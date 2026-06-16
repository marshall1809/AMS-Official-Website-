import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  Brush,
  CalendarDays,
  ChevronRight,
  FileText,
  Image,
  Layers3,
  LayoutDashboard,
  ListTree,
  LogOut,
  Newspaper,
  Palette,
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
  updateSiteSettingsFromFormAction,
  updateThemeTokensFromFormAction,
  upsertPageBlockAction
} from "@/lib/cms/admin-actions";
import { signOutAction } from "@/lib/auth/actions";
import type { CmsData, MatchRecord, PageBlockType, SeasonRecord, TeamRecord } from "@/lib/cms/types";
import styles from "@/components/admin-shell.module.css";

const pageBlockTypes: PageBlockType[] = [
  "hero",
  "text",
  "image",
  "image_text",
  "news_list",
  "match_list",
  "team_list",
  "bracket_embed",
  "rules_block",
  "sponsor_strip",
  "cta",
  "stat_cards",
  "faq"
];

const sidebarGroups = [
  {
    label: "Dashboard",
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard, key: "dashboard" }]
  },
  {
    label: "Seasons",
    items: [
      { label: "Alle Seasons", href: "/admin/seasons", icon: Trophy, key: "seasons" },
      { label: "Neue Season", href: "/admin/seasons/new", icon: Sparkles, key: "seasons/new" }
    ]
  },
  {
    label: "Content",
    items: [
      { label: "Seiten", href: "/admin/pages", icon: PanelTop, key: "pages" },
      { label: "Navigation", href: "/admin/navigation", icon: Route, key: "navigation" },
      { label: "News", href: "/admin/news", icon: Newspaper, key: "news" },
      { label: "Regeln", href: "/admin/rules", icon: FileText, key: "rules" }
    ]
  },
  {
    label: "Competition",
    items: [
      { label: "Teams", href: "/admin/teams", icon: Users, key: "teams" },
      { label: "Spieler", href: "/admin/players", icon: Users, key: "players" },
      { label: "Matches", href: "/admin/matches", icon: CalendarDays, key: "matches" },
      { label: "Schedule", href: "/admin/schedule", icon: BookOpen, key: "schedule" },
      { label: "Brackets", href: "/admin/brackets", icon: Swords, key: "brackets" }
    ]
  },
  {
    label: "Media",
    items: [
      { label: "Bilder", href: "/admin/media/images", icon: Image, key: "media/images" },
      { label: "Logos", href: "/admin/media/logos", icon: Upload, key: "media/logos" },
      { label: "Dokumente", href: "/admin/media/documents", icon: FileText, key: "media/documents" }
    ]
  },
  {
    label: "Design",
    items: [
      { label: "Themes", href: "/admin/design/themes", icon: Brush, key: "design/themes" },
      { label: "Farben", href: "/admin/design/colors", icon: Palette, key: "design/colors" },
      { label: "Logos", href: "/admin/design/logos", icon: Image, key: "design/logos" },
      { label: "Hero-Bereiche", href: "/admin/design/heros", icon: Layers3, key: "design/heros" }
    ]
  },
  {
    label: "Administration",
    items: [
      { label: "Benutzer", href: "/admin/users", icon: ShieldCheck, key: "users" },
      { label: "Rollen", href: "/admin/roles", icon: ShieldCheck, key: "roles" },
      { label: "Audit Log", href: "/admin/audit-log", icon: ListTree, key: "audit-log" },
      { label: "Einstellungen", href: "/admin/settings", icon: Settings, key: "settings" }
    ]
  }
];

async function createVisualPageBlockFromFormAction(formData: FormData) {
  "use server";

  const imageUrl = formString(formData, "imageUrl");
  const ctaLabel = formString(formData, "ctaLabel");
  const ctaHref = formString(formData, "ctaHref");
  const items = formString(formData, "items")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  await upsertPageBlockAction({
    pageId: formString(formData, "pageId"),
    blockId: formString(formData, "blockId") || undefined,
    type: formString(formData, "type"),
    sortOrder: Number(formString(formData, "sortOrder") || 0),
    isVisible: formData.get("isVisible") === "on",
    content: {
      kicker: formString(formData, "kicker"),
      title: formString(formData, "title"),
      body: formString(formData, "body"),
      imageUrl: imageUrl || undefined,
      logoSrc: imageUrl || undefined,
      ctaLabel: ctaLabel || undefined,
      ctaHref: ctaHref || undefined,
      items: items.length ? items : undefined
    }
  });
}

