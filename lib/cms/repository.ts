import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { defaultCmsData } from "@/lib/cms/default-data";
import type { CmsData, SiteSettings } from "@/lib/cms/types";

const tableNames = [
  "site_settings",
  "themes",
  "seasons",
  "navigation_items",
  "routes",
  "redirects",
  "pages",
  "page_blocks",
  "media_assets",
  "teams",
  "season_teams",
  "players",
  "tournaments",
  "stages",
  "matches",
  "match_participants",
  "bracket_edges",
  "news_posts",
  "rulesets",
  "sponsors"
] as const;

type SupabaseTable = (typeof tableNames)[number];

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function camelizeKey(key: string) {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      camelizeKey(key),
      camelize(item)
    ])
  );
}

async function fetchTable(table: SupabaseTable) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  return data ?? [];
}

function normalizeSiteSettings(record: unknown): SiteSettings {
  const settings = camelize(record) as (SiteSettings & { settings?: Record<string, unknown> }) | undefined;

  if (!settings) return defaultCmsData.siteSettings;

  const storedLogoImageUrl =
    typeof settings.settings?.logoImageUrl === "string" ? settings.settings.logoImageUrl : undefined;

  return {
    ...defaultCmsData.siteSettings,
    ...settings,
    logoImageUrl: storedLogoImageUrl ?? settings.logoImageUrl ?? defaultCmsData.siteSettings.logoImageUrl
  };
}

function normalizeSupabaseData(raw: Record<SupabaseTable, unknown[]>): CmsData {
  const pages = (camelize(raw.pages) as Array<Record<string, unknown> & { id: string }>).map((page) => ({
    ...page,
    blocks: []
  }));

  const blocks = camelize(raw.page_blocks ?? []) as unknown as Array<
    CmsData["pages"][number]["blocks"][number] & { pageId: string }
  >;

  return {
    ...defaultCmsData,
    siteSettings: normalizeSiteSettings(raw.site_settings?.[0]),
    themes: camelize(raw.themes) as CmsData["themes"],
    seasons: camelize(raw.seasons) as CmsData["seasons"],
    navigationItems: camelize(raw.navigation_items) as CmsData["navigationItems"],
    routes: camelize(raw.routes) as CmsData["routes"],
    redirects: camelize(raw.redirects) as CmsData["redirects"],
    pages: pages.map((page) => ({
      ...(page as unknown as CmsData["pages"][number]),
      blocks: blocks
        .filter((block) => block.pageId === page.id)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    })),
    mediaAssets: camelize(raw.media_assets) as CmsData["mediaAssets"],
    teams: camelize(raw.teams) as CmsData["teams"],
    seasonTeams: camelize(raw.season_teams) as CmsData["seasonTeams"],
    players: camelize(raw.players) as CmsData["players"],
    tournaments: camelize(raw.tournaments) as CmsData["tournaments"],
    stages: camelize(raw.stages) as CmsData["stages"],
    matches: camelize(raw.matches) as CmsData["matches"],
    matchParticipants: camelize(raw.match_participants) as CmsData["matchParticipants"],
    bracketEdges: camelize(raw.bracket_edges) as CmsData["bracketEdges"],
    newsPosts: camelize(raw.news_posts) as CmsData["newsPosts"],
    rulesets: camelize(raw.rulesets) as CmsData["rulesets"],
    sponsors: camelize(raw.sponsors) as CmsData["sponsors"]
  };
}

export const getCmsData = cache(async (): Promise<CmsData> => {
  if (!isSupabaseConfigured()) return defaultCmsData;

  try {
    const entries = await Promise.all(
      tableNames.map(async (table) => [table, await fetchTable(table)] as const)
    );

    return normalizeSupabaseData(Object.fromEntries(entries) as Record<SupabaseTable, unknown[]>);
  } catch (error) {
    console.error("Falling back to bundled CMS seed data.", error);
    return defaultCmsData;
  }
});
