// Shared types for the menu audit tool. Deliberately independent of the rest
// of the app (no imports from other lib/ folders).

export const NUTRIENT_KEYS = ["kcal", "fat", "satFat", "sodium", "sugar", "fibre"] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** A blank cell is `null` (a missing value), never 0. */
export type NutrientVector = Record<NutrientKey, number | null>;

export type Term = 1 | 2 | 3;

/** One row of a main-meal or snack sheet (a meal component or a snack item). */
export type FoodRow = {
  sheet: string;
  row: number;
  /** 1-4 for the base menu; null for mid-year "NEW / ADDITIONAL / MODIFIED" rows. */
  week: number | null;
  term: Term | null;
  name: string;
  brand: string;
  allergensRaw: string;
  allergens: string[];
  category: string;
  component: string;
  prep: string;
  day: string;
  meal: string;
  ingredients: string;
  foodType: string;
  servingG: number | null;
  per100: NutrientVector;
  remarks: string;
};

/** A main-meal combo: the component rows plus the form's own totals row. */
export type Combo = {
  id: string;
  sheet: string;
  week: number | null;
  term: Term | null;
  day: string;
  meal: string;
  category: string;
  name: string;
  components: FoodRow[];
  totalRow: number;
  /** The form's own per-serving totals (W-AB). Reported for comparison only. */
  formTotals: NutrientVector;
  formTotalG: number | null;
  formEvaluation: string;
};

export type Drink = {
  row: number;
  name: string;
  brand: string;
  allergensRaw: string;
  ingredients: string;
  drinkType: string;
  juicePct: number | null;
  volumeMl: number | null;
  kcalPer100ml: number | null;
  sugarPer100ml: number | null;
};

export type ParsedMenu = {
  info: Record<string, string | null>;
  combos: Combo[];
  snacks: FoodRow[];
  drinks: Drink[];
};

export type Severity = "critical" | "major" | "minor" | "info";
export type RuleOutcome = "pass" | "fail" | "needs_verification" | "incomplete";

export type Finding = {
  rule: string;
  severity: Severity;
  sheet: string;
  week: number | null;
  day: string;
  item: string;
  message: string;
  evidence: string;
  /** True when the finding came from the AI review rather than the rule engine. */
  ai?: boolean;
  /** What the caterer should do about it (filled in by the report builder). */
  action?: string;
  /** A possible (not confirmed) problem that a person must verify. */
  needsVerification?: boolean;
};

export type RuleResult = {
  id: string;
  title: string;
  result: RuleOutcome;
  /** True for "preferably" rules, whose result is advice rather than a pass/fail. */
  advisory?: boolean;
  summary: string;
  findings: Finding[];
  /** True when the AI review was unavailable, so an AI-based rule could not be checked. */
  notAssessed?: boolean;
};

export type Colour = "GREEN" | "AMBER" | "RED";

export type Classification = {
  colour: Colour;
  /** Colour if fibre were ignored. */
  colourWithoutFibre: Colour;
  redNutrients: string[];
  amberNutrients: string[];
};

export type ItemEvaluation = {
  id: string;
  kind: "combo" | "snack";
  name: string;
  week: number | null;
  day: string;
  perServing: NutrientVector;
  per100: NutrientVector;
  totalG: number;
  classification: Classification;
};

export type WeeklyMix = {
  kind: "combo" | "snack";
  week: number;
  count: number;
  green: number;
  amber: number;
  red: number;
  greenPct: number;
  amberPct: number;
  redPct: number;
  /** Same figures when fibre is ignored in the classification. */
  withoutFibre: { greenPct: number; amberPct: number; redPct: number };
  verdict: "pass" | "fail" | "incomplete";
};

export type AuditResult = {
  rules: RuleResult[];
  evaluations: ItemEvaluation[];
  weekly: WeeklyMix[];
  /** Whether an AI review was available for this audit. */
  aiAssessed: boolean;
  /** AI findings thrown away because their quoted evidence was not in the ingredient text. */
  aiDropped: string[];
};
