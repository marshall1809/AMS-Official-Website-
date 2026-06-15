import { AdminShell } from "@/components/admin-shell";
import { AdminLogin } from "@/components/admin-login";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCmsData } from "@/lib/cms/repository";

export const metadata = {
  title: "Admin"
};

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const data = await getCmsData();
  const isWritable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (isWritable) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      const params = await searchParams;
      return <AdminLogin failed={params.auth === "failed"} />;
    }
  }

  return <AdminShell data={data} isWritable={isWritable} />;
}
