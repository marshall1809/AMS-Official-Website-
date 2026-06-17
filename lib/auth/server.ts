import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { AppRole } from "@/lib/cms/types";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always set cookies; middleware refresh can handle it.
        }
      }
    }
  });
}

export async function requireAnyRole(roles: AppRole[]) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data, error } = await supabase
    .from("user_role_assignments")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) throw error;

  const userRoles = new Set((data ?? []).map((item) => item.role as AppRole));
  if (userRoles.has("super_admin") || userRoles.has("admin") || roles.some((role) => userRoles.has(role))) {
    return { supabase, user, roles: userRoles };
  }

  throw new Error("Not authorized.");
}
