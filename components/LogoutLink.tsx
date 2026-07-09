"use client";

import { logout } from "@/lib/actions/auth";

export default function LogoutLink() {
  return (
    <button onClick={() => logout()} style={{ background: "none", border: "none", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
      Log out
    </button>
  );
}
