import { AdminLogin } from "@/components/admin-login";

export const metadata = {
  title: "Admin Login | Alliance Master Series"
};

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ auth?: string; next?: string }>;
}) {
  const params = await searchParams;

  return <AdminLogin failed={params.auth === "failed"} nextPath={params.next ?? "/admin"} />;
}
