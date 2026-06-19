import Link from "next/link";
import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import adminStyles from "@/components/admin/admin-shell.module.css";
import teamStyles from "@/components/admin/team-manager.module.css";
import { requireAdminAccess } from "@/lib/admin/permissions";
import {
  createTeamAction,
  removeTeamFromSeasonAction,
  updateTeamAction
} from "@/lib/admin/team-actions";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Teams | AMS Admin"
};

export const dynamic = "force-dynamic";

type Season = {
  id: string;
  name: string;
  status: string;
};

type SeasonTeam = {
  id: string;
  season_id: string;
  team_id: string;
  team_version_id: string | null;
  status: string;
  seed: number | null;
};

type Team = {
  id: string;
  canonical_name: string;
  slug: string;
  description: string | null;
  current_version_id: string | null;
};

type TeamVersion = {
  id: string;
  team_id: string;
  name: string;
  tag: string | null;
  logo_asset_id: string | null;
  description: string | null;
};

type MediaAsset = {
  id: string;
  public_url: string | null;
};

export default async function TeamManagerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdminAccess("manage_teams");

  if (access.status !== "allowed") {
    return <AdminAccessBlocked access={access} />;
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const season = await getCurrentSeason(supabase);
  const feedback = getFeedback(params);

  if (!season) {
    return (
      <div className={teamStyles.card}>
        <AdminPageHeader
          path="/admin/competition/teams"
          title="Teams"
          description="A Season must exist before teams can be added."
        />
        <p>No current Season was found.</p>
        <Link className={teamStyles.primary} href="/admin/seasons/new">
          Create Season
        </Link>
      </div>
    );
  }

  const { data: participationData, error: participationError } = await supabase
    .from("season_teams")
    .select("id, season_id, team_id, team_version_id, status, seed")
    .eq("season_id", season.id)
    .neq("status", "archived")
    .order("seed", { ascending: true, nullsFirst: false });

  const participations = (participationData ?? []) as SeasonTeam[];
  const teamIds = participations.map((item) => item.team_id);
  const versionIds = participations
    .map((item) => item.team_version_id)
    .filter((id): id is string => Boolean(id));

  const teams = teamIds.length
    ? await loadRows<Team>(
        supabase
          .from("teams")
          .select("id, canonical_name, slug, description, current_version_id")
          .in("id", teamIds)
      )
    : [];

  const fallbackVersionIds = teams
    .map((team) => team.current_version_id)
    .filter((id): id is string => Boolean(id));
  const allVersionIds = Array.from(new Set([...versionIds, ...fallbackVersionIds]));

  const versions = allVersionIds.length
    ? await loadRows<TeamVersion>(
        supabase
          .from("team_versions")
          .select("id, team_id, name, tag, logo_asset_id, description")
          .in("id", allVersionIds)
      )
    : [];

  const logoIds = versions
    .map((version) => version.logo_asset_id)
    .filter((id): id is string => Boolean(id));
  const assets = logoIds.length
    ? await loadRows<MediaAsset>(
        supabase.from("media_assets").select("id, public_url").in("id", logoIds)
      )
    : [];

  const rows = participations
    .map((participation) => {
      const team = teams.find((item) => item.id === participation.team_id);
      if (!team) return null;

      const versionId = participation.team_version_id ?? team.current_version_id;
      const version = versions.find((item) => item.id === versionId);
      const logo = assets.find((asset) => asset.id === version?.logo_asset_id)?.public_url ?? null;

      return { participation, team, version, logo };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <div className={adminStyles.pageStack}>
      <AdminPageHeader
        path="/admin/competition/teams"
        title="Teams"
        description={`Season-scoped Team Manager for ${season.name} (${season.status}).`}
      />

      {feedback ? <div className={teamStyles.feedback}>{feedback}</div> : null}
      {participationError ? (
        <div className={teamStyles.feedback}>Could not load teams: {participationError.message}</div>
      ) : null}

      <div className={teamStyles.layout}>
        <section className={teamStyles.card}>
          <h2>{season.name} teams</h2>
          <p>Team identity is global; participation and the selected identity version belong to this Season.</p>

          {!rows.length ? (
            <div className={teamStyles.empty}>No teams have been added to this Season.</div>
          ) : (
            <div className={teamStyles.tableWrap}>
              <table className={teamStyles.table}>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Tag</th>
                    <th>Status</th>
                    <th>Seed</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ participation, team, version, logo }) => (
                    <tr key={participation.id}>
                      <td>
                        <div className={teamStyles.identity}>
                          {logo ? (
                            <img className={teamStyles.logo} src={logo} alt="" />
                          ) : (
                            <span className={`${teamStyles.logo} ${teamStyles.logoFallback}`}>
                              {(version?.tag ?? team.canonical_name).slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span>
                            <strong>{version?.name ?? team.canonical_name}</strong>
                            <br />
                            <small>/{team.slug}</small>
                          </span>
                        </div>
                      </td>
                      <td>{version?.tag ?? "-"}</td>
                      <td>{participation.status}</td>
                      <td>{participation.seed ?? "-"}</td>
                      <td>
                        <details className={teamStyles.details}>
                          <summary>Edit</summary>
                          <div className={teamStyles.editor}>
                            <form
                              action={updateTeamAction}
                              className={teamStyles.form}
                              encType="multipart/form-data"
                            >
                              <input name="seasonTeamId" type="hidden" value={participation.id} />
                              <input name="seasonId" type="hidden" value={season.id} />
                              <input name="teamId" type="hidden" value={team.id} />
                              <label>
                                Team name
                                <input
                                  name="name"
                                  defaultValue={version?.name ?? team.canonical_name}
                                  required
                                />
                              </label>
                              <label>
                                Tag
                                <input name="tag" defaultValue={version?.tag ?? ""} maxLength={16} />
                              </label>
                              <label>
                                Summary
                                <textarea
                                  name="summary"
                                  defaultValue={version?.description ?? team.description ?? ""}
                                />
                              </label>
                              <label>
                                New logo
                                <input
                                  name="logo"
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                />
                              </label>
                              <label className={teamStyles.checkbox}>
                                <input name="removeLogo" type="checkbox" />
                                Remove current logo
                              </label>
                              <button className={teamStyles.primary} type="submit">
                                Save changes
                              </button>
                            </form>

                            <form action={removeTeamFromSeasonAction}>
                              <input name="seasonTeamId" type="hidden" value={participation.id} />
                              <button className={teamStyles.danger} type="submit">
                                Remove from Season
                              </button>
                            </form>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className={teamStyles.card}>
          <h2>Add team</h2>
          <p>Create a global team identity and add its first version to {season.name}.</p>
          <form action={createTeamAction} className={teamStyles.form} encType="multipart/form-data">
            <input name="seasonId" type="hidden" value={season.id} />
            <label>
              Team name
              <input name="name" placeholder="Team Phoenix" required minLength={2} />
            </label>
            <label>
              Slug
              <input name="slug" placeholder="team-phoenix" pattern="[a-z0-9-]+" />
            </label>
            <label>
              Tag
              <input name="tag" placeholder="PHX" maxLength={16} />
            </label>
            <label>
              Summary
              <textarea name="summary" placeholder="Short team description" />
            </label>
            <label>
              Team logo
              <input
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
              />
            </label>
            <button className={teamStyles.primary} type="submit">
              Add team
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

async function getCurrentSeason(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<Season | null> {
  const active = await supabase
    .from("seasons")
    .select("id, name, status")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active.data) return active.data as Season;

  const current = await supabase
    .from("seasons")
    .select("id, name, status")
    .is("deleted_at", null)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (current.data as Season | null) ?? null;
}

async function loadRows<T>(query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

function getFeedback(params: Record<string, string | string[] | undefined>) {
  if (params.created === "1") return "Team created.";
  if (params.updated === "1") return "Team updated.";
  if (params.removed === "1") return "Team removed from this Season.";
  if (params.archived === "1") return "Team was already in use and has been archived.";
  if (typeof params.error === "string") return `Action failed: ${params.error}`;
  return null;
}
