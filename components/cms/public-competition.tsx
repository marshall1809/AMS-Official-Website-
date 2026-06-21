import Link from "next/link";
import { SiteShell } from "@/components/cms/site-shell";
import { defaultCmsData } from "@/lib/cms/default-data";
import { mergeThemes } from "@/lib/cms/theme";
import type {
  CmsData,
  MatchParticipantRecord,
  MatchRecord,
  PageRecord,
  SeasonRecord,
  SeasonTeamRecord,
  TeamRecord
} from "@/lib/cms/types";

type TeamEntry = {
  participation: SeasonTeamRecord;
  team: TeamRecord;
};

export function PublicSchedulePage({
  data,
  season
}: {
  data: CmsData;
  season?: SeasonRecord;
}) {
  const matches = seasonMatches(data, season?.id).sort(scheduleOrder);
  const bracketHref = season ? `/seasons/${season.slug}/bracket` : "/bracket";

  return (
    <SiteShell
      data={data}
      season={season}
      theme={publicTheme(data, season)}
      page={publicPage("schedule", season)}
    >
      <CompetitionHero
        description="Dates, matchups, streams and results for the current competition."
        season={season}
        title="Schedule"
      />

      <section className="container content-section">
        <div className="competition-toolbar">
          <span>{matches.length} matches</span>
          <Link className="button secondary" href={bracketHref}>
            View bracket
          </Link>
        </div>

        <div className="public-schedule-list">
          {matches.map((match) => (
            <ScheduleMatch data={data} match={match} season={season} key={match.id} />
          ))}
        </div>

        {!matches.length ? <CompetitionEmpty text="The match schedule has not been published yet." /> : null}
      </section>
    </SiteShell>
  );
}

