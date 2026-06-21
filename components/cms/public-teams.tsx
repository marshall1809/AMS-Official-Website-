import Link from "next/link";
import { SiteShell } from "@/components/cms/site-shell";
import { defaultCmsData } from "@/lib/cms/default-data";
import { mergeThemes } from "@/lib/cms/theme";
import type {
  CmsData,
  PageRecord,
  SeasonRecord,
  SeasonTeamRecord,
  TeamRecord
} from "@/lib/cms/types";

type SeasonTeamEntry = {
  participation: SeasonTeamRecord;
  team: TeamRecord;
};

export function PublicTeamsPage({
  data,
  season
}: {
  data: CmsData;
  season?: SeasonRecord;
}) {
  const page = publicPage("teams", season);
  const entries = seasonEntries(data, season?.id);

  return (
    <SiteShell data={data} season={season} theme={publicTheme(data, season)} page={page}>
      <section className="public-page-hero">
        <div className="container">
          <p className="section-kicker">{season?.name ?? "Alliance Master Series"}</p>
          <h1>Teams</h1>
          <p>The official teams competing in this Alliance Master Series Season.</p>
        </div>
      </section>

      <section className="container content-section">
        <div className="public-team-grid">
          {entries.map((entry) => {
            const logo = teamLogo(data, entry);
            const href = season
              ? `/seasons/${season.slug}/teams/${entry.team.slug}`
              : `/teams/${entry.team.slug}`;

            return (
              <Link className="public-team-card panel" href={href} key={entry.team.id}>
                <span className="public-team-card__seed">
                  {entry.participation.seed ? String(entry.participation.seed).padStart(2, "0") : "AMS"}
                </span>
                <span className="public-team-card__logo">
                  {logo ? (
                    <img
                      src={logo}
                      alt={entry.participation.displayName ?? entry.team.name}
                    />
                  ) : (
                    entry.participation.tag ?? entry.team.tag ?? entry.team.name.slice(0, 2)
                  )}
                </span>
                <span className="public-team-card__content">
                  <small>{entry.participation.tag ?? entry.team.tag ?? "Team"}</small>
                  <strong>{entry.participation.displayName ?? entry.team.name}</strong>
                  <p>{entry.participation.description ?? entry.team.description ?? "Season competitor"}</p>
                </span>
                <span className="public-team-card__status">{entry.participation.status}</span>
              </Link>
            );
          })}
        </div>

        {!entries.length ? (
          <section className="public-empty panel">
            <h2>No teams published yet</h2>
            <p>Teams will appear here as soon as they are added to this Season.</p>
          </section>
        ) : null}
      </section>
    </SiteShell>
  );
}

