import type { AiOutput } from "./ai-types";
import { defaultConfig, type RulesConfig } from "./rules";
import type { AuditResult, Finding, ItemEvaluation, ParsedMenu, RuleOutcome, RuleResult, Severity, WeeklyMix } from "./types";

// ---------------------------------------------------------------------------
// The report as plain, serialisable data. The page (AuditReport.tsx) only
// draws this - it makes no decisions - so the same data can be stored, sent
// over the network, or rendered again later.
// ---------------------------------------------------------------------------

export const FORM_REF = "DM-FSD-FO60";

export type ScoreResult = RuleOutcome | "not_assessed";
export type Verdict = "compliant" | "not_compliant" | "incomplete";

export type ReportSection = { id: string; title: string; result: ScoreResult; advisory?: boolean; summary: string; findings: Finding[] };

export type ReportData = {
  meta: {
    reportId: string;
    generatedAt: string; // ISO
    formRef: string;
    school: string;
    caterer: string;
    menuCycle: string;
    kindOfMeals: string;
    aiModel: string | null;
    aiMock: boolean;
    aiAvailable: boolean;
  };
  verdict: Verdict;
  verdictLabel: string;
  scorecard: { id: string; label: string; result: ScoreResult; advisory?: boolean; reason: string }[];
  weekly: WeeklyMix[];
  combos: ItemEvaluation[];
  snacks: ItemEvaluation[];
  fibreCounted: boolean;
  weeklyFindings: Finding[];
  sections: ReportSection[];
  accuracy: { formTotals: Finding[]; copyPaste: Finding[]; missing: Finding[]; internal: Finding[]; plausibility: Finding[]; plausibilityAssessed: boolean };
  corrective: { rule: string; action: string; affected: string[] }[];
  aiDropped: string[];
  appendix: {
    thresholds: { label: string; higherIsBetter: boolean; perServing: { green: number; amber: number }; per100: { green: number; amber: number } }[];
    weeklyLimits: RulesConfig["weeklyLimits"];
    formTotalsTolerancePct: number;
    plausibilityTolerancePct: number;
  };
};

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };

export const sortFindings = (fs: Finding[]): Finding[] =>
  [...fs].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.week ?? 99) - (b.week ?? 99) || a.day.localeCompare(b.day) || a.item.localeCompare(b.item));

/** What the caterer should do, used when a finding has no more specific action. */
const DEFAULT_ACTIONS: Record<string, string> = {
  R1: "Confirm the ingredient and cooking method, and replace the item if it is a banned type.",
  R2: "Correct the allergen declaration so it matches the ingredient list.",
  R3a: "Add a suitable protein source, or rebalance the combo, so it has carbohydrate, fat and protein.",
  R3b: "Add a vegetarian combo for this day.",
  R3c: "Vary the menu so no combo repeats more than twice in a week.",
  R3d: "Include whole-grain options in the menu.",
  "R4.2": "Reformulate or replace items so each week meets the GREEN / AMBER / RED limits.",
  "A.1": "Fill in the missing nutrient values, ingredient list or serving size.",
  "A.2": "Correct the form's totals so they match the component rows.",
  "A.3": "Check this item's values and replace any copied values with the correct ones.",
  "A.4": "Correct the declared energy or added sugar so it agrees with the ingredients.",
  "A.5": "Verify the declared values against recipe analysis or laboratory data.",
  "B.1": "Replace or correct the beverage so it meets the beverage criteria.",
  "D.1": "Complete the missing documentation on the form.",
};

const withActions = (fs: Finding[]): Finding[] => fs.map((f) => ({ ...f, action: f.action ?? DEFAULT_ACTIONS[f.rule] ?? "" }));

const ruleOf = (audit: AuditResult, id: string): RuleResult => audit.rules.find((r) => r.id === id)!;
const asScore = (r: RuleResult): ScoreResult => (r.notAssessed ? "not_assessed" : r.result);

function weeklyScore(weekly: WeeklyMix[], kind: "combo" | "snack", evals: ItemEvaluation[], fibre: boolean): { result: ScoreResult; reason: string } {
  const rows = weekly.filter((w) => w.kind === kind);
  const items = evals.filter((e) => e.kind === kind && e.week !== null);
  const red = items.filter((e) => (fibre ? e.classification.colour : e.classification.colourWithoutFibre) === "RED").length;
  const failed = rows.filter((w) => w.verdict === "fail").length;
  const empty = rows.filter((w) => w.verdict === "incomplete").length;
  const withItems = rows.length - empty;
  const label = kind === "combo" ? "combos" : "snacks";
  const parts = [`${red} of ${items.length} ${label} RED`, `${failed} of ${withItems} weeks outside the limits`];
  if (empty) parts.push(`${empty} week${empty === 1 ? " has" : "s have"} no items`);
  return { result: failed ? "fail" : empty ? "incomplete" : "pass", reason: parts.join("; ") };
}

