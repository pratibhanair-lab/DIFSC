import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import AuditReport from "@/components/menu-audit/AuditReport";
import { parseWorkbook } from "@/lib/menu-audit/parse";
import { runAudit } from "@/lib/menu-audit/rules";
import { mockAiOutput } from "@/lib/menu-audit/mock-ai";
import { reviewMenu } from "@/lib/menu-audit/ai-review";
import { buildReport } from "@/lib/menu-audit/report";

export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT-ONLY preview of the audit report (build step 2). It reads the
 * reference workbook from tests/fixtures/ and fills the AI parts with MOCK
 * output. It does not exist in production (404), so no real workbook is ever
 * served. Add ?ai=off to see the "AI unavailable" version of the report, or
 * ?ai=live to run the REAL Claude review (costs a little; needs the API key).
 */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ai?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { ai } = await searchParams;

  const file = join(process.cwd(), "tests", "fixtures", "ginza-form3.xlsx");
  if (!existsSync(file)) return <p style={{ padding: 24 }}>Put the reference workbook at tests/fixtures/ginza-form3.xlsx to see the preview.</p>;

  const menu = await parseWorkbook(readFileSync(file));
  const aiOutput = ai === "off" ? null : ai === "live" ? (await reviewMenu(menu)).ai : mockAiOutput(menu);
  const audit = runAudit(menu, undefined, aiOutput);
  const report = buildReport(menu, audit, aiOutput);
  return <AuditReport report={report} />;
}