export function PublicBracketPage({
  data,
  season
}: {
  data: CmsData;
  season?: SeasonRecord;
}) {
  const matches = knockoutMatches(data, season?.id);
  const rounds = Array.from(
    new Set(matches.map((match) => match.roundLabel ?? "Round"))
  ).sort(roundOrder);
  const matchesByRound = rounds.map((round) =>
    matches
      .filter((match) => (match.roundLabel ?? "Round") === round)
      .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
  );
  const bracketSlots = Math.max(1, ...matchesByRound.map((roundMatches) => roundMatches.length));
  const isMirroredEightTeamBracket =
    matchesByRound.length === 3 &&
    matchesByRound[0]?.length === 4 &&
    matchesByRound[1]?.length === 2 &&
    matchesByRound[2]?.length === 1;
  const scheduleHref = season ? `/seasons/${season.slug}/schedule` : "/schedule";

  return (
    <SiteShell
      data={data}
      season={season}
      theme={publicTheme(data, season)}
      page={publicPage("bracket", season)}
    >
      <CompetitionHero
        description="Follow every matchup and winner path through the Season knockout."
        season={season}
        title="Bracket"
      />

      <section className="container content-section public-bracket-section">
        <div className="competition-toolbar">
          <span>{matches.length} knockout matches across {rounds.length} rounds</span>
          <Link className="button secondary" href={scheduleHref}>
            View schedule
          </Link>
        </div>

        {matches.length ? (
          isMirroredEightTeamBracket ? (
            <MirroredEightTeamBracket
              data={data}
              finalMatch={matchesByRound[2][0]}
              quarterFinals={matchesByRound[0]}
              scheduleHref={scheduleHref}
              season={season}
              semiFinals={matchesByRound[1]}
            />
          ) : (
            <div className="public-bracket-shell">
              <div
                className="public-bracket"
                style={{ "--bracket-slots": bracketSlots } as React.CSSProperties}
              >
                {rounds.map((round, roundIndex) => {
                  const roundMatches = matchesByRound[roundIndex];
                  const slotSpan = Math.max(
                    1,
                    Math.floor(bracketSlots / Math.max(1, roundMatches.length))
                  );

                  return (
                    <section
                      className={[
                        "public-bracket-round",
                        roundIndex === 0 ? "is-opening-round" : "",
                        roundIndex === rounds.length - 1 ? "is-final-round" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={round}
                    >
                      <h2>
                        <span>{round}</span>
                        <small>
                          {roundMatches.length} {roundMatches.length === 1 ? "match" : "matches"}
                        </small>
                      </h2>
                      <div className="public-bracket-round__matches">
                        {roundMatches.map((match, matchIndex) => (
                          <div
                            className="public-bracket-slot"
                            key={match.id}
                            style={{
                              gridRow: `${matchIndex * slotSpan + 1} / span ${slotSpan}`
                            }}
                          >
                            <BracketMatch
                              data={data}
                              match={match}
                              scheduleHref={scheduleHref}
                              season={season}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <CompetitionEmpty text="The knockout bracket has not been generated yet." />
        )}
      </section>
    </SiteShell>
  );
}

function MirroredEightTeamBracket({
  data,
  season,
  quarterFinals,
  semiFinals,
  finalMatch,
  scheduleHref
}: {
  data: CmsData;
  season?: SeasonRecord;
  quarterFinals: MatchRecord[];
  semiFinals: MatchRecord[];
  finalMatch: MatchRecord;
  scheduleHref: string;
}) {
  return (
    <div className="public-bracket-shell public-bracket-shell--mirrored">
      <div className="public-bracket-mirrored">
        <section className="public-bracket-mirror-column mirror-quarter mirror-left">
          <BracketColumnHeading label="Quarter Finals" matches={2} />
          <div className="public-bracket-mirror-stack">
            {quarterFinals.slice(0, 2).map((match) => (
              <BracketMatch
                data={data}
                key={match.id}
                match={match}
                scheduleHref={scheduleHref}
                season={season}
              />
            ))}
          </div>
        </section>

        <section className="public-bracket-mirror-column mirror-semi mirror-left">
          <BracketColumnHeading label="Semi Final" matches={1} />
          <div className="public-bracket-mirror-center">
            <BracketMatch
              data={data}
              match={semiFinals[0]}
              scheduleHref={scheduleHref}
              season={season}
            />
          </div>
        </section>

        <section className="public-bracket-mirror-column mirror-final">
          <BracketColumnHeading label="Final" matches={1} />
          <span className="public-bracket-final-line" aria-hidden="true" />
          <div className="public-bracket-mirror-center">
            <BracketMatch
              data={data}
              match={finalMatch}
              scheduleHref={scheduleHref}
              season={season}
            />
          </div>
        </section>

        <section className="public-bracket-mirror-column mirror-semi mirror-right">
          <BracketColumnHeading label="Semi Final" matches={1} />
          <div className="public-bracket-mirror-center">
            <BracketMatch
              data={data}
              match={semiFinals[1]}
              scheduleHref={scheduleHref}
              season={season}
            />
          </div>
        </section>

        <section className="public-bracket-mirror-column mirror-quarter mirror-right">
          <BracketColumnHeading label="Quarter Finals" matches={2} />
          <div className="public-bracket-mirror-stack">
            {quarterFinals.slice(2, 4).map((match) => (
              <BracketMatch
                data={data}
                key={match.id}
                match={match}
                scheduleHref={scheduleHref}
                season={season}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function BracketColumnHeading({ label, matches }: { label: string; matches: number }) {
  return (
    <h2>
      <span>{label}</span>
      <small>{matches} {matches === 1 ? "match" : "matches"}</small>
    </h2>
  );
}

function CompetitionHero({
  season,
  title,
  description
}: {
  season?: SeasonRecord;
  title: string;
  description: string;
}) {
  return (
    <section className="public-page-hero">
      <div className="container">
        <p className="section-kicker">{season?.name ?? "Alliance Master Series"}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}

function ScheduleMatch({
  data,
  season,
  match
}: {
  data: CmsData;
  season?: SeasonRecord;
  match: MatchRecord;
}) {
  const participants = matchParticipants(data, match);
  const streamUrl = validUrl(match.streamUrl);
  const vodUrl = validUrl(match.vodUrl);

  return (
    <article className="public-schedule-match panel" id={`match-${match.id}`}>
      <header>
        <div>
          <small>{match.roundLabel ?? "Match"}</small>
          <strong>{match.title}</strong>
        </div>
        <span className={`match-status match-status--${String(match.status)}`}>
          {match.status}
        </span>
      </header>

      <div className="public-schedule-match__main">
        <MatchTeam data={data} participant={participants[0]} season={season} />
        <div className="public-schedule-match__center">
          <strong>
            {hasScore(participants)
              ? `${participants[0]?.score ?? "-"} : ${participants[1]?.score ?? "-"}`
              : "VS"}
          </strong>
          <time>{match.startsAt ? formatDate(match.startsAt) : "Date and time TBD"}</time>
        </div>
        <MatchTeam data={data} participant={participants[1]} season={season} right />
      </div>

      {match.report ? <p className="public-match-report">{match.report}</p> : null}

      {streamUrl || vodUrl ? (
        <footer>
          {streamUrl ? (
            <a href={streamUrl} rel="noreferrer" target="_blank">Watch stream</a>
          ) : null}
          {vodUrl ? (
            <a href={vodUrl} rel="noreferrer" target="_blank">Watch VOD</a>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function BracketMatch({
  data,
  season,
  match,
  scheduleHref
}: {
  data: CmsData;
  season?: SeasonRecord;
  match: MatchRecord;
  scheduleHref: string;
}) {
  const participants = matchParticipants(data, match);

  return (
    <article className="public-bracket-match panel" id={`match-${match.id}`}>
      <header>
        <span>{match.title}</span>
        <small>{match.status}</small>
      </header>

      {[0, 1].map((index) => {
        const participant = participants[index];
        const entry = participant?.teamId
          ? seasonTeam(data, season?.id, participant.teamId)
          : undefined;
        const isWinner = Boolean(
          participant?.teamId && participant.teamId === match.winnerTeamId
        );

        return (
          <div className={isWinner ? "public-bracket-team winner" : "public-bracket-team"} key={index}>
            <TeamIdentity data={data} entry={entry} fallback="TBD" />
            <strong>{typeof participant?.score === "number" ? participant.score : "-"}</strong>
          </div>
        );
      })}

      <Link href={`${scheduleHref}#match-${match.id}`}>
        {match.startsAt ? formatDate(match.startsAt) : "Open in schedule"}
      </Link>
    </article>
  );
}

function MatchTeam({
  data,
  season,
  participant,
  right = false
}: {
  data: CmsData;
  season?: SeasonRecord;
  participant?: MatchParticipantRecord;
  right?: boolean;
}) {
  const entry = participant?.teamId
    ? seasonTeam(data, season?.id, participant.teamId)
    : undefined;

  return (
    <div className={right ? "public-match-team right" : "public-match-team"}>
      <TeamIdentity data={data} entry={entry} fallback="TBD" />
    </div>
  );
}

function TeamIdentity({
  data,
  entry,
  fallback
}: {
  data: CmsData;
  entry?: TeamEntry;
  fallback: string;
}) {
  if (!entry) return <span className="public-match-team__name">{fallback}</span>;

  const assetId =
    entry.participation.logoAssetId ??
    entry.team.defaultLogoId ??
    entry.team.logoAssetId;
  const logo = data.mediaAssets.find((asset) => asset.id === assetId)?.publicUrl;

  return (
    <>
      <span className="public-match-team__logo">
        {logo ? (
          <img src={logo} alt={entry.participation.displayName ?? entry.team.name} />
        ) : (
          entry.participation.tag ?? entry.team.tag ?? entry.team.name.slice(0, 2)
        )}
      </span>
      <span className="public-match-team__name">
        {entry.participation.displayName ?? entry.team.name}
      </span>
    </>
  );
}

function CompetitionEmpty({ text }: { text: string }) {
  return (
    <section className="public-empty panel">
      <h2>Coming soon</h2>
      <p>{text}</p>
    </section>
  );
}

function knockoutMatches(data: CmsData, seasonId?: string) {
  if (!seasonId) return [];

  const knockoutStageIds = new Set(
    data.stages
      .filter((stage) => stage.type === "single_elimination")
      .map((stage) => stage.id)
  );
  const grouped = new Map<string, MatchRecord[]>();

  for (const match of seasonMatches(data, seasonId)) {
    if (!match.stageId || !knockoutStageIds.has(match.stageId)) continue;
    const stageMatches = grouped.get(match.stageId) ?? [];
    stageMatches.push(match);
    grouped.set(match.stageId, stageMatches);
  }

  const candidates = Array.from(grouped.values()).sort((a, b) => b.length - a.length);
  return candidates[0] ?? [];
}

function seasonMatches(data: CmsData, seasonId?: string) {
  if (!seasonId) return [];
  return data.matches.filter(
    (match) => match.seasonId === seasonId && String(match.status) !== "voided"
  );
}

function matchParticipants(data: CmsData, match: MatchRecord) {
  return data.matchParticipants
    .filter((participant) => participant.matchId === match.id)
    .sort((a, b) => a.slot - b.slot);
}

function seasonTeam(data: CmsData, seasonId: string | undefined, teamId: string) {
  if (!seasonId) return undefined;
  const participation = data.seasonTeams.find(
    (item) => item.seasonId === seasonId && item.teamId === teamId
  );
  const team = data.teams.find((item) => item.id === teamId);

  return participation && team ? { participation, team } : undefined;
}

function hasScore(participants: MatchParticipantRecord[]) {
  return participants.some((participant) => typeof participant.score === "number");
}

function scheduleOrder(a: MatchRecord, b: MatchRecord) {
  if (a.startsAt && b.startsAt) {
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  }
  if (a.startsAt) return -1;
  if (b.startsAt) return 1;

  const roundDifference = roundRank(a.roundLabel ?? "Round") - roundRank(b.roundLabel ?? "Round");
  return roundDifference || (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0);
}

function roundOrder(a: string, b: string) {
  return roundRank(a) - roundRank(b);
}

function roundRank(label: string) {
  const normalized = label.toLowerCase();
  const numberedRound = normalized.match(/round\s+(\d+)/);
  if (numberedRound) return Number(numberedRound[1]);
  if (normalized.includes("quarter")) return 100;
  if (normalized.includes("semi")) return 200;
  if (normalized.includes("final")) return 300;
  return 50;
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

function validUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
