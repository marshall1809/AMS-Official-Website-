import type { createSupabaseServerClient } from "@/lib/auth/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdminDashboardStats = {
  activeSeason: string;
  competitions: number;
  teams: number;
  matches: number;
  pendingResults: number;
  recentChanges: number;
};

export async function getAdminDashboardStats(supabase: SupabaseServerClient): Promise<AdminDashboardStats> {
  const [activeSeason, competitions, teams, matches, pendingResults, recentChanges] = await Promise.all([
    getActiveSeasonName(supabase),
    getCount(supabase, "competitions"),
    getCount(supabase, "teams"),
    getCount(supabase, "matches"),
    getCount(supabase, "match_results", "status", ["submitted", "disputed"]),
    getCount(supabase, "audit_logs")
  ]);

  return {
    activeSeason,
    competitions,
    teams,
    matches,
    pendingResults,
    recentChanges
  };
}

async function getActiveSeasonName(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("seasons")
    .select("name")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.name) return "No active season";
  return String(data.name);
}

async function getCount(
  supabase: SupabaseServerClient,
  table: string,
  filterColumn?: string,
  filterValues?: string[]
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  if (filterColumn && filterValues?.length) {
    query = query.in(filterColumn, filterValues);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}
