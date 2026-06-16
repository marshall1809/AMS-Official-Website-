import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  Box,
  Brush,
  CalendarDays,
  ChevronRight,
  FileText,
  Image,
  LayoutDashboard,
  ListTree,
  LogOut,
  Newspaper,
  PanelTop,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Upload,
  Users
} from "lucide-react";
import {
  advanceBracketWinnerFromFormAction,
  createMatchFromFormAction,
  createMediaAssetFromFormAction,
  createNavigationItemFromFormAction,
  createNewsPostFromFormAction,
  createPageFromFormAction,
  createPlayerFromFormAction,
  createRulesetFromFormAction,
  createSeasonFromFormAction,
  createSponsorFromFormAction,
  createTeamFromFormAction,
  updateSeasonStatusFromFormAction,
  updateSeasonTeamFromFormAction,
  updateSiteSettingsFromFormAction,
  updateThemeTokensFromFormAction
} from "@/lib/cms/admin-actions";
import { signOutAction } from "@/lib/auth/actions";
import type { CmsData, MatchRecord, SeasonRecord, SeasonTeamRecord, TeamRecord } from "@/lib/cms/types";
import styles from "@/components/admin-shell.module.css";

type AdminSection = {
  label: string;
  href: string;
  key: string;
  icon: ComponentType<{ size?: number }>;
};

const groups: Array<{ label: string; items: AdminSection[] }> = [
  { label: "Dashboard", items: [{ label: "Overview", href: "/admin", key: "dashboard", icon: LayoutDashboard }] },
  {
    label: "Seasons",
    items: [
      { label: "Alle Seasons", href: "/admin/seasons", key: "seasons", icon: Trophy },
      { label: "Neue Season", href: "/admin/seasons/new", key: "seasons/new", icon: Sparkles }
    ]
  },
  {
    label: "Content",
    items: [
      { label: "Seiten", href: "/admin/pages", key: "pages", icon: PanelTop },
      { label: "Navigation", href: "/admin/navigation", key: "navigation", icon: Route },
      { label: "News", href: "/admin/news", key: "news", icon: Newspaper },
      { label: "Regeln", href: "/admin/rules", key: "rules", icon: FileText }
    ]
  },
  {
    label: "Competition",
    items: [
      { label: "Teams", href: "/admin/teams", key: "teams", icon: Users },
      { label: "Spieler", href: "/admin/players", key: "players", icon: Users },
      { label: "Matches", href: "/admin/matches", key: "matches", icon: CalendarDays },
      { label: "Schedule", href: "/admin/schedule", key: "schedule", icon: CalendarDays },
      { label: "Brackets", href: "/admin/brackets", key: "brackets", icon: Swords }
    ]
  },
  {
    label: "Media",
    items: [
      { label: "Bilder", href: "/admin/media/images", key: "media/images", icon: Image },
      { label: "Logos", href: "/admin/media/logos", key: "media/logos", icon: Upload }
    ]
  },
  {
    label: "Design",
    items: [{ label: "Themes", href: "/admin/design/themes", key: "design/themes", icon: Brush }]
  },
  {
    label: "Administration",
    items: [
      { label: "Audit Log", href: "/admin/audit-log", key: "audit-log", icon: ListTree },
      { label: "Einstellungen", href: "/admin/settings", key: "settings", icon: Settings }
    ]
  }
];

