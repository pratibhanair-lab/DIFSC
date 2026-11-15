// The shape of what the AI review returns (spec section 4). Everything here is
// UNTRUSTED model output: ai-findings.ts checks it before it reaches a report.

export const BANNED_CATEGORIES = [
  "deep_fried",
  "trans_fat",
  "non_halal",
  "processed_meat",
  "artificial_sweetener",
  "protein_supplement",
  "confectionery",
  "sugary_drink",
  "caffeinated",
  "energy_drink",
  "highly_processed_snack",
] as const;
export type BannedCategory = (typeof BANNED_CATEGORIES)[number];

export const ALLERGENS = ["crustaceans", "peanuts", "soybeans", "tree nuts", "sesame seeds", "fish", "egg", "milk", "gluten"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type AiBanned = {
  category: BannedCategory;
  status: "present" | "possible";
  evidence: string;
  reason: string;
  action: string;
};

export type AiPlausibility = {
  nutrient: string;
  declared: number;
  reference_low: number;
  reference_high: number;
  basis: string;
};

export type AiItem = {
  /** Echoed back from the request so the answer can be matched to the item. */
  key: string;
  item: string;
  banned: AiBanned[];
  allergens_inferred: { allergen: string; evidence: string }[];
  needs_sub_ingredients: string[];
  plausibility: AiPlausibility[];
};

export type AiCombo = {
  combo_id: string;
  has_carb: boolean;
  has_fat: boolean;
  has_protein: boolean;
  protein_sources: string[];
  protein_adequate: boolean | "borderline";
  double_starch: boolean;
  contains_meat_or_fish: boolean;
  note: string;
};

export type AiOutput = {
  model: string;
  /** True for the development preview's made-up output - never for a real audit. */
  mock?: boolean;
  items: AiItem[];
  combos: AiCombo[];
};
