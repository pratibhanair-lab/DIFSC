import styles from "./AuditReport.module.css";
import PrintButton from "./PrintButton";
import type { ItemEvaluation, Finding, WeeklyMix } from "@/lib/menu-audit/types";
import type { ReportData, ScoreResult } from "@/lib/menu-audit/report";

// Fixed wording from the spec (section 5). Do not reword.
export const AI_DISCLAIMER_TITLE = "AI-generated draft – not an approval.";
export const AI_DISCLAIMER_BODY =
  "This report was produced automatically by software, using an AI model to review ingredient lists and estimate nutrient values. It may contain errors or omissions. It must be reviewed, corrected where necessary, and confirmed by a qualified nutritionist or dietitian before any decision is made or communicated to the caterer or school.";
export const AI_FOOTER = "AI-generated draft – requires confirmation by a qualified nutritionist";
export const AI_REFERENCE_NOTE = "Approximate reference value estimated by AI; verify against recipe analysis or laboratory data.";
const LOGO = "/brand/myschoolfood-logo.svg";
const LOGO_SMALL = "/brand/myschoolfood-logo-small.svg";

/** CSS for the browser's per-page header and footer (needs the report ID). */
function runningCss(reportId: string) {
  const id = reportId.replace(/[^A-Za-z0-9-]/g, "");
  return `@page {
  @top-left { content: url("${LOGO_SMALL}"); vertical-align: middle; }
  @top-right { content: "School Menu Audit Report · ${id}"; font: 7.5pt Arial, sans-serif; color: #5a6275; vertical-align: middle; }
  @bottom-left { content: "${AI_FOOTER} · Report ID ${id} · Page " counter(page) " of " counter(pages); font: 7.5pt Arial, sans-serif; color: #444; width: 100%; }
}`;
}

const RESULT_WORDS: Record<ScoreResult | "advisory", string> = {
  pass: "Pass",
  fail: "Fail",
  needs_verification: "Needs verification",
  incomplete: "Incomplete",
  not_assessed: "Not assessed",
  advisory: "Advisory",
};

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const n1 = (v: number | null) => (v === null ? "–" : (Math.round(v * 10) / 10).toLocaleString("en-GB"));
const pct = (v: number) => `${Math.round(v)}%`;

