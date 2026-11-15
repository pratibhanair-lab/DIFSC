import { ALLERGENS, type AiBanned, type AiOutput, type Allergen, type BannedCategory } from "./ai-types";
import { allRows, finding, normName, round, uniqueItems, whereCombo, whereRow } from "./shared";
import type { Finding, FoodRow, ParsedMenu, RuleResult } from "./types";

/**
 * Turns the AI review's raw answer into rule results, with the spec's
 * guardrails enforced in code (section 4):
 *  - a finding is dropped unless its quoted evidence is really in the item's
 *    ingredient text;
 *  - undeclared / unexplained allergens are computed here, never trusted from
 *    the model;
 *  - plausibility only reports deviations beyond the tolerance;
 *  - banned-item findings stay "needs verification" unless the ingredient
 *    text names the banned item outright.
 */

export const BANNED_LABELS: Record<BannedCategory, string> = {
  deep_fried: "Deep-fried food",
  trans_fat: "Trans fats",
  non_halal: "Non-halal product",
  processed_meat: "Processed meat",
  artificial_sweetener: "Artificial sweetener",
  protein_supplement: "Added protein supplement",
  confectionery: "Sugar or chocolate confectionery",
  sugary_drink: "Sugary drink",
  caffeinated: "Caffeinated drink",
  energy_drink: "Energy drink",
  highly_processed_snack: "Highly processed snack",
};

/** Words that name a banned item outright, so no verification is needed. */
const OUTRIGHT: Partial<Record<BannedCategory, RegExp>> = {
  non_halal: /\b(pork|lard|bacon|pig|alcohol|wine|beer|rum)\b/i,
  energy_drink: /energy drink/i,
  caffeinated: /energy drink|\bcola\b|caffeine/i,
  artificial_sweetener: /aspartame|sucralose|saccharin|acesulfame|cyclamate/i,
  deep_fried: /deep[- ]fr(y|ied|ying)/i,
  processed_meat: /sausage|salami|pepperoni|bacon|hot ?dog|nugget|luncheon|mortadella/i,
  trans_fat: /hydrogenated/i,
  protein_supplement: /protein (powder|isolate|supplement)|whey protein/i,
};

const ALLERGEN_WORDS: [RegExp, Allergen][] = [
  [/crustacean|shellfish|shrimp|prawn|crab|lobster/i, "crustaceans"],
  [/peanut|groundnut/i, "peanuts"],
  [/soy/i, "soybeans"],
  [/tree nut|almond|walnut|cashew|hazelnut|pistachio|pecan|macadamia|\bnuts?\b/i, "tree nuts"],
  [/sesame|tahini/i, "sesame seeds"],
  [/\bfish|tuna|salmon|anchov/i, "fish"],
  [/\begg/i, "egg"],
  [/milk|dairy|lactose|cheese|butter|cream|yogh?urt/i, "milk"],
  [/gluten|wheat|barley|\brye\b|\boats?\b|spelt|semolina/i, "gluten"],
];

/** "Eggs" -> "egg", "soy" -> "soybeans"; null for anything outside the nine. */
export function canonicalAllergen(text: string): Allergen | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if ((ALLERGENS as readonly string[]).includes(t)) return t as Allergen;
  for (const [re, a] of ALLERGEN_WORDS) if (re.test(t)) return a;
  return null;
}

const declaredSet = (r: FoodRow): Set<Allergen> => new Set(r.allergens.map(canonicalAllergen).filter((a): a is Allergen => a !== null));

/** Is the quoted evidence really in the ingredient text? (case-insensitive) */
export function evidenceInText(evidence: string, ingredients: string): boolean {
  const e = evidence.replace(/\s+/g, " ").trim().toLowerCase();
  return e.length > 0 && ingredients.replace(/\s+/g, " ").toLowerCase().includes(e);
}

const notAssessed = (id: string, title: string, findings: Finding[] = []): RuleResult => ({
  id,
  title,
  result: "incomplete",
  notAssessed: true,
  summary: "Not assessed – AI review unavailable",
  findings,
});

const placesNote = (n: number) => (n > 1 ? ` (appears ${n} times in the menu)` : "");

export type AiRulesOutput = { rules: RuleResult[]; dropped: string[]; meatFree: Map<string, boolean> };