export function buildReport(
  menu: ParsedMenu,
  audit: AuditResult,
  ai: AiOutput | null,
  opts: { config?: RulesConfig; now?: Date; reportId?: string } = {},
): ReportData {
  const config = opts.config ?? defaultConfig;
  const now = opts.now ?? new Date();
  const fibre = !config.exclude_fibre_in_classification;
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const reportId = opts.reportId ?? `MSA-${stamp}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  const info = (k: string) => menu.info[k] ?? null;

  const main = weeklyScore(audit.weekly, "combo", audit.evaluations, fibre);
  const snacks = weeklyScore(audit.weekly, "snack", audit.evaluations, fibre);

  const accuracyIds = ["A.1", "A.2", "A.3", "A.4", "A.5"];
  const accuracyRules = accuracyIds.map((id) => ruleOf(audit, id));
  const accuracyFail = accuracyRules.some((r) => r.result === "fail");
  const accuracyUnassessed = ruleOf(audit, "A.5").notAssessed === true;
  const count = (id: string) => ruleOf(audit, id).findings.length;
  const accuracyReason = `${count("A.2")} wrong form totals, ${count("A.1")} rows with missing values, ${count("A.3")} copy-paste suspects, ${count("A.4")} internal inconsistencies${accuracyUnassessed ? "; plausibility not assessed (AI unavailable)" : `, ${count("A.5")} implausible values`}`;

  const pick = (id: string, label: string) => {
    const r = ruleOf(audit, id);
    return { id, label, result: asScore(r), advisory: r.advisory, reason: r.summary };
  };
  const scorecard: ReportData["scorecard"] = [
    pick("R1", "R1 · Banned ingredients and processes"),
    pick("R2", "R2 · Allergen declaration"),
    pick("R3a", "R3a · Food groups in each combo"),
    pick("R3b", "R3b · Vegetarian option every day"),
    pick("R3c", "R3c · No combo repeated more than twice a week"),
    pick("R3d", "R3d · Whole grains (advisory)"),
    { id: "R4-main", label: "R4 · Nutrient mix, main meals", ...main },
    { id: "R4-snacks", label: "R4 · Nutrient mix, snacks", ...snacks },
    { id: "ACC", label: "Accuracy of the form", result: accuracyFail ? "fail" : accuracyUnassessed ? "not_assessed" : "pass", reason: accuracyReason },
    pick("B.1", "Beverages"),
    pick("D.1", "Documentation"),
  ];

  // Overall verdict: any failed (non-advisory) check fails the menu; otherwise
  // anything unchecked or unverified makes it incomplete.
  const counted = scorecard.filter((s) => !s.advisory);
  const verdict: Verdict = counted.some((s) => s.result === "fail") ? "not_compliant" : counted.some((s) => s.result !== "pass") ? "incomplete" : "compliant";
  const verdictLabel = verdict === "compliant" ? "Compliant" : verdict === "not_compliant" ? "Not compliant – return for revision" : "Incomplete";

  const sectionOf = (id: string): ReportSection => {
    const r = ruleOf(audit, id);
    return { id: r.id, title: r.title, result: asScore(r), advisory: r.advisory, summary: r.summary, findings: sortFindings(withActions(r.findings)) };
  };
  const sections = ["R1", "R2", "R3a", "R3b", "R3c", "R3d", "B.1", "D.1"].map(sectionOf);

  const fixed = (id: string) => sortFindings(withActions(ruleOf(audit, id).findings));

  // Corrective actions: one numbered item per rule that has critical/major findings.
  const corrective: ReportData["corrective"] = [];
  for (const id of ["R1", "R2", "R3a", "R3b", "R3c", "R4.2", "A.1", "A.2", "A.3", "A.4", "A.5", "B.1", "D.1"]) {
    const serious = withActions(ruleOf(audit, id).findings).filter((f) => f.severity === "critical" || f.severity === "major");
    if (!serious.length) continue;
    const tally = new Map<string, number>();
    for (const f of serious) tally.set(f.action ?? "", (tally.get(f.action ?? "") ?? 0) + 1);
    const action = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const affected = [...new Set(serious.map((f) => [f.week ? `Wk ${f.week}` : "", f.day, f.item].filter(Boolean).join(" ")))];
    corrective.push({ rule: id, action, affected });
  }

  return {
    meta: {
      reportId,
      generatedAt: now.toISOString(),
      formRef: FORM_REF,
      school: info("Name of the Educational Institution:") ?? "Not stated on the form",
      caterer: info("Name of the food supplier/company:") ?? "Not stated on the form",
      menuCycle: info("Menu Cycle Number and/or Name") ?? "Not stated",
      kindOfMeals: info("Kind of Main Meals:") ?? "Not stated",
      aiModel: ai?.model ?? null,
      aiMock: ai?.mock === true,
      aiAvailable: ai !== null,
    },
    verdict,
    verdictLabel,
    scorecard,
    weekly: audit.weekly,
    combos: audit.evaluations.filter((e) => e.kind === "combo"),
    snacks: audit.evaluations.filter((e) => e.kind === "snack"),
    fibreCounted: fibre,
    weeklyFindings: fixed("R4.2"),
    sections,
    accuracy: {
      formTotals: fixed("A.2"),
      copyPaste: fixed("A.3"),
      missing: fixed("A.1"),
      internal: fixed("A.4"),
      plausibility: fixed("A.5"),
      plausibilityAssessed: !accuracyUnassessed,
    },
    corrective,
    aiDropped: audit.aiDropped,
    appendix: {
      thresholds: Object.values(config.thresholds).map((t) => ({
        label: t.label,
        higherIsBetter: "higherIsBetter" in t && t.higherIsBetter === true,
        perServing: t.perServing,
        per100: t.per100,
      })),
      weeklyLimits: config.weeklyLimits,
      formTotalsTolerancePct: config.formTotalsTolerancePct,
      plausibilityTolerancePct: config.plausibilityTolerancePct,
    },
  };
}
