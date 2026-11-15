import type { AiBanned, AiCombo, AiItem, AiOutput } from "./ai-types";
import { uniqueItems } from "./shared";
import type { ParsedMenu } from "./types";

/**
 * MOCK AI output for the development preview of the report (build step 2).
 * It is made from simple keyword rules over the real ingredient text, so the
 * report can be laid out and tested before the real Claude review exists
 * (step 3). It is NOT an assessment and must never be used for a real audit -
 * `mock: true` is carried through so the preview can say so.
 */

const ALLERGEN_KEYWORDS: [RegExp, string][] = [
  [/soy sauce|soya|soy/i, "soybeans"],
  [/flour|bread|pasta|couscous|semolina|bulgur|wheat|oats?|croissant|muffin|bun\b/i, "gluten"],
  [/\begg|mayonnaise/i, "egg"],
  [/milk|cheese|butter|cream|yogh?urt|laban/i, "milk"],
  [/\btuna|salmon|fish|anchov/i, "fish"],
  [/almond|walnut|cashew|hazelnut|pistachio/i, "tree nuts"],
  [/sesame|tahini/i, "sesame seeds"],
  [/shrimp|prawn|crab/i, "crustaceans"],
  [/peanut/i, "peanuts"],
];

const PROTEIN = /chicken|beef|lamb|turkey|fish|tuna|salmon|egg|cheese|yogh?urt|milk|chickpea|lentil|bean|tofu|quorn|paneer|hummus/i;
const STARCH = /rice|pasta|bread|potato|couscous|noodle|macaroni|semolina|bulgur|tortilla|wrap|bun\b|fries|chips|vermicelli/i;

export function mockAiOutput(menu: ParsedMenu): AiOutput {
  const items: AiItem[] = uniqueItems(menu).map(({ key, row }) => {
    const ing = row.ingredients;
    const inferred: { allergen: string; evidence: string }[] = [];
    for (const [re, allergen] of ALLERGEN_KEYWORDS) {
      const m = ing.match(re);
      if (m && !inferred.some((x) => x.allergen === allergen)) inferred.push({ allergen, evidence: m[0] });
    }
    const banned: AiBanned[] = [];
    const frying = ing.match(/frying oil|deep[- ]fr\w*/i);
    if (frying) banned.push({ category: "deep_fried", status: "possible", evidence: frying[0], reason: "The ingredient list mentions frying oil, so the item may be deep-fried.", action: "Confirm the cooking method; bake or grill instead of deep-frying." });
    const fat = ing.match(/vegetable fat|margarine|shortening/i);
    if (fat) banned.push({ category: "trans_fat", status: "possible", evidence: fat[0], reason: "An unspecified fat may contain trans fats.", action: "Provide the fat's specification showing no partially hydrogenated oil." });
    const meat = ing.match(/sausage|salami|pepperoni|hot ?dog|nugget|bacon/i);
    if (meat) banned.push({ category: "processed_meat", status: "present", evidence: meat[0], reason: "Processed meat is not permitted.", action: "Replace with fresh, unprocessed meat." });
    return { key, item: row.name, banned, allergens_inferred: inferred, needs_sub_ingredients: /\b(bun|burger bun|potato bun)\b/i.test(ing) ? ["bun"] : [], plausibility: [] };
  });

  // One clearly-labelled sample plausibility entry so the report layout can be seen.
  const sample = items.find((i) => /white bread cheese/i.test(i.item));
  if (sample) sample.plausibility.push({ nutrient: "energy (kcal per 100 g)", declared: 194, reference_low: 280, reference_high: 300, basis: "SAMPLE ONLY: white bread + cheddar + mayo" });

  const combos: AiCombo[] = menu.combos.map((c) => {
    const main = c.components.find((x) => /one dish|protein|main/i.test(x.component)) ?? c.components[0];
    const proteinHere = c.components.filter((x) => PROTEIN.test(x.ingredients) && !/milk|yogh?urt/i.test(x.name));
    const meal = c.components.some((x) => /chicken|beef|lamb|turkey|fish|tuna|salmon/i.test(x.ingredients));
    const mainProtein = main ? PROTEIN.test(main.ingredients) : false;
    return {
      combo_id: c.id,
      has_carb: c.components.some((x) => STARCH.test(x.ingredients) || /grains|starch/i.test(x.component)),
      has_fat: true,
      has_protein: proteinHere.length > 0,
      protein_sources: proteinHere.map((x) => x.name),
      protein_adequate: mainProtein ? true : proteinHere.length ? "borderline" : false,
      double_starch: c.components.filter((x) => STARCH.test(x.name)).length > 1,
      contains_meat_or_fish: meal,
      note: "Mock review - not a real assessment.",
    };
  });

  return { model: "mock (development preview)", mock: true, items, combos };
}
