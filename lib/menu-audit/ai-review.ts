import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ALLERGENS, BANNED_CATEGORIES, type AiCombo, type AiItem, type AiOutput } from "./ai-types";
import { uniqueItems } from "./shared";
import type { ParsedMenu } from "./types";

/**
 * The real AI review (build step 3). Server-side only: it reads
 * ANTHROPIC_API_KEY and must never be imported from a client component.
 *
 * Notes on how the model is called:
 *  - Structured outputs (`output_config.format`) guarantee the reply is valid
 *    JSON in the shape below. The spec asked for temperature 0, but current
 *    Claude models reject any sampling setting (400), so steadiness comes from
 *    the fixed schema, the "quote the exact words" rule, and the code-side
 *    checks in ai-findings.ts instead.
 *  - Items are de-duplicated, sent in batches, and run a few at a time.
 *  - Any failure makes the whole AI review "unavailable" (null) so the report
 *    says "Not assessed" rather than silently passing items it never checked.
 */

export const DEFAULT_MODEL = "claude-sonnet-5-5";
const ITEM_BATCH = 25;
const COMBO_BATCH = 14;
const CONCURRENCY = 4;

// Approximate public prices in US$ per million tokens, for the cost estimate only.
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-opus-5-5": { in: 4, out: 20 },
};

// ---------------------------------------------------------------------------
// Prompts (the rule-book wording for R1, R2, R3a and A.5)
// ---------------------------------------------------------------------------

export const ITEM_SYSTEM_PROMPT = `You are a food-safety reviewer checking a school-menu workbook (Dubai Municipality form DM-FSD-FO60). You are given menu items one at a time with their ingredient text. Review ONLY what the ingredient text supports. Only flag what the ingredient text supports; quote the exact words. Never invent evidence.

For each item return:

1. banned (rule R1). The banned ingredients and processes are: highly processed snacks; foods with trans fats; non-halal products; foods and drinks with added protein supplements; foods with artificial sweeteners; deep-fried food; sugar and chocolate confectionery; sugary drinks; caffeinated drinks; energy drinks; processed meats. Return an entry for an item that may breach one of these. "category" is one of the allowed values. "status" is "present" only when the ingredient text clearly names the banned item (for example "pork", "energy drink"); otherwise "possible". "evidence" must be the EXACT words copied from that item's ingredient text. Give a short "reason" and a practical "action" for the caterer.

2. allergens_inferred (rule R2). The nine major allergens are: ${ALLERGENS.join(", ")}. List each of these that the ingredient text implies (for example soy sauce implies soybeans; wheat flour, bread, pasta and couscous imply gluten; mayonnaise implies egg; cheese, butter, cream and yoghurt imply milk). Give the EXACT ingredient words as evidence. Do not look at the declared allergen list - the comparison is done separately. If the ingredients contain a composite whose contents are unknown and could hide an allergen (for example "potato bun", "cheese analogue", "seasoning", "sauce"), list it in needs_sub_ingredients.

3. plausibility (rule A.5). Using your general food-composition knowledge and the ingredients, compare the DECLARED per-100 g values with what such a food typically contains. Return an entry ONLY for a nutrient (kcal, fat, sat_fat, sodium, added_sugar, fibre) where you believe the declared value is more than about 20% away from a typical value. Give "declared", an approximate "reference_low" and "reference_high" (per 100 g, in the same unit as the declared value) and a short "basis" naming what you assumed. These are rough estimates.

Return an empty array for anything that does not apply. Return exactly one result per item, using the item's "id".`;

export const COMBO_SYSTEM_PROMPT = `You are a nutrition reviewer checking school main-meal combos (Dubai Municipality form DM-FSD-FO60). Each combo is a list of components with their ingredient text. The rule book says: the three major food groups (carbohydrates, fats and proteins) should be represented in each meal combo.

For each combo return:
- has_carb, has_fat, has_protein: whether each food group is represented, judged from the ingredients.
- protein_sources: the names of the components that supply meaningful protein (meat, fish, egg, legumes, tofu, cheese, a substantial amount of yoghurt or milk).
- protein_adequate: "yes" if the combo has a substantial protein source for a school meal; "no" if protein is clearly inadequate (for example only a small amount of cheese or milk, or none); "borderline" if it is genuinely unclear.
- double_starch: true if the combo contains two starch components (for example pasta with potatoes or rice with chips).
- contains_meat_or_fish: true if any ingredient is meat, poultry or fish.
- note: one short sentence explaining your judgement.

Base everything on the ingredient text given. Return exactly one result per combo, using the combo's "id".`;