export function AdminShell({
  data,
  isWritable,
  sectionPath = []
}: {
  data: CmsData;
  isWritable: boolean;
  sectionPath?: string[];
}) {
  const sectionKey = sectionPath.length ? sectionPath.join("/") : "dashboard";
  const activeSeason = getContextSeason(data, sectionKey);
  const header = getHeader(sectionKey, activeSeason);

  return (
    <div className={`theme-root admin-theme ${styles.root}`}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/admin">
          {data.siteSettings.logoImageUrl ? <img src={data.siteSettings.logoImageUrl} alt="AMS" /> : <Box size={24} />}
          <span>
            <strong>{data.siteSettings.logoText}</strong>
            <small>Admin</small>
          </span>
        </a>

        <nav className={styles.navigation} aria-label="Admin navigation">
          {groups.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <a data-active={isActive(item.key, sectionKey)} href={item.href} key={item.href}>
                  <item.icon size={16} />
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {isWritable ? (
          <form action={signOutAction} className={styles.signOut}>
            <button type="submit"><LogOut size={16} /> Sign out</button>
          </form>
        ) : null}
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.breadcrumbs}>
              <a href="/admin">AMS Admin</a>
              <ChevronRight size={14} />
              <span>{activeSeason?.name ?? "No season"}</span>
              <ChevronRight size={14} />
              <strong>{header.title}</strong>
            </div>
            <h1>{header.title}</h1>
            <p>{header.description}</p>
          </div>
          <div className={styles.contextPanel}>
            <span>Season context</span>
            <strong>{activeSeason?.name ?? "No active season"}</strong>
            <small>{activeSeason?.status ?? "empty"}</small>
          </div>
        </header>

        {!isWritable ? (
          <div className={styles.notice}>
            <ShieldCheck size={20} />
            <div>
              <strong>Read-only mode</strong>
              <p>Dieser User hat keine Schreibrolle oder Supabase ist nicht vollständig konfiguriert.</p>
            </div>
          </div>
        ) : null}

        <div className={styles.commandBar}>
          <label><Search size={16} /><input placeholder="Suche nach Seasons, Teams, Matches, Seiten..." /></label>
          <select defaultValue={activeSeason?.id ?? ""} aria-label="Season context">
            {data.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select>
          <a className={styles.primaryAction} href={header.primaryHref}>{header.primaryAction}</a>
        </div>

        {renderSection(sectionKey, data, isWritable, activeSeason)}
      </main>
    </div>
  );
}

function renderSection(sectionKey: string, data: CmsData, isWritable: boolean, activeSeason?: SeasonRecord) {
  if (sectionKey === "dashboard") return <Dashboard data={data} season={activeSeason} />;
  if (sectionKey === "seasons") return <Seasons data={data} isWritable={isWritable} />;
  if (sectionKey === "seasons/new") return <NewSeason isWritable={isWritable} />;
  if (sectionKey.startsWith("seasons/")) return <SeasonWorkspace data={data} isWritable={isWritable} sectionKey={sectionKey} />;
  if (sectionKey === "teams") return <TeamsManager data={data} isWritable={isWritable} season={activeSeason} />;
  if (sectionKey === "players") return <PlayersManager data={data} isWritable={isWritable} season={activeSeason} />;
  if (sectionKey === "matches" || sectionKey === "schedule") return <MatchesManager data={data} isWritable={isWritable} season={activeSeason} />;
  if (sectionKey === "brackets") return <BracketManager data={data} isWritable={isWritable} season={activeSeason} />;
  if (sectionKey === "pages") return <PagesManager data={data} isWritable={isWritable} />;
  if (sectionKey === "navigation") return <NavigationManager data={data} isWritable={isWritable} />;
  if (sectionKey === "news") return <NewsManager data={data} isWritable={isWritable} season={activeSeason} />;
  if (sectionKey === "rules") return <RulesManager data={data} isWritable={isWritable} season={activeSeason} />;
  if (sectionKey.startsWith("media/")) return <MediaManager data={data} isWritable={isWritable} mode={sectionKey} />;
  if (sectionKey.startsWith("design/")) return <ThemeManager data={data} isWritable={isWritable} />;
  if (sectionKey === "settings") return <SettingsManager data={data} isWritable={isWritable} />;
  return <EmptyState title="Bereich vorbereitet" body="Diese Admin-Seite ist strukturell vorhanden und kann als nächstes erweitert werden." />;
}

function Dashboard({ data, season }: { data: CmsData; season?: SeasonRecord }) {
  const seasonTeams = getSeasonTeams(data, season);
  const seasonMatches = getSeasonMatches(data, season);
  const nextMatches = seasonMatches.filter((match) => match.status === "scheduled").slice(0, 4);

  return (
    <div className={styles.stack}>
      <div className={styles.metricGrid}>
        <Metric icon={Trophy} label="Aktive Season" value={season?.name ?? "Keine"} note={season?.status ?? "leer"} />
        <Metric icon={Users} label="Season Teams" value={String(seasonTeams.length)} note="nicht global" />
        <Metric icon={CalendarDays} label="Season Matches" value={String(seasonMatches.length)} note="eigener Spielplan" />
        <Metric icon={Newspaper} label="Season News" value={String(data.newsPosts.filter((post) => post.seasonId === season?.id).length)} note="CMS" />
      </div>
      <div className={styles.dashboardGrid}>
        <Panel title="Nächste Matches" action="Matches öffnen" href="/admin/matches">
          <MiniList rows={nextMatches.map((match) => ({ title: match.title, meta: match.roundLabel ?? match.status, value: formatDate(match.startsAt) }))} empty="Keine Matches in dieser Season" />
        </Panel>
        <Panel title="Season Bereiche" action="Season öffnen" href={season ? `/admin/seasons/${season.slug}` : "/admin/seasons"}>
          <MiniList rows={["Teams", "Schedule", "Bracket", "Rules", "News"].map((title) => ({ title, meta: season?.name ?? "Keine Season", value: "isoliert" }))} />
        </Panel>
      </div>
    </div>
  );
}

function Seasons({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <div className={styles.tableCard}>
      <TableHeader title="Alle Seasons" description="Neue Seasons starten mit leeren Competition-Daten. Teams, Matches, Brackets, Rules und News werden nicht übernommen." actionHref="/admin/seasons/new" actionLabel="Neue Season" />
      <table className={styles.table}>
        <thead><tr><th>Name</th><th>Status</th><th>Teams</th><th>Matches</th><th>Aktionen</th></tr></thead>
        <tbody>
          {data.seasons.map((season) => (
            <tr key={season.id}>
              <td><strong>{season.name}</strong><small>/{season.slug}</small></td>
              <td><StatusBadge status={season.status} /></td>
              <td>{data.seasonTeams.filter((item) => item.seasonId === season.id).length}</td>
              <td>{data.matches.filter((item) => item.seasonId === season.id).length}</td>
              <td>
                <div className={styles.rowActions}>
                  <a href={`/admin/seasons/${season.slug}`}>Bearbeiten</a>
                  <a href={`/seasons/${season.slug}`}>Vorschau</a>
                  <SeasonStatusButton season={season} status="archived" disabled={!isWritable} label="Archivieren" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewSeason({ isWritable }: { isWritable: boolean }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <h2>Neue Season erstellen</h2>
        <p>Standardverhalten: neue Season, neue leere Competition-Daten. Es werden keine Teams, Matches, Brackets oder Regeln aus alten Seasons kopiert.</p>
        <form action={createSeasonFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable}>
            <label>Season Name<input name="name" placeholder="Season Two" required /></label>
            <label>Slug<input name="slug" placeholder="season-two" pattern="[a-z0-9-]+" required /></label>
            <label>Startfarben<textarea name="themeTokens" rows={8} defaultValue={'{\n  "colorBg": "#050b16",\n  "colorAccent": "#c9a84c"\n}'} /></label>
            <button className={styles.submitButton} type="submit">Season Paket erstellen</button>
          </fieldset>
        </form>
      </section>
      <aside className={styles.sidePanel}>
        <h3>Leere Bereiche</h3>
        <MiniList rows={["Teams", "Schedule", "Bracket", "Rules", "News"].map((title) => ({ title, meta: "leer", value: "bereit" }))} />
      </aside>
    </div>
  );
}

function SeasonWorkspace({ data, isWritable, sectionKey }: { data: CmsData; isWritable: boolean; sectionKey: string }) {
  const [, slug, tab = "overview"] = sectionKey.split("/");
  const season = data.seasons.find((item) => item.slug === slug) ?? getActiveSeason(data);
  if (!season) return <EmptyState title="Keine Season" body="Erstelle zuerst eine Season." />;

  const tabs = ["overview", "teams", "players", "schedule", "bracket", "rules", "news", "sponsors", "design"];
  return (
    <div className={styles.stack}>
      <div className={styles.seasonHeader}>
        <div><p className="section-kicker">Season Workspace</p><h2>{season.name}</h2><p>Alle Competition-Daten in diesen Tabs sind an diese Season gebunden.</p></div>
        <StatusBadge status={season.status} />
      </div>
      <div className={styles.tabs}>{tabs.map((item) => <a data-active={item === tab} href={`/admin/seasons/${season.slug}/${item}`} key={item}>{item}</a>)}</div>
      {tab === "overview" ? <SeasonOverview data={data} season={season} isWritable={isWritable} /> : null}
      {tab === "teams" ? <TeamsManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "players" ? <PlayersManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "schedule" ? <MatchesManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "bracket" ? <BracketManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "rules" ? <RulesManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "news" ? <NewsManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "sponsors" ? <SponsorsManager data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "design" ? <ThemeManager data={data} isWritable={isWritable} /> : null}
    </div>
  );
}

function SeasonOverview({ data, season, isWritable }: { data: CmsData; season: SeasonRecord; isWritable: boolean }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <h3>Status</h3>
        <form action={updateSeasonStatusFromFormAction} className={styles.inlineForm}>
          <input name="seasonId" type="hidden" value={season.id} />
          <select name="status" defaultValue={season.status} disabled={!isWritable}>
            <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option><option value="deleted">Deleted</option>
          </select>
          <button disabled={!isWritable} type="submit">Speichern</button>
        </form>
        <div className={styles.metricGridCompact}>
          <Metric icon={Users} label="Teams" value={String(getSeasonTeams(data, season).length)} note="Season" />
          <Metric icon={CalendarDays} label="Matches" value={String(getSeasonMatches(data, season).length)} note="Season" />
          <Metric icon={FileText} label="Regeln" value={String(data.rulesets.filter((rule) => rule.seasonId === season.id).length)} note="Season" />
        </div>
      </section>
      <aside className={styles.sidePanel}><h3>Vorschau</h3><a className={styles.submitButton} href={`/seasons/${season.slug}`}>Öffentliche Season öffnen</a></aside>
    </div>
  );
}

function TeamsManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const contextSeason = season ?? getActiveSeason(data);
  const entries = getSeasonTeamEntries(data, contextSeason);

  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <TableHeader title={`Teams ${contextSeason ? `für ${contextSeason.name}` : ""}`} description="Teams werden als globale Stammdaten gespeichert, aber die Teilnahme läuft über season_teams." />
        {entries.length ? <TeamTable entries={entries} data={data} season={contextSeason} isWritable={isWritable} /> : <EmptyState title="Keine Teams in dieser Season" body="Füge rechts ein Team hinzu. Alte Seasons bleiben unverändert." />}
      </section>
      <aside className={styles.settingsRail}><TeamForm data={data} isWritable={isWritable} season={contextSeason} /></aside>
    </div>
  );
}

function TeamTable({ entries, data, season, isWritable }: { entries: Array<{ seasonTeam: SeasonTeamRecord; team: TeamRecord }>; data: CmsData; season?: SeasonRecord; isWritable: boolean }) {
  return (
    <div className={styles.miniList}>
      {entries.map(({ seasonTeam, team }) => (
        <article key={`${seasonTeam.seasonId}-${team.id}`}>
          <TeamIdentity data={data} seasonTeam={seasonTeam} team={team} />
          <form action={updateSeasonTeamFromFormAction} className={styles.inlineForm}>
            <input type="hidden" name="seasonId" value={season?.id ?? seasonTeam.seasonId} />
            <input type="hidden" name="teamId" value={team.id} />
            <input type="hidden" name="name" value={team.name} />
            <input type="hidden" name="slug" value={team.slug} />
            <input name="tag" placeholder="Tag" defaultValue={seasonTeam.tag ?? team.tag ?? ""} />
            <input name="logoAssetId" placeholder="Logo Asset ID" defaultValue={seasonTeam.logoAssetId ?? team.defaultLogoId ?? team.logoAssetId ?? ""} />
            <select name="status" defaultValue={normalizeTeamStatus(seasonTeam.status)} disabled={!isWritable}>
              <option value="active">active</option><option value="inactive">inactive</option><option value="eliminated">eliminated</option><option value="archived">archived</option>
            </select>
            <button disabled={!isWritable} type="submit">Speichern</button>
          </form>
        </article>
      ))}
    </div>
  );
}

function TeamForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createTeamFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable || !season}>
        <h3>Team für Season hinzufügen</h3>
        <input type="hidden" name="seasonId" value={season?.id ?? ""} />
        <label>Teamname<input name="name" required /></label>
        <label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label>
        <label>Teamtag<input name="tag" maxLength={12} placeholder="AMS" /></label>
        <label>Fallback Logo Text<input name="logoText" maxLength={6} /></label>
        <label>Logo Asset ID<SelectMediaAsset data={data} name="logoAssetId" /></label>
        <label>Seed<input name="seed" inputMode="numeric" /></label>
        <label>Status<SelectTeamStatus /></label>
        <label>Beschreibung<textarea name="description" rows={4} /></label>
        <label>Social Links JSON<textarea name="socialLinks" rows={5} defaultValue={'{\n  "discord": "",\n  "x": "",\n  "website": ""\n}'} /></label>
        <button className={styles.submitButton} type="submit">Team speichern</button>
      </fieldset>
    </form>
  );
}

function PlayersManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const players = season ? data.players.filter((player) => player.seasonId === season.id) : data.players;
  return <Split title="Spieler" rows={players.map((player) => ({ title: player.name, meta: player.handle, value: player.role ?? "Player" }))} form={<PlayerForm data={data} isWritable={isWritable} season={season ?? getActiveSeason(data)} />} />;
}

function MatchesManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const contextSeason = season ?? getActiveSeason(data);
  const matches = getSeasonMatches(data, contextSeason);
  return (
    <div className={styles.stack}>
      <div className={styles.filters}><select><option>{contextSeason?.name ?? "Keine Season"}</option></select><select><option>Status</option><option>scheduled</option><option>live</option><option>completed</option></select><input placeholder="Team suchen" /></div>
      <Split title="Matches" rows={matches.map((match) => ({ title: match.title, meta: match.roundLabel ?? formatDate(match.startsAt), value: match.status }))} form={<MatchForm data={data} isWritable={isWritable} season={contextSeason} />} />
    </div>
  );
}

function BracketManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const contextSeason = season ?? getActiveSeason(data);
  const matches = getSeasonMatches(data, contextSeason).slice(0, 12);
  return (
    <div className={styles.bracketWorkspace}>
      <section className={styles.bracketCanvas}>
        {matches.length ? ["Round 1", "Semifinal", "Final"].map((round, index) => (
          <div className={styles.bracketColumn} key={round}>
            <h3>{round}</h3>
            {matches.filter((_, matchIndex) => matchIndex % 3 === index).map((match) => <BracketCard data={data} match={match} season={contextSeason} key={match.id} />)}
          </div>
        )) : <EmptyState title="Leerer Bracket-Bereich" body="Diese Season hat noch keine Bracket-Matches. Alte Seasons werden nicht angezeigt." />}
      </section>
      <aside className={styles.settingsRail}>
        <h3>Match Details</h3>
        <form action={advanceBracketWinnerFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable || !matches.length}>
            <label>Match<SelectMatch matches={matches} /></label>
            <label>Gewinner<SelectSeasonTeam data={data} season={contextSeason} name="winnerTeamId" /></label>
            <button className={styles.submitButton} type="submit">Gewinner weiterleiten</button>
          </fieldset>
        </form>
      </aside>
    </div>
  );
}

