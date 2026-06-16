import {
  advanceBracketWinnerFromFormAction,
  createMatchFromFormAction,
  createMediaAssetFromFormAction,
  createNavigationItemFromFormAction,
  createNewsPostFromFormAction,
  createPlayerFromFormAction,
  createRulesetFromFormAction,
  createSponsorFromFormAction,
  createTeamFromFormAction,
  updateSiteSettingsFromFormAction
} from "@/lib/cms/admin-actions";
import type { CmsData } from "@/lib/cms/types";

export function AdminReleaseSections({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <>
      <NavigationManagerSection data={data} isWritable={isWritable} />
      <TeamPlayerManagerSection data={data} isWritable={isWritable} />
      <MatchBracketManagerSection data={data} isWritable={isWritable} />
      <ContentManagerSection data={data} isWritable={isWritable} />
      <MediaSettingsSection data={data} isWritable={isWritable} />
      <AuditLogSection />
    </>
  );
}

function NavigationManagerSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <section className="admin-workspace panel" id="navigation-manager-workspace">
      <WorkspaceHeader kicker="Navigation Manager" title="Menus and links" count={`${data.navigationItems.length} items`} />
      <div className="admin-form-grid">
        <form action={createNavigationItemFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Label
              <input name="label" placeholder="Rules" required />
            </label>
            <label>
              Href
              <input name="href" placeholder="/seasons/season-one/rules" required />
            </label>
            <label>
              Scope
              <SelectScope />
            </label>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" includeEmpty />
            </label>
            <label>
              Order
              <input name="sortOrder" defaultValue="10" inputMode="numeric" />
            </label>
            <label className="admin-checkbox">
              <input name="isVisible" type="checkbox" defaultChecked />
              Visible
            </label>
            <button className="button" type="submit">
              Add navigation item
            </button>
          </fieldset>
        </form>
        <RecordList
          rows={data.navigationItems.map((item) => ({
            title: item.label,
            meta: item.href,
            value: item.scope
          }))}
        />
      </div>
    </section>
  );
}

function TeamPlayerManagerSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <section className="admin-workspace panel" id="team-manager-workspace">
      <WorkspaceHeader kicker="Teams and Players" title="Roster management" count={`${data.teams.length} teams`} />
      <div className="admin-form-grid">
        <form action={createTeamFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Team name
              <input name="name" placeholder="Alliance Name" required />
            </label>
            <label>
              Slug
              <input name="slug" placeholder="alliance-name" pattern="[a-z0-9-]+" required />
            </label>
            <label>
              Logo text
              <input name="logoText" placeholder="AN" maxLength={6} />
            </label>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" includeEmpty />
            </label>
            <label>
              Seed
              <input name="seed" inputMode="numeric" placeholder="1" />
            </label>
            <label>
              Status
              <SelectTeamStatus />
            </label>
            <label>
              Description
              <textarea name="description" rows={4} />
            </label>
            <label>
              Social links JSON
              <textarea name="socialLinks" rows={4} defaultValue={'{\n  "discord": ""\n}'} />
            </label>
            <button className="button" type="submit">
              Create team
            </button>
          </fieldset>
        </form>
        <form action={createPlayerFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Name
              <input name="name" placeholder="Player name" required />
            </label>
            <label>
              Handle
              <input name="handle" placeholder="Handle" required />
            </label>
            <label>
              Slug
              <input name="slug" placeholder="player-handle" pattern="[a-z0-9-]+" required />
            </label>
            <label>
              Role
              <input name="role" placeholder="Captain" />
            </label>
            <label>
              Team
              <SelectTeam data={data} name="teamId" includeEmpty />
            </label>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" includeEmpty />
            </label>
            <button className="button" type="submit">
              Create player
            </button>
          </fieldset>
        </form>
      </div>
      <RecordList
        rows={data.teams.slice(0, 8).map((team) => ({
          title: team.name,
          meta: `/${team.slug}`,
          value: team.logoText ?? "Team"
        }))}
      />
    </section>
  );
}

function MatchBracketManagerSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <section className="admin-workspace panel" id="match-schedule-manager-workspace">
      <WorkspaceHeader kicker="Matches and Brackets" title="Schedule, scores and advancement" count={`${data.matches.length} matches`} />
      <div className="admin-form-grid">
        <form action={createMatchFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" />
            </label>
            <label>
              Tournament
              <SelectTournament data={data} name="tournamentId" includeEmpty />
            </label>
            <label>
              Stage
              <SelectStage data={data} name="stageId" includeEmpty />
            </label>
            <label>
              Title
              <input name="title" placeholder="Opening Match" required />
            </label>
            <label>
              Status
              <SelectMatchStatus />
            </label>
            <label>
              Date/time
              <input name="startsAt" type="datetime-local" />
            </label>
            <label>
              Round label
              <input name="roundLabel" placeholder="Round 1" />
            </label>
            <label>
              Bracket position
              <input name="bracketPosition" inputMode="numeric" placeholder="1" />
            </label>
            <label>
              Team A
              <SelectTeam data={data} name="teamAId" includeEmpty />
            </label>
            <label>
              Team B
              <SelectTeam data={data} name="teamBId" includeEmpty />
            </label>
            <label>
              Stream URL
              <input name="streamUrl" placeholder="https://..." />
            </label>
            <label>
              VOD URL
              <input name="vodUrl" placeholder="https://..." />
            </label>
            <button className="button" type="submit">
              Create match
            </button>
          </fieldset>
        </form>
        <form action={advanceBracketWinnerFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Match
              <SelectMatch data={data} name="matchId" />
            </label>
            <label>
              Winner
              <SelectTeam data={data} name="winnerTeamId" />
            </label>
            <p className="admin-help">
              Winner advancement uses the bracket_edges table and the advance_match_winner Postgres function.
            </p>
            <button className="button" type="submit">
              Advance winner
            </button>
          </fieldset>
        </form>
      </div>
      <RecordList
        rows={data.matches.slice(0, 8).map((match) => ({
          title: match.title,
          meta: match.roundLabel ?? "Match",
          value: match.status
        }))}
      />
    </section>
  );
}

function ContentManagerSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <section className="admin-workspace panel" id="news-manager-workspace">
      <WorkspaceHeader kicker="Content" title="News, rules and sponsors" count={`${data.newsPosts.length} posts`} />
      <div className="admin-form-grid">
        <form action={createNewsPostFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" includeEmpty />
            </label>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9-]+" required />
            </label>
            <label>
              Category
              <input name="category" placeholder="Season" />
            </label>
            <label>
              Status
              <SelectPublishStatus />
            </label>
            <label>
              Published at
              <input name="publishedAt" type="datetime-local" />
            </label>
            <label>
              Href
              <input name="href" placeholder="/news/my-post" />
            </label>
            <label>
              Excerpt
              <textarea name="excerpt" rows={3} />
            </label>
            <label>
              Body JSON
              <textarea name="body" rows={6} defaultValue={'{\n  "body": "News content"\n}'} />
            </label>
            <button className="button" type="submit">
              Create news
            </button>
          </fieldset>
        </form>
        <form action={createRulesetFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" includeEmpty />
            </label>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Status
              <SelectPublishStatus />
            </label>
            <label>
              Rules text
              <textarea name="body" rows={9} required />
            </label>
            <button className="button" type="submit">
              Create ruleset
            </button>
          </fieldset>
        </form>
        <form action={createSponsorFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Season
              <SelectSeason data={data} name="seasonId" includeEmpty />
            </label>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              URL
              <input name="url" placeholder="https://..." />
            </label>
            <label>
              Logo text
              <input name="logoText" maxLength={8} />
            </label>
            <label>
              Order
              <input name="sortOrder" inputMode="numeric" defaultValue="0" />
            </label>
            <label className="admin-checkbox">
              <input name="isActive" type="checkbox" defaultChecked />
              Active
            </label>
            <button className="button" type="submit">
              Create sponsor
            </button>
          </fieldset>
        </form>
      </div>
    </section>
  );
}

