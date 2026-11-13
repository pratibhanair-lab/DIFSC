import Link from "next/link";
import { fetchProgramme } from "@/lib/programme-view";
import { PROGRAMME_TEXT, type Lang } from "@/lib/programme-config";
import ThemeToggle from "@/components/ThemeToggle";
import PublicProgramme from "@/components/PublicProgramme";

/**
 * The whole public programme page for one language. /programme-en and
 * /programme-ar are one-line wrappers around this, so the two pages can
 * never drift apart.
 */
export default async function ProgrammePage({ lang }: { lang: Lang }) {
  const { rooms, days } = await fetchProgramme();
  const t = PROGRAMME_TEXT[lang];
  const rtl = lang === "ar";

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={lang}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: rtl ? "var(--font-arabic), var(--font-body), sans-serif" : undefined,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          minHeight: 60,
          gap: 12,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
          DIFSC 2026
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href={t.otherLanguageHref} style={{ fontSize: 14, fontWeight: 700 }}>
            {t.otherLanguage}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <PublicProgramme lang={lang} rooms={rooms} days={days} />
    </div>
  );
}
