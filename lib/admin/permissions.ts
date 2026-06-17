import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/server";

export type AdminRole =
  | "super_admin"
  | "admin"
  | "designer"
  | "tournament_manager"
  | "content_manager"
  | "media_manager"
  | "viewer";

export type AdminScope = "global" | "season" | "division" | "competition" | "stage" | "content" | "media";

export type AdminRoleAssignment = {
  id: string;
  role: AdminRole;
  scope: AdminScope;
  scope_id: string | null;
  capabilities: string[] | null;
  is_active: boolean;
};

export type AdminAccess = {
  status: "allowed" | "unauthenticated" | "forbidden" | "unconfigured";
  user: {
    id: string;
    email?: string;
  } | null;
  assignments: AdminRoleAssignment[];
  reason?: string;
};

const ADMIN_ENTRY_CAPABILITY = "view_admin";

export function hasAdminCapability(
  assignments: AdminRoleAssignment[],
  capability = ADMIN_ENTRY_CAPABILITY,
  scope?: { type: AdminScope; id?: string | null }
) {
  return assignments.some((assignment) => {
    if (!assignment.is_active) return false;
    if (assignment.role === "super_admin" || assignment.role === "admin") return true;

    const capabilities = assignment.capabilities ?? [];
    const hasCapability = capabilities.includes(capability);
    if (!hasCapability) return false;

    if (!scope) return true;
    if (assignment.scope === "global") return true;
    return assignment.scope === scope.type && assignment.scope_id === scope.id;
  });
}

export async function getAdminAccess(requiredCapability = ADMIN_ENTRY_CAPABILITY): Promise<AdminAccess> {
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!hasSupabaseEnv) {
    return {
      status: "unconfigured",
      user: null,
      assignments: [],
      reason: "Supabase environment variables are missing."
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "unauthenticated",
      user: null,
      assignments: [],
      reason: userError?.message ?? "No authenticated Supabase user."
    };
  }

  const { data, error } = await supabase
    .from("user_role_assignments")
    .select("id, role, scope, scope_id, capabilities, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) {
    return {
      status: "forbidden",
      user: { id: user.id, email: user.email ?? undefined },
      assignments: [],
      reason: error.message
    };
  }

  const assignments = (data ?? []) as AdminRoleAssignment[];
  const isAllowed = hasAdminCapability(assignments, requiredCapability);

  return {
    status: isAllowed ? "allowed" : "forbidden",
    user: { id: user.id, email: user.email ?? undefined },
    assignments,
    reason: isAllowed ? undefined : `Missing admin capability: ${requiredCapability}`
  };
}

export async function requireAdminAccess(requiredCapability = ADMIN_ENTRY_CAPABILITY) {
  const access = await getAdminAccess(requiredCapability);

  if (access.status === "unauthenticated") {
    redirect("/admin-login?next=/admin");
  }

  return access;
}

export function summarizeAdminAccess(assignments: AdminRoleAssignment[]) {
  if (!assignments.length) return "No admin role";
  if (assignments.some((assignment) => assignment.role === "super_admin")) return "Super Admin";
  if (assignments.some((assignment) => assignment.role === "admin")) return "Admin";
  return assignments
    .map((assignment) => assignment.role.replaceAll("_", " "))
    .filter(Boolean)
    .join(", ");
}