// ---------------------------------------------------------------------------
// Output schemas (what the model must return)
// ---------------------------------------------------------------------------

const ItemsResponse = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      banned: z.array(
        z.object({
          category: z.enum(BANNED_CATEGORIES),
          status: z.enum(["present", "possible"]),
          evidence: z.string(),
          reason: z.string(),
          action: z.string(),
        }),
      ),
      allergens_inferred: z.array(z.object({ allergen: z.string(), evidence: z.string() })),
      needs_sub_ingredients: z.array(z.string()),
      plausibility: z.array(
        z.object({ nutrient: z.string(), declared: z.number(), reference_low: z.number(), reference_high: z.number(), basis: z.string() }),
      ),
    }),
  ),
});

const CombosResponse = z.object({
  combos: z.array(
    z.object({
      id: z.string(),
      has_carb: z.boolean(),
      has_fat: z.boolean(),
      has_protein: z.boolean(),
      protein_sources: z.array(z.string()),
      protein_adequate: z.enum(["yes", "no", "borderline"]),
      double_starch: z.boolean(),
      contains_meat_or_fish: z.boolean(),
      note: z.string(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Calling the model (kept behind one small function so tests can fake it)
// ---------------------------------------------------------------------------

export type ModelCall = (args: { system: string; user: string; schema: z.ZodType; effort: Effort }) => Promise<{
  parsed: unknown | null;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}>;

export type Effort = "low" | "medium" | "high";

export function anthropicCaller(client: Anthropic, model: string): ModelCall {
  return async ({ system, user, schema, effort }) => {
    // Server-side refusal fallback is switched on by default (Anthropic's
    // recommended safety net); `"default"` lets the API choose the substitute.
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort, format: zodOutputFormat(schema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    return {
      parsed: response.parsed_output ?? null,
      stopReason: response.stop_reason ?? null,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  };
}

// ---------------------------------------------------------------------------
// The review
// ---------------------------------------------------------------------------

export type ReviewUsage = { calls: number; retries: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number | null };
export type ReviewResult = { ai: AiOutput | null; error: string | null; usage: ReviewUsage };

export type ReviewOptions = {
  model?: string;
  call?: ModelCall; // tests pass a fake
  effortItems?: Effort;
  effortCombos?: Effort;
};

class BatchError extends Error {
  constructor(message: string, readonly truncated = false) {
    super(message);
  }
}

const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function pool<T>(tasks: (() => Promise<T>)[], size: number): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      out[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker));
  return out;
}

export async function reviewMenu(menu: ParsedMenu, opts: ReviewOptions = {}): Promise<ReviewResult> {
  const model = opts.model ?? process.env.MENU_AUDIT_MODEL ?? DEFAULT_MODEL;
  const usage: ReviewUsage = { calls: 0, retries: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: null };
  const fail = (error: string): ReviewResult => ({ ai: null, error, usage });

  let call = opts.call;
  if (!call) {
    if (!process.env.ANTHROPIC_API_KEY) return fail("The AI review is not configured (no ANTHROPIC_API_KEY).");
    call = anthropicCaller(new Anthropic({ maxRetries: 2, timeout: 240_000 }), model);
  }
  const modelCall = call;
  const effortItems = opts.effortItems ?? "medium";
  const effortCombos = opts.effortCombos ?? "high";

  /** One batch: call, validate, retry once; on truncation split in half. */
  async function runBatch<R extends { id: string }>(
    ids: string[],
    system: string,
    makeUser: (ids: string[]) => string,
    schema: z.ZodType,
    pick: (parsed: unknown) => R[],
    effort: Effort,
    attempt = 0,
  ): Promise<R[]> {
    try {
      usage.calls++;
      const r = await modelCall({ system, user: makeUser(ids), schema, effort });
      usage.inputTokens += r.inputTokens;
      usage.outputTokens += r.outputTokens;
      if (r.stopReason === "refusal") throw new BatchError("The AI declined to review part of the menu.");
      if (r.stopReason === "max_tokens") throw new BatchError("The AI's answer was cut off.", true);
      if (r.parsed === null) throw new BatchError("The AI's answer could not be read.");
      const results = pick(r.parsed);
      const byId = new Map(results.map((x) => [x.id, x]));
      const missing = ids.filter((id) => !byId.has(id));
      if (missing.length) throw new BatchError(`The AI skipped ${missing.length} item(s).`);
      return ids.map((id) => byId.get(id)!);
    } catch (e) {
      const truncated = e instanceof BatchError && e.truncated;
      if (truncated && ids.length > 1) {
        usage.retries++;
        const half = Math.ceil(ids.length / 2);
        const [a, b] = await Promise.all([
          runBatch(ids.slice(0, half), system, makeUser, schema, pick, effort, attempt),
          runBatch(ids.slice(half), system, makeUser, schema, pick, effort, attempt),
        ]);
        return [...a, ...b];
      }
      if (attempt < 1 && !(e instanceof BatchError && /declined/.test(e.message))) {
        usage.retries++;
        return runBatch(ids, system, makeUser, schema, pick, effort, attempt + 1);
      }
      throw e;
    }
  }

  try {
    // ---- items (de-duplicated) ----
    const unique = uniqueItems(menu);
    const itemById = new Map(unique.map((u, i) => [`i${i + 1}`, u]));
    const itemPayload = (id: string) => {
      const { row } = itemById.get(id)!;
      return {
        id,
        name: row.name,
        brand: row.brand || null,
        component: row.component || null,
        declared_allergens: row.allergensRaw || null,
        ingredients: row.ingredients || null,
        preparation: row.prep || null,
        serving_g: row.servingG,
        declared_per_100g: { kcal: row.per100.kcal, fat: row.per100.fat, sat_fat: row.per100.satFat, sodium: row.per100.sodium, added_sugar: row.per100.sugar, fibre: row.per100.fibre },
      };
    };
    const itemTasks = chunk([...itemById.keys()], ITEM_BATCH).map(
      (ids) => () =>
        runBatch(
          ids,
          ITEM_SYSTEM_PROMPT,
          (b) => `Review these menu items. Return one result per item.\n\n${JSON.stringify(b.map(itemPayload))}`,
          ItemsResponse,
          (p) => (p as z.infer<typeof ItemsResponse>).items,
          effortItems,
        ),
    );

    // ---- combos ----
    const comboById = new Map(menu.combos.map((c, i) => [`c${i + 1}`, c]));
    const comboPayload = (id: string) => {
      const c = comboById.get(id)!;
      return { id, components: c.components.map((x) => ({ name: x.name, type: x.component || null, ingredients: x.ingredients || null, grams: x.servingG })) };
    };
    const comboTasks = chunk([...comboById.keys()], COMBO_BATCH).map(
      (ids) => () =>
        runBatch(
          ids,
          COMBO_SYSTEM_PROMPT,
          (b) => `Review these meal combos. Return one result per combo.\n\n${JSON.stringify(b.map(comboPayload))}`,
          CombosResponse,
          (p) => (p as z.infer<typeof CombosResponse>).combos,
          effortCombos,
        ),
    );

    const [itemBatches, comboBatches] = await Promise.all([pool(itemTasks, CONCURRENCY), pool(comboTasks, CONCURRENCY)]);

    const items: AiItem[] = itemBatches.flat().map((r) => ({
      key: itemById.get(r.id)!.key,
      item: itemById.get(r.id)!.row.name,
      banned: r.banned,
      allergens_inferred: r.allergens_inferred,
      needs_sub_ingredients: r.needs_sub_ingredients,
      plausibility: r.plausibility,
    }));
    const combos: AiCombo[] = comboBatches.flat().map((r) => ({
      combo_id: comboById.get(r.id)!.id,
      has_carb: r.has_carb,
      has_fat: r.has_fat,
      has_protein: r.has_protein,
      protein_sources: r.protein_sources,
      protein_adequate: r.protein_adequate === "yes" ? true : r.protein_adequate === "no" ? false : "borderline",
      double_starch: r.double_starch,
      contains_meat_or_fish: r.contains_meat_or_fish,
      note: r.note,
    }));

    const price = PRICES[model];
    usage.estimatedCostUsd = price ? (usage.inputTokens * price.in + usage.outputTokens * price.out) / 1_000_000 : null;
    return { ai: { model, items, combos }, error: null, usage };
  } catch (e) {
    // Never leak the raw error (it may name internals); the report just says "unavailable".
    const message = e instanceof BatchError ? e.message : e instanceof Anthropic.APIError ? `The AI service returned an error (${e.status ?? "network"}).` : "The AI review failed.";
    return fail(message);
  }
}
