import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWorkbook, UnrecognisedFormError } from "../lib/menu-audit/parse";
import { classify, defaultConfig, runAudit, perServingOf } from "../lib/menu-audit/rules";
import type { AuditResult, ParsedMenu } from "../lib/menu-audit/types";

// The reference workbook is a real, confidential caterer form, so it is
// git-ignored. These acceptance tests are skipped on a machine that does not
// have it (put it at tests/fixtures/ginza-form3.xlsx).
const FIXTURE = "tests/fixtures/ginza-form3.xlsx";

describe("classification (no workbook needed)", () => {
  const vec = (kcal: number, fat: number, satFat: number, sodium: number, sugar: number, fibre: number) => ({ kcal, fat, satFat, sodium, sugar, fibre });
  it("is GREEN when every nutrient is within the green limits", () => {
    const c = classify(defaultConfig, vec(400, 10, 3, 400, 4, 4), vec(100, 2, 1, 100, 1, 4));
    expect(c.colour).toBe("GREEN");
  });
  it("is RED if any one nutrient is RED, and names it", () => {
    const c = classify(defaultConfig, vec(692, 10, 3, 400, 4, 4), vec(100, 2, 1, 100, 1, 4));
    expect(c.colour).toBe("RED");
    expect(c.redNutrients).toEqual(["Energy (kcal)"]);
  });
  it("treats low fibre as the bad direction", () => {
    const c = classify(defaultConfig, vec(400, 10, 3, 400, 4, 1), vec(100, 2, 1, 100, 1, 1));
    expect(c.colour).toBe("RED");
    expect(c.colourWithoutFibre).toBe("GREEN");
  });
  it("counts a blank value as 0 in totals", () => {
    const row = { servingG: 100, per100: { kcal: 100, fat: null, satFat: null, sodium: null, sugar: null, fibre: null } } as never;
    expect(perServingOf([row]).kcal).toBe(100);
    expect(perServingOf([row]).sodium).toBe(0);
  });
});

describe("rejects a file that is not the DM form", () => {
  it("says 'Unrecognised form version' for garbage input", async () => {
    await expect(parseWorkbook(Buffer.from("not a workbook"))).rejects.toThrow(UnrecognisedFormError);
  });
});

describe.skipIf(!existsSync(FIXTURE))("acceptance test: Ginza / Repton Form 3", () => {
  let menu: ParsedMenu;
  let audit: AuditResult;
  const rule = (id: string) => audit.rules.find((r) => r.id === id)!;
  const names = (id: string) => rule(id).findings.map((f) => f.item.toLowerCase());

  it("parses", async () => {
    menu = await parseWorkbook(readFileSync(FIXTURE));
    audit = runAudit(menu);
    const count = (xs: { week: number | null }[], w: number) => xs.filter((x) => x.week === w).length;
    expect([1, 2, 3, 4].map((w) => count(menu.combos, w))).toEqual([9, 9, 9, 0]);
    expect(menu.combos).toHaveLength(27);
    expect([1, 2, 3].map((w) => count(menu.snacks, w))).toEqual([8, 9, 10]);
    expect(menu.snacks).toHaveLength(27);
    expect(menu.drinks).toHaveLength(0);
  });

  it("R4 main meals: 27/27 RED, with or without fibre; week 4 is incomplete", () => {
    const combos = audit.evaluations.filter((e) => e.kind === "combo");
    expect(combos.every((e) => e.classification.colour === "RED")).toBe(true);
    expect(combos.every((e) => e.classification.colourWithoutFibre === "RED")).toBe(true);
    const wk4 = audit.weekly.find((w) => w.kind === "combo" && w.week === 4)!;
    expect(wk4.verdict).toBe("incomplete");
    expect(audit.weekly.filter((w) => w.kind === "combo" && w.week <= 3).every((w) => w.verdict === "fail")).toBe(true);
  });

  it("R4 example: Wk 1 Mon Bolognese combo", () => {
    const e = audit.evaluations.find((x) => x.kind === "combo" && x.week === 1 && x.day === "Mon" && /bolognese/i.test(x.name))!;
    const r = (n: number | null) => Math.round((n ?? 0) * 10) / 10;
    expect([r(e.perServing.kcal), r(e.perServing.fat), r(e.perServing.satFat), Math.round(e.perServing.sodium ?? 0), r(e.perServing.sugar), r(e.perServing.fibre)]).toEqual([692.3, 26.5, 6.2, 1195, 0.5, 5.6]);
  });

  it("R4 snacks: strict and fibre-excluded mixes", () => {
    const s = (w: number) => audit.weekly.find((x) => x.kind === "snack" && x.week === w)!;
    const p = (w: { greenPct: number; amberPct: number; redPct: number }) => [w.greenPct, w.amberPct, w.redPct].map(Math.round);
    expect([1, 2, 3].map((w) => p(s(w)))).toEqual([[0, 25, 75], [0, 0, 100], [0, 20, 80]]);
    expect([1, 2, 3].map((w) => p(s(w).withoutFibre))).toEqual([[50, 50, 0], [56, 33, 11], [60, 20, 20]]);
  });

  it("A.2 broken Friday totals", () => {
    const fridays = rule("A.2").findings.filter((f) => f.day === "Fri");
    expect(fridays).toHaveLength(3);
    expect(fridays.map((f) => f.evidence.match(/Energy \(kcal\): form ([\d.]+) vs recomputed ([\d.]+)/)!.slice(1).map((n) => Math.round(Number(n))))).toEqual([[824, 1017], [695, 893], [793, 996]]);
  });

  it("A.1 missing values: 13 component rows", () => {
    expect(rule("A.1").findings).toHaveLength(13);
    expect(rule("A.1").findings.filter((f) => /yogurt/i.test(f.item))).toHaveLength(11);
  });

  it("A.3 Fresh yoghurt carrying Saffron Rice values", () => {
    const hit = rule("A.3").findings.find((f) => f.week === 1 && f.day === "Wed" && /fresh yoghurt full fat/i.test(f.item));
    expect(hit?.evidence).toContain("146 kcal");
  });

  it("A.4 added sugar 0 despite honey/syrup", () => {
    const n = names("A.4");
    for (const x of ["apple crumble cake", "vanilla cake", "whole oats flapjack", "banana bread", "oats raisins and carrot bread"]) expect(n).toContain(x);
    expect(n).not.toContain("fruit salad"); // "Honey Dew" is a melon
    expect(n).not.toContain("fruit juice"); // a juice's own concentrate
  });

  it("R3b pass, R3c pass, R3d 0 of 24", () => {
    expect(rule("R3b").result).toBe("pass");
    expect(rule("R3c").result).toBe("pass");
    expect(rule("R3d").summary).toContain("0 of 24");
  });

  it("D.1 flags the empty Drinks sheet", () => {
    expect(rule("D.1").findings.some((f) => f.item === "Drinks sheet")).toBe(true);
  });
});