export function buildAiRules(menu: ParsedMenu, ai: AiOutput | null, plausibilityTolerancePct: number): AiRulesOutput {
  const dropped: string[] = [];
  const items = uniqueItems(menu);

  // ---- R2 deterministic cross-check: same item name declared differently elsewhere ----
  const crossCheck: Finding[] = [];
  const byName = new Map<string, FoodRow[]>();
  for (const r of allRows(menu)) if (r.name) byName.set(normName(r.name), [...(byName.get(normName(r.name)) ?? []), r]);
  for (const group of byName.values()) {
    const union = new Set<Allergen>();
    for (const r of group) for (const a of declaredSet(r)) union.add(a);
    for (const r of group) {
      const have = declaredSet(r);
      const missing = [...union].filter((a) => !have.has(a));
      if (missing.length) {
        crossCheck.push(
          finding("R2", "major", whereRow(r), `Allergen declared for this item elsewhere in the menu but missing here: ${missing.join(", ")}.`, `Declared here: ${r.allergensRaw || "(none)"}  [${r.sheet} row ${r.row}]`),
        );
      }
    }
  }

  if (!ai) {
    return {
      rules: [notAssessed("R1", "Banned ingredients and processes"), notAssessed("R2", "Allergen declaration", crossCheck), notAssessed("R3a", "Food groups in each combo"), notAssessed("A.5", "Plausibility of nutrient values")],
      dropped,
      meatFree: new Map(),
    };
  }

  const aiByKey = new Map(ai.items.map((i) => [i.key, i]));
  const r1: Finding[] = [];
  const r2: Finding[] = [...crossCheck];
  const a5: Finding[] = [];

  for (const { key, row, places } of items) {
    const a = aiByKey.get(key);
    if (!a) continue;
    const here = whereRow(row);
    const dup = placesNote(places.length);

    // R1 - banned items
    for (const b of a.banned as AiBanned[]) {
      if (!evidenceInText(b.evidence, row.ingredients)) {
        dropped.push(`${row.name}: banned "${b.category}" - evidence "${b.evidence}" is not in the ingredient text`);
        continue;
      }
      const outright = OUTRIGHT[b.category]?.test(b.evidence) ?? false;
      const f = finding("R1", outright ? "critical" : "major", here, `${BANNED_LABELS[b.category] ?? b.category}${outright ? "" : " (possible - needs verification)"}: ${b.reason}${dup}`, `"${b.evidence}"`);
      f.ai = true;
      f.action = b.action;
      f.needsVerification = !outright;
      r1.push(f);
    }

    // R2 - allergens (computed here from the model's inferred set)
    const inferred = new Map<Allergen, string>();
    for (const x of a.allergens_inferred) {
      const canon = canonicalAllergen(x.allergen);
      if (!canon) continue;
      if (!evidenceInText(x.evidence, row.ingredients)) {
        dropped.push(`${row.name}: allergen "${x.allergen}" - evidence "${x.evidence}" is not in the ingredient text`);
        continue;
      }
      inferred.set(canon, x.evidence);
    }
    for (const [allergen, evidence] of inferred) {
      const lacking = places.filter((p) => !declaredSet(p).has(allergen));
      if (lacking.length) {
        const f = finding("R2", "major", whereRow(lacking[0]), `Allergen not declared: ${allergen}${lacking.length > 1 ? ` (missing in ${lacking.length} of ${places.length} places)` : ""}.`, `"${evidence}" in the ingredients`);
        f.ai = true;
        r2.push(f);
      }
    }
    const declaredAnywhere = new Set<Allergen>();
    for (const p of places) for (const d of declaredSet(p)) declaredAnywhere.add(d);
    for (const d of declaredAnywhere) {
      if (!inferred.has(d)) {
        const f = finding("R2", "minor", here, `Declared allergen "${d}" is not explained by the ingredient list - check the ingredients or the declaration.${dup}`, `Declared: ${row.allergensRaw}`);
        f.ai = true;
        r2.push(f);
      }
    }
    if (a.needs_sub_ingredients.length) {
      const f = finding("R2", "minor", here, `Sub-ingredient lists are needed to check allergens for: ${a.needs_sub_ingredients.join(", ")}.${dup}`, `"${row.ingredients.slice(0, 140)}"`);
      f.ai = true;
      r2.push(f);
    }

    // A.5 - plausibility (only beyond the tolerance)
    for (const p of a.plausibility) {
      const mid = (p.reference_low + p.reference_high) / 2;
      if (!mid) continue;
      const dev = ((p.declared - mid) / mid) * 100;
      if (Math.abs(dev) <= plausibilityTolerancePct) continue;
      const f = finding(
        "A.5",
        "major",
        here,
        `Declared ${p.nutrient} (${p.declared}) is ${Math.abs(round(dev, 0))}% ${dev < 0 ? "under" : "over"} the approximate reference range ${p.reference_low}-${p.reference_high} (AI estimate).${dup}`,
        `Reference basis: ${p.basis}`,
      );
      f.ai = true;
      a5.push(f);
    }
  }

  // ---- R3a - food groups in each combo ----
  const r3a: Finding[] = [];
  const comboById = new Map(ai.combos.map((c) => [c.combo_id, c]));
  const meatFree = new Map<string, boolean>();
  let unchecked = 0;
  for (const c of menu.combos) {
    const a = comboById.get(c.id);
    if (!a) {
      unchecked++;
      continue;
    }
    meatFree.set(c.id, !a.contains_meat_or_fish);
    const missing = [!a.has_carb && "carbohydrate", !a.has_fat && "fat", !a.has_protein && "protein"].filter(Boolean);
    if (missing.length) {
      const f = finding("R3a", "major", whereCombo(c), `Food group missing from this combo: ${missing.join(", ")}.`, a.note);
      f.ai = true;
      r3a.push(f);
    }
    if (a.protein_adequate === false) {
      const f = finding("R3a", "major", whereCombo(c), "Protein looks inadequate in this combo.", a.protein_sources.length ? `Protein sources: ${a.protein_sources.join(", ")}. ${a.note}` : a.note);
      f.ai = true;
      r3a.push(f);
    } else if (a.protein_adequate === "borderline") {
      const f = finding("R3a", "minor", whereCombo(c), "Protein is borderline in this combo - needs a nutritionist's judgement.", a.note);
      f.ai = true;
      r3a.push(f);
    }
    if (a.double_starch) {
      const f = finding("R3a", "info", whereCombo(c), "This combo contains two starch components (double starch).", a.note);
      f.ai = true;
      r3a.push(f);
    }
  }

  const outcome = (fs: Finding[], needsVerifyIf: (f: Finding) => boolean) =>
    fs.some((f) => (f.severity === "critical" || f.severity === "major") && !needsVerifyIf(f)) ? "fail" : fs.some((f) => f.severity !== "info") ? "needs_verification" : "pass";

  const isPossible = (f: Finding) => f.needsVerification === true;
  const rules: RuleResult[] = [
    {
      id: "R1",
      title: "Banned ingredients and processes",
      result: outcome(r1, isPossible),
      summary: r1.length ? `${r1.filter((f) => !isPossible(f)).length} confirmed, ${r1.filter(isPossible).length} possible (needs verification)` : "No banned ingredients or processes found",
      findings: r1,
    },
    {
      id: "R2",
      title: "Allergen declaration",
      result: r2.some((f) => f.severity === "major") ? "fail" : r2.length ? "needs_verification" : "pass",
      summary: r2.length ? `${r2.filter((f) => f.severity === "major").length} allergen discrepancies, ${r2.filter((f) => f.severity !== "major").length} to check` : "Declared allergens match the ingredients",
      findings: r2,
    },
    {
      id: "R3a",
      title: "Food groups in each combo",
      result: unchecked ? "incomplete" : outcome(r3a, () => false),
      summary: unchecked ? `${unchecked} combo${unchecked === 1 ? "" : "s"} could not be assessed` : r3a.some((f) => f.severity === "major") ? `${r3a.filter((f) => f.severity === "major").length} combos with a food-group problem` : "Every combo has carbohydrate, fat and protein",
      findings: r3a,
    },
    {
      id: "A.5",
      title: "Plausibility of nutrient values",
      result: a5.length ? "fail" : "pass",
      summary: a5.length ? `${a5.length} value${a5.length === 1 ? "" : "s"} outside ±${plausibilityTolerancePct}% of the approximate reference` : `All checked values within ±${plausibilityTolerancePct}%`,
      findings: a5,
    },
  ];
  return { rules, dropped, meatFree };
}
