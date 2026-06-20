import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import adminStyles from "@/components/admin/admin-shell.module.css";
import bracketStyles from "@/components/admin/bracket-manager.module.css";
import { requireAdminAccess } from "@/lib/admin/permissions";
import {
  certifyMatchWinnerAction,
  createSingleEliminationAction
} from "@/lib/admin/bracket-actions";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Bracket | AMS Admin"
};

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & { id: string };

export default async function BracketManagerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdminAccess("manage_brackets");
  if (access.status !== "allowed") return <AdminAccessBlocked access={access} />;

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const season = await currentSeason(supabase);
  const feedback = getFeedback(params);

  if (!season) {
    return (
      <div className={adminStyles.pageStack}>
        <AdminPageHeader
          path="/admin/competition/brackets"
          title="Single Elimination"
          description="Create a Season before generating a bracket."
        />
      </div>
    );
  }

  const division = await maybeOne(
    supabase.from("divisions").select("id").eq("season_id", season.id).limit(1)
  );
  const competition = division
    ? await maybeOne(
        supabase
          .from("competitions")
          .select("id, name, status")
          .eq("division_id", division.id)
          .neq("status", "archived")
          .limit(1)
      )
    : null;

  if (!competition) {
    const { count } = await supabase
      .from("season_teams")
      .select("id", { count: "exact", head: true })
      .eq("season_id", season.id)
      .eq("status", "active");

    return (
      <div className={adminStyles.pageStack}>
        <AdminPageHeader
          path="/admin/competition/brackets"
          title="Single Elimination"
          description={`Create the Season 1 knockout bracket for ${season.name}.`}
        />
        {feedback ? <div className={bracketStyles.feedback}>{feedback}</div> : null}
        <section className={bracketStyles.setup}>
          <h2>Generate bracket</h2>
          <p>
            Active teams: {count ?? 0}. This launch version supports exactly 2, 4, 8, or 16 teams.
          </p>
          <form action={createSingleEliminationAction} className={bracketStyles.form}>
            <input name="seasonId" type="hidden" value={season.id} />
            <label>
              Competition name
              <input name="name" defaultValue={`${season.name} Knockout`} required />
            </label>
            <label>
              Slug
              <input name="slug" defaultValue={`${season.slug}-knockout`} pattern="[a-z0-9-]+" />
            </label>
            <button className={bracketStyles.primary} type="submit">
              Generate Single Elimination
            </button>
          </form>
        </section>
      </div>
    );
  }

  const stage = await maybeOne(
    supabase
      .from("stages")
      .select("id")
      .eq("competition_id", competition.id)
      .eq("type", "single_elimination")
      .limit(1)
  );
  const rounds = stage
    ? await rows(
        supabase
          .from("stage_rounds")
          .select("id, name, sort_order")
          .eq("stage_id", stage.id)
          .order("sort_order")
      )
    : [];
  const matches = stage
    ? await rows(
        supabase
          .from("matches")
          .select("id, round_id, title, status, bracket_position")
          .eq("stage_id", stage.id)
          .order("bracket_position")
      )
    : [];
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
  const results = matchIds.length
    ? await rows(
        supabase
          .from("match_results")
          .select("id, match_id, winner_participant_id, score, status")
          .in("match_id", matchIds)
          .eq("is_current", true)
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

  return (
    <div className={adminStyles.pageStack}>
      <AdminPageHeader
        path="/admin/competition/brackets"
        title={String(competition.name)}
        description={`${season.name} · Single Elimination · ${competition.status}`}
      />
      {feedback ? <div className={bracketStyles.feedback}>{feedback}</div> : null}

      <div className={bracketStyles.bracket}>
        {rounds.map((round) => (
          <section className={bracketStyles.round} key={round.id}>
            <h2>{String(round.name)}</h2>
            {matches
              .filter((match) => match.round_id === round.id)
              .map((match) => {
                const matchParticipants = participants.filter(
                  (participant) => participant.match_id === match.id
                );
                const result = results.find((item) => item.match_id === match.id);
                const score = (result?.score ?? {}) as Record<string, number>;

                return (
                  <article className={bracketStyles.match} key={match.id}>
                    <header>
                      <span>{String(match.title)}</span>
                      <span>{String(match.status)}</span>
                    </header>

                    {[1, 2].map((slot) => {
                      const participant = matchParticipants.find((item) => item.slot === slot);
                      const isWinner = result?.winner_participant_id === participant?.id;
                      return (
                        <div
                          className={
                            isWinner
                              ? `${bracketStyles.participant} ${bracketStyles.winner}`
                              : bracketStyles.participant
                          }
                          key={slot}
                        >
                          <strong>{participant ? teamName(participant.team_id, teams, versions) : "TBD"}</strong>
                          <span>{result ? score[String(slot)] ?? "-" : "-"}</span>
                        </div>
                      );
                    })}

                    {!result && matchParticipants.length === 2 ? (
                      <form action={certifyMatchWinnerAction} className={bracketStyles.form}>
                        <input name="matchId" type="hidden" value={match.id} />
                        <div className={bracketStyles.scoreGrid}>
                          <label>
                            Score 1
                            <input name="scoreOne" type="number" min="0" defaultValue="0" required />
                          </label>
                          <label>
                            Score 2
                            <input name="scoreTwo" type="number" min="0" defaultValue="0" required />
                          </label>
                        </div>
                        <label>
                          Winner
                          <select name="winnerParticipantId" required defaultValue="">
                            <option value="" disabled>Select winner</option>
                            {matchParticipants.map((participant) => (
                              <option value={participant.id} key={participant.id}>
                                {teamName(participant.team_id, teams, versions)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className={bracketStyles.primary} type="submit">
                          Certify result
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
          </section>
        ))}
      </div>
    </div>
  );
}

async function currentSeason(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const active = await supabase
    .from("seasons")
    .select("id, name, slug, status")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (active.data) return active.data;

  const fallback = await supabase
    .from("seasons")
    .select("id, name, slug, status")
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return fallback.data;
}

async function maybeOne(query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? [])[0] as Row | undefined) ?? null;
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

function getFeedback(params: Record<string, string | string[] | undefined>) {
  if (params.created === "1") return "Single Elimination bracket created.";
  if (params.result === "1") return "Result certified and winner advanced.";
  if (typeof params.error === "string") return `Action failed: ${params.error}`;
  return null;
}
