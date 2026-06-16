import { PageRenderer } from "@/components/cms/page-renderer";
import { SiteShell } from "@/components/cms/site-shell";
import { getCmsData } from "@/lib/cms/repository";
import { handleResolvedRoute, normalizePath, resolveRoute } from "@/lib/cms/routing";
import { themeToStyle } from "@/lib/cms/theme";

type DynamicPageProps = {
  params: Promise<{ path?: string[] }>;
};

export default async function DynamicPage({ params }: DynamicPageProps) {
  const resolvedParams = await params;
  const data = await getCmsData();
  const path = normalizePath(resolvedParams.path);
  const resolved = resolveRoute(data, path);

  if (resolved.kind === "gone") {
    const theme = data.themes.find((item) => item.scope === "global") ?? data.themes[0];

    return (
      <div className="theme-root" style={theme ? themeToStyle(theme.tokens) : undefined}>
        <main className="container content-section">
          <section className="copy-block panel">
            <p className="section-kicker">410</p>
            <h1>Page removed</h1>
            <p>This page was removed from the Alliance Master Series archive.</p>
          </section>
        </main>
      </div>
    );
  }

  handleResolvedRoute(resolved);

  if (resolved.kind !== "page") return null;

  return (
    <SiteShell data={data} season={resolved.season} theme={resolved.theme} page={resolved.page}>
      <PageRenderer data={data} page={resolved.page} />
    </SiteShell>
  );
}
