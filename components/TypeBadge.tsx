const COLORS: Record<string, string> = {
  both: "var(--accent)",
  speaker: "#8A5CD1",
  session: "#2563B0",
};
const SHORT: Record<string, string> = { both: "BOTH", speaker: "SPKR", session: "SESS" };

export default function TypeBadge({ kind }: { kind: "both" | "speaker" | "session" }) {
  return (
    <span className="badge" style={{ background: COLORS[kind] }}>
      {SHORT[kind]}
    </span>
  );
}
