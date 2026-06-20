import Link from "next/link";
import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import adminStyles from "@/components/admin/admin-shell.module.css";
import styles from "@/components/admin/match-schedule.module.css";
import {
  MatchScheduleEditor,
  type ScheduleMatch
} from "@/components/admin/match-schedule-editor";
import { requireAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Schedule | AMS Admin"
};

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & { id: string };

export default async function ScheduleManagerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdminAccess("manage_competitions");
  if (access.status !== "allowed") return <AdminAccessBlocked access={access} />;

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const season = await currentSeason(supabase);
  const feedback = getFeedback(params);

  if (!season) {
    return (
      <div className={adminStyles.pageStack}>
        <AdminPageHeader
          path="/admin/competition/schedule"
          title="Schedule"
          description="Create a Season before scheduling matches."
        />
      </div>
    );
  }

  const matches = await rows(
    supabase
      .from("matches")
      .select(
        "id, title, status, starts_at, stream_url, vod_url, report, round_label, bracket_position"
      )
      .eq("season_id", season.id)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("bracket_position", { ascending: true })
  );
  const matchIds = matches.map((match) => match.id);
  const participants = matchIds.length
    ? await rows(
        supabase
          .from("match_participants")
          .select("id, match_id, team_id, slot")
          .in("match_id", matchIds)
          .order("slot")
      )
    : [];
  const teamIds = participants
    .map((participant) => participant.team_id)
    .filter((id): id is string => typeof id === "string");
  const teams = teamIds.length
    ? await rows(
        supabase
          .from("teams")
          .select("id, canonical_name, current_version_id")
          .in("id", Array.from(new Set(teamIds)))
      )
    : [];
  const versionIds = teams
    .map((team) => team.current_version_id)
    .filter((id): id is string => typeof id === "string");
  const versions = versionIds.length
    ? await rows(
        supabase
          .from("team_versions")
          .select("id, name, tag")
          .in("id", versionIds)
      )
    : [];

  const scheduleMatches: ScheduleMatch[] = matches.map((match) => ({
    id: match.id,
    title: String(match.title ?? "Match"),
    status: String(match.status ?? "scheduled"),
    startsAt: stringOrNull(match.starts_at),
    streamUrl: stringOrNull(match.stream_url),
    vodUrl: stringOrNull(match.vod_url),
    report: stringOrNull(match.report),
    roundLabel: stringOrNull(match.round_label),
    teams: participants
      .filter((participant) => participant.match_id === match.id)
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((participant) => teamName(participant.team_id, teams, versions))
  }));

  return (
    <div className={adminStyles.pageStack}>
      <AdminPageHeader
        path="/admin/competition/schedule"
        title="Schedule"
        description={`Manage dates, broadcast links, and reports for ${season.name}.`}
      />

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}

      <section className={styles.toolbar}>
        <span>{scheduleMatches.length} matches in the current Season</span>
        <Link href="/admin/competition/brackets">Open bracket</Link>
      </section>

      {!scheduleMatches.length ? (
        <section className={styles.empty}>
          <p>No matches exist yet. Generate the Single Elimination bracket first.</p>
          <Link href="/admin/competition/brackets">Generate bracket</Link>
        </section>
      ) : (
        <section className={styles.list}>
          {scheduleMatches.map((match) => (
            <MatchScheduleEditor match={match} key={match.id} />
          ))}
        </section>
      )}
    </div>
  );
}

async function currentSeason(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const active = await supabase
    .from("seasons")
    .select("id, name")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (active.data) return active.data;

  const fallback = await supabase
    .from("seasons")
    .select("id, name")
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return fallback.data;
}

async function rows(query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function teamName(teamId: unknown, teams: Row[], versions: Row[]) {
  const team = teams.find((item) => item.id === teamId);
  const version = versions.find((item) => item.id === team?.current_version_id);
  return String(version?.name ?? team?.canonical_name ?? "TBD");
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getFeedback(params: Record<string, string | string[] | undefined>) {
  if (params.updated === "1") return "Match schedule updated.";
  if (typeof params.error === "string") return `Action failed: ${params.error}`;
  return null;
}
