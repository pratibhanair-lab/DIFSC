import { fetchApprovedListing } from "@/lib/approved-view";
import ThemeToggle from "@/components/ThemeToggle";
import PublicApprovedListing from "@/components/PublicApprovedListing";

export const dynamic = "force-dynamic";

export default async function ApprovedPage() {
  const listing = await fetchApprovedListing();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: 60,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
          DIFSC 2026 &mdash; Approved Sessions &amp; Speakers
        </span>
        <ThemeToggle />
      </header>
      <PublicApprovedListing listing={listing} />
    </div>
  );
}
