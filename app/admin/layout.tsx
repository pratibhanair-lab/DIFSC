import { requireRole } from "@/lib/auth";
import AdminHeader from "@/components/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminHeader userName={user.name} />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px 60px" }}>{children}</div>
    </div>
  );
}