function PagesManager({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return <Split title="Seiten" rows={data.pages.map((page) => ({ title: page.title, meta: page.scope, value: page.status }))} form={<PageForm isWritable={isWritable} />} />;
}

function NavigationManager({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return <Split title="Navigation" rows={data.navigationItems.map((item) => ({ title: item.label, meta: item.href, value: item.scope }))} form={<NavigationForm data={data} isWritable={isWritable} />} />;
}

function NewsManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const posts = season ? data.newsPosts.filter((post) => post.seasonId === season.id) : data.newsPosts;
  return <Split title="News" rows={posts.map((post) => ({ title: post.title, meta: post.category ?? "News", value: post.status }))} form={<NewsForm data={data} isWritable={isWritable} season={season ?? getActiveSeason(data)} />} />;
}

function RulesManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const rules = season ? data.rulesets.filter((rule) => rule.seasonId === season.id) : data.rulesets;
  return <Split title="Regeln" rows={rules.map((rule) => ({ title: rule.title, meta: rule.status, value: "Rules" }))} form={<RulesForm data={data} isWritable={isWritable} season={season ?? getActiveSeason(data)} />} />;
}

function SponsorsManager({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const sponsors = season ? data.sponsors.filter((sponsor) => sponsor.seasonId === season.id) : data.sponsors;
  return <Split title="Sponsoren" rows={sponsors.map((sponsor) => ({ title: sponsor.name, meta: sponsor.url, value: sponsor.isActive ? "active" : "hidden" }))} form={<SponsorForm data={data} isWritable={isWritable} season={season} />} />;
}

function MediaManager({ data, isWritable, mode }: { data: CmsData; isWritable: boolean; mode: string }) {
  return (
    <div className={styles.mediaLayout}>
      <section className={styles.mediaGrid}>
        {data.mediaAssets.map((asset) => <article className={styles.assetCard} key={asset.id}><div>{asset.publicUrl ? <img src={asset.publicUrl} alt={asset.altText ?? asset.title ?? "Asset"} /> : <Image size={28} />}</div><strong>{asset.title ?? asset.path}</strong><small>{asset.id}</small><span>{asset.bucket}</span></article>)}
      </section>
      <aside className={styles.settingsRail}>{mode.includes("logos") ? <SettingsForm data={data} isWritable={isWritable} compact /> : <MediaForm isWritable={isWritable} />}</aside>
    </div>
  );
}

function ThemeManager({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  const theme = data.themes[0];
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <h2>Theme Manager</h2>
        <form action={updateThemeTokensFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable || !theme}>
            <input type="hidden" name="themeId" value={theme?.id} />
            <textarea name="tokens" hidden readOnly defaultValue={JSON.stringify(theme?.tokens ?? {})} />
            <label>Background<input name="colorBg" type="color" defaultValue={toHex(theme?.tokens.colorBg)} /></label>
            <label>Accent<input name="colorAccent" type="color" defaultValue={toHex(theme?.tokens.colorAccent)} /></label>
            <label>Text<input name="colorText" type="color" defaultValue={toHex(theme?.tokens.colorText)} /></label>
            <button className={styles.submitButton} type="submit">Theme speichern</button>
          </fieldset>
        </form>
      </section>
      <aside className={styles.themePreview}><span>Live Preview</span><h3>AMS Preview</h3><p>Season- und globale Themes werden über Tokens gespeichert.</p><button>Primary</button></aside>
    </div>
  );
}

function SettingsManager({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return <Split title="Einstellungen" rows={[{ title: data.siteSettings.siteName, meta: data.siteSettings.defaultTitle, value: "global" }]} form={<SettingsForm data={data} isWritable={isWritable} />} />;
}

function Split({ title, rows, form }: { title: string; rows: Array<Row>; form: ReactNode }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}><TableHeader title={title} description="Daten werden im aktuellen Season-Kontext angezeigt." /><MiniList rows={rows} empty="Keine Einträge in diesem Kontext" /></section>
      <aside className={styles.settingsRail}>{form}</aside>
    </div>
  );
}

