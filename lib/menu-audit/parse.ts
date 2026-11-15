import ExcelJS from "exceljs";
import type { Combo, Drink, FoodRow, NutrientVector, ParsedMenu, Term } from "./types";

export class UnrecognisedFormError extends Error {
  constructor(detail: string) {
    super(`Unrecognised form version (${detail})`);
    this.name = "UnrecognisedFormError";
  }
}

// ---- Column numbers (A=1) for the main-meal and snack sheets ---------------
const C = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 10, K: 11, L: 12,
  P: 16, W: 23, AC: 29, AD: 30, AE: 31, AY: 51,
};
const FIRST_DATA_ROW = 16;
const DRINKS_FIRST_ROW = 15;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Reads one cell as its cached value (never a formula), or null when blank/error. */
function raw(cell: ExcelJS.Cell): string | number | boolean | Date | null {
  let v: unknown = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    if ("result" in o) v = o.result; // formula: use the value Excel last calculated
    else if ("richText" in o) v = (o.richText as { text: string }[]).map((t) => t.text).join("");
    else if ("error" in o) return null;
    else if ("text" in o) v = o.text;
    else return null;
  }
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && !(v instanceof Date)) return null; // e.g. {error: "#DIV/0!"}
  if (typeof v === "string" && /^#(DIV\/0|VALUE|REF|NAME|N\/A|NUM|NULL)/.test(v)) return null;
  return v as string | number | boolean | Date;
}

function str(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const v = raw(ws.getRow(row).getCell(col));
  if (v === null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).replace(/\s+/g, " ").trim();
}

function num(ws: ExcelJS.Worksheet, row: number, col: number): number | null {
  const v = raw(ws.getRow(row).getCell(col));
  if (v === null || typeof v === "boolean" || v instanceof Date) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = v.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function vector(ws: ExcelJS.Worksheet, row: number, firstCol: number): NutrientVector {
  return {
    kcal: num(ws, row, firstCol),
    fat: num(ws, row, firstCol + 1),
    satFat: num(ws, row, firstCol + 2),
    sodium: num(ws, row, firstCol + 3),
    sugar: num(ws, row, firstCol + 4),
    fibre: num(ws, row, firstCol + 5),
  };
}

function findSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = wb.worksheets.find((s) => norm(s.name) === norm(name));
  if (!ws) throw new UnrecognisedFormError(`missing sheet "${name}"`);
  return ws;
}

