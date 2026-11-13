import type { Metadata } from "next";
import ProgrammePage from "@/components/ProgrammePage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conference Programme — DIFSC 2026" };

export default function Page() {
  return <ProgrammePage lang="en" />;
}
