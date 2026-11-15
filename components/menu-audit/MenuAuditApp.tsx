"use client";

import { useRef, useState } from "react";
import styles from "./MenuAuditApp.module.css";
import AuditReport from "./AuditReport";
import type { AuditEvent } from "@/lib/menu-audit/pipeline";
import type { ReportData } from "@/lib/menu-audit/report";

const MAX_BYTES = 4 * 1024 * 1024;
const STEPS = [
  { id: "reading", label: "Reading the form" },
  { id: "rules", label: "Running the rule checks" },
  { id: "ai", label: "AI review of ingredients and food groups" },
  { id: "report", label: "Building the report" },
] as const;

type Phase = "idle" | "running" | "done";

export default function MenuAuditApp() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<string>("");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function choose(f: File | null) {
    setError("");
    if (!f) return setFile(null);
    if (!/\.xlsx$/i.test(f.name)) return setError("Please choose an Excel workbook ending in .xlsx.");
    if (f.size > MAX_BYTES) return setError("That file is larger than 4 MB.");
    setFile(f);
  }

  async function start() {
    if (!file) return;
    setPhase("running");
    setError("");
    setStep("reading");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/menu-audit", { method: "POST", body });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "The audit could not be started. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AuditEvent;
          if (event.type === "step") setStep(event.step);
          else if (event.type === "error") throw new Error(event.message);
          else if (event.type === "done") {
            setReport(event.report);
            setAiError(event.ai.available ? null : event.ai.error);
            setPhase("done");
            finished = true;
          }
        }
      }
      if (!finished) throw new Error("The audit ended unexpectedly. Please try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("idle");
    }
  }

  function reset() {
    setReport(null);
    setFile(null);
    setPhase("idle");
    setStep("");
    setAiError(null);
    setError("");
  }

  if (phase === "done" && report) {
    return (
      <div className={styles.wrap}>
        <div className={styles.bar}>
          <span>Audit complete. Use “Download PDF” below to save the report.</span>
          <button type="button" className={styles.btnGhost} onClick={reset}>
            Audit another menu
          </button>
        </div>
        {aiError && <div className={styles.aiNote}>{aiError} The AI-based checks are shown as “Not assessed” in the report.</div>}
        <AuditReport report={report} />
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/myschoolfood-logo.svg" alt="MySchoolFood" />
      </div>
      <main className={styles.main}>
        <h1 className={styles.h1}>School Menu Audit</h1>
        <p className={styles.lead}>
          Upload a Dubai Municipality school-menu workbook (form DM-FSD-FO60) to get an audit report against the rule book. The report is an AI-generated draft that a qualified nutritionist must review and confirm.
        </p>

        {phase === "idle" && (
          <>
            <label
              className={`${styles.drop} ${over ? styles.dropOver : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                choose(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <strong>Choose a workbook, or drag it here</strong>
              <span>Excel (.xlsx) only, up to 4 MB</span>
              <input ref={input} className={styles.hidden} type="file" accept=".xlsx" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
            </label>
            {file && (
              <div className={styles.file}>
                <span>
                  {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button type="button" className={styles.btnGhost} onClick={() => choose(null)}>
                  Remove
                </button>
              </div>
            )}
            <div className={styles.row}>
              <button type="button" className={styles.btn} disabled={!file} onClick={start}>
                Run the audit
              </button>
            </div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {phase === "running" && (
          <>
            <ol className={styles.steps} aria-live="polite">
              {STEPS.map((s, i) => {
                const done = i < stepIndex;
                const now = i === stepIndex;
                return (
                  <li key={s.id} className={done ? styles.stepDone : now ? styles.stepNow : ""}>
                    <span className={styles.dot}>{done ? "✓" : now ? <span className={styles.spin}>◐</span> : "○"}</span>
                    {s.label}
                  </li>
                );
              })}
            </ol>
            <p className={styles.lead} style={{ marginTop: 14 }}>
              This usually takes under a minute. Please keep this page open.
            </p>
          </>
        )}

        <div className={styles.notice}>
          <strong>Privacy:</strong> your file is processed in memory and is not stored. To review ingredients and food groups, the menu text and nutrient values in the workbook are sent to Anthropic’s AI service, which may process them outside the UAE.
        </div>
      </main>
    </div>
  );
}
