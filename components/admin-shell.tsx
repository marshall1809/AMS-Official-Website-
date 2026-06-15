import {
  Activity,
  BarChart3,
  Brush,
  CalendarDays,
  FileText,
  Image,
  ListTree,
  Newspaper,
  PanelTop,
  Route,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  Users
} from "lucide-react";
import {
  createPageFromFormAction,
  createSeasonFromFormAction,
  updateSeasonStatusFromFormAction,
  updateThemeTokensFromFormAction,
  upsertPageBlockFromFormAction
} from "@/lib/cms/admin-actions";
import { signOutAction } from "@/lib/auth/actions";
import { AdminReleaseSections } from "@/components/admin-release-sections";
import type { CmsData } from "@/lib/cms/types";

const modules = [
  {
    icon: BarChart3,
    title: "Dashboard",
    copy: "Current season overview, next matches, open tasks and recently edited content.",
    role: "Viewer"
  },
  {
    icon: Trophy,
    title: "Season Manager",
    copy: "Create, duplicate, activate, archive and soft-delete seasons with generated default pages.",
    role: "Admin"
  },
  {
    icon: Brush,
    title: "Design Manager",
    copy: "Manage global and season theme tokens, logos, hero images, buttons, cards and preview states.",
    role: "Designer"
  },
  {
    icon: PanelTop,
    title: "Page Builder",
    copy: "Build pages from approved blocks, control visibility, SEO, order, scope and versioning.",
    role: "Content Manager"
  },
  {
    icon: Route,
    title: "Navigation Manager",
    copy: "Edit global and season-specific navigation, ordering, labels, links and hidden states.",
    role: "Content Manager"
  },
  {
    icon: Users,
    title: "Team Manager",
    copy: "Manage teams, logos, social links, season participation, seeds and achievements.",
    role: "Admin"
  },
  {
    icon: Users,
    title: "Player Manager",
    copy: "Manage players, handles, roles, team memberships, histories and statistics.",
    role: "Admin"
  },
  {
    icon: CalendarDays,
    title: "Match/Schedule Manager",
    copy: "Create matches, schedule dates, set status, enter results, streams, VODs and reports.",
    role: "Tournament Manager"
  },
  {
    icon: Swords,
    title: "Bracket Manager",
    copy: "Generate single-elimination brackets, seed teams, enter winners and advance slots.",
    role: "Tournament Manager"
  },
  {
    icon: FileText,
    title: "Rules Manager",
    copy: "Create, edit, archive and publish season rulebooks with optional PDF attachments.",
    role: "Content Manager"
  },
  {
    icon: Newspaper,
    title: "News Manager",
    copy: "Draft, schedule, categorize, publish and optimize season-specific news content.",
    role: "Content Manager"
  },
  {
    icon: Activity,
    title: "Sponsor Manager",
    copy: "Manage global and season sponsors, logos, links, ordering and visibility.",
    role: "Content Manager"
  },
  {
    icon: Image,
    title: "Media Manager",
    copy: "Upload and manage AMS logos, season assets, team logos, banners, images and PDFs.",
    role: "Media Manager"
  },
  {
    icon: Settings,
    title: "Settings",
    copy: "Manage global website data, contact information, footer, social links and SEO defaults.",
    role: "Super Admin"
  },
  {
    icon: ListTree,
    title: "Audit Log",
    copy: "Review changes to seasons, pages, themes, brackets, media and settings.",
    role: "Viewer"
  }
];

const pageBlockTypes = [
  "announcement",
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
  "faq",
  "season_list"
];

