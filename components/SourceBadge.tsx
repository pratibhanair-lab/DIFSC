import type { SubmissionSource } from "@/lib/types";

const LABELS: Record<SubmissionSource, string> = {
  external: "External",
  internal: "Internal (DM staff)",
};

export default function SourceBadge({ source }: { source: SubmissionSource }) {
  return <span className={`chip chip-source-${source}`}>{LABELS[source]}</span>;
}
