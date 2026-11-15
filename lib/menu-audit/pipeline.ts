import { reviewMenu } from "./ai-review";
import { parseWorkbook, UnrecognisedFormError } from "./parse";
import { buildReport, type ReportData } from "./report";
import { runAudit } from "./rules";

/** What the upload page is told, one event at a time, while an audit runs. */
export type AuditEvent =
  | { type: "step"; step: "reading" | "rules" | "ai" | "report" }
  | { type: "done"; report: ReportData; ai: { available: boolean; error: string | null; costUsd: number | null } }
  | { type: "error"; message: string };

/**
 * The whole audit: read the form -> rule checks -> AI review -> report.
 * An async generator so the API can stream real progress to the page. The AI
 * step is optional: if it fails, the report is still produced and marks the
 * AI-based rules "Not assessed".
 */
export async function* runPipeline(bytes: Uint8Array, deps: { review?: typeof reviewMenu } = {}): AsyncGenerator<AuditEvent> {
  try {
    yield { type: "step", step: "reading" };
    let menu;
    try {
      menu = await parseWorkbook(bytes);
    } catch (e) {
      yield { type: "error", message: e instanceof UnrecognisedFormError ? e.message : "The file could not be read as a Dubai Municipality menu workbook (form DM-FSD-FO60)." };
      return;
    }
    if (menu.combos.length === 0 && menu.snacks.length === 0) {
      yield { type: "error", message: "The workbook contains no menu items to audit." };
      return;
    }

    yield { type: "step", step: "rules" };
    runAudit(menu); // deterministic checks (fast); the report is built after the AI step

    yield { type: "step", step: "ai" };
    const review = await (deps.review ?? reviewMenu)(menu);

    yield { type: "step", step: "report" };
    const audit = runAudit(menu, undefined, review.ai);
    const report = buildReport(menu, audit, review.ai);
    yield { type: "done", report, ai: { available: review.ai !== null, error: review.error, costUsd: review.usage.estimatedCostUsd } };
  } catch {
    // Never expose internals; the page just shows a friendly message.
    yield { type: "error", message: "Something went wrong while auditing this file. Please try again." };
  }
}