export function AdminShell({
  data,
  isWritable,
  sectionPath = []
}: {
  data: CmsData;
  isWritable: boolean;
  sectionPath?: string[];
}) {
  const activeSeason = data.seasons.find((season) => season.status === "active") ?? data.seasons[0];
  const sectionKey = sectionPath.length ? sectionPath.join("/") : "dashboard";
  const current = resolveAdminSection(sectionKey, data);

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
          {sidebarGroups.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <a data-active={isActiveNav(item.key, sectionKey)} href={item.href} key={item.href}>
                  <item.icon size={16} />
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {isWritable ? (
          <form action={signOutAction} className={styles.signOut}>
            <button type="submit">
              <LogOut size={16} />
              Sign out
            </button>
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
              <strong>{current.title}</strong>
            </div>
            <h1>{current.title}</h1>
            <p>{current.description}</p>
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
              <p>Supabase ist verbunden oder sichtbar, aber dieser User hat keine Schreibrolle oder die Umgebung ist nicht voll konfiguriert.</p>
            </div>
          </div>
        ) : null}

        <div className={styles.commandBar}>
          <label>
            <Search size={16} />
            <input placeholder="Suche nach Seasons, Teams, Matches, Seiten..." />
          </label>
          <select defaultValue={activeSeason?.id ?? ""} aria-label="Season context">
            {data.seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
          <a className={styles.primaryAction} href={current.primaryHref}>
            {current.primaryAction}
          </a>
        </div>

        {renderSection(sectionKey, data, isWritable, activeSeason)}
      </main>
    </div>
  );
}

function renderSection(sectionKey: string, data: CmsData, isWritable: boolean, activeSeason?: SeasonRecord) {
  if (sectionKey === "dashboard") return <DashboardPage data={data} activeSeason={activeSeason} />;
  if (sectionKey === "seasons/new") return <NewSeasonPage isWritable={isWritable} />;
  if (sectionKey.startsWith("seasons/") && sectionKey !== "seasons/new") {
    return <SeasonDetailPage data={data} isWritable={isWritable} sectionKey={sectionKey} />;
  }
  if (sectionKey === "seasons") return <SeasonsPage data={data} isWritable={isWritable} />;
  if (sectionKey === "pages") return <PagesPage data={data} isWritable={isWritable} />;
  if (sectionKey === "navigation") return <NavigationPage data={data} isWritable={isWritable} />;
  if (sectionKey === "news") return <NewsPage data={data} isWritable={isWritable} />;
  if (sectionKey === "rules") return <RulesPage data={data} isWritable={isWritable} />;
  if (sectionKey === "teams") return <TeamsPage data={data} isWritable={isWritable} />;
  if (sectionKey === "players") return <PlayersPage data={data} isWritable={isWritable} />;
  if (sectionKey === "matches" || sectionKey === "schedule") return <MatchesPage data={data} isWritable={isWritable} />;
  if (sectionKey === "brackets") return <BracketPage data={data} isWritable={isWritable} />;
  if (sectionKey.startsWith("media/")) return <MediaPage data={data} isWritable={isWritable} sectionKey={sectionKey} />;
  if (sectionKey.startsWith("design/")) return <DesignPage data={data} isWritable={isWritable} sectionKey={sectionKey} />;
  if (sectionKey === "users" || sectionKey === "roles") return <AccessPage mode={sectionKey} />;
  if (sectionKey === "audit-log") return <AuditPage />;
  if (sectionKey === "settings") return <SettingsPage data={data} isWritable={isWritable} />;
  return <DashboardPage data={data} activeSeason={activeSeason} />;
}

function DashboardPage({ data, activeSeason }: { data: CmsData; activeSeason?: SeasonRecord }) {
  const seasonTeams = activeSeason ? data.seasonTeams.filter((team) => team.seasonId === activeSeason.id) : [];
  const seasonMatches = activeSeason ? data.matches.filter((match) => match.seasonId === activeSeason.id) : [];
  const nextMatches = seasonMatches.filter((match) => match.status === "scheduled").slice(0, 4);
  const latestNews = data.newsPosts.slice(0, 4);

  return (
    <div className={styles.stack}>
      <div className={styles.metricGrid}>
        <Metric icon={Trophy} label="Aktive Season" value={activeSeason?.name ?? "Keine"} note={activeSeason?.status ?? "leer"} />
        <Metric icon={Users} label="Teams" value={String(seasonTeams.length)} note="in aktueller Season" />
        <Metric icon={Activity} label="Spieler" value={String(data.players.length)} note="Profile" />
        <Metric icon={CalendarDays} label="Matches" value={String(seasonMatches.length)} note="aktuelle Season" />
      </div>
      <div className={styles.dashboardGrid}>
        <Panel title="Nächste Matches" action="Matches öffnen" href="/admin/matches">
          <MiniList rows={nextMatches.map((match) => ({ title: match.title, meta: match.roundLabel ?? match.status, value: formatDate(match.startsAt) }))} empty="Keine geplanten Matches" />
        </Panel>
        <Panel title="Neue News" action="News öffnen" href="/admin/news">
          <MiniList rows={latestNews.map((post) => ({ title: post.title, meta: post.category ?? "News", value: post.status }))} empty="Noch keine News" />
        </Panel>
        <Panel title="Offene Aufgaben" action="Einstellungen" href="/admin/settings">
          <MiniList
            rows={[
              { title: "Season-Kontext prüfen", meta: activeSeason?.name ?? "Keine Season", value: "Heute" },
              { title: "Logo und SEO kontrollieren", meta: data.siteSettings.defaultTitle, value: "Setup" },
              { title: "Bracket finalisieren", meta: "Competition", value: "Optional" }
            ]}
          />
        </Panel>
        <Panel title="Schnellzugriff" action="Neue Season" href="/admin/seasons/new">
          <div className={styles.quickGrid}>
            <a href="/admin/pages">Page Builder</a>
            <a href="/admin/design/themes">Theme Manager</a>
            <a href="/admin/teams">Teams</a>
            <a href="/admin/brackets">Bracket</a>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SeasonsPage({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <div className={styles.stack}>
      <div className={styles.tableCard}>
        <TableHeader title="Alle Seasons" description="Verwalte Season-Pakete, Status und Vorschau." actionHref="/admin/seasons/new" actionLabel="Neue Season" />
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Teams</th>
              <th>Matches</th>
              <th>Letzte Änderung</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {data.seasons.map((season) => (
              <tr key={season.id}>
                <td><strong>{season.name}</strong><small>/{season.slug}</small></td>
                <td><StatusBadge status={season.status} /></td>
                <td>{data.seasonTeams.filter((team) => team.seasonId === season.id).length}</td>
                <td>{data.matches.filter((match) => match.seasonId === season.id).length}</td>
                <td>Live data</td>
                <td>
                  <div className={styles.rowActions}>
                    <a href={`/admin/seasons/${season.slug}`}>Bearbeiten</a>
                    <a href={`/seasons/${season.slug}`}>Vorschau</a>
                    <form action={updateSeasonStatusFromFormAction}>
                      <input type="hidden" name="seasonId" value={season.id} />
                      <input type="hidden" name="status" value="archived" />
                      <button disabled={!isWritable} type="submit">Archivieren</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewSeasonPage({ isWritable }: { isWritable: boolean }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <p className="section-kicker">Season Template</p>
        <h2>Neue Season erstellen</h2>
        <p>Beim Erstellen werden Standardseiten und die technische Season-Struktur vorbereitet.</p>
        <form action={createSeasonFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable}>
            <label>Season Name<input name="name" placeholder="Season Two" required /></label>
            <label>Slug<input name="slug" placeholder="season-two" pattern="[a-z0-9-]+" required /></label>
            <label>Startfarben<textarea name="themeTokens" rows={8} defaultValue={'{\n  "colorBg": "#050b16",\n  "colorAccent": "#c9a84c",\n  "colorPanel": "rgba(12, 28, 60, 0.72)"\n}'} /></label>
            <button className={styles.submitButton} type="submit">Season Paket erstellen</button>
          </fieldset>
        </form>
      </section>
      <aside className={styles.sidePanel}>
        <h3>Wird vorbereitet</h3>
        <MiniList rows={["Overview", "Teams", "Schedule", "Bracket", "Rules", "News"].map((item) => ({ title: item, meta: "Standardseite", value: "Draft" }))} />
      </aside>
    </div>
  );
}

function SeasonDetailPage({ data, isWritable, sectionKey }: { data: CmsData; isWritable: boolean; sectionKey: string }) {
  const [, slug, tab = "overview"] = sectionKey.split("/");
  const season = data.seasons.find((item) => item.slug === slug) ?? data.seasons[0];
  const tabs = ["overview", "design", "teams", "players", "schedule", "bracket", "rules", "news", "sponsors", "seo"];

  if (!season) return <EmptyState title="Keine Season gefunden" body="Erstelle zuerst eine Season." />;

  return (
    <div className={styles.stack}>
      <div className={styles.seasonHeader}>
        <div>
          <p className="section-kicker">Season Workspace</p>
          <h2>{season.name}</h2>
          <p>Alles in diesem Bereich gehört logisch zu dieser Season.</p>
        </div>
        <StatusBadge status={season.status} />
      </div>
      <div className={styles.tabs}>
        {tabs.map((item) => (
          <a data-active={item === tab} href={`/admin/seasons/${season.slug}/${item}`} key={item}>{item}</a>
        ))}
      </div>
      {tab === "design" ? <DesignPage data={data} isWritable={isWritable} sectionKey="design/themes" /> : null}
      {tab === "teams" ? <TeamsPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "players" ? <PlayersPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "schedule" ? <MatchesPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "bracket" ? <BracketPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "rules" ? <RulesPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "news" ? <NewsPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "sponsors" ? <SponsorsPage data={data} isWritable={isWritable} season={season} /> : null}
      {tab === "overview" || tab === "seo" ? <SeasonOverview data={data} season={season} isWritable={isWritable} /> : null}
    </div>
  );
}

function SeasonOverview({ data, season, isWritable }: { data: CmsData; season: SeasonRecord; isWritable: boolean }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <h3>Status und Aktionen</h3>
        <form action={updateSeasonStatusFromFormAction} className={styles.inlineForm}>
          <input name="seasonId" type="hidden" value={season.id} />
          <select name="status" defaultValue={season.status} disabled={!isWritable}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted</option>
          </select>
          <button disabled={!isWritable} type="submit">Speichern</button>
        </form>
        <div className={styles.metricGridCompact}>
          <Metric icon={Users} label="Teams" value={String(data.seasonTeams.filter((team) => team.seasonId === season.id).length)} note="Season" />
          <Metric icon={CalendarDays} label="Matches" value={String(data.matches.filter((match) => match.seasonId === season.id).length)} note="Season" />
          <Metric icon={Newspaper} label="News" value={String(data.newsPosts.filter((post) => post.seasonId === season.id).length)} note="Season" />
        </div>
      </section>
      <aside className={styles.sidePanel}>
        <h3>Vorschau</h3>
        <a className={styles.submitButton} href={`/seasons/${season.slug}`}>Öffentliche Season öffnen</a>
      </aside>
    </div>
  );
}

function PagesPage({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  const selectedPage = data.pages[0];

  return (
    <div className={styles.builderLayout}>
      <aside className={styles.blockLibrary}>
        <h3>Blockbibliothek</h3>
        {pageBlockTypes.map((type) => <button type="button" key={type}>{type.replaceAll("_", " ")}</button>)}
        <hr />
        <form action={createPageFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable}>
            <label>Neue Seite<input name="title" placeholder="Landing Page" required /></label>
            <label>Slug<input name="slug" placeholder="landing" pattern="[a-z0-9-]+" required /></label>
            <label>Route<input name="routePath" placeholder="/landing" required /></label>
            <input type="hidden" name="scope" value="global" />
            <input type="hidden" name="status" value="draft" />
            <button className={styles.submitButton} type="submit">Seite anlegen</button>
          </fieldset>
        </form>
      </aside>
      <section className={styles.previewCanvas}>
        <div className={styles.previewToolbar}>
          <span>{selectedPage?.title ?? "Keine Seite"}</span>
          <a href={selectedPage ? `/${selectedPage.slug}` : "/"}>Vorschau</a>
        </div>
        <div className={styles.livePreview}>
          {selectedPage?.blocks.length ? selectedPage.blocks.map((block) => (
            <article key={block.id}>
              <small>{block.type}</small>
              <h3>{String(block.content.title ?? block.type)}</h3>
              <p>{String(block.content.body ?? "Block content")}</p>
            </article>
          )) : <EmptyState title="Noch keine Blöcke" body="Wähle rechts eine Seite und füge einen Block hinzu." />}
        </div>
      </section>
      <aside className={styles.settingsRail}>
        <h3>Block-Einstellungen</h3>
        <form action={createVisualPageBlockFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable || !selectedPage}>
            <label>Seite<SelectPage data={data} /></label>
            <label>Blocktyp<SelectBlockType /></label>
            <label>Reihenfolge<input name="sortOrder" defaultValue="10" inputMode="numeric" /></label>
            <label>Kicker<input name="kicker" placeholder="AMS" /></label>
            <label>Titel<input name="title" placeholder="Neuer Block" /></label>
            <label>Text<textarea name="body" rows={5} /></label>
            <label>Bild/Logo URL<input name="imageUrl" placeholder="/ams-logo.png" /></label>
            <label>CTA Text<input name="ctaLabel" placeholder="Mehr erfahren" /></label>
            <label>CTA Link<input name="ctaHref" placeholder="/seasons" /></label>
            <label>Liste<textarea name="items" rows={4} placeholder="Ein Eintrag pro Zeile" /></label>
            <label className={styles.check}><input name="isVisible" type="checkbox" defaultChecked /> Sichtbar</label>
            <button className={styles.submitButton} type="submit">Block speichern</button>
          </fieldset>
        </form>
      </aside>
    </div>
  );
}

function NavigationPage({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return <SimpleManager title="Navigation" rows={data.navigationItems.map((item) => ({ title: item.label, meta: item.href, value: item.scope }))} form={<NavigationForm data={data} isWritable={isWritable} />} />;
}

function NewsPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const posts = season ? data.newsPosts.filter((post) => post.seasonId === season.id) : data.newsPosts;
  return <SplitEditor title="News Manager" rows={posts.map((post) => ({ title: post.title, meta: post.category ?? "News", value: post.status }))} form={<NewsForm data={data} isWritable={isWritable} season={season} />} />;
}

function RulesPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const rows = (season ? data.rulesets.filter((rule) => rule.seasonId === season.id) : data.rulesets).map((rule) => ({ title: rule.title, meta: rule.status, value: "Rules" }));
  return <SimpleManager title="Rules Manager" rows={rows} form={<RulesForm data={data} isWritable={isWritable} season={season} />} />;
}

function SponsorsPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const rows = (season ? data.sponsors.filter((sponsor) => sponsor.seasonId === season.id) : data.sponsors).map((sponsor) => ({ title: sponsor.name, meta: sponsor.url, value: sponsor.isActive ? "Active" : "Hidden" }));
  return <SimpleManager title="Sponsor Manager" rows={rows} form={<SponsorForm data={data} isWritable={isWritable} season={season} />} />;
}

function TeamsPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const teams = season
    ? data.seasonTeams.filter((entry) => entry.seasonId === season.id).map((entry) => data.teams.find((team) => team.id === entry.teamId)).filter(isDefined)
    : data.teams;
  return <SimpleManager title="Team Manager" rows={teams.map((team) => ({ title: team.name, meta: `/${team.slug}`, value: team.logoText ?? "Team" }))} form={<TeamForm data={data} isWritable={isWritable} season={season} />} />;
}

function PlayersPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const players = season ? data.players.filter((player) => player.seasonId === season.id) : data.players;
  return <SimpleManager title="Player Manager" rows={players.map((player) => ({ title: player.name, meta: player.handle, value: player.role ?? "Player" }))} form={<PlayerForm data={data} isWritable={isWritable} season={season} />} />;
}

function MatchesPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const matches = season ? data.matches.filter((match) => match.seasonId === season.id) : data.matches;
  return (
    <div className={styles.stack}>
      <div className={styles.filters}>
        <select><option>{season?.name ?? "Alle Seasons"}</option></select>
        <select><option>Status</option><option>scheduled</option><option>live</option><option>completed</option></select>
        <input placeholder="Team suchen" />
      </div>
      <SimpleManager title="Match Manager" rows={matches.map((match) => ({ title: match.title, meta: match.roundLabel ?? formatDate(match.startsAt), value: match.status }))} form={<MatchForm data={data} isWritable={isWritable} season={season} />} />
    </div>
  );
}

function BracketPage({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  const matches = (season ? data.matches.filter((match) => match.seasonId === season.id) : data.matches).slice(0, 12);
  const selectedMatch = matches[0];

  return (
    <div className={styles.bracketWorkspace}>
      <section className={styles.bracketCanvas}>
        {["Round 1", "Semifinal", "Final"].map((round, index) => (
          <div className={styles.bracketColumn} key={round}>
            <h3>{round}</h3>
            {matches.filter((_, matchIndex) => matchIndex % 3 === index).map((match) => <BracketCard match={match} data={data} key={match.id} />)}
          </div>
        ))}
      </section>
      <aside className={styles.settingsRail}>
        <h3>Match Details</h3>
        <MiniList rows={selectedMatch ? [{ title: selectedMatch.title, meta: selectedMatch.status, value: selectedMatch.roundLabel ?? "Bracket" }] : []} empty="Kein Match" />
        <form action={advanceBracketWinnerFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable || !selectedMatch}>
            <label>Match<SelectMatch data={data} /></label>
            <label>Gewinner<SelectTeam data={data} /></label>
            <button className={styles.submitButton} type="submit">Gewinner weiterleiten</button>
          </fieldset>
        </form>
      </aside>
    </div>
  );
}

function MediaPage({ data, isWritable, sectionKey }: { data: CmsData; isWritable: boolean; sectionKey: string }) {
  const mode = sectionKey.split("/")[1] ?? "images";
  return (
    <div className={styles.mediaLayout}>
      <section className={styles.mediaGrid}>
        {data.mediaAssets.map((asset) => (
          <article className={styles.assetCard} key={asset.id}>
            <div>{asset.publicUrl ? <img src={asset.publicUrl} alt={asset.altText ?? asset.title ?? "Asset"} /> : <Image size={28} />}</div>
            <strong>{asset.title ?? asset.path}</strong>
            <small>{asset.bucket}</small>
            <span>Used in CMS data</span>
          </article>
        ))}
        {!data.mediaAssets.length ? <EmptyState title="Noch keine Medien" body="Registriere Bilder, Logos oder PDFs aus Supabase Storage." /> : null}
      </section>
      <aside className={styles.settingsRail}>
        <h3>{mode === "logos" ? "Logo verwalten" : "Asset registrieren"}</h3>
        {mode === "logos" ? <SettingsForm data={data} isWritable={isWritable} compact /> : <MediaForm isWritable={isWritable} />}
      </aside>
    </div>
  );
}

function DesignPage({ data, isWritable, sectionKey }: { data: CmsData; isWritable: boolean; sectionKey: string }) {
  const theme = data.themes[0];
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <p className="section-kicker">Theme Manager</p>
        <h2>{sectionKey.includes("colors") ? "Farben" : sectionKey.includes("logos") ? "Logos" : sectionKey.includes("heros") ? "Hero-Bereiche" : "Themes"}</h2>
        <form action={updateThemeTokensFromFormAction} className={styles.form}>
          <fieldset disabled={!isWritable || !theme}>
            <input type="hidden" name="themeId" value={theme?.id} />
            <textarea name="tokens" hidden readOnly defaultValue={JSON.stringify(theme?.tokens ?? {})} />
            <div className={styles.colorGrid}>
              <label>Background<input name="colorBg" type="color" defaultValue={toHex(theme?.tokens.colorBg)} /></label>
              <label>Panel<input name="colorPanel" defaultValue={theme?.tokens.colorPanel} /></label>
              <label>Text<input name="colorText" type="color" defaultValue={toHex(theme?.tokens.colorText)} /></label>
              <label>Accent<input name="colorAccent" type="color" defaultValue={toHex(theme?.tokens.colorAccent)} /></label>
              <label>Border<input name="colorBorder" defaultValue={theme?.tokens.colorBorder} /></label>
              <label>Button Radius<input name="radiusButton" defaultValue={theme?.tokens.radiusButton} /></label>
            </div>
            <button className={styles.submitButton} type="submit">Theme veröffentlichen</button>
          </fieldset>
        </form>
      </section>
      <aside className={styles.themePreview}>
        <span>Live Preview</span>
        <h3>AMS Preview Card</h3>
        <p>Farben, Cards, Buttons und Akzente werden als Theme Tokens gespeichert.</p>
        <button>Primary Action</button>
      </aside>
    </div>
  );
}

function AccessPage({ mode }: { mode: string }) {
  return <EmptyState title={mode === "users" ? "Benutzerverwaltung" : "Rollenverwaltung"} body="Die Rollen werden sicher über Supabase Auth und user_roles verwaltet. Die Oberfläche ist vorbereitet." />;
}

function AuditPage() {
  return <EmptyState title="Audit Log" body="Änderungsprotokolle werden aus audit_logs gelesen. Sobald Trigger aktiv sind, erscheinen hier alle Änderungen." />;
}

function SettingsPage({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <SettingsForm data={data} isWritable={isWritable} />
      </section>
      <aside className={styles.sidePanel}>
        <h3>Globales Logo</h3>
        {data.siteSettings.logoImageUrl ? <img className={styles.logoPreview} src={data.siteSettings.logoImageUrl} alt="AMS logo" /> : null}
        <p>Änderst du die Logo-URL hier, wird das Logo global auf der Webseite genutzt.</p>
      </aside>
    </div>
  );
}

function SimpleManager({ title, rows, form }: { title: string; rows: Array<Row>; form: React.ReactNode }) {
  return (
    <div className={styles.editorGrid}>
      <section className={styles.panelLarge}>
        <TableHeader title={title} description="Listenansicht mit klaren Aktionen und schnellem Überblick." />
        <MiniList rows={rows} empty="Noch keine Einträge" />
      </section>
      <aside className={styles.settingsRail}>{form}</aside>
    </div>
  );
}

function SplitEditor({ title, rows, form }: { title: string; rows: Array<Row>; form: React.ReactNode }) {
  return (
    <div className={styles.splitEditor}>
      <section className={styles.listPane}>
        <h2>{title}</h2>
        <MiniList rows={rows} empty="Noch keine Beiträge" />
      </section>
      <section className={styles.editorPane}>{form}</section>
    </div>
  );
}

function NavigationForm({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <form action={createNavigationItemFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Menüpunkt hinzufügen</h3>
        <label>Label<input name="label" required /></label>
        <label>Href<input name="href" placeholder="/seasons/season-one" required /></label>
        <label>Scope<SelectScope /></label>
        <label>Season<SelectSeason data={data} includeEmpty /></label>
        <label>Order<input name="sortOrder" defaultValue="10" inputMode="numeric" /></label>
        <label className={styles.check}><input name="isVisible" type="checkbox" defaultChecked /> Sichtbar</label>
        <button className={styles.submitButton} type="submit">Speichern</button>
      </fieldset>
    </form>
  );
}

function TeamForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createTeamFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Team erstellen</h3>
        <label>Name<input name="name" required /></label>
        <label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label>
        <label>Logo Text<input name="logoText" maxLength={6} /></label>
        <label>Season<SelectSeason data={data} value={season?.id} includeEmpty /></label>
        <label>Seed<input name="seed" inputMode="numeric" /></label>
        <label>Status<SelectTeamStatus /></label>
        <label>Beschreibung<textarea name="description" rows={4} /></label>
        <textarea name="socialLinks" hidden readOnly defaultValue="{}" />
        <button className={styles.submitButton} type="submit">Team speichern</button>
      </fieldset>
    </form>
  );
}

function PlayerForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createPlayerFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Spieler erstellen</h3>
        <label>Name<input name="name" required /></label>
        <label>Handle<input name="handle" required /></label>
        <label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label>
        <label>Rolle<input name="role" /></label>
        <label>Team<SelectTeam data={data} includeEmpty /></label>
        <label>Season<SelectSeason data={data} value={season?.id} includeEmpty /></label>
        <button className={styles.submitButton} type="submit">Spieler speichern</button>
      </fieldset>
    </form>
  );
}

function MatchForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createMatchFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Match erstellen</h3>
        <label>Season<SelectSeason data={data} value={season?.id} /></label>
        <label>Title<input name="title" required /></label>
        <label>Status<SelectMatchStatus /></label>
        <label>Datum<input name="startsAt" type="datetime-local" /></label>
        <label>Runde<input name="roundLabel" /></label>
        <label>Position<input name="bracketPosition" inputMode="numeric" /></label>
        <label>Team A<SelectTeam data={data} name="teamAId" includeEmpty /></label>
        <label>Team B<SelectTeam data={data} name="teamBId" includeEmpty /></label>
        <input name="tournamentId" type="hidden" />
        <input name="stageId" type="hidden" />
        <button className={styles.submitButton} type="submit">Match speichern</button>
      </fieldset>
    </form>
  );
}

function NewsForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createNewsPostFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>News Editor</h3>
        <label>Season<SelectSeason data={data} value={season?.id} includeEmpty /></label>
        <label>Titel<input name="title" required /></label>
        <label>Slug<input name="slug" pattern="[a-z0-9-]+" required /></label>
        <label>Kategorie<input name="category" /></label>
        <label>Status<SelectPublishStatus /></label>
        <label>Veröffentlichung<input name="publishedAt" type="datetime-local" /></label>
        <label>Excerpt<textarea name="excerpt" rows={3} /></label>
        <textarea name="body" hidden readOnly defaultValue="{}" />
        <button className={styles.submitButton} type="submit">News speichern</button>
      </fieldset>
    </form>
  );
}

function RulesForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createRulesetFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Regeln bearbeiten</h3>
        <label>Season<SelectSeason data={data} value={season?.id} includeEmpty /></label>
        <label>Titel<input name="title" required /></label>
        <label>Status<SelectPublishStatus /></label>
        <label>Regeltext<textarea name="body" rows={10} required /></label>
        <button className={styles.submitButton} type="submit">Regeln speichern</button>
      </fieldset>
    </form>
  );
}

function SponsorForm({ data, isWritable, season }: { data: CmsData; isWritable: boolean; season?: SeasonRecord }) {
  return (
    <form action={createSponsorFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Sponsor erstellen</h3>
        <label>Season<SelectSeason data={data} value={season?.id} includeEmpty /></label>
        <label>Name<input name="name" required /></label>
        <label>URL<input name="url" /></label>
        <label>Logo Text<input name="logoText" maxLength={8} /></label>
        <label>Order<input name="sortOrder" defaultValue="0" inputMode="numeric" /></label>
        <label className={styles.check}><input name="isActive" type="checkbox" defaultChecked /> Aktiv</label>
        <button className={styles.submitButton} type="submit">Sponsor speichern</button>
      </fieldset>
    </form>
  );
}

function MediaForm({ isWritable }: { isWritable: boolean }) {
  return (
    <form action={createMediaAssetFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>Asset registrieren</h3>
        <label>Bucket<input name="bucket" placeholder="seasons" required /></label>
        <label>Storage Path<input name="path" required /></label>
        <label>Titel<input name="title" /></label>
        <label>Alt Text<input name="altText" /></label>
        <label>MIME<input name="mimeType" placeholder="image/png" /></label>
        <label>Public URL<input name="publicUrl" placeholder="https://..." /></label>
        <button className={styles.submitButton} type="submit">Asset speichern</button>
      </fieldset>
    </form>
  );
}

function SettingsForm({ data, isWritable, compact = false }: { data: CmsData; isWritable: boolean; compact?: boolean }) {
  return (
    <form action={updateSiteSettingsFromFormAction} className={styles.form}>
      <fieldset disabled={!isWritable}>
        <h3>{compact ? "Globales Logo" : "Globale Einstellungen"}</h3>
        {!compact ? <label>Site Name<input name="siteName" defaultValue={data.siteSettings.siteName} required /></label> : <input name="siteName" type="hidden" value={data.siteSettings.siteName} />}
        {!compact ? <label>Default Title<input name="defaultTitle" defaultValue={data.siteSettings.defaultTitle} required /></label> : <input name="defaultTitle" type="hidden" value={data.siteSettings.defaultTitle} />}
        {!compact ? <label>Default Description<textarea name="defaultDescription" rows={3} defaultValue={data.siteSettings.defaultDescription} /></label> : <input name="defaultDescription" type="hidden" value={data.siteSettings.defaultDescription} />}
        <label>Logo Text<input name="logoText" defaultValue={data.siteSettings.logoText} required /></label>
        <label>Logo Subtext<input name="logoSubtext" defaultValue={data.siteSettings.logoSubtext} /></label>
        <label>Logo Image URL<input name="logoImageUrl" defaultValue={data.siteSettings.logoImageUrl ?? "/ams-logo.png"} /></label>
        {!compact ? <label>Kontakt Label<input name="contactLabel" defaultValue={data.siteSettings.contactLabel} /></label> : <input name="contactLabel" type="hidden" value={data.siteSettings.contactLabel ?? ""} />}
        {!compact ? <label>Kontakt URL<input name="contactUrl" defaultValue={data.siteSettings.contactUrl} /></label> : <input name="contactUrl" type="hidden" value={data.siteSettings.contactUrl ?? ""} />}
        {!compact ? <label>Footer<input name="footerText" defaultValue={data.siteSettings.footerText} /></label> : <input name="footerText" type="hidden" value={data.siteSettings.footerText} />}
        <button className={styles.submitButton} type="submit">Speichern</button>
      </fieldset>
    </form>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Trophy; label: string; value: string; note: string }) {
  return (
    <article className={styles.metricCard}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Panel({ title, action, href, children }: { title: string; action: string; href: string; children: React.ReactNode }) {
  return (
    <section className={styles.panelLarge}>
      <div className={styles.panelHeader}>
        <h2>{title}</h2>
        <a href={href}>{action}</a>
      </div>
      {children}
    </section>
  );
}

function TableHeader({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className={styles.tableHeader}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionHref && actionLabel ? <a className={styles.primaryAction} href={actionHref}>{actionLabel}</a> : null}
    </div>
  );
}

type Row = { title: string; meta?: string; value?: string };

function MiniList({ rows, empty = "Keine Daten" }: { rows: Row[]; empty?: string }) {
  if (!rows.length) return <EmptyState title={empty} body="Sobald Daten vorhanden sind, erscheinen sie hier." />;
  return (
    <div className={styles.miniList}>
      {rows.map((row) => (
        <article key={`${row.title}-${row.meta}-${row.value}`}>
          <div>
            <strong>{row.title}</strong>
            <small>{row.meta}</small>
          </div>
          <span>{row.value}</span>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.emptyState}>
      <Box size={24} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function BracketCard({ match, data }: { match: MatchRecord; data: CmsData }) {
  const participants = data.matchParticipants.filter((participant) => participant.matchId === match.id);
  return (
    <article className={styles.bracketCard}>
      <small>{match.roundLabel ?? match.status}</small>
      <strong>{match.title}</strong>
      {participants.map((participant) => {
        const team = data.teams.find((item) => item.id === participant.teamId);
        return <span key={`${match.id}-${participant.slot}`}>{team?.name ?? `Slot ${participant.slot}`} <b>{participant.score ?? "-"}</b></span>;
      })}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={styles.statusBadge} data-status={status}>{status}</span>;
}

function SelectSeason({ data, includeEmpty = false, value }: { data: CmsData; includeEmpty?: boolean; value?: string }) {
  return (
    <select name="seasonId" defaultValue={value ?? (includeEmpty ? "" : data.seasons[0]?.id)}>
      {includeEmpty ? <option value="">Global / keine Season</option> : null}
      {data.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
    </select>
  );
}

function SelectTeam({ data, includeEmpty = false, name = "teamId" }: { data: CmsData; includeEmpty?: boolean; name?: string }) {
  return (
    <select name={name} defaultValue={includeEmpty ? "" : data.teams[0]?.id}>
      {includeEmpty ? <option value="">Noch offen</option> : null}
      {data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
    </select>
  );
}

function SelectMatch({ data }: { data: CmsData }) {
  return (
    <select name="matchId" defaultValue={data.matches[0]?.id}>
      {data.matches.map((match) => <option key={match.id} value={match.id}>{match.title}</option>)}
    </select>
  );
}

function SelectPage({ data }: { data: CmsData }) {
  return (
    <select name="pageId" defaultValue={data.pages[0]?.id}>
      {data.pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
    </select>
  );
}

function SelectBlockType() {
  return (
    <select name="type" defaultValue="hero">
      {pageBlockTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
    </select>
  );
}

function SelectScope() {
  return (
    <select name="scope" defaultValue="global">
      <option value="global">Global</option>
      <option value="season">Season</option>
    </select>
  );
}

function SelectTeamStatus() {
  return (
    <select name="status" defaultValue="pending">
      <option value="confirmed">Confirmed</option>
      <option value="pending">Pending</option>
      <option value="withdrawn">Withdrawn</option>
    </select>
  );
}

function SelectMatchStatus() {
  return (
    <select name="status" defaultValue="scheduled">
      <option value="scheduled">Scheduled</option>
      <option value="live">Live</option>
      <option value="completed">Completed</option>
      <option value="postponed">Postponed</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
}

function SelectPublishStatus() {
  return (
    <select name="status" defaultValue="draft">
      <option value="draft">Entwurf</option>
      <option value="published">Veröffentlicht</option>
      <option value="archived">Archiviert</option>
    </select>
  );
}

function resolveAdminSection(sectionKey: string, data: CmsData) {
  const seasonSlug = sectionKey.startsWith("seasons/") ? sectionKey.split("/")[1] : undefined;
  const season = data.seasons.find((item) => item.slug === seasonSlug);

  if (season) {
    return {
      title: season.name,
      description: "Season-spezifischer Workspace mit Tabs für Design, Teams, Schedule, Bracket, Regeln, News und SEO.",
      primaryAction: "Vorschau öffnen",
      primaryHref: `/seasons/${season.slug}`
    };
  }

  const map: Record<string, { title: string; description: string; primaryAction: string; primaryHref: string }> = {
    dashboard: { title: "Dashboard", description: "Zentrale Übersicht über Season, Matches, Inhalte und offene Aufgaben.", primaryAction: "Neue Season", primaryHref: "/admin/seasons/new" },
    seasons: { title: "Seasons", description: "Alle Seasons als klar verwaltbare Pakete.", primaryAction: "Neue Season", primaryHref: "/admin/seasons/new" },
    "seasons/new": { title: "Neue Season", description: "Erstelle ein neues Season-Paket mit Standardstruktur.", primaryAction: "Alle Seasons", primaryHref: "/admin/seasons" },
    pages: { title: "Page Builder", description: "Blockbasierte Seitenverwaltung mit Bibliothek, Vorschau und Einstellungen.", primaryAction: "Navigation", primaryHref: "/admin/navigation" },
    navigation: { title: "Navigation", description: "Globale und season-spezifische Menüpunkte.", primaryAction: "Neue Seite", primaryHref: "/admin/pages" },
    news: { title: "News", description: "CMS-Editor für Entwürfe, geplante und veröffentlichte Beiträge.", primaryAction: "Seiten", primaryHref: "/admin/pages" },
    rules: { title: "Regeln", description: "Regelwerke je Season verwalten.", primaryAction: "News", primaryHref: "/admin/news" },
    teams: { title: "Teams", description: "Teams, Seeds, Logos und Season-Zuordnung.", primaryAction: "Spieler", primaryHref: "/admin/players" },
    players: { title: "Spieler", description: "Spielerprofile und Teamzuordnung.", primaryAction: "Teams", primaryHref: "/admin/teams" },
    matches: { title: "Matches", description: "Tabellenansicht mit Filtern und schnellem Anlegen.", primaryAction: "Bracket", primaryHref: "/admin/brackets" },
    schedule: { title: "Schedule", description: "Spielplanansicht nach Season, Datum, Status und Team.", primaryAction: "Matches", primaryHref: "/admin/matches" },
    brackets: { title: "Bracket Manager", description: "Vollbild-Bracket mit Match-Details in der rechten Seitenleiste.", primaryAction: "Match erstellen", primaryHref: "/admin/matches" },
    "media/images": { title: "Bilder", description: "Medienverwaltung im Grid-Stil mit Such- und Nutzungskonzept.", primaryAction: "Logos", primaryHref: "/admin/media/logos" },
    "media/logos": { title: "Logos", description: "Globales AMS-Logo und Logo-Assets verwalten.", primaryAction: "Einstellungen", primaryHref: "/admin/settings" },
    "media/documents": { title: "Dokumente", description: "PDFs und Dokumente aus Supabase Storage registrieren.", primaryAction: "Bilder", primaryHref: "/admin/media/images" },
    "design/themes": { title: "Themes", description: "Theme Tokens mit Live Preview, Duplikation und Import/Export-Grundlage.", primaryAction: "Farben", primaryHref: "/admin/design/colors" },
    "design/colors": { title: "Farben", description: "Farb-Picker für globale und season-spezifische Akzente.", primaryAction: "Themes", primaryHref: "/admin/design/themes" },
    "design/logos": { title: "Design Logos", description: "Logo-Design und Branding-Kontext.", primaryAction: "Media Logos", primaryHref: "/admin/media/logos" },
    "design/heros": { title: "Hero-Bereiche", description: "Hero-Bilder, Texte und visuelle Einstiege planen.", primaryAction: "Page Builder", primaryHref: "/admin/pages" },
    users: { title: "Benutzer", description: "Auth-User und Admin-Zugriff verwalten.", primaryAction: "Rollen", primaryHref: "/admin/roles" },
    roles: { title: "Rollen", description: "Rechte und Verantwortlichkeiten im Admin-Bereich.", primaryAction: "Benutzer", primaryHref: "/admin/users" },
    "audit-log": { title: "Audit Log", description: "Änderungen nachvollziehen und später filtern.", primaryAction: "Settings", primaryHref: "/admin/settings" },
    settings: { title: "Einstellungen", description: "Globale Website-Daten, Logo, Kontakt und SEO Defaults.", primaryAction: "Website öffnen", primaryHref: "/" }
  };

  return map[sectionKey] ?? map.dashboard;
}

function isActiveNav(key: string, sectionKey: string) {
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

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
