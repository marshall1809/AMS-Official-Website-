import { SiteShell } from "@/components/cms/site-shell";
import { defaultCmsData } from "@/lib/cms/default-data";
import { mergeThemes } from "@/lib/cms/theme";
import type { CmsData, PageRecord, SeasonRecord } from "@/lib/cms/types";

export function PublicRulesPage({
  data,
  season
}: {
  data: CmsData;
  season?: SeasonRecord;
}) {
  const globalTheme =
    data.themes.find((theme) => theme.scope === "global") ??
    defaultCmsData.themes.find((theme) => theme.scope === "global") ??
    defaultCmsData.themes[0];
  const seasonTheme = season
    ? data.themes.find(
        (theme) => theme.id === season.themeId || theme.seasonId === season.id
      )
    : undefined;
  const theme = mergeThemes(globalTheme, seasonTheme);
  const page: PageRecord = {
    id: season ? `public-rules-${season.id}` : "public-rules",
    title: "Rules",
    slug: "rules",
    status: "published",
    scope: season ? "season" : "global",
    seasonId: season?.id,
    blocks: []
  };
  const rulesets = data.rulesets
    .filter((ruleset) => ruleset.status === "published")
    .filter((ruleset) => (season ? ruleset.seasonId === season.id : !ruleset.seasonId));
  const ruleset = rulesets[0];

  return (
    <SiteShell data={data} season={season} theme={theme} page={page}>
      <section className="public-page-hero">
        <div className="container">
          <p className="section-kicker">{season?.name ?? "Alliance Master Series"}</p>
          <h1>Official Rules</h1>
          <p>Competition rules and regulations for the current Alliance Master Series Season.</p>
        </div>
      </section>

      <section className="container content-section">
        <article className="rules-panel panel">
          {ruleset ? (
            <>
              <header>
                <span className="status-pill">Published</span>
                <h2>{ruleset.title}</h2>
              </header>
              <div className="rules-document">{ruleset.body}</div>
            </>
          ) : (
            <>
              <h2>Rules are being prepared</h2>
              <p className="empty-copy">No official rules have been published for this Season yet.</p>
            </>
          )}
        </article>
      </section>
    </SiteShell>
  );
}
