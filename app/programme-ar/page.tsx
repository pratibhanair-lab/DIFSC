import type { Metadata } from "next";
import ProgrammePage from "@/components/ProgrammePage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "برنامج المؤتمر — DIFSC 2026" };

export default function Page() {
  return <ProgrammePage lang="ar" />;
}
