import { PageRenderer } from "@/components/cms/page-renderer";
import { SiteShell } from "@/components/cms/site-shell";
import { currentPublicSeason } from "@/components/cms/public-teams";
import { defaultCmsData } from "@/lib/cms/default-data";
import { mergeThemes } from "@/lib/cms/theme";
import type { CmsData, PageBlock, PageRecord } from "@/lib/cms/types";

export function PublicHomepage({ data }: { data: CmsData }) {
  const season = currentPublicSeason(data);
  const seasonTeams = season
    ? data.seasonTeams.filter((entry) => entry.seasonId === season.id && entry.status !== "archived")
    : [];
  const matches = season
    ? data.matches.filter((match) => match.seasonId === season.id && String(match.status) !== "voided")
    : [];
  const nextMatch = [...matches]
    .filter((match) => match.startsAt && new Date(match.startsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startsAt as string).getTime() - new Date(b.startsAt as string).getTime())[0];
  const globalTheme =
    data.themes.find((theme) => theme.scope === "global") ??
    defaultCmsData.themes.find((theme) => theme.scope === "global") ??
    defaultCmsData.themes[0];
  const seasonTheme = season
    ? data.themes.find((theme) => theme.id === season.themeId || theme.seasonId === season.id)
    : undefined;

  const blocks: PageBlock[] = [
    ...(season
      ? [
          {
            id: "live-home-announcement",
            type: "announcement" as const,
            sortOrder: 1,
            content: { text: `${season.name} is ${season.status}. Follow the bracket and results live on AMS.` }
          }
        ]
      : []),
    {
      id: "live-home-hero",
      type: "hero",
      sortOrder: 2,
      content: {
        logoSrc: data.siteSettings.logoImageUrl || "/ams-logo.png",
        logoAlt: data.siteSettings.siteName,
        kicker: season ? `${season.name} · ${season.status}` : "Alliance Master Series",
        title: data.siteSettings.siteName,
        body:
          data.siteSettings.defaultDescription ||
          "The official competition platform for the Alliance Master Series.",
        primaryLabel: "View Teams",
        primaryHref: "/teams",
        secondaryLabel: "Open Bracket",
        secondaryHref: "/bracket"
      }
    },
    {
      id: "live-home-stats",
      type: "stat_cards",
      sortOrder: 3,
      content: {
        items: [
          { label: "Teams", value: String(seasonTeams.length) },
          { label: "Matches", value: String(matches.length) },
          {
            label: "Next match",
            value: nextMatch?.startsAt ? formatCompactDate(nextMatch.startsAt) : "TBD"
          },
          { label: "Season", value: season?.status ?? "Setup" }
        ]
      }
    },
    {
      id: "live-home-matches",
      type: "match_list",
      sortOrder: 4,
      content: { title: "Next Matches", seasonId: season?.id, limit: 3 }
    },
    {
      id: "live-home-teams",
      type: "team_list",
      sortOrder: 5,
      content: { title: "Season Teams", seasonId: season?.id, limit: 8 }
    },
    {
      id: "live-home-bracket",
      type: "bracket_embed",
      sortOrder: 6,
      content: { title: "Tournament Path", seasonId: season?.id }
    },
    {
      id: "live-home-sponsors",
      type: "sponsor_strip",
      sortOrder: 7,
      content: { title: "Partners", seasonId: season?.id }
    }
  ];

  const page: PageRecord = {
    id: "public-live-home",
    title: data.siteSettings.siteName,
    slug: "home",
    status: "published",
    scope: season ? "season" : "global",
    seasonId: season?.id,
    blocks
  };

  return (
    <SiteShell data={data} season={season} theme={mergeThemes(globalTheme, seasonTheme)} page={page}>
      <PageRenderer data={data} page={page} />
    </SiteShell>
  );
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(value));
}
