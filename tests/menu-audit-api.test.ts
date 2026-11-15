import { existsSync, readFileSync } from "node:fs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { checkUploadBasics, checkZipSize, createLimiter, MAX_FILE_BYTES } from "../lib/menu-audit/limits";
import { mockAiOutput } from "../lib/menu-audit/mock-ai";
import { runPipeline, type AuditEvent } from "../lib/menu-audit/pipeline";
import type { ReviewResult } from "../lib/menu-audit/ai-review";

const FIXTURE = "tests/fixtures/ginza-form3.xlsx";
const zipMagic = (n = 100) => new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(n).fill(1)]);
const collect = async (g: AsyncGenerator<AuditEvent>) => {
  const out: AuditEvent[] = [];
  for await (const e of g) out.push(e);
  return out;
};
const noUsage = { calls: 0, retries: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: null };

describe("upload checks", () => {
  it("accepts a plausible .xlsx", () => expect(checkUploadBasics("menu.xlsx", zipMagic())).toEqual({ ok: true }));
  it("rejects other file types (415)", () => {
    expect(checkUploadBasics("menu.pdf", zipMagic())).toMatchObject({ ok: false, status: 415 });
    expect(checkUploadBasics("menu.xlsx.exe", zipMagic())).toMatchObject({ ok: false, status: 415 });
  });
  it("rejects a renamed non-zip file (415)", () => expect(checkUploadBasics("menu.xlsx", new TextEncoder().encode("hello, not a zip"))).toMatchObject({ ok: false, status: 415 }));
  it("rejects empty (400) and over-4MB (413) files", () => {
    expect(checkUploadBasics("a.xlsx", new Uint8Array(0))).toMatchObject({ ok: false, status: 400 });
    expect(checkUploadBasics("a.xlsx", zipMagic(MAX_FILE_BYTES))).toMatchObject({ ok: false, status: 413 });
  });
  it("rejects a zip with far too many parts", async () => {
    const zip = new JSZip();
    for (let i = 0; i < 450; i++) zip.file(`f${i}.txt`, "x");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    expect(await checkZipSize(bytes)).toMatchObject({ ok: false, status: 413 });
  });
  it("rejects bytes that only look like a zip (415)", async () => expect(await checkZipSize(zipMagic())).toMatchObject({ ok: false, status: 415 }));
});

describe("rate limiter", () => {
  it("allows up to the limit, then says when to retry, then resets", () => {
    const l = createLimiter(3, 1000);
    expect([1, 2, 3].map((i) => l.take("a", i)).every((r) => r.ok)).toBe(true);
    const blocked = l.take("a", 10);
    expect(blocked).toMatchObject({ ok: false });
    expect(blocked.ok === false && blocked.retryAfterSec).toBeGreaterThan(0);
    expect(l.take("b", 10).ok).toBe(true); // other visitors are unaffected
    expect(l.take("a", 1500).ok).toBe(true); // window has passed
  });
});

describe("pipeline", () => {
  it("returns a clear error for a file that is not the DM form", async () => {
    const zip = new JSZip();
    zip.file("hello.txt", "hi");
    const events = await collect(runPipeline(await zip.generateAsync({ type: "uint8array" })));
    expect(events.at(-1)).toMatchObject({ type: "error" });
    expect(JSON.stringify(events.at(-1))).toContain("Unrecognised form version");
  });

  describe.skipIf(!existsSync(FIXTURE))("with the reference workbook", () => {
    it("streams the four steps in order and ends with a report", async () => {
      const bytes = new Uint8Array(readFileSync(FIXTURE));
      const review = async (menu: Parameters<typeof mockAiOutput>[0]): Promise<ReviewResult> => ({ ai: mockAiOutput(menu), error: null, usage: noUsage });
      const events = await collect(runPipeline(bytes, { review }));
      expect(events.filter((e) => e.type === "step").map((e) => (e as { step: string }).step)).toEqual(["reading", "rules", "ai", "report"]);
      const done = events.at(-1) as Extract<AuditEvent, { type: "done" }>;
      expect(done.type).toBe("done");
      expect(done.ai.available).toBe(true);
      expect(done.report.verdict).toBe("not_compliant");
    });

    it("still produces a report when the AI is unavailable", async () => {
      const bytes = new Uint8Array(readFileSync(FIXTURE));
      const review = async (): Promise<ReviewResult> => ({ ai: null, error: "The AI service returned an error (500).", usage: noUsage });
      const done = (await collect(runPipeline(bytes, { review }))).at(-1) as Extract<AuditEvent, { type: "done" }>;
      expect(done.type).toBe("done");
      expect(done.ai).toMatchObject({ available: false, error: "The AI service returned an error (500)." });
      expect(done.report.scorecard.find((s) => s.id === "R1")!.result).toBe("not_assessed");
    });

    it("turns an unexpected crash into a friendly message", async () => {
      const bytes = new Uint8Array(readFileSync(FIXTURE));
      const review = async (): Promise<ReviewResult> => {
        throw new Error("secret internal detail");
      };
      const last = (await collect(runPipeline(bytes, { review }))).at(-1);
      expect(last).toMatchObject({ type: "error" });
      expect(JSON.stringify(last)).not.toContain("secret internal detail");
    });
  });
});

describe("POST /api/menu-audit (rejections only - no AI is called)", () => {
  async function load() {
    process.env.MENU_AUDIT_MAX_PER_HOUR = "3";
    return (await import("../app/api/menu-audit/route")).POST;
  }
  const post = (POST: (r: Request) => Promise<Response>, name: string | null, bytes: Uint8Array, headers: Record<string, string> = {}) => {
    const form = new FormData();
    if (name) form.append("file", new File([bytes as BlobPart], name));
    return POST(new Request("http://localhost/api/menu-audit", { method: "POST", body: form, headers }));
  };

  it("rejects a missing file, a wrong type, and an oversized declaration", async () => {
    const POST = await load();
    expect((await post(POST, null, new Uint8Array(), { "x-real-ip": "1.1.1.1" })).status).toBe(400);
    const wrong = await post(POST, "notes.txt", new TextEncoder().encode("hi"), { "x-real-ip": "1.1.1.2" });
    expect(wrong.status).toBe(415);
    expect(await wrong.json()).toMatchObject({ error: expect.stringContaining(".xlsx") });
    const big = new Request("http://localhost/api/menu-audit", { method: "POST", body: new FormData(), headers: { "x-real-ip": "1.1.1.3", "content-length": String(MAX_FILE_BYTES + 500_000) } });
    expect((await POST(big)).status).toBe(413);
  });

  it("limits one visitor, with a Retry-After header", async () => {
    const POST = await load();
    const ip = { "x-real-ip": "9.9.9.9" };
    for (let i = 0; i < 3; i++) expect((await post(POST, "a.txt", new Uint8Array([1]), ip)).status).toBe(415);
    const limited = await post(POST, "a.txt", new Uint8Array([1]), ip);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
