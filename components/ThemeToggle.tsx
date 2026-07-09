"use client";

import { useEffect, useState } from "react";

type Theme = "verdant" | "clinical";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("verdant");

  useEffect(() => {
    const stored = window.localStorage.getItem("difsc-theme") as Theme | null;
    if (stored === "verdant" || stored === "clinical") {
      document.documentElement.setAttribute("data-theme", stored);
      // Reading persisted state from localStorage on mount, not derived from props/state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored);
    }
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("difsc-theme", next);
  }

  const segStyle = (active: boolean): React.CSSProperties => ({
    border: "none",
    borderRadius: 7,
    padding: "6px 13px",
    fontSize: 12.5,
    fontWeight: 600,
    background: active ? "var(--surface)" : "transparent",
    color: active ? "var(--accent)" : "var(--muted)",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
  });

  return (
    <div
      style={{
        display: "flex",
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: 9,
        padding: 3,
        gap: 2,
      }}
    >
      <button style={segStyle(theme === "verdant")} onClick={() => choose("verdant")}>
        Verdant
      </button>
      <button style={segStyle(theme === "clinical")} onClick={() => choose("clinical")}>
        Clinical
      </button>
    </div>
  );
}
