import { describe, expect, it } from "vitest";
import { COMBO_SYSTEM_PROMPT, ITEM_SYSTEM_PROMPT, reviewMenu, type ModelCall } from "../lib/menu-audit/ai-review";
import { buildAiRules } from "../lib/menu-audit/ai-findings";
import type { Combo, FoodRow, ParsedMenu } from "../lib/menu-audit/types";

const row = (name: string, ingredients: string, over: Partial<FoodRow> = {}): FoodRow => ({
  sheet: "Wk 1 Main Meals", row: 16, week: 1, term: null, name, brand: "", allergensRaw: "", allergens: [], category: "", component: "One Dish", prep: "", day: "Mon", meal: "Lunch",
  ingredients, foodType: "Catered", servingG: 100, per100: { kcal: 100, fat: 5, satFat: 1, sodium: 100, sugar: 1, fibre: 2 }, remarks: "", ...over,
});
const combo = (id: string, parts: FoodRow[]): Combo => ({
  id, sheet: "Wk 1 Main Meals", week: 1, term: null, day: "Mon", meal: "Lunch", category: "NON-VEGETARIAN MENU", name: id, components: parts, totalRow: 1,
  formTotals: { kcal: null, fat: null, satFat: null, sodium: null, sugar: null, fibre: null }, formTotalG: 100, formEvaluation: "",
});
const menuWith = (nItems: number, nCombos = 0): ParsedMenu => {
  const snacks = Array.from({ length: nItems }, (_, i) => row(`Item ${i + 1}`, `ingredient list ${i + 1}, soy sauce`, { sheet: "Snacks", row: 16 + i }));
  const combos = Array.from({ length: nCombos }, (_, i) => combo(`combo-${i}`, [row(`Main ${i}`, "chicken, rice")]));
  return { info: {}, combos, snacks, drinks: [] };
};

/** A fake model: answers every id it is sent, like a well-behaved Claude. */
function fakeModel(log: { system: string; ids: string[] }[] = [], hooks: { stop?: (n: number) => string | null; drop?: boolean } = {}): ModelCall {
  let n = 0;
  return async ({ system, user }) => {
    n++;
    const payload = JSON.parse(user.slice(user.indexOf("\n\n") + 2)) as { id: string; ingredients?: string }[];
    log.push({ system, ids: payload.map((p) => p.id) });
    const stop = hooks.stop?.(n) ?? "end_turn";
    if (stop !== "end_turn") return { parsed: null, stopReason: stop, inputTokens: 10, outputTokens: 5 };
    const isItems = system === ITEM_SYSTEM_PROMPT;
    const list = hooks.drop ? payload.slice(1) : payload;
    const parsed = isItems
      ? { items: list.map((p) => ({ id: p.id, banned: [], allergens_inferred: [{ allergen: "soybeans", evidence: "soy sauce" }], needs_sub_ingredients: [], plausibility: [] })) }
      : { combos: list.map((p) => ({ id: p.id, has_carb: true, has_fat: true, has_protein: true, protein_sources: ["Main"], protein_adequate: "yes", double_starch: false, contains_meat_or_fish: true, note: "ok" })) };
    return { parsed, stopReason: "end_turn", inputTokens: 1000, outputTokens: 200 };
  };
}