function checkHeaders(ws: ExcelJS.Worksheet, kind: "meal" | "drinks") {
  if (kind === "meal") {
    const ok =
      norm(str(ws, 14, C.A)).includes("item name") &&
      norm(str(ws, 14, C.J)).includes("ingredients") &&
      norm(str(ws, 15, C.P)).includes("calories");
    if (!ok) throw new UnrecognisedFormError(`unexpected headers on "${ws.name}"`);
  } else if (!norm(str(ws, 13, C.A)).includes("drink item name")) {
    throw new UnrecognisedFormError(`unexpected headers on "${ws.name}"`);
  }
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayIndex = (d: string) => {
  const i = DAYS.indexOf(d.trim().slice(0, 3).toLowerCase());
  return i === -1 ? null : i;
};

function termOf(text: string): Term | null {
  const m = text.match(/(\d)(?:ST|ND|RD|TH)\s+TERM/i);
  const n = m ? Number(m[1]) : NaN;
  return n === 1 || n === 2 || n === 3 ? n : null;
}

const isMarker = (a: string) => /NEW\s*\/\s*ADDITIONAL\s*\/\s*MODIFIED/i.test(a);
const isFooter = (a: string) => /^page\s+\d+\s+of\s+\d+/i.test(a);

function readFoodRow(ws: ExcelJS.Worksheet, row: number, week: number | null, term: Term | null): FoodRow {
  const allergensRaw = str(ws, row, C.C);
  return {
    sheet: ws.name,
    row,
    week,
    term,
    name: str(ws, row, C.A),
    brand: str(ws, row, C.B),
    allergensRaw,
    allergens: allergensRaw
      .split(/[,;/]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    category: str(ws, row, C.D),
    component: str(ws, row, C.E),
    prep: str(ws, row, C.F),
    day: str(ws, row, C.G),
    meal: str(ws, row, C.H),
    ingredients: str(ws, row, C.J),
    foodType: str(ws, row, C.K),
    servingG: num(ws, row, C.L),
    per100: vector(ws, row, C.P),
    remarks: str(ws, row, C.AY),
  };
}

function parseMainMeals(ws: ExcelJS.Worksheet, week: number): Combo[] {
  checkHeaders(ws, "meal");
  const combos: Combo[] = [];
  let term: Term | null = null;
  let acc: FoodRow[] = [];
  const last = ws.rowCount;

  for (let r = FIRST_DATA_ROW; r <= last; r++) {
    const a = str(ws, r, C.A);
    const j = str(ws, r, C.J);
    if (isFooter(a)) break;
    if (isMarker(a)) {
      term = termOf(a);
      acc = [];
      continue;
    }
    if (/^TOTAL WEIGHT OF SERVING SIZE/i.test(j)) {
      const totalG = num(ws, r, C.L);
      // A total of 0 means an empty template block - skip it.
      if (totalG && acc.length > 0) {
        const first = acc[0];
        combos.push({
          id: `${ws.name}#${r}`,
          sheet: ws.name,
          week: term ? null : week,
          term,
          day: first.day || str(ws, r, C.G),
          meal: first.meal || str(ws, r, C.H),
          category: first.category,
          name: a,
          components: acc,
          totalRow: r,
          formTotals: vector(ws, r, C.W),
          formTotalG: totalG,
          formEvaluation: [str(ws, r, C.AC), str(ws, r, C.AD), str(ws, r, C.AE)].filter(Boolean).join(" / "),
        });
      }
      acc = [];
      continue;
    }
    const serving = num(ws, r, C.L);
    if (a || j || (serving !== null && serving > 0)) acc.push(readFoodRow(ws, r, term ? null : week, term));
  }
  return combos;
}

function parseSnacks(ws: ExcelJS.Worksheet, firstWeek: number): FoodRow[] {
  checkHeaders(ws, "meal");
  const out: FoodRow[] = [];
  let week = firstWeek;
  let term: Term | null = null;
  let prevDay: number | null = null;

  for (let r = FIRST_DATA_ROW; r <= ws.rowCount; r++) {
    const a = str(ws, r, C.A);
    if (isFooter(a)) break;
    if (isMarker(a)) {
      term = termOf(a);
      prevDay = null;
      continue;
    }
    const serving = num(ws, r, C.L);
    if (!a && !(serving !== null && serving > 0)) continue;
    const day = str(ws, r, C.G);
    const idx = dayIndex(day);
    // The week changes when the day moves backwards (e.g. Thu -> Mon).
    if (!term && idx !== null) {
      if (prevDay !== null && idx < prevDay) week++;
      prevDay = idx;
    }
    out.push(readFoodRow(ws, r, term ? null : week, term));
  }
  return out;
}

function parseDrinks(ws: ExcelJS.Worksheet): Drink[] {
  checkHeaders(ws, "drinks");
  const out: Drink[] = [];
  for (let r = DRINKS_FIRST_ROW; r <= ws.rowCount; r++) {
    const a = str(ws, r, 1);
    if (isFooter(a) || isMarker(a)) break;
    if (!a) continue;
    out.push({
      row: r,
      name: a,
      brand: str(ws, r, 2),
      allergensRaw: str(ws, r, 3),
      ingredients: str(ws, r, 4),
      drinkType: str(ws, r, 5),
      juicePct: num(ws, r, 6),
      volumeMl: num(ws, r, 7),
      kcalPer100ml: num(ws, r, 8),
      sugarPer100ml: num(ws, r, 9),
    });
  }
  return out;
}

/**
 * The Information sheet: look each field up by its English label. In the top
 * block (rows 1-13) the value sits to the LEFT of its label; in the lower
 * block (row 15 onwards) it sits to the RIGHT.
 */
const INFO_LABELS = [
  "License Number",
  "Name of the establishment",
  "Owner/Manager Name",
  "Location",
  "Mobile No.",
  "Business Activity:",
  "School Year",
  "Makani Number:",
  "Approving Date",
  "Permit officer name/ID",
  "Name of the Educational Institution:",
  "Type of Educational Institution:",
  "Type of Food Supply:",
  "Name of the School PIC:",
  "Name of the Supplier PIC in the Canteen:",
  "Person Who Completed The Form",
  "Name of the food supplier/company:",
  "Menu Cycle Number and/or Name",
  "Kind of Main Meals:",
];

function parseInfo(ws: ExcelJS.Worksheet): Record<string, string | null> {
  const wanted = new Map(INFO_LABELS.map((l) => [norm(l).replace(/:$/, ""), l]));
  const out: Record<string, string | null> = {};
  ws.eachRow((row, r) => {
    row.eachCell((cell, c) => {
      const v = raw(cell);
      if (typeof v !== "string") return;
      const key = norm(v).replace(/:$/, "");
      const label = wanted.get(key);
      if (!label || label in out) return;
      const valueCol = r <= 13 ? c - 1 : c + 1;
      const value = valueCol >= 1 ? str(ws, r, valueCol) : "";
      out[label] = value === "" ? null : value;
    });
  });
  for (const l of INFO_LABELS) if (!(l in out)) out[l] = null;
  // "APPROVAL STATUS:" is filled in (by the authority, not the caterer) in the
  // cell directly BELOW its label.
  ws.eachRow((row, r) => {
    row.eachCell((cell, c) => {
      const v = raw(cell);
      if (typeof v === "string" && /^approval status:?$/i.test(v.trim()) && !("Approval status" in out)) {
        const below = str(ws, r + 1, c);
        out["Approval status"] = below === "" ? null : below;
      }
    });
  });
  return out;
}

export async function parseWorkbook(data: ArrayBuffer | Buffer | Uint8Array): Promise<ParsedMenu> {
  const wb = new ExcelJS.Workbook();
  try {
    // exceljs wants an ArrayBuffer-compatible value.
    await wb.xlsx.load(data as unknown as ArrayBuffer);
  } catch {
    throw new UnrecognisedFormError("the file could not be read as an .xlsx workbook");
  }

  const info = findSheet(wb, "Information");
  const combos: Combo[] = [];
  for (const week of [1, 2, 3, 4]) combos.push(...parseMainMeals(findSheet(wb, `Wk ${week} Main Meals`), week));
  const snacks = [
    ...parseSnacks(findSheet(wb, "Wk 1 & 2 Entree Snacks & Snacks"), 1),
    ...parseSnacks(findSheet(wb, "Wk 3 & 4 Entree Snacks & Snacks"), 3),
  ];
  const drinks = parseDrinks(findSheet(wb, "Drinks"));

  return { info: parseInfo(info), combos, snacks, drinks };
}
