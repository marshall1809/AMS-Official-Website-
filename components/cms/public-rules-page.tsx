import { SiteShell } from "@/components/cms/site-shell";
import { defaultCmsData } from "@/lib/cms/default-data";
import { mergeThemes } from "@/lib/cms/theme";
import type { CmsData, PageRecord, SeasonRecord } from "@/lib/cms/types";

export function PublicInfoPage({
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
    id: season ? `public-info-${season.id}` : "public-info",
    title: "Info",
    slug: "info",
    status: "published",
    scope: season ? "season" : "global",
    seasonId: season?.id,
    blocks: []
  };
  const entries = data.rulesets
    .filter((entry) => entry.status === "published")
    .filter((entry) => (season ? entry.seasonId === season.id : !entry.seasonId));
  const entry = entries[0];
  const asset = entry?.pdfAssetId
    ? data.mediaAssets.find((item) => item.id === entry.pdfAssetId)
    : undefined;
  const isPdf =
    asset?.mimeType === "application/pdf" ||
    Boolean(asset?.publicUrl?.toLowerCase().split("?")[0].endsWith(".pdf"));
  const isImage = Boolean(asset?.mimeType?.startsWith("image/"));

  return (
    <SiteShell data={data} season={season} theme={theme} page={page}>
      <section className="public-page-hero">
        <div className="container">
          <p className="section-kicker">{season?.name ?? "Alliance Master Series"}</p>
          <h1>Information</h1>
          <p>Official Season information, documents, and important downloads.</p>
        </div>
      </section>

      <section className="container content-section">
        <article className="rules-panel panel">
          {entry ? (
            <>
              <header>
                <span className="status-pill">Published</span>
                <h2>{entry.title}</h2>
              </header>
              <div className="rules-document">{entry.body}</div>

              {asset?.publicUrl ? (
                isPdf ? (
                  <section className="rules-pdf">
                    <header>
                      <div>
                        <p className="section-kicker">Official document</p>
                        <h3>{asset.title ?? entry.title}</h3>
                      </div>
                      <a
                        className="button secondary"
                        href={asset.publicUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open PDF
                      </a>
                    </header>
                    <iframe
                      loading="eager"
                      src={`${asset.publicUrl}#view=FitH&toolbar=1`}
                      title={asset.title ?? `${entry.title} PDF`}
                    />
                  </section>
                ) : isImage ? (
                  <section className="rules-pdf info-image-document">
                    <header>
                      <div>
                        <p className="section-kicker">Attached image</p>
                        <h3>{asset.title ?? entry.title}</h3>
                      </div>
                      <a
                        className="button secondary"
                        href={asset.publicUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open image
                      </a>
                    </header>
                    <img src={asset.publicUrl} alt={asset.altText ?? asset.title ?? entry.title} />
                  </section>
                ) : (
                  <section className="info-file-download">
                    <div>
                      <p className="section-kicker">Attached file</p>
                      <h3>{asset.title ?? entry.title}</h3>
                    </div>
                    <a
                      className="button"
                      href={asset.publicUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Download file
                    </a>
                  </section>
                )
              ) : null}
            </>
          ) : (
            <>
              <h2>Information is being prepared</h2>
              <p className="empty-copy">No information has been published for this Season yet.</p>
            </>
          )}
        </article>
      </section>
    </SiteShell>
  );
}

export const PublicRulesPage = PublicInfoPage;
