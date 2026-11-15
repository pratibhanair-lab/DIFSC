import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAiRules, canonicalAllergen, evidenceInText } from "../lib/menu-audit/ai-findings";
import type { AiItem, AiOutput } from "../lib/menu-audit/ai-types";
import { mockAiOutput } from "../lib/menu-audit/mock-ai";
import { parseWorkbook } from "../lib/menu-audit/parse";
import { buildReport } from "../lib/menu-audit/report";
import { runAudit } from "../lib/menu-audit/rules";
import { rowKey } from "../lib/menu-audit/shared";
import type { FoodRow, ParsedMenu } from "../lib/menu-audit/types";

const row = (over: Partial<FoodRow>): FoodRow => ({
  sheet: "Wk 1 & 2 Entree Snacks & Snacks", row: 16, week: 1, term: null, name: "Test snack", brand: "", allergensRaw: "", allergens: [],
  category: "", component: "One Dish", prep: "", day: "Mon", meal: "Breakfast", ingredients: "wheat flour, soy sauce, vegetable fat", foodType: "Catered",
  servingG: 100, per100: { kcal: 100, fat: 5, satFat: 1, sodium: 100, sugar: 1, fibre: 2 }, remarks: "", ...over,
});
const menuOf = (r: FoodRow): ParsedMenu => ({ info: {}, combos: [], snacks: [r], drinks: [] });
const aiFor = (r: FoodRow, item: Partial<AiItem>): AiOutput => ({
  model: "test", items: [{ key: rowKey(r), item: r.name, banned: [], allergens_inferred: [], needs_sub_ingredients: [], plausibility: [], ...item }], combos: [],
});

describe("AI guardrails (no workbook needed)", () => {
  it("maps allergen wording to the nine standard allergens", () => {
    expect(canonicalAllergen("eggs")).toBe("egg");
    expect(canonicalAllergen("soy")).toBe("soybeans");
    expect(canonicalAllergen("Wheat")).toBe("gluten");
    expect(canonicalAllergen("mustard")).toBeNull();
  });
  it("finds quoted evidence case-insensitively", () => {
    expect(evidenceInText("Soy Sauce", "wheat flour, soy sauce")).toBe(true);
    expect(evidenceInText("pork", "wheat flour, soy sauce")).toBe(false);
  });
  it("drops a finding whose evidence is not in the ingredients, and logs it", () => {
    const r = row({});
    const out = buildAiRules(menuOf(r), aiFor(r, { banned: [{ category: "non_halal", status: "present", evidence: "pork", reason: "x", action: "y" }] }), 20);
    expect(out.rules.find((x) => x.id === "R1")!.findings).toHaveLength(0);
    expect(out.dropped[0]).toContain("pork");
  });
  it("computes undeclared allergens in code, not from the model", () => {
    const r = row({ allergensRaw: "gluten", allergens: ["gluten"] });
    const out = buildAiRules(menuOf(r), aiFor(r, { allergens_inferred: [{ allergen: "soybeans", evidence: "soy sauce" }, { allergen: "gluten", evidence: "wheat flour" }] }), 20);
    const r2 = out.rules.find((x) => x.id === "R2")!;
    expect(r2.result).toBe("fail");
    expect(r2.findings.map((f) => f.message).join(" ")).toContain("soybeans");
    expect(r2.findings.map((f) => f.message).join(" ")).not.toContain("not declared: gluten");
  });
  it("keeps a 'possible' banned item as needs-verification, but a named one is critical", () => {
    const r = row({ ingredients: "chicken, vegetable fat, pork sausage" });
    const possible = buildAiRules(menuOf(r), aiFor(r, { banned: [{ category: "trans_fat", status: "possible", evidence: "vegetable fat", reason: "x", action: "y" }] }), 20).rules.find((x) => x.id === "R1")!;
    expect(possible.result).toBe("needs_verification");
    const named = buildAiRules(menuOf(r), aiFor(r, { banned: [{ category: "non_halal", status: "possible", evidence: "pork", reason: "x", action: "y" }] }), 20).rules.find((x) => x.id === "R1")!;
    expect(named.result).toBe("fail");
    expect(named.findings[0].severity).toBe("critical");
  });
  it("reports plausibility only beyond the tolerance", () => {
    const r = row({});
    const within = buildAiRules(menuOf(r), aiFor(r, { plausibility: [{ nutrient: "kcal", declared: 110, reference_low: 95, reference_high: 105, basis: "b" }] }), 20);
    expect(within.rules.find((x) => x.id === "A.5")!.findings).toHaveLength(0);
    const far = buildAiRules(menuOf(r), aiFor(r, { plausibility: [{ nutrient: "kcal", declared: 50, reference_low: 95, reference_high: 105, basis: "b" }] }), 20);
    expect(far.rules.find((x) => x.id === "A.5")!.findings).toHaveLength(1);
  });
  it("marks AI rules 'not assessed' when the AI review is unavailable", () => {
    const out = buildAiRules(menuOf(row({})), null, 20);
    for (const id of ["R1", "R3a", "A.5"]) expect(out.rules.find((x) => x.id === id)).toMatchObject({ notAssessed: true, result: "incomplete" });
  });
});

describe.skipIf(!existsSync("tests/fixtures/ginza-form3.xlsx"))("report: Ginza / Repton Form 3", () => {
  it("R2 cross-check finds milk missing on the Low fat milk row (no AI needed)", async () => {
    const menu = await parseWorkbook(readFileSync("tests/fixtures/ginza-form3.xlsx"));
    const audit = runAudit(menu, undefined, null);
    const hit = audit.rules.find((r) => r.id === "R2")!.findings.find((f) => /low fat milk/i.test(f.item) && f.week === 2 && f.day === "Tue" && /milk/.test(f.message));
    expect(hit).toBeTruthy();
  });

  it("builds a complete report with mock AI", async () => {
    const menu = await parseWorkbook(readFileSync("tests/fixtures/ginza-form3.xlsx"));
    const ai = mockAiOutput(menu);
    const report = buildReport(menu, runAudit(menu, undefined, ai), ai, { now: new Date("2026-11-15T08:00:00Z"), reportId: "MSA-TEST" });
    expect(report.verdict).toBe("not_compliant");
    expect(report.scorecard.map((s) => s.id)).toEqual(["R1", "R2", "R3a", "R3b", "R3c", "R3d", "R4-main", "R4-snacks", "ACC", "B.1", "D.1"]);
    expect(report.meta.aiMock).toBe(true);
    expect(report.corrective.length).toBeGreaterThan(3);
    expect(JSON.parse(JSON.stringify(report))).toEqual(report); // plain data only
  });

  it("with no AI: still a full report, AI rules 'not assessed'", async () => {
    const menu = await parseWorkbook(readFileSync("tests/fixtures/ginza-form3.xlsx"));
    const report = buildReport(menu, runAudit(menu, undefined, null), null);
    expect(report.meta.aiAvailable).toBe(false);
    for (const id of ["R1", "R3a"]) expect(report.scorecard.find((s) => s.id === id)!.result).toBe("not_assessed");
    expect(report.accuracy.plausibilityAssessed).toBe(false);
    expect(report.verdict).toBe("not_compliant"); // the deterministic checks alone already fail
  });
});
