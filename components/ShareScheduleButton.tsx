"use client";

import { useState } from "react";

export default function ShareScheduleButton() {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/programme`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link to share the programme:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button onClick={handleClick} className="btn btn-small btn-outline" style={{ whiteSpace: "nowrap" }}>
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