export function AdminShell({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  const activeSeason = data.seasons.find((season) => season.status === "active") ?? data.seasons[0];
  const seasonTeams = activeSeason
    ? data.seasonTeams.filter((team) => team.seasonId === activeSeason.id)
    : [];
  const seasonMatches = activeSeason
    ? data.matches.filter((match) => match.seasonId === activeSeason.id)
    : [];
  const publishedPages = data.pages.filter((page) => page.status === "published");

  return (
    <div className="theme-root admin-theme">
      <div className="admin-shell">
        <aside className="admin-shell__sidebar">
          <p className="section-kicker">Admin Panel</p>
          <h1>{data.siteSettings.logoText} Control</h1>
          <nav aria-label="Admin modules">
            {modules.map((module) => (
              <a href={`#${slugify(module.title)}`} key={module.title}>
                <module.icon size={16} />
                {module.title}
              </a>
            ))}
          </nav>
          {isWritable ? (
            <form action={signOutAction} className="admin-signout">
              <button type="submit">Sign out</button>
            </form>
          ) : null}
        </aside>
        <section className="admin-shell__main">
          {!isWritable ? (
            <div className="admin-notice panel">
              <ShieldCheck size={22} />
              <div>
                <strong>Supabase write mode is not configured.</strong>
                <p>
                  The admin forms are rendered as the production architecture, but
                  writing is disabled until Supabase environment variables and
                  authenticated roles are available.
                </p>
              </div>
            </div>
          ) : null}
          <div className="admin-hero panel">
            <div>
              <p className="section-kicker">Current Season</p>
              <h2>{activeSeason?.name ?? "No active season"}</h2>
              <p>
                This area is the CMS and tournament management cockpit. The next
                implementation layer connects forms, server actions, validation,
                RLS-backed writes and audit logging for each module.
              </p>
            </div>
            <ShieldCheck size={44} />
          </div>
          <div className="admin-metrics">
            <Metric label="Seasons" value={String(data.seasons.length)} note="managed packages" />
            <Metric label="Teams" value={String(seasonTeams.length)} note="current season" />
            <Metric label="Matches" value={String(seasonMatches.length)} note="current season" />
            <Metric label="Pages" value={String(publishedPages.length)} note="published routes" />
          </div>
          <div className="admin-modules">
            {modules.map((module) => (
              <article className="admin-module panel" id={slugify(module.title)} key={module.title}>
                <module.icon size={24} />
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.copy}</p>
                  <span>{module.role}</span>
                </div>
              </article>
            ))}
          </div>
          <SeasonManagerSection data={data} isWritable={isWritable} />
          <DesignManagerSection data={data} isWritable={isWritable} />
          <PageBuilderSection data={data} isWritable={isWritable} />
          <AdminReleaseSections data={data} isWritable={isWritable} />
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="admin-metric panel">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function SeasonManagerSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <section className="admin-workspace panel" id="season-manager-workspace">
      <div className="admin-workspace__header">
        <div>
          <p className="section-kicker">Season Manager</p>
          <h2>Create and control seasons</h2>
        </div>
        <span>{data.seasons.length} seasons</span>
      </div>
      <div className="admin-form-grid">
        <form action={createSeasonFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Season name
              <input name="name" placeholder="Season Two" required />
            </label>
            <label>
              Slug
              <input name="slug" placeholder="season-two" pattern="[a-z0-9-]+" required />
            </label>
            <label>
              Initial theme tokens JSON
              <textarea name="themeTokens" defaultValue={'{\n  "colorAccent": "#C9A84C"\n}'} rows={6} />
            </label>
            <button className="button" type="submit">
              Create season package
            </button>
          </fieldset>
        </form>
        <div className="admin-list">
          {data.seasons.map((season) => (
            <form action={updateSeasonStatusFromFormAction} className="admin-list-row" key={season.id}>
              <input name="seasonId" type="hidden" value={season.id} />
              <div>
                <strong>{season.name}</strong>
                <small>/{season.slug}</small>
              </div>
              <select name="status" defaultValue={season.status} disabled={!isWritable}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deleted">Deleted</option>
              </select>
              <button className="admin-mini-button" disabled={!isWritable} type="submit">
                Save
              </button>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesignManagerSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  const selectedTheme = data.themes[0];

  return (
    <section className="admin-workspace panel" id="design-manager-workspace">
      <div className="admin-workspace__header">
        <div>
          <p className="section-kicker">Design Manager</p>
          <h2>Theme tokens</h2>
        </div>
        <span>{data.themes.length} themes</span>
      </div>
      <form action={updateThemeTokensFromFormAction} className="admin-form wide">
        <fieldset disabled={!isWritable}>
          <label>
            Theme
            <select name="themeId" defaultValue={selectedTheme?.id}>
              {data.themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-token-grid">
            <label>
              Background
              <input name="colorBg" defaultValue={selectedTheme?.tokens.colorBg} />
            </label>
            <label>
              Panel
              <input name="colorPanel" defaultValue={selectedTheme?.tokens.colorPanel} />
            </label>
            <label>
              Text
              <input name="colorText" defaultValue={selectedTheme?.tokens.colorText} />
            </label>
            <label>
              Accent
              <input name="colorAccent" defaultValue={selectedTheme?.tokens.colorAccent} />
            </label>
            <label>
              Border
              <input name="colorBorder" defaultValue={selectedTheme?.tokens.colorBorder} />
            </label>
            <label>
              Button radius
              <input name="radiusButton" defaultValue={selectedTheme?.tokens.radiusButton} />
            </label>
          </div>
          <label>
            Full token JSON
            <textarea
              name="tokens"
              defaultValue={JSON.stringify(selectedTheme?.tokens ?? {}, null, 2)}
              rows={14}
            />
          </label>
          <button className="button" type="submit">
            Publish theme tokens
          </button>
        </fieldset>
      </form>
    </section>
  );
}

function PageBuilderSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  const firstPage = data.pages[0];

  return (
    <section className="admin-workspace panel" id="page-builder-workspace">
      <div className="admin-workspace__header">
        <div>
          <p className="section-kicker">Page Builder</p>
          <h2>Pages and blocks</h2>
        </div>
        <span>{data.pages.length} pages</span>
      </div>
      <div className="admin-form-grid">
        <form action={createPageFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Page title
              <input name="title" placeholder="Season Two Teams" required />
            </label>
            <label>
              Slug
              <input name="slug" placeholder="teams" pattern="[a-z0-9-]+" required />
            </label>
            <label>
              Route path
              <input name="routePath" placeholder="/seasons/season-two/teams" required />
            </label>
            <label>
              Scope
              <select name="scope" defaultValue="season">
                <option value="global">Global</option>
                <option value="season">Season</option>
              </select>
            </label>
            <label>
              Season
              <select name="seasonId" defaultValue={data.seasons[0]?.id}>
                <option value="">None</option>
                {data.seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Publish status
              <select name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              SEO title
              <input name="seoTitle" placeholder="Optional" />
            </label>
            <label>
              SEO description
              <textarea name="seoDescription" rows={3} />
            </label>
            <button className="button" type="submit">
              Create page and route
            </button>
          </fieldset>
        </form>
        <form action={upsertPageBlockFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Page
              <select name="pageId" defaultValue={firstPage?.id}>
                {data.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Block type
              <select name="type" defaultValue="hero">
                {pageBlockTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort order
              <input name="sortOrder" defaultValue="10" inputMode="numeric" />
            </label>
            <label className="admin-checkbox">
              <input name="isVisible" type="checkbox" defaultChecked />
              Visible
            </label>
            <label>
              Block content JSON
              <textarea
                name="content"
                defaultValue={'{\n  "kicker": "New block",\n  "title": "Editable content",\n  "body": "Managed from the Page Builder."\n}'}
                rows={12}
              />
            </label>
            <button className="button" type="submit">
              Add block
            </button>
          </fieldset>
        </form>
      </div>
      <div className="admin-page-overview">
        {data.pages.slice(0, 8).map((page) => (
          <article className="admin-page-card" key={page.id}>
            <strong>{page.title}</strong>
            <span>{page.scope}</span>
            <small>{page.blocks.length} blocks</small>
          </article>
        ))}
      </div>
    </section>
  );
}
