import defaultConfig from "./rules.config.json";
import {
  NUTRIENT_KEYS,
  type AuditResult,
  type Classification,
  type Colour,
  type Combo,
  type Drink,
  type Finding,
  type FoodRow,
  type ItemEvaluation,
  type NutrientKey,
  type NutrientVector,
  type ParsedMenu,
  type RuleResult,
  type Severity,
  type WeeklyMix,
} from "./types";
import { allRows, finding, normName, round, whereCombo, whereRow } from "./shared";
import { buildAiRules } from "./ai-findings";
import type { AiOutput } from "./ai-types";

export type RulesConfig = typeof defaultConfig;
export { defaultConfig, normName };

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const emptyVector = (): NutrientVector => ({ kcal: null, fat: null, satFat: null, sodium: null, sugar: null, fibre: null });

const isComplete = (v: NutrientVector) => NUTRIENT_KEYS.every((k) => v[k] !== null);

function ruleResult(
  id: string,
  title: string,
  findings: Finding[],
  summaryPass: string,
  opts: { advisory?: boolean; failIfAny?: Severity[]; summaryFail?: string } = {},
): RuleResult {
  const failing = findings.filter((f) => (opts.failIfAny ?? ["critical", "major", "minor"]).includes(f.severity));
  return {
    id,
    title,
    result: failing.length ? "fail" : "pass",
    advisory: opts.advisory,
    summary: failing.length ? (opts.summaryFail ?? `${failing.length} finding${failing.length === 1 ? "" : "s"}`) : summaryPass,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Nutrient maths and Smart Choices classification (R4.1)
// ---------------------------------------------------------------------------

/** Σ(per-100 g × g / 100). A blank value counts as 0 for totals only. */
export function perServingOf(rows: FoodRow[]): NutrientVector {
  const out = emptyVector();
  for (const k of NUTRIENT_KEYS) {
    out[k] = rows.reduce((sum, r) => sum + ((r.per100[k] ?? 0) * (r.servingG ?? 0)) / 100, 0);
  }
  return out;
}

export const totalGramsOf = (rows: FoodRow[]) => rows.reduce((s, r) => s + (r.servingG ?? 0), 0);

export function per100Of(perServing: NutrientVector, totalG: number): NutrientVector {
  const out = emptyVector();
  for (const k of NUTRIENT_KEYS) out[k] = totalG > 0 ? ((perServing[k] ?? 0) / totalG) * 100 : 0;
  return out;
}

function colourFor(config: RulesConfig, key: NutrientKey, basis: "perServing" | "per100", value: number): Colour {
  const t = config.thresholds[key];
  const { green, amber } = t[basis];
  if ("higherIsBetter" in t && t.higherIsBetter) {
    if (value >= green - EPS) return "GREEN";
    if (value >= amber - EPS) return "AMBER";
    return "RED";
  }
  if (value <= green + EPS) return "GREEN";
  if (value <= amber + EPS) return "AMBER";
  return "RED";
}

const worst = (a: Colour, b: Colour): Colour => (a === "RED" || b === "RED" ? "RED" : a === "AMBER" || b === "AMBER" ? "AMBER" : "GREEN");

export function classify(config: RulesConfig, perServing: NutrientVector, per100: NutrientVector): Classification {
  let colour: Colour = "GREEN";
  let colourWithoutFibre: Colour = "GREEN";
  const red: string[] = [];
  const amber: string[] = [];
  for (const k of NUTRIENT_KEYS) {
    const a = colourFor(config, k, "perServing", perServing[k] ?? 0);
    const b = colourFor(config, k, "per100", per100[k] ?? 0);
    const c = worst(a, b);
    colour = worst(colour, c);
    if (k !== "fibre") colourWithoutFibre = worst(colourWithoutFibre, c);
    const label = config.thresholds[k].label;
    if (c === "RED") red.push(label);
    else if (c === "AMBER") amber.push(label);
  }
  return { colour, colourWithoutFibre, redNutrients: red, amberNutrients: amber };
}

function evaluate(config: RulesConfig, kind: "combo" | "snack", id: string, name: string, week: number | null, day: string, rows: FoodRow[]): ItemEvaluation {
  const totalG = totalGramsOf(rows);
  const perServing = perServingOf(rows);
  const per100 = per100Of(perServing, totalG);
  return { id, kind, name, week, day, perServing, per100, totalG, classification: classify(config, perServing, per100) };
}

// ---------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------

export function runAudit(menu: ParsedMenu, config: RulesConfig = defaultConfig, ai: AiOutput | null = null): AuditResult {
  const aiRules = buildAiRules(menu, ai, config.plausibilityTolerancePct);
  const evaluations: ItemEvaluation[] = [];
  for (const c of menu.combos) evaluations.push(evaluate(config, "combo", c.id, c.name, c.week, c.day, c.components));
  for (const s of menu.snacks) evaluations.push(evaluate(config, "snack", `${s.sheet}#${s.row}`, s.name, s.week, s.day, [s]));

  const weekly = weeklyMix(evaluations, config);
  const rules: RuleResult[] = [
    ruleR41(evaluations, config),
    ruleR42(weekly, config),
    ruleA1(menu),
    ruleA2(menu, evaluations, config),
    ruleA3(menu),
    ruleA4(menu, config),
    ruleR3b(menu, config, aiRules.meatFree),
    ruleR3c(menu, config),
    ruleR3d(menu, config),
    ruleB1(menu, config),
    ruleD1(menu, config),
    ...aiRules.rules,
  ];
  return { rules, evaluations, weekly, aiAssessed: ai !== null, aiDropped: aiRules.dropped };
}

// R4.1 ----------------------------------------------------------------------

function ruleR41(evals: ItemEvaluation[], config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  const useFibre = !config.exclude_fibre_in_classification;
  for (const e of evals) {
    const colour = useFibre ? e.classification.colour : e.classification.colourWithoutFibre;
    if (colour !== "RED") continue;
    const kind = e.kind === "combo" ? "combo" : "snack";
    findings.push({
      rule: "R4.1",
      severity: "major",
      sheet: "",
      week: e.week,
      day: e.day,
      item: e.name,
      message: `This ${kind} is RED (seldom choice).`,
      evidence: e.classification.redNutrients.join(", "),
    });
  }
  // Individual RED items are listed in the weekly mix; this rule only reports
  // the classification itself, so it never "fails" on its own.
  return {
    id: "R4.1",
    title: "Smart Choices classification of each combo and snack",
    result: "pass",
    summary: `${evals.filter((e) => e.classification.colour === "RED").length} of ${evals.length} items are RED`,
    findings: findings.map((f) => ({ ...f, severity: "info" as Severity })),
  };
}

// R4.2 ----------------------------------------------------------------------

function weeklyMix(evals: ItemEvaluation[], config: RulesConfig): WeeklyMix[] {
  const out: WeeklyMix[] = [];
  for (const kind of ["combo", "snack"] as const) {
    for (const week of [1, 2, 3, 4]) {
      const items = evals.filter((e) => e.kind === kind && e.week === week);
      const count = items.length;
      const tally = (pick: (e: ItemEvaluation) => Colour) => ({
        green: items.filter((e) => pick(e) === "GREEN").length,
        amber: items.filter((e) => pick(e) === "AMBER").length,
        red: items.filter((e) => pick(e) === "RED").length,
      });
      const strict = tally((e) => e.classification.colour);
      const loose = tally((e) => e.classification.colourWithoutFibre);
      const pct = (n: number) => (count ? (n / count) * 100 : 0);
      const useFibre = !config.exclude_fibre_in_classification;
      const main = useFibre ? strict : loose;
      const L = config.weeklyLimits;
      const ok = pct(main.green) >= L.minGreenPct - EPS && pct(main.amber) <= L.maxAmberPct + EPS && pct(main.red) <= L.maxRedPct + EPS;
      out.push({
        kind,
        week,
        count,
        ...strict,
        greenPct: pct(strict.green),
        amberPct: pct(strict.amber),
        redPct: pct(strict.red),
        withoutFibre: { greenPct: pct(loose.green), amberPct: pct(loose.amber), redPct: pct(loose.red) },
        verdict: count === 0 ? "incomplete" : ok ? "pass" : "fail",
      });
    }
  }
  return out;
}

function ruleR42(weekly: WeeklyMix[], config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  const L = config.weeklyLimits;
  const useFibre = !config.exclude_fibre_in_classification;
  for (const w of weekly) {
    const label = w.kind === "combo" ? "Main meals" : "Snacks";
    const where = { sheet: label, week: w.week, day: "", item: `Week ${w.week} ${label}` };
    if (w.count === 0) {
      findings.push(finding("R4.2", "major", where, "No items listed for this week, so the weekly mix cannot be checked."));
      continue;
    }
    const g = useFibre ? w.greenPct : w.withoutFibre.greenPct;
    const a = useFibre ? w.amberPct : w.withoutFibre.amberPct;
    const r = useFibre ? w.redPct : w.withoutFibre.redPct;
    const ev = `${round(g)}% GREEN / ${round(a)}% AMBER / ${round(r)}% RED`;
    if (g < L.minGreenPct - EPS) findings.push(finding("R4.2", "major", where, `Fewer than ${L.minGreenPct}% of items are GREEN.`, ev));
    if (a > L.maxAmberPct + EPS) findings.push(finding("R4.2", "major", where, `More than ${L.maxAmberPct}% of items are AMBER.`, ev));
    if (r > L.maxRedPct + EPS) findings.push(finding("R4.2", "major", where, `More than ${L.maxRedPct}% of items are RED.`, ev));
  }
  const incomplete = weekly.some((w) => w.count === 0);
  const failed = findings.some((f) => !/No items/.test(f.message));
  return {
    id: "R4.2",
    title: "Weekly nutrient mix (main meals and snacks)",
    result: failed ? "fail" : incomplete ? "incomplete" : "pass",
    summary: failed ? "One or more weeks break the GREEN/AMBER/RED limits" : incomplete ? "Some weeks have no items" : "All weeks within limits",
    findings,
  };
}

// A.1 -----------------------------------------------------------------------


function ruleA1(menu: ParsedMenu): RuleResult {
  const findings: Finding[] = [];
  const labels: Record<NutrientKey, string> = { kcal: "calories", fat: "total fat", satFat: "saturated fat", sodium: "sodium", sugar: "added sugar", fibre: "fibre" };
  for (const r of allRows(menu)) {
    const missing: string[] = NUTRIENT_KEYS.filter((k) => r.per100[k] === null).map((k) => labels[k]);
    if (!r.ingredients) missing.push("ingredient list");
    if (r.servingG === null) missing.push("serving size");
    if (missing.length) {
      findings.push(finding("A.1", "major", whereRow(r), `Missing value: ${missing.join(", ")}. Treated as 0 for totals only.`, `${r.sheet} row ${r.row}`));
    }
  }
  return ruleResult("A.1", "Missing values", findings, "No blank nutrient values, ingredient lists or serving sizes", {
    summaryFail: `${findings.length} component row${findings.length === 1 ? "" : "s"} with missing values`,
  });
}

// A.2 -----------------------------------------------------------------------

function ruleA2(menu: ParsedMenu, evals: ItemEvaluation[], config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  const tol = config.formTotalsTolerancePct / 100;
  const byId = new Map(evals.map((e) => [e.id, e]));
  for (const c of menu.combos) {
    const e = byId.get(c.id)!;
    const diffs: string[] = [];
    for (const k of NUTRIENT_KEYS) {
      const form = c.formTotals[k];
      if (form === null) continue;
      const mine = e.perServing[k] ?? 0;
      const base = Math.max(Math.abs(form), Math.abs(mine));
      if (base < EPS) continue;
      if (Math.abs(mine - form) / base > tol + EPS) {
        diffs.push(`${config.thresholds[k].label}: form ${round(form)} vs recomputed ${round(mine)}`);
      }
    }
    if (diffs.length) {
      findings.push(finding("A.2", "major", whereCombo(c), "The form's own totals do not match the component rows.", diffs.join("; ")));
    }
  }
  return ruleResult("A.2", "Broken form totals", findings, "Form totals match the recomputed values", {
    summaryFail: `${findings.length} combo${findings.length === 1 ? "" : "s"} where the form's totals are wrong`,
  });
}

// A.3 -----------------------------------------------------------------------

/** Same food written two ways: "Pear"/"Pears", "Carrot"/"Carrot Sticks". */
function similarNames(a: string, b: string): boolean {
  const x = normName(a).replace(/s\b/g, "");
  const y = normName(b).replace(/s\b/g, "");
  return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

const vectorKey = (v: NutrientVector) => NUTRIENT_KEYS.map((k) => v[k]).join("|");

function ruleA3(menu: ParsedMenu): RuleResult {
  const findings: Finding[] = [];
  const rows = allRows(menu).filter((r) => isComplete(r.per100));

  // Same values under different names.
  const byVector = new Map<string, FoodRow[]>();
  for (const r of rows) {
    if (NUTRIENT_KEYS.every((k) => r.per100[k] === 0)) continue;
    const key = vectorKey(r.per100);
    byVector.set(key, [...(byVector.get(key) ?? []), r]);
  }
  const reported = new Set<string>();
  for (const group of byVector.values()) {
    const names = [...new Set(group.map((r) => normName(r.name)))];
    if (names.length < 2) continue;
    for (const r of group) {
      const others = [...new Set(group.filter((o) => !similarNames(o.name, r.name)).map((o) => o.name))];
      if (others.length === 0) continue;
      // The same item appears in many combos - report it once.
      const once = `${normName(r.name)}|${others.map(normName).sort().join(",")}`;
      if (reported.has(once)) continue;
      reported.add(once);
      findings.push(
        finding("A.3", "major", whereRow(r), `Carries exactly the same per-100 g values as "${others.join('", "')}" - possible copy-paste error.`, `${r.per100.kcal} kcal, ${r.per100.fat} g fat (${r.sheet} row ${r.row})`),
      );
    }
  }

  // Same name, different values.
  const byName = new Map<string, FoodRow[]>();
  for (const r of rows) byName.set(normName(r.name), [...(byName.get(normName(r.name)) ?? []), r]);
  for (const group of byName.values()) {
    const keys = new Set(group.map((r) => vectorKey(r.per100)));
    if (keys.size < 2) continue;
    const first = group[0];
    findings.push(
      finding("A.3", "major", whereRow(first), `The same item name carries ${keys.size} different sets of nutrient values.`, [...new Map(group.map((r) => [vectorKey(r.per100), r])).values()].map((r) => `${r.per100.kcal} kcal (${r.sheet} row ${r.row})`).join(" vs ")),
    );
  }
  return ruleResult("A.3", "Duplicate or copy-pasted rows", findings, "No suspicious duplicate values");
}

// A.4 -----------------------------------------------------------------------

function ruleA4(menu: ParsedMenu, config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  const hasSugar = (ing: string) => {
    let text = ing.toLowerCase();
    for (const ig of config.keywords.sugarIgnore) text = text.split(ig).join(" ");
    return config.keywords.sugarInIngredients.find((k) => text.includes(k)) ?? null;
  };
  const seen = new Set<string>();
  for (const r of allRows(menu)) {
    const { kcal, fat, sugar } = r.per100;
    if (kcal !== null && fat !== null && kcal < 9 * fat - 5) {
      findings.push(finding("A.4", "major", whereRow(r), "Energy is lower than the fat alone would provide (kcal < 9 × fat − 5).", `${kcal} kcal, ${fat} g fat (${r.sheet} row ${r.row})`));
    }
    if (sugar === 0) {
      let hit = hasSugar(r.ingredients);
      // A juice's own concentrate is the juice itself, not an added sugar.
      if (hit === "juice concentrate" && /juice/i.test(r.name)) hit = null;
      const key = `${normName(r.name)}|${hit}`;
      if (hit && !seen.has(key)) {
        seen.add(key);
        findings.push(finding("A.4", "major", whereRow(r), `Added sugar is declared as 0 but the ingredients contain "${hit}".`, r.ingredients));
      }
    }
  }
  return ruleResult("A.4", "Internal consistency", findings, "No internal inconsistencies found");
}

// R3b -----------------------------------------------------------------------

const isVegCategory = (c: string) => /^\s*vegetarian/i.test(c);

/** No meat/fish word in any ingredient list (the label is not trusted). */
function isMeatFree(c: Combo, config: RulesConfig): boolean {
  const re = new RegExp(`\\b(?:${config.keywords.meatOrFish.join("|")})`, "i");
  return !c.components.some((x) => re.test(x.ingredients));
}

function ruleR3b(menu: ParsedMenu, config: RulesConfig, aiMeatFree: Map<string, boolean>): RuleResult {
  const findings: Finding[] = [];
  const base = menu.combos.filter((c) => c.week !== null);
  const weeks = [...new Set(base.map((c) => c.week!))].sort();
  for (const w of weeks) {
    const days = [...new Set(base.filter((c) => c.week === w).map((c) => c.day))];
    for (const d of days) {
      const dayCombos = base.filter((c) => c.week === w && c.day === d);
      if (!dayCombos.some((c) => isVegCategory(c.category) || (aiMeatFree.get(c.id) ?? isMeatFree(c, config)))) {
        findings.push(finding("R3b", "major", { sheet: `Wk ${w} Main Meals`, week: w, day: d, item: `Week ${w} ${d}` }, "No vegetarian combo on this day."));
      }
    }
  }
  // A NON-VEGETARIAN label on a combo that lists no meat or fish.
  for (const c of base) {
    if (/non[- ]?veg/i.test(c.category) && (aiMeatFree.get(c.id) ?? isMeatFree(c, config))) {
      findings.push(finding("R3b", "info", whereCombo(c), "Labelled non-vegetarian, but no meat or fish is listed in the ingredients.", c.components.map((x) => x.name).join(", ")));
    }
  }
  // Category label contradicting the ingredients.
  for (const c of base.filter((c) => isVegCategory(c.category))) {
    for (const comp of c.components) {
      const ing = comp.ingredients.toLowerCase();
      const hit = config.keywords.meatOrFish.find((k) => new RegExp(`\\b${k}`, "i").test(ing) && !/\b(chicken|beef|lamb|meat|fish|vegetable) ?(stock|flavou?r|broth)\b/.test(ing));
      if (hit) {
        findings.push(
          finding("R3b", "minor", whereCombo(c), `Labelled vegetarian but "${comp.name}" lists "${hit}" - needs checking.`, comp.ingredients),
        );
        break;
      }
    }
  }
  const missing = findings.filter((f) => /No vegetarian/.test(f.message)).length;
  return {
    id: "R3b",
    title: "At least one vegetarian option every day",
    result: missing ? "fail" : findings.some((f) => f.severity === "minor") ? "needs_verification" : "pass",
    summary: missing ? `${missing} day${missing === 1 ? "" : "s"} without a vegetarian combo` : findings.some((f) => f.severity === "minor") ? "Some vegetarian labels need checking" : "Every day has a vegetarian combo",
    findings,
  };
}

// R3c -----------------------------------------------------------------------

function ruleR3c(menu: ParsedMenu, config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  const base = menu.combos.filter((c) => c.week !== null);
  const weeks = [...new Set(base.map((c) => c.week!))].sort();
  for (const w of weeks) {
    const combos = base.filter((c) => c.week === w);
    const counts = new Map<string, Combo[]>();
    for (const c of combos) {
      const key = [...new Set(c.components.map((x) => normName(x.name)).filter(Boolean))].sort().join(" | ");
      counts.set(key, [...(counts.get(key) ?? []), c]);
    }
    for (const group of counts.values()) {
      if (group.length > config.repetition.maxPerWeek) {
        findings.push(finding("R3c", "major", whereCombo(group[0]), `This exact combo appears ${group.length} times in the week (limit ${config.repetition.maxPerWeek}).`, group.map((c) => c.day).join(", ")));
      }
    }
    const sideCount = new Map<string, number>();
    for (const c of combos)
      for (const n of new Set(c.components.filter((x) => !/one dish|protein|main/i.test(x.component)).map((x) => normName(x.name)))) sideCount.set(n, (sideCount.get(n) ?? 0) + 1);
    for (const [n, k] of sideCount) {
      const pct = (k / combos.length) * 100;
      if (pct > config.repetition.sideDishInfoPct) {
        findings.push(finding("R3c", "info", { sheet: `Wk ${w} Main Meals`, week: w, day: "", item: n }, `Side dish appears in ${k} of ${combos.length} combos (${round(pct, 0)}%).`));
      }
    }
  }
  return ruleResult("R3c", "No combo repeated more than twice a week", findings, "No combo repeated more than twice a week", { failIfAny: ["critical", "major"] });
}

// R3d -----------------------------------------------------------------------

function ruleR3d(menu: ParsedMenu, config: RulesConfig): RuleResult {
  const words = config.keywords.wholeGrain.map((k) => (k === "brown" ? "brown(?! sugar)" : k.replace(/[-\s]/g, "[- ]?")));
  const re = new RegExp(`\\b(?:${words.join("|")})\\b`, "i");
  const base = menu.combos.filter((c) => c.week !== null);
  const weeks = [...new Set(base.map((c) => c.week!))].sort();
  const findings: Finding[] = [];
  let total = 0;
  let withGrain = 0;
  for (const w of weeks) {
    const combos = base.filter((c) => c.week === w && !/fri/i.test(c.day));
    const n = combos.filter((c) => c.components.some((x) => re.test(x.ingredients))).length;
    total += combos.length;
    withGrain += n;
    findings.push(finding("R3d", n === 0 ? "minor" : "info", { sheet: `Wk ${w} Main Meals`, week: w, day: "Mon-Thu", item: `Week ${w}` }, `${n} of ${combos.length} Mon-Thu combos include a whole grain.`));
  }
  return {
    id: "R3d",
    title: "Whole grains preferably included (advisory)",
    result: withGrain === 0 && total > 0 ? "fail" : "pass",
    advisory: true,
    summary: `${withGrain} of ${total} Mon-Thu combos include a whole grain`,
    findings,
  };
}

// B.1 -----------------------------------------------------------------------

type DrinkKind = "juice" | "icePop" | "flavouredMilk" | "plainMilk" | "water" | "coffeeTea";

export function drinkKindOf(text: string): DrinkKind | null {
  const t = text.toLowerCase();
  if (/ice pop|lolly|lollies|popsicle/.test(t)) return "icePop";
  if (/juice/.test(t)) return "juice";
  if (/(flavou?red|chocolate|strawberry|banana|vanilla).*(milk)|milk ?shake/.test(t)) return "flavouredMilk";
  if (/milk|laban/.test(t)) return "plainMilk";
  if (/coffee|tea\b|cappuccino|latte/.test(t)) return "coffeeTea";
  if (/water/.test(t)) return "water";
  return null;
}

type DrinkLike = { where: { sheet: string; week: number | null; day: string; item: string }; text: string; ml: number | null; sugar: number | null; juicePct: number | null; juicePctKnown: boolean };

function ruleB1(menu: ParsedMenu, config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  const list: DrinkLike[] = menu.drinks.map((d: Drink) => ({
    where: { sheet: "Drinks", week: null, day: "", item: d.name },
    text: `${d.name} ${d.drinkType}`,
    ml: d.volumeMl,
    sugar: d.sugarPer100ml,
    juicePct: d.juicePct,
    juicePctKnown: true,
  }));
  const seen = new Set<string>();
  for (const r of allRows(menu)) {
    const n = r.name.toLowerCase();
    if (config.keywords.beverageNameIgnore.some((k) => n.includes(k))) continue;
    if (!config.keywords.beverageInMeal.some((k) => n.includes(k))) continue;
    const key = `${normName(r.name)}|${r.servingG}|${r.per100.sugar}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ where: whereRow(r), text: r.name, ml: r.servingG, sugar: r.per100.sugar, juicePct: null, juicePctKnown: false });
  }
  let needsCheck = false;
  for (const d of list) {
    const kind = drinkKindOf(d.text);
    if (!kind) {
      findings.push(finding("B.1", "major", d.where, "This drink is not one of the approved beverage types."));
      continue;
    }
    const lim = config.beverages[kind] as { maxMl: number | null; juicePct?: number; sugarMin: number; sugarMax: number };
    if (lim.maxMl !== null && d.ml !== null && d.ml > lim.maxMl) {
      findings.push(finding("B.1", "major", d.where, `Volume ${d.ml} exceeds the limit of ${lim.maxMl} for this drink type.`));
    }
    if (d.sugar === null) {
      needsCheck = true;
      findings.push(finding("B.1", "minor", d.where, "Added sugar is not declared - needs verification."));
    } else if (d.sugar < lim.sugarMin - EPS || d.sugar > lim.sugarMax + EPS) {
      findings.push(finding("B.1", "major", d.where, `Added sugar ${d.sugar} g/100 ml is outside the allowed ${lim.sugarMin === lim.sugarMax ? lim.sugarMin : `${lim.sugarMin}-${lim.sugarMax}`} g.`));
    }
    if (lim.juicePct !== undefined) {
      if (d.juicePct === null) {
        needsCheck = true;
        findings.push(finding("B.1", "minor", d.where, "Fruit juice percentage is not declared - needs verification."));
      } else if (d.juicePct < lim.juicePct) {
        findings.push(finding("B.1", "major", d.where, `Only ${d.juicePct}% fruit juice; 100% is required.`));
      }
    }
  }
  const hardFail = findings.some((f) => f.severity === "major");
  return {
    id: "B.1",
    title: "Beverages",
    result: hardFail ? "fail" : needsCheck ? "needs_verification" : "pass",
    summary: list.length === 0 ? "No beverages listed" : hardFail ? "One or more drinks break the beverage rules" : needsCheck ? "Some details need verification" : "All beverages comply",
    findings,
  };
}

// D.1 -----------------------------------------------------------------------

function ruleD1(menu: ParsedMenu, config: RulesConfig): RuleResult {
  const findings: Finding[] = [];
  for (const [label, value] of Object.entries(menu.info)) {
    if (label === "Approval status") continue; // should be blank - checked below
    if (value === null) findings.push(finding("D.1", "minor", { sheet: "Information", week: null, day: "", item: label.replace(/:$/, "") }, "This field on the Information sheet is blank."));
  }
  const drinksInMeals = allRows(menu).some((r) => {
    const n = r.name.toLowerCase();
    return !config.keywords.beverageNameIgnore.some((k) => n.includes(k)) && config.keywords.beverageInMeal.some((k) => n.includes(k));
  });
  if (menu.drinks.length === 0 && drinksInMeals) {
    findings.push(finding("D.1", "major", { sheet: "Drinks", week: null, day: "", item: "Drinks sheet" }, "The Drinks sheet is empty although drinks appear in the meals."));
  }
  const prepBlank = menu.combos.flatMap((c) => c.components).filter((r) => !r.prep).length;
  if (prepBlank) findings.push(finding("D.1", "minor", { sheet: "Main meals", week: null, day: "", item: "Preparation method" }, `${prepBlank} component row${prepBlank === 1 ? " has" : "s have"} no preparation method.`));
  for (const r of allRows(menu)) {
    if (!r.brand && r.foodType && !/catered/i.test(r.foodType)) {
      findings.push(finding("D.1", "minor", whereRow(r), `Supplied product ("${r.foodType}") has no brand name.`, `${r.sheet} row ${r.row}`));
    }
  }
  const status = menu.info["Approval status"];
  if (status) findings.push(finding("D.1", "minor", { sheet: "Information", week: null, day: "", item: "Approval status" }, `The approval status is already filled in ("${status}").`));
  return ruleResult("D.1", "Documentation", findings, "Documentation complete");
}
