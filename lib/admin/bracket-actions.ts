"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const BRACKET_ROUTE = "/admin/competition/brackets";
const SUPPORTED_TEAM_COUNTS = new Set([2, 4, 8, 16]);

export async function createSingleEliminationAction(formData: FormData) {
  const { supabase } = await requireBracketAccess();
  const seasonId = field(formData, "seasonId");
  const name = field(formData, "name") || "Season Knockout";
  const slug = slugify(field(formData, "slug") || name);

  if (!seasonId || !slug) fail("invalid-competition");

  const { data: seasonTeams, error: seasonTeamsError } = await supabase
    .from("season_teams")
    .select("id, team_id, seed")
    .eq("season_id", seasonId)
    .eq("status", "active")
    .order("seed", { ascending: true, nullsFirst: false });

  if (seasonTeamsError) fail(seasonTeamsError.message);
  if (!SUPPORTED_TEAM_COUNTS.has(seasonTeams?.length ?? 0)) {
    fail("single-elimination-requires-2-4-8-or-16-active-teams");
  }

  const { data: existingCompetition } = await supabase
    .from("competitions")
    .select("id")
    .eq("division_id", await ensureDivision(supabase, seasonId))
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();

  if (existingCompetition) fail("competition-already-exists");

  const divisionId = await ensureDivision(supabase, seasonId);
  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .insert({
      division_id: divisionId,
      name,
      slug,
      status: "generated",
      format_key: "single_elimination",
      generated_config: { teamCount: seasonTeams!.length }
    })
    .select("id")
    .single();

  if (competitionError || !competition) fail(competitionError?.message ?? "competition-create-failed");

  const divisionTeams = [];
  for (const [index, seasonTeam] of seasonTeams!.entries()) {
    const { data, error } = await supabase
      .from("division_teams")
      .upsert(
        {
          division_id: divisionId,
          season_team_id: seasonTeam.id,
          status: "active",
          seed: seasonTeam.seed ?? index + 1
        },
        { onConflict: "division_id,season_team_id" }
      )
      .select("id, season_team_id")
      .single();

    if (error || !data) fail(error?.message ?? "division-team-failed");
    divisionTeams.push({ ...data, teamId: seasonTeam.team_id, seed: seasonTeam.seed ?? index + 1 });
  }

  const entries = [];
  for (const divisionTeam of divisionTeams) {
    const { data, error } = await supabase
      .from("competition_entries")
      .insert({
        competition_id: competition.id,
        division_team_id: divisionTeam.id,
        seed: divisionTeam.seed,
        status: "active"
      })
      .select("id, division_team_id, seed")
      .single();

    if (error || !data) fail(error?.message ?? "competition-entry-failed");
    entries.push({ ...data, teamId: divisionTeam.teamId });
  }

  const { data: stage, error: stageError } = await supabase
    .from("stages")
    .insert({
      competition_id: competition.id,
      name: "Knockout Stage",
      slug: "knockout",
      type: "single_elimination",
      status: "generated",
      sort_order: 0,
      config: { teamCount: entries.length }
    })
    .select("id")
    .single();

  if (stageError || !stage) fail(stageError?.message ?? "stage-create-failed");

  const roundCount = Math.log2(entries.length);
  const matchesByRound: Array<Array<{ id: string }>> = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const roundName = getRoundName(roundIndex, roundCount);
    const { data: round, error: roundError } = await supabase
      .from("stage_rounds")
      .insert({
        stage_id: stage.id,
        name: roundName,
        slug: slugify(roundName),
        sort_order: roundIndex
      })
      .select("id")
      .single();

    if (roundError || !round) fail(roundError?.message ?? "round-create-failed");

    const matchCount = entries.length / 2 ** (roundIndex + 1);
    const roundMatches = [];

    for (let position = 0; position < matchCount; position += 1) {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          season_id: seasonId,
          competition_id: competition.id,
          stage_id: stage.id,
          round_id: round.id,
          title: `${roundName} ${position + 1}`,
          status: "scheduled",
          round_label: roundName,
          bracket_position: position
        })
        .select("id")
        .single();

      if (matchError || !match) fail(matchError?.message ?? "match-create-failed");
      roundMatches.push(match);
    }

    matchesByRound.push(roundMatches);
  }

  for (let index = 0; index < entries.length; index += 1) {
    const matchIndex = Math.floor(index / 2);
    const { error } = await supabase.from("match_participants").insert({
      match_id: matchesByRound[0][matchIndex].id,
      team_id: entries[index].teamId,
      competition_entry_id: entries[index].id,
      slot: (index % 2) + 1,
      source_type: "seed"
    });

    if (error) fail(error.message);
  }

  for (let roundIndex = 0; roundIndex < matchesByRound.length - 1; roundIndex += 1) {
    for (let matchIndex = 0; matchIndex < matchesByRound[roundIndex].length; matchIndex += 1) {
      const { error } = await supabase.from("advancement_rules").insert({
        stage_id: stage.id,
        competition_id: competition.id,
        source_type: "match",
        source_id: matchesByRound[roundIndex][matchIndex].id,
        outcome: "winner",
        target_match_id: matchesByRound[roundIndex + 1][Math.floor(matchIndex / 2)].id,
        target_slot: (matchIndex % 2) + 1,
        is_active: true
      });

      if (error) fail(error.message);
    }
  }

  const { error: readyError } = await supabase
    .from("competitions")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", competition.id);

  if (readyError) fail(readyError.message);
  finish("created");
}