function Badge({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={cx(styles.badge, styles[`b_${kind}`])}>{children}</span>;
}

function ResultBadge({ result, advisory }: { result: ScoreResult; advisory?: boolean }) {
  // An advisory rule is advice, not a verdict - say so instead of "Fail".
  if (advisory && result === "fail") return <Badge kind="advisory">Advisory – not met</Badge>;
  return <Badge kind={result}>{RESULT_WORDS[result]}</Badge>;
}

function shortSheet(s: string) {
  if (/main meals/i.test(s)) return "Main meals";
  if (/snacks/i.test(s)) return "Snacks";
  return s;
}

function where(f: Finding) {
  return [shortSheet(f.sheet), f.week ? `Wk ${f.week}` : "", f.day].filter(Boolean).join(" · ");
}

function FindingsTable({ findings, empty }: { findings: Finding[]; empty: string }) {
  if (!findings.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th style={{ width: "9%" }}>Severity</th>
          <th style={{ width: "20%" }}>Item</th>
          <th style={{ width: "14%" }}>Sheet · week · day</th>
          <th style={{ width: "24%" }}>Finding</th>
          <th style={{ width: "17%" }}>Evidence</th>
          <th style={{ width: "16%" }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {findings.map((f, i) => (
          <tr key={i}>
            <td>
              <Badge kind={f.severity}>{f.severity}</Badge>
              {f.needsVerification && <div className={styles.note}>to verify</div>}
            </td>
            <td>
              {f.item}
              {f.ai && <span className={styles.aiTag}>AI</span>}
            </td>
            <td>{where(f)}</td>
            <td>{f.message}</td>
            <td className={styles.quote}>{f.evidence}</td>
            <td>{f.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WeeklyBars({ title, rows, fibreCounted }: { title: string; rows: WeeklyMix[]; fibreCounted: boolean }) {
  return (
    <div className={styles.bars}>
      <h3 className={styles.h3}>{title}</h3>
      <div className={styles.legend} aria-hidden="true">
        <span style={{ left: "30%" }}>GREEN ≥ 30%</span>
        <span style={{ left: "60%" }}>RED ≤ 40%</span>
      </div>
      {rows.map((w) => {
        const g = fibreCounted ? w.greenPct : w.withoutFibre.greenPct;
        const a = fibreCounted ? w.amberPct : w.withoutFibre.amberPct;
        const r = fibreCounted ? w.redPct : w.withoutFibre.redPct;
        const alt = fibreCounted ? w.withoutFibre : { greenPct: w.greenPct, amberPct: w.amberPct, redPct: w.redPct };
        return (
          <div key={w.week} className={styles.barRow}>
            <div className={styles.barLabel}>Week {w.week}</div>
            {w.count === 0 ? (
              <div className={styles.empty}>No items listed – incomplete</div>
            ) : (
              <div className={styles.barTrack}>
                {([["GREEN", g], ["AMBER", a], ["RED", r]] as const).map(([name, v]) =>
                  v > 0 ? (
                    <div key={name} className={cx(styles.seg, styles[`seg_${name}`])} style={{ width: `${v}%` }}>
                      {v >= 14 ? `${name} ${pct(v)}` : v >= 6 ? pct(v) : ""}
                    </div>
                  ) : null,
                )}
                <span className={styles.limit} style={{ left: "30%" }} />
                <span className={styles.limit} style={{ left: "60%" }} />
              </div>
            )}
            {w.count > 0 && (
              <p className={styles.barNote}>
                {w.count} items · GREEN {pct(g)} / AMBER {pct(a)} / RED {pct(r)} · {fibreCounted ? "without fibre" : "with fibre"}: {pct(alt.greenPct)} / {pct(alt.amberPct)} / {pct(alt.redPct)} · <strong>{w.verdict === "pass" ? "Within limits" : w.verdict === "fail" ? "Outside limits" : "Incomplete"}</strong>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemsTable({ items, kind }: { items: ItemEvaluation[]; kind: "combo" | "snack" }) {
  if (!items.length) return null;
  const short = (s: string) => (s.length > 78 ? `${s.slice(0, 76)}…` : s);
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Wk</th>
          <th>Day</th>
          <th style={{ width: "26%" }}>{kind === "combo" ? "Combo" : "Snack"}</th>
          <th className={styles.num}>kcal</th>
          <th className={styles.num}>Fat g</th>
          <th className={styles.num}>Sat g</th>
          <th className={styles.num}>Na mg</th>
          <th className={styles.num}>Sugar g</th>
          <th className={styles.num}>Fibre g</th>
          <th style={{ width: "18%" }}>RED nutrients</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {items.map((e) => (
          <tr key={e.id}>
            <td>{e.week ?? "–"}</td>
            <td>{e.day}</td>
            <td>{short(e.name)}</td>
            <td className={styles.num}>{n1(e.perServing.kcal)}</td>
            <td className={styles.num}>{n1(e.perServing.fat)}</td>
            <td className={styles.num}>{n1(e.perServing.satFat)}</td>
            <td className={styles.num}>{n1(e.perServing.sodium)}</td>
            <td className={styles.num}>{n1(e.perServing.sugar)}</td>
            <td className={styles.num}>{n1(e.perServing.fibre)}</td>
            <td>{e.classification.redNutrients.map((n) => n.replace(/ \(.*\)/, "")).join(", ") || "–"}</td>
            <td>
              <Badge kind={e.classification.colour}>{e.classification.colour}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AuditReport({ report }: { report: ReportData }) {
  const { meta } = report;
  const date = new Date(meta.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });
  const weeklyOf = (kind: "combo" | "snack") => report.weekly.filter((w) => w.kind === kind);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span>Choose “Save as PDF” as the printer to download the report.</span>
        <PrintButton />
      </div>

      {/* Repeats on every printed page */}
      <div className={styles.watermark} aria-hidden="true">
        DRAFT – NOT REVIEWED
      </div>
      {/* Printed on every page by the browser: small logo and title at the top,
          the AI footer line with the page count at the bottom. (Chrome and Edge;
          Firefox prints without them.) The report ID is cleaned so it is safe in CSS. */}
      <style dangerouslySetInnerHTML={{ __html: runningCss(meta.reportId) }} />

      <div className={styles.sheet}>
        {/* 1. Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src={LOGO} alt="MySchoolFood" />
        <h1 className={styles.title}>School Menu Audit Report</h1>
        <p className={styles.subtitle}>Review of a school menu submitted on form {meta.formRef}</p>
        <dl className={styles.meta}>
          <div>
            <dt>School(s)</dt>
            <dd>{meta.school}</dd>
          </div>
          <div>
            <dt>Caterer / supplier</dt>
            <dd>{meta.caterer}</dd>
          </div>
          <div>
            <dt>Menu cycle</dt>
            <dd>{meta.menuCycle}</dd>
          </div>
          <div>
            <dt>Kind of main meals</dt>
            <dd>{meta.kindOfMeals}</dd>
          </div>
          <div>
            <dt>Form reference</dt>
            <dd>{meta.formRef}</dd>
          </div>
          <div>
            <dt>Upload date</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>Report ID</dt>
            <dd>{meta.reportId}</dd>
          </div>
        </dl>
        <div className={cx(styles.verdict, styles[`verdict_${report.verdict}`])}>{report.verdictLabel}</div>

        {/* 2. Disclaimer */}
        <div className={styles.banner}>
          <strong>{AI_DISCLAIMER_TITLE}</strong> {AI_DISCLAIMER_BODY}
        </div>
        {meta.aiMock && (
          <div className={cx(styles.banner, styles.bannerMock)}>DEVELOPMENT PREVIEW – the AI findings in this report are MOCK data made from simple keyword rules. They are not a real assessment.</div>
        )}
        {!meta.aiAvailable && (
          <div className={styles.banner}>The AI review was unavailable for this audit. Rules R1, R2, R3a and A.5 are marked “Not assessed”; every other section is complete.</div>
        )}

        {/* 3. Scorecard */}
        <h2 className={cx(styles.h2, styles.pageBreak)}>Scorecard</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "36%" }}>Rule</th>
              <th style={{ width: "17%" }}>Result</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {report.scorecard.map((s) => (
              <tr key={s.id}>
                <td>{s.label}</td>
                <td>
                  <ResultBadge result={s.result} advisory={s.advisory} />
                </td>
                <td>{s.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. Weekly nutrient mix */}
        <h2 className={styles.h2}>Weekly nutrient mix</h2>
        <p className={styles.note}>
          Each combo and snack is classified GREEN, AMBER or RED from the Smart Choices criteria, per serving and per 100 g, using the worst result. Fibre {report.fibreCounted ? "is counted" : "is not counted"} in the headline result; the other result is shown beside each bar. Dashed lines mark the limits: at least 30% GREEN and at most 40% RED.
        </p>
        <WeeklyBars title="Main meals" rows={weeklyOf("combo")} fibreCounted={report.fibreCounted} />
        <ItemsTable items={report.combos} kind="combo" />
        <WeeklyBars title="Snacks" rows={weeklyOf("snack")} fibreCounted={report.fibreCounted} />
        <ItemsTable items={report.snacks} kind="snack" />
        {report.weeklyFindings.length > 0 && (
          <>
            <h3 className={styles.h3}>Weekly mix findings</h3>
            <FindingsTable findings={report.weeklyFindings} empty="" />
          </>
        )}

        {/* 5. One section per rule */}
        <h2 className={cx(styles.h2, styles.pageBreak)}>Findings by rule</h2>
        {report.sections.map((s) => (
          <section key={s.id}>
            <div className={styles.keepNext}>
              <h3 className={styles.h3}>
                {s.id} · {s.title} <ResultBadge result={s.result} advisory={s.advisory} />
              </h3>
              <p className={styles.note}>{s.summary}</p>
            </div>
            <FindingsTable findings={s.findings} empty={s.result === "not_assessed" ? "Not assessed – AI review unavailable." : "No findings."} />
          </section>
        ))}

        {/* 6. Accuracy */}
        <h2 className={cx(styles.h2, styles.pageBreak)}>Accuracy of the form</h2>
        <p className={styles.note}>All totals are recomputed from the component rows; the form’s own totals and status columns are never trusted.</p>
        <h3 className={styles.h3}>Form totals that do not match the components</h3>
        <FindingsTable findings={report.accuracy.formTotals} empty="Every form total matches the recomputed value." />
        <h3 className={styles.h3}>Possible copy-paste errors</h3>
        <FindingsTable findings={report.accuracy.copyPaste} empty="No suspicious duplicate values." />
        <h3 className={styles.h3}>Missing values</h3>
        <FindingsTable findings={report.accuracy.missing} empty="No missing values." />
        <h3 className={styles.h3}>Internal consistency</h3>
        <FindingsTable findings={report.accuracy.internal} empty="No internal inconsistencies." />
        <h3 className={styles.h3}>Plausibility against approximate references</h3>
        {report.accuracy.plausibilityAssessed ? (
          <>
            <FindingsTable findings={report.accuracy.plausibility} empty={`No declared value is more than ±${report.appendix.plausibilityTolerancePct}% from the approximate reference.`} />
            {report.accuracy.plausibility.length > 0 && <p className={styles.note}>{AI_REFERENCE_NOTE}</p>}
          </>
        ) : (
          <p className={styles.empty}>Not assessed – AI review unavailable.</p>
        )}

        {/* 7. Corrective actions */}
        <h2 className={cx(styles.h2, styles.pageBreak)}>Corrective actions</h2>
        {report.corrective.length === 0 ? (
          <p className={styles.empty}>No critical or major findings.</p>
        ) : (
          <ol className={styles.ol}>
            {report.corrective.map((c) => (
              <li key={c.rule}>
                <strong>{c.action}</strong> <span className={styles.note}>[{c.rule}]</span>
                <div className={styles.note}>
                  Affects: {c.affected.slice(0, 6).join("; ")}
                  {c.affected.length > 6 ? `; and ${c.affected.length - 6} more` : ""}
                </div>
              </li>
            ))}
          </ol>
        )}
        {report.aiDropped.length > 0 && (
          <p className={styles.note}>
            {report.aiDropped.length} AI finding{report.aiDropped.length === 1 ? " was" : "s were"} discarded because the ingredient text it quoted could not be found in the form.
          </p>
        )}

        {/* 8. Sign-off */}
        <h2 className={cx(styles.h2, styles.pageBreak)}>Reviewer sign-off</h2>
        <p className={styles.note}>This report keeps the watermark “DRAFT – NOT REVIEWED” until a qualified nutritionist or dietitian has completed this block.</p>
        <table className={styles.sign}>
          <tbody>
            <tr>
              <th>Reviewer name</th>
              <td className={styles.sigBox}></td>
            </tr>
            <tr>
              <th>Professional registration / licence no.</th>
              <td className={styles.sigBox}></td>
            </tr>
            <tr>
              <th>Decision</th>
              <td>
                <div className={styles.checks}>
                  <span>☐ Approved</span>
                  <span>☐ Approved with conditions</span>
                  <span>☐ Returned for revision</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>Comments</th>
              <td className={styles.tall}></td>
            </tr>
            <tr>
              <th>Signature</th>
              <td className={styles.sigBox}></td>
            </tr>
            <tr>
              <th>Date</th>
              <td className={styles.sigBox}></td>
            </tr>
          </tbody>
        </table>

        {/* Appendix */}
        <h2 className={cx(styles.h2, styles.pageBreak)}>Appendix: method and thresholds</h2>
        <p className={styles.note}>
          Per serving = the sum of (value per 100 g × grams ÷ 100) over a combo’s components. Per 100 g = per serving ÷ total grams × 100. A blank nutrient cell is a missing value, flagged as a finding, and counted as 0 only inside totals. An item takes the worst colour of any nutrient on either basis. Rules that need judgement (R1, R2, R3a, A.5) were reviewed by an AI model{meta.aiModel ? ` (${meta.aiModel})` : ""}; every AI finding quotes the ingredient text it relies on, and findings whose quote could not be found were discarded.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nutrient</th>
              <th className={styles.num}>Per serving GREEN</th>
              <th className={styles.num}>Per serving AMBER</th>
              <th className={styles.num}>Per 100 g GREEN</th>
              <th className={styles.num}>Per 100 g AMBER</th>
            </tr>
          </thead>
          <tbody>
            {report.appendix.thresholds.map((t) => (
              <tr key={t.label}>
                <td>
                  {t.label} {t.higherIsBetter ? "(higher is better)" : "(lower is better)"}
                </td>
                <td className={styles.num}>
                  {t.higherIsBetter ? "≥ " : "≤ "}
                  {t.perServing.green}
                </td>
                <td className={styles.num}>
                  {t.higherIsBetter ? "≥ " : "≤ "}
                  {t.perServing.amber}
                </td>
                <td className={styles.num}>
                  {t.higherIsBetter ? "≥ " : "≤ "}
                  {t.per100.green}
                </td>
                <td className={styles.num}>
                  {t.higherIsBetter ? "≥ " : "≤ "}
                  {t.per100.amber}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.note}>
          Weekly limits: at least {report.appendix.weeklyLimits.minGreenPct}% GREEN, at most {report.appendix.weeklyLimits.maxAmberPct}% AMBER and at most {report.appendix.weeklyLimits.maxRedPct}% RED. Form totals are flagged when they differ from the recomputed value by more than {report.appendix.formTotalsTolerancePct}%. AI plausibility checks report only deviations beyond ±{report.appendix.plausibilityTolerancePct}%.
        </p>
      </div>
    </div>
  );
}
