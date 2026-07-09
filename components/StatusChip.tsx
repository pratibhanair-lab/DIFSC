const LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  confirmed: "Confirmed",
};

export default function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{LABELS[status] ?? status}</span>;
}
