import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reviewMenu } from "../lib/menu-audit/ai-review";
import { parseWorkbook } from "../lib/menu-audit/parse";
import { runAudit } from "../lib/menu-audit/rules";

// LIVE test: calls the real Claude API and costs a few cents. It only runs
// when you ask for it:  npm run test:live   (needs ANTHROPIC_API_KEY in
// .env.local and the reference workbook in tests/fixtures/).
// Read .env.local ourselves: Next's loader skips it in test mode.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const enabled = process.env.RUN_LIVE === "1" && !!process.env.ANTHROPIC_API_KEY && existsSync("tests/fixtures/ginza-form3.xlsx");

describe.skipIf(!enabled)("LIVE acceptance: AI results for the Ginza / Repton Form 3 (spec section 6)", () => {
  it("finds at least the listed R1 / R2 / R3a items", async () => {
    const menu = await parseWorkbook(readFileSync("tests/fixtures/ginza-form3.xlsx"));
    const review = await reviewMenu(menu);
    console.log("AI usage:", JSON.stringify(review.usage), "model:", review.ai?.model, "error:", review.error);
    expect(review.error).toBeNull();
    const audit = runAudit(menu, undefined, review.ai);
    console.log("dropped by guardrails:", audit.aiDropped.length);
    const rule = (id: string) => audit.rules.find((r) => r.id === id)!;
    const has = (id: string, item: RegExp, msg: RegExp) => rule(id).findings.some((f) => item.test(f.item) && msg.test(f.message + " " + f.evidence));

    // R2 - undeclared allergens
    expect(has("R2", /orange cake/i, /gluten/i)).toBe(true);
    expect(has("R2", /orange cake/i, /egg/i)).toBe(true);
    expect(has("R2", /arabic chicken skewers/i, /soybeans/i)).toBe(true);
    expect(has("R2", /arabic chicken skewers/i, /gluten/i)).toBe(true);
    expect(has("R2", /quinoa/i, /gluten/i)).toBe(true);
    expect(has("R2", /banana bread/i, /egg/i)).toBe(true);
    // R2 - milk missing on the Low fat milk row in the Wk 2 Tue vegetarian combo (deterministic)
    expect(rule("R2").findings.some((f) => /low fat milk/i.test(f.item) && f.week === 2 && f.day === "Tue" && /milk/.test(f.message))).toBe(true);

    // R1 - possible deep frying / trans fat
    expect(has("R1", /biryani/i, /deep-fried|frying/i)).toBe(true);
    expect(has("R1", /muffin/i, /trans fat/i)).toBe(true);

    // R3a - protein inadequate in at least 7 of the 9 listed combos
    const flagged = rule("R3a").findings.filter((f) => /protein/i.test(f.message) && !/borderline/i.test(f.message));
    const listed = [[1, "Tue"], [1, "Thu"], [2, "Tue"], [2, "Wed"], [2, "Fri"], [3, "Mon"], [3, "Wed"], [3, "Thu"], [3, "Fri"]];
    const hits = listed.filter(([w, d]) => flagged.some((f) => f.week === w && f.day === d)).length;
    console.log(`R3a: protein inadequate in ${hits} of the 9 listed combos (spec needs >= 7); total flagged: ${flagged.length}`);
    expect(hits).toBeGreaterThanOrEqual(7);
  }, 280_000);
});
