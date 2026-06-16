import { AdminShell } from "@/components/admin-shell";
import { AdminLogin } from "@/components/admin-login";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCmsData } from "@/lib/cms/repository";
import type { AppRole } from "@/lib/cms/types";

export const metadata = {
  title: "Admin"
};

const writeRoles: AppRole[] = [
  "super_admin",
  "admin",
  "designer",
  "tournament_manager",
  "content_manager",
  "media_manager"
];

export default async function AdminSectionPage({
  params,
  searchParams
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ auth?: string }>;
}) {
  const [{ section = [] }, data] = await Promise.all([params, getCmsData()]);
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!hasSupabaseEnv) {
    return <AdminShell data={data} isWritable={false} sectionPath={section} />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const paramsValue = await searchParams;
    return <AdminLogin failed={paramsValue.auth === "failed"} />;
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const userRoles = new Set((roles ?? []).map((item) => item.role as AppRole));
  const isWritable = writeRoles.some((role) => userRoles.has(role));

  return <AdminShell data={data} isWritable={isWritable} sectionPath={section} />;
}
