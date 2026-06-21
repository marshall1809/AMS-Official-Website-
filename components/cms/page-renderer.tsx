import Link from "next/link";
import { CalendarClock, ExternalLink } from "lucide-react";
import type {
  CmsData,
  MatchParticipantRecord,
  MatchRecord,
  PageBlock,
  PageRecord,
  SeasonTeamRecord,
  TeamRecord
} from "@/lib/cms/types";

export function PageRenderer({ data, page }: { data: CmsData; page: PageRecord }) {
  const blocks = [...page.blocks]
    .filter((block) => block.isVisible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {blocks.map((block) => (
        <BlockRenderer block={block} data={data} page={page} key={block.id} />
      ))}
    </>
  );
}

function BlockRenderer({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  switch (block.type) {
    case "announcement":
      return <AnnouncementBlock block={block} />;
    case "hero":
      return <HeroBlock block={block} />;
    case "text":
      return <TextBlock block={block} />;
    case "image":
      return <ImageBlock block={block} data={data} />;
    case "image_text":
      return <ImageTextBlock block={block} data={data} />;
    case "stat_cards":
      return <StatCardsBlock block={block} />;
    case "team_list":
      return <TeamListBlock block={block} data={data} page={page} />;
    case "match_list":
      return <MatchListBlock block={block} data={data} page={page} />;
    case "bracket_embed":
      return <BracketBlock block={block} data={data} page={page} />;
    case "news_list":
      return <NewsListBlock block={block} data={data} page={page} />;
    case "rules_block":
      return <RulesBlock block={block} data={data} page={page} />;
    case "sponsor_strip":
      return <SponsorStripBlock block={block} data={data} page={page} />;
    case "cta":
      return <CtaBlock block={block} />;
    case "faq":
      return <FaqBlock block={block} />;
    case "season_list":
      return <SeasonListBlock block={block} data={data} />;
    default:
      return null;
  }
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number | undefined = undefined) {
  return typeof value === "number" ? value : fallback;
}

function arrayValue<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function seasonIdFor(block: PageBlock, page: PageRecord, data: CmsData) {
  return stringValue(block.content.seasonId) || page.seasonId || data.seasons.find((season) => season.status === "active")?.id || data.seasons[0]?.id;
}

function normalizeTeamStatus(status?: string) {
  if (status === "confirmed") return "active";
  if (status === "pending") return "inactive";
  if (status === "withdrawn") return "archived";
  return status ?? "active";
}

function getSeasonTeamEntries(data: CmsData, seasonId?: string) {
  if (!seasonId) return [];
  return data.seasonTeams
    .filter((entry) => entry.seasonId === seasonId && normalizeTeamStatus(entry.status) !== "archived")
    .map((seasonTeam) => ({
      seasonTeam,
      team: data.teams.find((team) => team.id === seasonTeam.teamId)
    }))
    .filter((entry): entry is { seasonTeam: SeasonTeamRecord; team: TeamRecord } => Boolean(entry.team))
    .sort((a, b) => (a.seasonTeam.seed ?? 999) - (b.seasonTeam.seed ?? 999));
}

function getTeamLogo(data: CmsData, team: TeamRecord, seasonTeam?: SeasonTeamRecord) {
  const assetId = seasonTeam?.logoAssetId ?? team.defaultLogoId ?? team.logoAssetId;
  return data.mediaAssets.find((asset) => asset.id === assetId)?.publicUrl;
}

function TeamMark({ data, team, seasonTeam }: { data: CmsData; team?: TeamRecord; seasonTeam?: SeasonTeamRecord }) {
  if (!team) return <span className="team-card__mark">TBD</span>;
  const logo = getTeamLogo(data, team, seasonTeam);
  return (
    <span className="team-card__mark">
      {logo ? <img src={logo} alt={team.name} /> : team.logoText ?? seasonTeam?.tag ?? team.tag ?? team.name.slice(0, 2)}
    </span>
  );
}

function AnnouncementBlock({ block }: { block: PageBlock }) {
  return <section className="announcement"><div className="container">{stringValue(block.content.text)}</div></section>;
}

function HeroBlock({ block }: { block: PageBlock }) {
  const primaryHref = stringValue(block.content.primaryHref);
  const secondaryHref = stringValue(block.content.secondaryHref);
  const logoSrc = stringValue(block.content.logoSrc);

  return (
    <section className="hero">
      <div className="container hero__inner">
        {logoSrc ? <img className="hero__logo" src={logoSrc} alt={stringValue(block.content.logoAlt, "Alliance Master Series")} /> : null}
        {block.content.kicker ? <p className="section-kicker">{stringValue(block.content.kicker)}</p> : null}
        <h1>{stringValue(block.content.title, "Untitled")}</h1>
        {block.content.body ? <p>{stringValue(block.content.body)}</p> : null}
        <div className="hero__actions">
          {primaryHref ? <Link className="button" href={primaryHref}>{stringValue(block.content.primaryLabel, "Open")}</Link> : null}
          {secondaryHref ? <Link className="button secondary" href={secondaryHref}>{stringValue(block.content.secondaryLabel, "Learn more")}</Link> : null}
        </div>
      </div>
    </section>
  );
}

function TextBlock({ block }: { block: PageBlock }) {
  return (
    <section className="container content-section">
      <div className="copy-block panel">
        {block.content.kicker ? <p className="section-kicker">{stringValue(block.content.kicker)}</p> : null}
        {block.content.title ? <h2>{stringValue(block.content.title)}</h2> : null}
        {block.content.body ? <p>{stringValue(block.content.body)}</p> : null}
      </div>
    </section>
  );
}

function ImageBlock({ block, data }: { block: PageBlock; data: CmsData }) {
  const asset = data.mediaAssets.find((item) => item.id === block.content.assetId);
  if (!asset?.publicUrl) return null;
  return <section className="container content-section"><img className="media-image" src={asset.publicUrl} alt={asset.altText ?? asset.title ?? ""} /></section>;
}

function ImageTextBlock({ block, data }: { block: PageBlock; data: CmsData }) {
  const asset = data.mediaAssets.find((item) => item.id === block.content.assetId);
  return (
    <section className="container content-section split-block panel">
      <div>
        {block.content.kicker ? <p className="section-kicker">{stringValue(block.content.kicker)}</p> : null}
        <h2>{stringValue(block.content.title, "Content")}</h2>
        <p>{stringValue(block.content.body)}</p>
      </div>
      {asset?.publicUrl ? <img src={asset.publicUrl} alt={asset.altText ?? asset.title ?? ""} /> : <div className="image-placeholder">{stringValue(block.content.placeholder, "Media")}</div>}
    </section>
  );
}

function StatCardsBlock({ block }: { block: PageBlock }) {
  const items = arrayValue<{ label: string; value: string }>(block.content.items);
  return <section className="stat-band"><div className="container stat-band__grid">{items.map((item) => <article className="stat" key={`${item.label}-${item.value}`}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div></section>;
}

function TeamListBlock({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  const seasonId = seasonIdFor(block, page, data);
  const limit = numberValue(block.content.limit);
  const entries = getSeasonTeamEntries(data, seasonId).slice(0, limit);

  return (
    <section className="container content-section">
      <SectionTitle title={stringValue(block.content.title, "Teams")} />
      <div className="team-list">
        {entries.map(({ team, seasonTeam }) => (
          <article className="team-card" key={`${seasonTeam.seasonId}-${team.id}`}>
            <span className="team-card__seed">{String(seasonTeam.seed ?? "-").padStart(2, "0")}</span>
            <TeamMark data={data} team={team} seasonTeam={seasonTeam} />
            <span className="team-card__body">
              <strong>{seasonTeam.displayName ?? team.name}</strong>
              <small>{seasonTeam.tag ?? team.tag ?? team.slug} · {normalizeTeamStatus(seasonTeam.status)}</small>
            </span>
          </article>
        ))}
        {!entries.length ? <p className="empty-copy">No teams have been added to this season yet.</p> : null}
      </div>
    </section>
  );
}

function MatchListBlock({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  const seasonId = seasonIdFor(block, page, data);
  const limit = numberValue(block.content.limit);
  const matches = data.matches.filter((match) => match.seasonId === seasonId).slice(0, limit);

  return (
    <section className="container content-section">
      <SectionTitle title={stringValue(block.content.title, "Matches")} />
      <div className="schedule-grid">
        {matches.map((match) => <MatchCard data={data} match={match} key={match.id} />)}
      </div>
    </section>
  );
}

function MatchCard({ data, match }: { data: CmsData; match: MatchRecord }) {
  const participants = data.matchParticipants.filter((item) => item.matchId === match.id).sort((a, b) => a.slot - b.slot);
  const seasonEntries = getSeasonTeamEntries(data, match.seasonId);
  const teamA = seasonEntries.find((entry) => entry.team.id === participants[0]?.teamId);
  const teamB = seasonEntries.find((entry) => entry.team.id === participants[1]?.teamId);

  return (
    <article className="match-card">
      <div className="match-card__meta">
        <span><CalendarClock size={15} />{match.startsAt ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(match.startsAt)) : "TBD"}</span>
        <span>{match.status}</span>
      </div>
      <h3>{match.title}</h3>
      <div className="match-card__teams">
        <TeamSummary data={data} entry={teamA} fallback="TBD" />
        <span>vs</span>
        <TeamSummary data={data} entry={teamB} fallback="TBD" alignRight />
      </div>
      {match.streamUrl ? <a className="inline-link" href={match.streamUrl}><ExternalLink size={15} />Stream</a> : null}
    </article>
  );
}

function TeamSummary({ data, entry, fallback, alignRight = false }: { data: CmsData; entry?: { seasonTeam: SeasonTeamRecord; team: TeamRecord }; fallback: string; alignRight?: boolean }) {
  if (!entry) return <strong>{fallback}</strong>;
  return (
    <strong className={alignRight ? "team-summary right" : "team-summary"}>
      <TeamMark data={data} team={entry.team} seasonTeam={entry.seasonTeam} />
      {entry.seasonTeam.tag ?? entry.team.tag ?? entry.team.name}
    </strong>
  );
}

function BracketBlock({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  const seasonId = seasonIdFor(block, page, data);
  const tournamentId = stringValue(block.content.tournamentId);
  const matches = data.matches
    .filter((match) => (tournamentId ? match.tournamentId === tournamentId : match.seasonId === seasonId))
    .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
  const rounds = Array.from(new Set(matches.map((match) => match.roundLabel ?? "Round")));

  return (
    <section className="container content-section">
      <SectionTitle title={stringValue(block.content.title, "Bracket")} />
      <div className="bracket-view">
        {rounds.map((round) => (
          <section className="bracket-round" key={round}>
            <h2>{round}</h2>
            {matches.filter((match) => (match.roundLabel ?? "Round") === round).map((match) => <BracketMatch data={data} match={match} key={match.id} />)}
          </section>
        ))}
        {!matches.length ? <p className="empty-copy">This season does not have bracket matches yet.</p> : null}
      </div>
    </section>
  );
}

function BracketMatch({ data, match }: { data: CmsData; match: MatchRecord }) {
  const participants = [1, 2].map((slot) => data.matchParticipants.find((participant) => participant.matchId === match.id && participant.slot === slot)) as Array<MatchParticipantRecord | undefined>;
  const seasonEntries = getSeasonTeamEntries(data, match.seasonId);

  return (
    <article className="bracket-match">
      {participants.map((participant, index) => {
        const entry = seasonEntries.find((item) => item.team.id === participant?.teamId);
        const isWinner = Boolean(match.winnerTeamId && entry?.team.id === match.winnerTeamId);
        return (
          <div className={isWinner ? "winner" : ""} key={`${match.id}-${index}`}>
            <span>{entry ? <TeamSummary data={data} entry={entry} fallback="TBD" /> : "TBD"}</span>
            <strong>{participant?.score ?? "-"}</strong>
          </div>
        );
      })}
    </article>
  );
}

function NewsListBlock({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  const seasonId = seasonIdFor(block, page, data);
  const posts = data.newsPosts.filter((post) => post.status === "published" && post.seasonId === seasonId);

  return (
    <section className="container content-section">
      <SectionTitle title={stringValue(block.content.title, "News")} />
      <div className="news-grid">
        {posts.map((post) => (
          <Link href={post.href ?? `/news/${post.slug}`} className="news-card" key={post.id}>
            <div className="news-card__meta"><span>{post.category ?? "News"}</span><time>{post.publishedAt ? new Intl.DateTimeFormat("en").format(new Date(post.publishedAt)) : ""}</time></div>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RulesBlock({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  const seasonId = seasonIdFor(block, page, data);
  const ruleset = stringValue(block.content.rulesetId)
    ? data.rulesets.find(
        (item) => item.id === block.content.rulesetId && item.status === "published"
      )
    : data.rulesets.find(
        (item) => item.seasonId === seasonId && item.status === "published"
      );
  if (!ruleset) return <section className="container content-section"><article className="copy-block panel"><h2>Rules</h2><p>No rules have been published for this season yet.</p></article></section>;

  return <section className="container content-section"><article className="copy-block panel"><h2>{ruleset.title}</h2><div className="rules-document">{ruleset.body}</div></article></section>;
}

function SponsorStripBlock({ block, data, page }: { block: PageBlock; data: CmsData; page: PageRecord }) {
  const seasonId = seasonIdFor(block, page, data);
  const sponsors = data.sponsors.filter((sponsor) => sponsor.isActive && sponsor.seasonId === seasonId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="sponsor-band">
      <div className="container sponsor-band__inner">
        <p className="section-kicker">{stringValue(block.content.title, "Sponsors")}</p>
        <div>{sponsors.map((sponsor) => <a href={sponsor.url ?? "#"} key={sponsor.id}><strong>{sponsor.logoText ?? sponsor.name.slice(0, 2)}</strong><span>{sponsor.name}</span></a>)}</div>
      </div>
    </section>
  );
}

function CtaBlock({ block }: { block: PageBlock }) {
  const href = stringValue(block.content.href, "#");
  return <section className="container content-section"><div className="cta-block panel"><h2>{stringValue(block.content.title, "Next step")}</h2><p>{stringValue(block.content.body)}</p><Link className="button" href={href}>{stringValue(block.content.label, "Open")}</Link></div></section>;
}

function FaqBlock({ block }: { block: PageBlock }) {
  const items = arrayValue<{ question: string; answer: string }>(block.content.items);
  return <section className="container content-section"><SectionTitle title={stringValue(block.content.title, "FAQ")} /><div className="faq-list">{items.map((item) => <details className="panel" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>;
}

function SeasonListBlock({ block, data }: { block: PageBlock; data: CmsData }) {
  return (
    <section className="container content-section">
      <SectionTitle title={stringValue(block.content.title, "Seasons")} />
      <div className="season-grid">
        {data.seasons.filter((season) => season.status !== "deleted").map((season) => <Link className="season-card panel" href={`/seasons/${season.slug}`} key={season.id}><span className="status-pill">{season.status}</span><h2>{season.name}</h2><p>{season.summary}</p></Link>)}
      </div>
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="section-heading compact"><h2>{title}</h2></div>;
}
