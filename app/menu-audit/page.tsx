import type { Metadata } from "next";
import MenuAuditApp from "@/components/menu-audit/MenuAuditApp";

export const metadata: Metadata = {
  title: "School Menu Audit — MySchoolFood",
  description: "Upload a Dubai Municipality school-menu workbook and get an audit report.",
  robots: { index: false, follow: false }, // an unlisted tool: keep it out of search results
};

export default function MenuAuditPage() {
  return <MenuAuditApp />;
}