function PageForm({ isWritable }: { isWritable: boolean }) {
  return <form action={createPageFromFormAction} className={styles.form}><fieldset disabled={!isWritable}><h3>Seite anlegen</h3><label>Titel<input name="title" required /></label><label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label><label>Route<input name="routePath" required /></label><input type="hidden" name="scope" value="global" /><input type="hidden" name="status" value="draft" /><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function NavigationForm({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return <form action={createNavigationItemFromFormAction} className={styles.form}><fieldset disabled={!isWritable}><h3>Menüpunkt</h3><label>Label<input name="label" required /></label><label>Href<input name="href" required /></label><label>Scope<SelectScope /></label><label>Season<SelectSeason data={data} includeEmpty /></label><label>Order<input name="sortOrder" defaultValue="10" inputMode="numeric" /></label><label className={styles.check}><input name="isVisible" type="checkbox" defaultChecked /> Sichtbar</label><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function PlayerForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return <form action={createPlayerFromFormAction} className={styles.form}><fieldset disabled={!isWritable || !season}><h3>Spieler</h3><input type="hidden" name="seasonId" value={season?.id ?? ""} /><label>Name<input name="name" required /></label><label>Handle<input name="handle" required /></label><label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label><label>Rolle<input name="role" /></label><label>Team<SelectSeasonTeam data={data} season={season} name="teamId" includeEmpty /></label><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function MatchForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return <form action={createMatchFromFormAction} className={styles.form}><fieldset disabled={!isWritable || !season}><h3>Match</h3><input type="hidden" name="seasonId" value={season?.id ?? ""} /><label>Titel<input name="title" required /></label><label>Status<SelectMatchStatus /></label><label>Datum<input name="startsAt" type="datetime-local" /></label><label>Runde<input name="roundLabel" /></label><label>Position<input name="bracketPosition" inputMode="numeric" /></label><label>Team A<SelectSeasonTeam data={data} season={season} name="teamAId" includeEmpty /></label><label>Team B<SelectSeasonTeam data={data} season={season} name="teamBId" includeEmpty /></label><input name="tournamentId" type="hidden" /><input name="stageId" type="hidden" /><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function NewsForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return <form action={createNewsPostFromFormAction} className={styles.form}><fieldset disabled={!isWritable || !season}><h3>News</h3><input type="hidden" name="seasonId" value={season?.id ?? ""} /><label>Titel<input name="title" required /></label><label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label><label>Kategorie<input name="category" /></label><label>Status<SelectPublishStatus /></label><label>Excerpt<textarea name="excerpt" rows={3} /></label><textarea name="body" hidden readOnly defaultValue="{}" /><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function RulesForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return <form action={createRulesetFromFormAction} className={styles.form}><fieldset disabled={!isWritable || !season}><h3>Regeln</h3><input type="hidden" name="seasonId" value={season?.id ?? ""} /><label>Titel<input name="title" required /></label><label>Status<SelectPublishStatus /></label><label>Regeltext<textarea name="body" rows={10} required /></label><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function SponsorForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return <form action={createSponsorFromFormAction} className={styles.form}><fieldset disabled={!isWritable || !season}><h3>Sponsor</h3><input type="hidden" name="seasonId" value={season?.id ?? ""} /><label>Name<input name="name" required /></label><label>URL<input name="url" /></label><label>Logo Text<input name="logoText" maxLength={8} /></label><label>Order<input name="sortOrder" defaultValue="0" inputMode="numeric" /></label><label className={styles.check}><input name="isActive" type="checkbox" defaultChecked /> Aktiv</label><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function MediaForm({ isWritable }: { isWritable: boolean }) {
  return <form action={createMediaAssetFromFormAction} className={styles.form}><fieldset disabled={!isWritable}><h3>Asset registrieren</h3><label>Bucket<input name="bucket" required /></label><label>Path<input name="path" required /></label><label>Titel<input name="title" /></label><label>Alt Text<input name="altText" /></label><label>MIME<input name="mimeType" /></label><label>Public URL<input name="publicUrl" /></label><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function SettingsForm({ data, isWritable, compact = false }: { data: CmsData; isWritable: boolean; compact?: boolean }) {
  return <form action={updateSiteSettingsFromFormAction} className={styles.form}><fieldset disabled={!isWritable}><h3>{compact ? "Logo" : "Globale Einstellungen"}</h3>{!compact ? <label>Site Name<input name="siteName" defaultValue={data.siteSettings.siteName} required /></label> : <input name="siteName" type="hidden" value={data.siteSettings.siteName} />}{!compact ? <label>Default Title<input name="defaultTitle" defaultValue={data.siteSettings.defaultTitle} required /></label> : <input name="defaultTitle" type="hidden" value={data.siteSettings.defaultTitle} />}{!compact ? <label>Beschreibung<textarea name="defaultDescription" rows={3} defaultValue={data.siteSettings.defaultDescription} /></label> : <input name="defaultDescription" type="hidden" value={data.siteSettings.defaultDescription} />}<label>Logo Text<input name="logoText" defaultValue={data.siteSettings.logoText} required /></label><label>Logo Subtext<input name="logoSubtext" defaultValue={data.siteSettings.logoSubtext} /></label><label>Logo Image URL<input name="logoImageUrl" defaultValue={data.siteSettings.logoImageUrl ?? "/ams-logo.png"} /></label><input name="contactLabel" type="hidden" value={data.siteSettings.contactLabel ?? ""} /><input name="contactUrl" type="hidden" value={data.siteSettings.contactUrl ?? ""} /><input name="footerText" type="hidden" value={data.siteSettings.footerText} /><button className={styles.submitButton} type="submit">Speichern</button></fieldset></form>;
}

function TeamIdentity({ data, seasonTeam, team }: { data: CmsData; seasonTeam: SeasonTeamRecord; team: TeamRecord }) {
  const logo = getTeamLogo(data, team, seasonTeam);
  return <div><strong>{logo ? <img className={styles.logoPreview} src={logo} alt={team.name} /> : team.logoText ?? team.name.slice(0, 2)}</strong><small>{seasonTeam.tag ?? team.tag ?? team.slug} · {normalizeTeamStatus(seasonTeam.status)}</small></div>;
}

function BracketCard({ data, match, season }: { data: CmsData; match: MatchRecord; season?: SeasonRecord }) {
  const participants = data.matchParticipants.filter((participant) => participant.matchId === match.id);
  return <article className={styles.bracketCard}><small>{match.roundLabel ?? match.status}</small><strong>{match.title}</strong>{participants.map((participant) => { const team = getSeasonTeamEntries(data, season).find((entry) => entry.team.id === participant.teamId); return <span key={`${match.id}-${participant.slot}`}>{team ? <TeamIdentity data={data} seasonTeam={team.seasonTeam} team={team.team} /> : `Slot ${participant.slot}`} <b>{participant.score ?? "-"}</b></span>; })}</article>;
}

function SeasonStatusButton({ season, status, disabled, label }: { season: SeasonRecord; status: string; disabled: boolean; label: string }) {
  return <form action={updateSeasonStatusFromFormAction}><input type="hidden" name="seasonId" value={season.id} /><input type="hidden" name="status" value={status} /><button disabled={disabled} type="submit">{label}</button></form>;
}

function Metric({ icon: Icon, label, value, note }: { icon: ComponentType<{ size?: number }>; label: string; value: string; note: string }) {
  return <article className={styles.metricCard}><Icon size={20} /><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Panel({ title, action, href, children }: { title: string; action: string; href: string; children: ReactNode }) {
  return <section className={styles.panelLarge}><div className={styles.panelHeader}><h2>{title}</h2><a href={href}>{action}</a></div>{children}</section>;
}

function TableHeader({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return <div className={styles.tableHeader}><div><h2>{title}</h2><p>{description}</p></div>{actionHref && actionLabel ? <a className={styles.primaryAction} href={actionHref}>{actionLabel}</a> : null}</div>;
}

type Row = { title: string; meta?: string; value?: string };

function MiniList({ rows, empty = "Keine Daten" }: { rows: Row[]; empty?: string }) {
  if (!rows.length) return <EmptyState title={empty} body="Sobald Daten vorhanden sind, erscheinen sie hier." />;
  return <div className={styles.miniList}>{rows.map((row) => <article key={`${row.title}-${row.meta}-${row.value}`}><div><strong>{row.title}</strong><small>{row.meta}</small></div><span>{row.value}</span></article>)}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className={styles.emptyState}><Box size={24} /><strong>{title}</strong><p>{body}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={styles.statusBadge} data-status={status}>{status}</span>;
}

function SelectSeason({ data, includeEmpty = false, value }: { data: CmsData; includeEmpty?: boolean; value?: string }) {
  return <select name="seasonId" defaultValue={value ?? (includeEmpty ? "" : data.seasons[0]?.id)}>{includeEmpty ? <option value="">Global / keine Season</option> : null}{data.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select>;
}

function SelectSeasonTeam({ data, season, name, includeEmpty = false }: { data: CmsData; season?: SeasonRecord; name: string; includeEmpty?: boolean }) {
  const entries = getSeasonTeamEntries(data, season).filter(({ seasonTeam }) => normalizeTeamStatus(seasonTeam.status) !== "archived");
  return <select name={name} defaultValue={includeEmpty ? "" : entries[0]?.team.id}>{includeEmpty ? <option value="">Noch offen</option> : null}{entries.map(({ team, seasonTeam }) => <option key={`${seasonTeam.seasonId}-${team.id}`} value={team.id}>{seasonTeam.tag ?? team.tag ?? team.name} · {team.name}</option>)}</select>;
}

function SelectMatch({ matches }: { matches: MatchRecord[] }) {
  return <select name="matchId" defaultValue={matches[0]?.id}>{matches.map((match) => <option key={match.id} value={match.id}>{match.title}</option>)}</select>;
}

function SelectMediaAsset({ data, name }: { data: CmsData; name: string }) {
  return <select name={name} defaultValue=""><option value="">Kein Logo</option>{data.mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title ?? asset.path}</option>)}</select>;
}

function SelectScope() {
  return <select name="scope" defaultValue="global"><option value="global">Global</option><option value="season">Season</option></select>;
}

function SelectTeamStatus() {
  return <select name="status" defaultValue="active"><option value="active">active</option><option value="inactive">inactive</option><option value="eliminated">eliminated</option><option value="archived">archived</option></select>;
}

function SelectMatchStatus() {
  return <select name="status" defaultValue="scheduled"><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="completed">Completed</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select>;
}

function SelectPublishStatus() {
  return <select name="status" defaultValue="draft"><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option><option value="archived">Archiviert</option></select>;
}

function getSeasonTeamEntries(data: CmsData, season?: SeasonRecord) {
  if (!season) return [];
  return data.seasonTeams
    .filter((entry) => entry.seasonId === season.id)
    .map((seasonTeam) => ({ seasonTeam, team: data.teams.find((team) => team.id === seasonTeam.teamId) }))
    .filter((entry): entry is { seasonTeam: SeasonTeamRecord; team: TeamRecord } => Boolean(entry.team))
    .sort((a, b) => (a.seasonTeam.seed ?? 999) - (b.seasonTeam.seed ?? 999));
}

function getSeasonTeams(data: CmsData, season?: SeasonRecord) {
  return getSeasonTeamEntries(data, season).map((entry) => entry.team);
}

function getSeasonMatches(data: CmsData, season?: SeasonRecord) {
  return season ? data.matches.filter((match) => match.seasonId === season.id) : [];
}

function getActiveSeason(data: CmsData) {
  return data.seasons.find((season) => season.status === "active") ?? data.seasons[0];
}

function getContextSeason(data: CmsData, sectionKey: string) {
  if (sectionKey.startsWith("seasons/") && sectionKey !== "seasons/new") {
    const slug = sectionKey.split("/")[1];
    return data.seasons.find((season) => season.slug === slug) ?? getActiveSeason(data);
  }
  return getActiveSeason(data);
}

function getHeader(sectionKey: string, season?: SeasonRecord) {
  if (sectionKey.startsWith("seasons/") && sectionKey !== "seasons/new") return { title: season?.name ?? "Season", description: "Season-spezifischer Workspace. Competition-Daten bleiben isoliert.", primaryAction: "Vorschau", primaryHref: season ? `/seasons/${season.slug}` : "/admin/seasons" };
  const map: Record<string, { title: string; description: string; primaryAction: string; primaryHref: string }> = {
    dashboard: { title: "Dashboard", description: "Übersicht über aktive Season, Teams, Matches und offene Aufgaben.", primaryAction: "Neue Season", primaryHref: "/admin/seasons/new" },
    seasons: { title: "Seasons", description: "Verwalte Seasons als voneinander getrennte Pakete.", primaryAction: "Neue Season", primaryHref: "/admin/seasons/new" },
    "seasons/new": { title: "Neue Season", description: "Neue Seasons starten mit leeren Teams, Schedule, Bracket, Rules und News.", primaryAction: "Alle Seasons", primaryHref: "/admin/seasons" },
    teams: { title: "Teams", description: "Team Manager für die aktuelle Season. Keine global gemischten Teams.", primaryAction: "Season", primaryHref: season ? `/admin/seasons/${season.slug}/teams` : "/admin/seasons" },
    players: { title: "Spieler", description: "Spieler werden im Season-Kontext verwaltet.", primaryAction: "Teams", primaryHref: "/admin/teams" },
    matches: { title: "Matches", description: "Matches werden nur mit Teams der aktuellen Season erstellt.", primaryAction: "Bracket", primaryHref: "/admin/brackets" },
    schedule: { title: "Schedule", description: "Spielplan der aktuellen Season.", primaryAction: "Matches", primaryHref: "/admin/matches" },
    brackets: { title: "Bracket", description: "Bracket-Ansicht für die aktuelle Season.", primaryAction: "Match erstellen", primaryHref: "/admin/matches" },
    pages: { title: "Seiten", description: "CMS-Seiten und Routen.", primaryAction: "Navigation", primaryHref: "/admin/navigation" },
    navigation: { title: "Navigation", description: "Menüpunkte global oder season-spezifisch.", primaryAction: "Seiten", primaryHref: "/admin/pages" },
    news: { title: "News", description: "News der aktuellen Season.", primaryAction: "Rules", primaryHref: "/admin/rules" },
    rules: { title: "Regeln", description: "Regeln der aktuellen Season.", primaryAction: "News", primaryHref: "/admin/news" },
    settings: { title: "Einstellungen", description: "Globale Einstellungen und Logo.", primaryAction: "Website", primaryHref: "/" }
  };
  return map[sectionKey] ?? { title: "Admin", description: "Verwaltungsbereich", primaryAction: "Dashboard", primaryHref: "/admin" };
}

function getTeamLogo(data: CmsData, team: TeamRecord, seasonTeam?: SeasonTeamRecord) {
  const assetId = seasonTeam?.logoAssetId ?? team.defaultLogoId ?? team.logoAssetId;
  return data.mediaAssets.find((asset) => asset.id === assetId)?.publicUrl;
}

function normalizeTeamStatus(status?: string) {
  if (status === "confirmed") return "active";
  if (status === "pending") return "inactive";
  if (status === "withdrawn") return "archived";
  return status ?? "active";
}

function isActive(key: string, sectionKey: string) {
  if (key === "dashboard") return sectionKey === "dashboard";
  return sectionKey === key || sectionKey.startsWith(`${key}/`);
}

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function toHex(value?: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#c9a84c";
}
