import { AdminDashboard } from "@/components/admin/admin-page";
import { getAdminDashboardStats } from "@/lib/admin/dashboard";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Dashboard | AMS Admin"
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const stats = await getAdminDashboardStats(supabase);

  return <AdminDashboard stats={stats} />;
}