function MediaSettingsSection({ data, isWritable }: { data: CmsData; isWritable: boolean }) {
  return (
    <section className="admin-workspace panel" id="media-manager-workspace">
      <WorkspaceHeader kicker="Media and Settings" title="Assets and global site data" count={`${data.mediaAssets.length} assets`} />
      <div className="admin-form-grid">
        <form action={createMediaAssetFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            <label>
              Bucket
              <input name="bucket" placeholder="seasons" required />
            </label>
            <label>
              Storage path
              <input name="path" placeholder="season-one/hero.jpg" required />
            </label>
            <label>
              Title
              <input name="title" />
            </label>
            <label>
              Alt text
              <input name="altText" />
            </label>
            <label>
              MIME type
              <input name="mimeType" placeholder="image/jpeg" />
            </label>
            <label>
              Public URL
              <input name="publicUrl" placeholder="https://..." />
            </label>
            <p className="admin-help">
              File uploads happen in Supabase Storage; this form registers metadata and usage data for rendering and SEO.
            </p>
            <button className="button" type="submit">
              Register asset
            </button>
          </fieldset>
        </form>
        <form action={updateSiteSettingsFromFormAction} className="admin-form">
          <fieldset disabled={!isWritable}>
            {data.siteSettings.logoImageUrl ? (
              <div className="admin-page-card">
                <strong>Current global logo</strong>
                <img src={data.siteSettings.logoImageUrl} alt="Current AMS logo" style={{ maxWidth: "180px", width: "100%" }} />
                <small>{data.siteSettings.logoImageUrl}</small>
              </div>
            ) : null}
            <label>
              Site name
              <input name="siteName" defaultValue={data.siteSettings.siteName} required />
            </label>
            <label>
              Default title
              <input name="defaultTitle" defaultValue={data.siteSettings.defaultTitle} required />
            </label>
            <label>
              Default description
              <textarea name="defaultDescription" rows={3} defaultValue={data.siteSettings.defaultDescription} />
            </label>
            <label>
              Contact label
              <input name="contactLabel" defaultValue={data.siteSettings.contactLabel} />
            </label>
            <label>
              Contact URL
              <input name="contactUrl" defaultValue={data.siteSettings.contactUrl} />
            </label>
            <label>
              Footer text
              <input name="footerText" defaultValue={data.siteSettings.footerText} />
            </label>
            <label>
              Logo text
              <input name="logoText" defaultValue={data.siteSettings.logoText} required />
            </label>
            <label>
              Logo subtext
              <input name="logoSubtext" defaultValue={data.siteSettings.logoSubtext} />
            </label>
            <label>
              Global logo image URL
              <input name="logoImageUrl" defaultValue={data.siteSettings.logoImageUrl ?? "/ams-logo.png"} placeholder="/ams-logo.png" />
            </label>
            <button className="button" type="submit">
              Save settings
            </button>
          </fieldset>
        </form>
      </div>
    </section>
  );
}

function AuditLogSection() {
  return (
    <section className="admin-workspace panel" id="audit-log-workspace">
      <WorkspaceHeader kicker="Audit Log" title="Security and traceability" count="RLS backed" />
      <p className="admin-help">
        The audit_logs table is ready for write tracking. The next hardening step is adding database triggers or action-level inserts for every sensitive change.
      </p>
    </section>
  );
}

function WorkspaceHeader({ kicker, title, count }: { kicker: string; title: string; count: string }) {
  return (
    <div className="admin-workspace__header">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <span>{count}</span>
    </div>
  );
}

function RecordList({ rows }: { rows: Array<{ title: string; meta?: string; value?: string }> }) {
  return (
    <div className="admin-page-overview">
      {rows.map((row) => (
        <article className="admin-page-card" key={`${row.title}-${row.meta}`}>
          <strong>{row.title}</strong>
          <span>{row.value}</span>
          <small>{row.meta}</small>
        </article>
      ))}
    </div>
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

function SelectSeason({ data, name, includeEmpty = false }: { data: CmsData; name: string; includeEmpty?: boolean }) {
  return (
    <select name={name} defaultValue={includeEmpty ? "" : data.seasons[0]?.id}>
      {includeEmpty ? <option value="">None</option> : null}
      {data.seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {season.name}
        </option>
      ))}
    </select>
  );
}

function SelectTeam({ data, name, includeEmpty = false }: { data: CmsData; name: string; includeEmpty?: boolean }) {
  return (
    <select name={name} defaultValue={includeEmpty ? "" : data.teams[0]?.id}>
      {includeEmpty ? <option value="">None</option> : null}
      {data.teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}

function SelectTournament({ data, name, includeEmpty = false }: { data: CmsData; name: string; includeEmpty?: boolean }) {
  return (
    <select name={name} defaultValue={includeEmpty ? "" : data.tournaments[0]?.id}>
      {includeEmpty ? <option value="">None</option> : null}
      {data.tournaments.map((tournament) => (
        <option key={tournament.id} value={tournament.id}>
          {tournament.name}
        </option>
      ))}
    </select>
  );
}

function SelectStage({ data, name, includeEmpty = false }: { data: CmsData; name: string; includeEmpty?: boolean }) {
  return (
    <select name={name} defaultValue={includeEmpty ? "" : data.stages[0]?.id}>
      {includeEmpty ? <option value="">None</option> : null}
      {data.stages.map((stage) => (
        <option key={stage.id} value={stage.id}>
          {stage.name}
        </option>
      ))}
    </select>
  );
}

function SelectMatch({ data, name }: { data: CmsData; name: string }) {
  return (
    <select name={name} defaultValue={data.matches[0]?.id}>
      {data.matches.map((match) => (
        <option key={match.id} value={match.id}>
          {match.title}
        </option>
      ))}
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
      <option value="draft">Draft</option>
      <option value="published">Published</option>
      <option value="archived">Archived</option>
    </select>
  );
}