export function PublicTeamProfile({
  data,
  season,
  entry
}: {
  data: CmsData;
  season: SeasonRecord;
  entry: SeasonTeamEntry;
}) {
  const page = publicPage(`team-${entry.team.slug}`, season);
  const logo = teamLogo(data, entry);
  const matches = data.matches
    .filter((match) => match.seasonId === season.id)
    .filter((match) =>
      data.matchParticipants.some(
        (participant) => participant.matchId === match.id && participant.teamId === entry.team.id
      )
    )
    .sort((a, b) => {
      if (a.startsAt && b.startsAt) return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      if (a.startsAt) return -1;
      if (b.startsAt) return 1;
      return (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0);
    })
    .slice(0, 10);
  const socialLinks = Object.entries(entry.team.socialLinks ?? {}).filter(
    ([, href]) => typeof href === "string" && /^https?:\/\//.test(href)
  );

  return (
    <SiteShell data={data} season={season} theme={publicTheme(data, season)} page={page}>
      <section className="team-profile-hero">
        <div className="container team-profile-hero__inner">
          <span className="team-profile-logo">
            {logo ? (
              <img src={logo} alt={entry.participation.displayName ?? entry.team.name} />
            ) : (
              entry.participation.tag ?? entry.team.tag ?? entry.team.name.slice(0, 2)
            )}
          </span>
          <div>
            <p className="section-kicker">{season.name}</p>
            <h1>{entry.participation.displayName ?? entry.team.name}</h1>
            <p>{entry.participation.description ?? entry.team.description ?? "Alliance Master Series competitor."}</p>
            <div className="team-profile-meta">
              <span>{entry.participation.tag ?? entry.team.tag ?? "Team"}</span>
              <span>{entry.participation.status}</span>
              {entry.participation.seed ? <span>Seed {entry.participation.seed}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="container content-section team-profile-layout">
        <article className="team-profile-panel panel">
          <header>
            <h2>Season matches</h2>
            <span>{matches.length}</span>
          </header>

          <div className="team-profile-matches">
            {matches.map((match) => {
              const participants = data.matchParticipants
                .filter((participant) => participant.matchId === match.id)
                .sort((a, b) => a.slot - b.slot);
              const own = participants.find((participant) => participant.teamId === entry.team.id);
              const opponentParticipant = participants.find(
                (participant) => participant.teamId && participant.teamId !== entry.team.id
              );
              const opponent = data.teams.find((team) => team.id === opponentParticipant?.teamId);

              return (
                <article key={match.id}>
                  <div>
                    <small>{match.roundLabel ?? match.status}</small>
                    <strong>vs {opponent?.name ?? "TBD"}</strong>
                  </div>
                  <div>
                    <small>{match.startsAt ? formatDate(match.startsAt) : "Date TBD"}</small>
                    <strong>
                      {typeof own?.score === "number" || typeof opponentParticipant?.score === "number"
                        ? `${own?.score ?? "-"} : ${opponentParticipant?.score ?? "-"}`
                        : match.status}
                    </strong>
                  </div>
                </article>
              );
            })}
            {!matches.length ? <p className="empty-copy">No matches are available for this team yet.</p> : null}
          </div>
        </article>

        <aside className="team-profile-panel panel">
          <h2>Team links</h2>
          {socialLinks.length ? (
            <div className="team-social-links">
              {socialLinks.map(([label, href]) => (
                <a href={href} key={label} rel="noreferrer" target="_blank">
                  {label}
                </a>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No public team links have been added.</p>
          )}
          <Link className="button secondary" href={`/seasons/${season.slug}/teams`}>
            Back to teams
          </Link>
        </aside>
      </section>
    </SiteShell>
  );
}

export function currentPublicSeason(data: CmsData) {
  return (
    data.seasons.find((season) => season.status === "active") ??
    data.seasons.find((season) => season.status === "ready") ??
    data.seasons.find((season) => season.status === "finished") ??
    data.seasons.find((season) => season.status !== "archived" && season.status !== "deleted")
  );
}

export function findSeasonTeamEntry(data: CmsData, seasonId: string, teamSlug: string) {
  return seasonEntries(data, seasonId).find((entry) => entry.team.slug === teamSlug);
}

function seasonEntries(data: CmsData, seasonId?: string): SeasonTeamEntry[] {
  if (!seasonId) return [];

  return data.seasonTeams
    .filter(
      (participation) =>
        participation.seasonId === seasonId && participation.status !== "archived"
    )
    .map((participation) => ({
      participation,
      team: data.teams.find((team) => team.id === participation.teamId)
    }))
    .filter((entry): entry is SeasonTeamEntry => Boolean(entry.team))
    .sort((a, b) => (a.participation.seed ?? 999) - (b.participation.seed ?? 999));
}

function teamLogo(data: CmsData, entry: SeasonTeamEntry) {
  const assetId =
    entry.participation.logoAssetId ??
    entry.team.defaultLogoId ??
    entry.team.logoAssetId;

  return data.mediaAssets.find((asset) => asset.id === assetId)?.publicUrl;
}

function publicPage(slug: string, season?: SeasonRecord): PageRecord {
  return {
    id: season ? `public-${slug}-${season.id}` : `public-${slug}`,
    title: slug,
    slug,
    status: "published",
    scope: season ? "season" : "global",
    seasonId: season?.id,
    blocks: []
  };
}

function publicTheme(data: CmsData, season?: SeasonRecord) {
  const globalTheme =
    data.themes.find((theme) => theme.scope === "global") ??
    defaultCmsData.themes.find((theme) => theme.scope === "global") ??
    defaultCmsData.themes[0];
  const seasonTheme = season
    ? data.themes.find(
        (theme) => theme.id === season.themeId || theme.seasonId === season.id
      )
    : undefined;

  return mergeThemes(globalTheme, seasonTheme);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