describe("reviewMenu (stand-in model, no network)", () => {
  it("sends unique items in batches of 25 and maps answers back", async () => {
    const log: { system: string; ids: string[] }[] = [];
    const menu = menuWith(60, 3);
    const r = await reviewMenu(menu, { call: fakeModel(log) });
    expect(r.error).toBeNull();
    expect(log.filter((l) => l.system === ITEM_SYSTEM_PROMPT).map((l) => l.ids.length).sort()).toEqual([13, 25, 25]); // 60 snacks + 3 combo mains = 63 unique items
    expect(log.filter((l) => l.system === COMBO_SYSTEM_PROMPT)).toHaveLength(1);
    expect(r.ai!.items).toHaveLength(63);
    expect(r.ai!.combos.map((c) => c.combo_id)).toEqual(["combo-0", "combo-1", "combo-2"]);
    expect(r.ai!.items.map((i) => i.key)).toContain("item 1|ingredient list 1 soy sauce");
    expect(r.usage.calls).toBe(4);
  });

  it("sends an item that appears many times only once", async () => {
    const log: { system: string; ids: string[] }[] = [];
    const same = Array.from({ length: 5 }, () => row("Garden Salad", "cucumber, tomato"));
    const menu: ParsedMenu = { info: {}, combos: [], snacks: same, drinks: [] };
    const r = await reviewMenu(menu, { call: fakeModel(log) });
    expect(log.flatMap((l) => l.ids)).toEqual(["i1"]);
    expect(r.ai!.items).toHaveLength(1);
  });

  it("is 'unavailable' (null) when a batch fails twice", async () => {
    const r = await reviewMenu(menuWith(5), { call: async () => { throw new Error("network down"); } });
    expect(r.ai).toBeNull();
    expect(r.error).toBeTruthy();
    expect(r.error).not.toContain("network down"); // raw errors are never shown
  });

  it("does not retry a refusal", async () => {
    const log: { system: string; ids: string[] }[] = [];
    const r = await reviewMenu(menuWith(5), { call: fakeModel(log, { stop: () => "refusal" }) });
    expect(r.ai).toBeNull();
    expect(log).toHaveLength(1);
  });

  it("splits a batch whose answer was cut off", async () => {
    const log: { system: string; ids: string[] }[] = [];
    // First call (25 items) is truncated; the two halves then succeed.
    const r = await reviewMenu(menuWith(25), { call: fakeModel(log, { stop: (n) => (n === 1 ? "max_tokens" : null) }) });
    expect(r.error).toBeNull();
    expect(r.ai!.items).toHaveLength(25);
    expect(log.map((l) => l.ids.length)).toEqual([25, 13, 12]);
  });

  it("retries once when the model skips an item, then fails if it keeps skipping", async () => {
    const r = await reviewMenu(menuWith(3), { call: fakeModel([], { drop: true }) });
    expect(r.ai).toBeNull();
    expect(r.usage.retries).toBe(1);
  });

  it("reports 'not configured' when there is no API key and no fake", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const r = await reviewMenu(menuWith(2));
    if (saved) process.env.ANTHROPIC_API_KEY = saved;
    expect(r.ai).toBeNull();
    expect(r.error).toMatch(/not configured/);
  });

  it("estimates the cost from the token counts", async () => {
    const r = await reviewMenu(menuWith(2), { call: fakeModel(), model: "claude-sonnet-5-5" });
    expect(r.usage.estimatedCostUsd).toBeCloseTo((1000 * 2 + 200 * 10) / 1_000_000, 6);
  });

  it("feeds the guardrails: a made-up quote is dropped, a real one becomes a finding", async () => {
    const menu = menuWith(1);
    const r = await reviewMenu(menu, {
      call: async ({ user }) => {
        const id = (JSON.parse(user.slice(user.indexOf("\n\n") + 2)) as { id: string }[])[0].id;
        return {
          parsed: { items: [{ id, banned: [{ category: "non_halal", status: "present", evidence: "pork", reason: "x", action: "y" }], allergens_inferred: [{ allergen: "soybeans", evidence: "soy sauce" }], needs_sub_ingredients: [], plausibility: [] }] },
          stopReason: "end_turn", inputTokens: 1, outputTokens: 1,
        };
      },
    });
    const out = buildAiRules(menu, r.ai, 20);
    expect(out.dropped.join(" ")).toContain("pork");
    expect(out.rules.find((x) => x.id === "R1")!.findings).toHaveLength(0);
    expect(out.rules.find((x) => x.id === "R2")!.result).toBe("fail"); // soybeans undeclared
  });
});