export async function certifyMatchWinnerAction(formData: FormData) {
  const { supabase, userId } = await requireBracketAccess();
  const matchId = field(formData, "matchId");
  const winnerParticipantId = field(formData, "winnerParticipantId");
  const scoreOne = integerField(formData, "scoreOne");
  const scoreTwo = integerField(formData, "scoreTwo");

  if (!matchId || !winnerParticipantId || scoreOne < 0 || scoreTwo < 0 || scoreOne === scoreTwo) {
    fail("invalid-result");
  }

  const { data: currentResult } = await supabase
    .from("match_results")
    .select("id")
    .eq("match_id", matchId)
    .eq("is_current", true)
    .limit(1)
    .maybeSingle();

  if (currentResult) fail("result-already-certified");

  const { data: participants, error: participantsError } = await supabase
    .from("match_participants")
    .select("id, team_id, competition_entry_id, slot")
    .eq("match_id", matchId)
    .order("slot");

  if (participantsError) fail(participantsError.message);
  const winner = participants?.find((participant) => participant.id === winnerParticipantId);
  if (!winner?.competition_entry_id || participants?.length !== 2) fail("invalid-winner");

  const { error: resultError } = await supabase.from("match_results").insert({
    match_id: matchId,
    revision: 1,
    is_current: true,
    winner_participant_id: winnerParticipantId,
    status: "certified",
    score: { 1: scoreOne, 2: scoreTwo },
    certified_by: userId,
    certified_at: new Date().toISOString(),
    created_by: userId
  });

  if (resultError) fail(resultError.message);

  const { error: matchError } = await supabase
    .from("matches")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (matchError) fail(matchError.message);

  const { data: rule, error: ruleError } = await supabase
    .from("advancement_rules")
    .select("target_match_id, target_slot")
    .eq("source_id", matchId)
    .eq("outcome", "winner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (ruleError) fail(ruleError.message);

  if (rule?.target_match_id && rule.target_slot) {
    const { error } = await supabase.from("match_participants").upsert(
      {
        match_id: rule.target_match_id,
        team_id: winner.team_id,
        competition_entry_id: winner.competition_entry_id,
        slot: rule.target_slot,
        source_type: "match",
        source_match_id: matchId,
        source_outcome: "winner"
      },
      { onConflict: "match_id,slot" }
    );

    if (error) fail(error.message);
  } else {
    const { data: entry, error: entryError } = await supabase
      .from("competition_entries")
      .select("competition_id, division_team_id")
      .eq("id", winner.competition_entry_id)
      .single();

    if (entryError || !entry) fail(entryError?.message ?? "winner-entry-missing");

    const { error } = await supabase
      .from("competitions")
      .update({
        champion_division_team_id: entry.division_team_id,
        status: "finalized",
        updated_at: new Date().toISOString()
      })
      .eq("id", entry.competition_id);

    if (error) fail(error.message);
  }

  finish("result");
}

async function ensureDivision(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  seasonId: string
) {
  const { data: existing } = await supabase
    .from("divisions")
    .select("id")
    .eq("season_id", seasonId)
    .eq("slug", "division-1")
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("divisions")
    .insert({
      season_id: seasonId,
      name: "Division 1",
      slug: "division-1",
      status: "published"
    })
    .select("id")
    .single();

  if (error || !data) fail(error?.message ?? "division-create-failed");
  return data.id as string;
}

async function requireBracketAccess() {
  const access = await getAdminAccess("manage_brackets");
  if (access.status === "unauthenticated") redirect("/admin-login?next=" + BRACKET_ROUTE);
  if (access.status !== "allowed" || !access.user) redirect("/admin?error=forbidden");

  return {
    supabase: await createSupabaseServerClient(),
    userId: access.user.id
  };
}

function getRoundName(index: number, roundCount: number) {
  const remaining = roundCount - index;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semi Final";
  if (remaining === 3) return "Quarter Final";
  return `Round ${index + 1}`;
}

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function integerField(formData: FormData, key: string) {
  const value = Number(field(formData, key));
  return Number.isInteger(value) ? value : -1;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function fail(message: string): never {
  redirect(`${BRACKET_ROUTE}?error=${encodeURIComponent(message)}`);
}

function finish(message: string): never {
  revalidatePath("/admin");
  revalidatePath(BRACKET_ROUTE);
  redirect(`${BRACKET_ROUTE}?${message}=1`);
}
