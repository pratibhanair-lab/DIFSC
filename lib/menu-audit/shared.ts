import type { Combo, Finding, FoodRow, ParsedMenu, Severity } from "./types";

export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export type Where = { sheet: string; week: number | null; day: string; item: string };

export function finding(rule: string, severity: Severity, where: Where, message: string, evidence = ""): Finding {
  return { rule, severity, ...where, message, evidence };
}

export const whereCombo = (c: Combo): Where => ({ sheet: c.sheet, week: c.week, day: c.day, item: c.name });
export const whereRow = (r: FoodRow): Where => ({ sheet: r.sheet, week: r.week, day: r.day, item: r.name });

/** Every component row of every combo, plus every snack row. */
export const allRows = (menu: ParsedMenu): FoodRow[] => [...menu.combos.flatMap((c) => c.components), ...menu.snacks];

/** Two rows are "the same item" for the AI when name and ingredients match. */
export const rowKey = (r: FoodRow) => `${normName(r.name)}|${normName(r.ingredients)}`;

/** The unique items sent to the AI, each with every place it appears. */
export function uniqueItems(menu: ParsedMenu): { key: string; row: FoodRow; places: FoodRow[] }[] {
  const map = new Map<string, FoodRow[]>();
  for (const r of allRows(menu)) {
    if (!r.name) continue;
    const k = rowKey(r);
    map.set(k, [...(map.get(k) ?? []), r]);
  }
  return [...map.entries()].map(([key, places]) => ({ key, row: places[0], places }));
}
