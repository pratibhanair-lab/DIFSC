import { checkUploadBasics, checkZipSize, createLimiter, MAX_FILE_BYTES } from "@/lib/menu-audit/limits";
import { runPipeline } from "@/lib/menu-audit/pipeline";

// Public endpoint (no login, by the owner's choice for now). Each audit makes
// paid AI calls, so it is guarded by size/type checks, a per-visitor hourly
// limit, a per-server daily limit and a cap on audits running at once.
export const runtime = "nodejs";
export const maxDuration = 300;

const perVisitor = createLimiter(Number(process.env.MENU_AUDIT_MAX_PER_HOUR ?? 6), 60 * 60 * 1000);
const perServerDay = createLimiter(Number(process.env.MENU_AUDIT_MAX_PER_DAY ?? 200), 24 * 60 * 60 * 1000);
const MAX_AT_ONCE = 4;
let running = 0;

const json = (status: number, error: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  // Reject oversized bodies before reading them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 200_000) return json(413, "The file is larger than 4 MB.");

  const visitor = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const limited = perVisitor.take(visitor);
  if (!limited.ok) return json(429, `You have reached the hourly limit for audits. Please try again in about ${Math.ceil(limited.retryAfterSec / 60)} minute(s).`, { "Retry-After": String(limited.retryAfterSec) });
  if (!perServerDay.take("all").ok) return json(429, "The tool has reached its daily limit. Please try again tomorrow.");
  if (running >= MAX_AT_ONCE) return json(503, "The tool is busy right now. Please try again in a minute.");

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return json(400, "Please upload the workbook as a file.");
  }
  if (!file) return json(400, "No file was uploaded.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const basics = checkUploadBasics(file.name, bytes);
  if (!basics.ok) return json(basics.status, basics.error);
  const zip = await checkZipSize(bytes);
  if (!zip.ok) return json(zip.status, zip.error);

  // Stream progress to the page as one JSON object per line.
  running++;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runPipeline(bytes)) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      } finally {
        running--;
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
