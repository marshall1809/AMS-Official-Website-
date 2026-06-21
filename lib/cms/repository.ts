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
  "team_versions",
  "season_teams",
  "players",
  "divisions",
  "competitions",
  "tournaments",
  "stages",
  "matches",
  "match_participants",
  "match_results",
  "bracket_edges",
  "news_posts",
  "rulesets",
  "sponsors"
] as const;

type SupabaseTable = (typeof tableNames)[number];
type RecordValue = Record<string, unknown>;

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
    Object.entries(value as RecordValue).map(([key, item]) => [
      camelizeKey(key),
      camelize(item)
    ])
  );
}

async function fetchTable(table: SupabaseTable) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from(table).select("*");

  if (error) {
    console.warn(`Public CMS table unavailable: ${table}`, error.message);
    return null;
  }

  return data ?? [];
}

function normalizeSiteSettings(record: unknown): SiteSettings {
  const settings = camelize(record) as (SiteSettings & { settings?: RecordValue }) | undefined;

  if (!settings) return defaultCmsData.siteSettings;

  const storedLogoImageUrl =
    typeof settings.settings?.logoImageUrl === "string" ? settings.settings.logoImageUrl : undefined;

  return {
    ...defaultCmsData.siteSettings,
    ...settings,
    logoImageUrl: storedLogoImageUrl ?? settings.logoImageUrl ?? defaultCmsData.siteSettings.logoImageUrl
  };
}

function scopedRecords(value: unknown[]) {
  return (camelize(value) as RecordValue[]).map((record) =>
    record.scope === "season" && typeof record.scopeId === "string"
      ? { ...record, seasonId: record.scopeId }
      : record
  );
}

function normalizeMediaAssets(value: unknown[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  return scopedRecords(value).map((asset) => {
    if (typeof asset.publicUrl === "string" && asset.publicUrl.length > 0) {
      return asset;
    }

    if (
      supabaseUrl &&
      typeof asset.bucket === "string" &&
      typeof asset.path === "string"
    ) {
      const encodedPath = asset.path
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");

      return {
        ...asset,
        publicUrl: `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(asset.bucket)}/${encodedPath}`
      };
    }

    return asset;
  });
}

function normalizeSupabaseData(raw: Record<SupabaseTable, unknown[]>): CmsData {
  const pageRows = scopedRecords(raw.pages);
  const pages = (
    pageRows.length ? pageRows : (defaultCmsData.pages as unknown as RecordValue[])
  ).map((page) => ({
    ...page,
    id: String(page.id),
    blocks: [] as CmsData["pages"][number]["blocks"]
  }));
  const blocks = camelize(
    raw.page_blocks.length ? raw.page_blocks : defaultCmsData.pages.flatMap((page) =>
      page.blocks.map((block) => ({ ...block, pageId: page.id }))
    )
  ) as Array<CmsData["pages"][number]["blocks"][number] & { pageId: string }>;

  const teamVersions = camelize(raw.team_versions) as RecordValue[];
  const teamRows = camelize(raw.teams) as RecordValue[];
  const teams = teamRows.map((team) => {
    const version = teamVersions.find((item) => item.id === team.currentVersionId);

    return {
      ...team,
      name: version?.name ?? team.canonicalName ?? "Team",
      tag: version?.tag,
      defaultLogoId: version?.logoAssetId,
      logoAssetId: version?.logoAssetId,
      description: version?.description ?? team.description,
      socialLinks: team.socials
    };
  });

  const seasonTeams = (camelize(raw.season_teams) as RecordValue[]).map((seasonTeam) => {
    const version = teamVersions.find((item) => item.id === seasonTeam.teamVersionId);

    return {
      ...seasonTeam,
      displayName: version?.name,
      tag: version?.tag,
      logoAssetId: version?.logoAssetId,
      description: version?.description
    };
  });

  const divisions = camelize(raw.divisions) as RecordValue[];
  const competitionRows = camelize(raw.competitions) as RecordValue[];
  const legacyTournaments = camelize(raw.tournaments) as RecordValue[];
  const tournaments = competitionRows.length
    ? competitionRows.map((competition) => {
        const division = divisions.find((item) => item.id === competition.divisionId);
        return {
          ...competition,
          seasonId: division?.seasonId
        };
      })
    : legacyTournaments;

  const stageRows = camelize(raw.stages) as RecordValue[];
  const stages = stageRows.map((stage) => ({
    ...stage,
    tournamentId: stage.competitionId ?? stage.tournamentId
  }));

  const resultRows = camelize(raw.match_results) as RecordValue[];
  const participantRows = camelize(raw.match_participants) as RecordValue[];
  const matchRows = camelize(raw.matches) as RecordValue[];
  const matches = matchRows.map((match) => {
    const result = resultRows.find(
      (item) => item.matchId === match.id && item.isCurrent === true
    );
    const winner = participantRows.find(
      (item) => item.id === result?.winnerParticipantId
    );

    return {
      ...match,
      tournamentId: match.competitionId ?? match.tournamentId,
      winnerTeamId: winner?.teamId
    };
  });
  const matchParticipants = participantRows.map((participant) => {
    const result = resultRows.find(
      (item) => item.matchId === participant.matchId && item.isCurrent === true
    );
    const score = result?.score as Record<string, unknown> | undefined;

    return {
      ...participant,
      score:
        score && (typeof score[String(participant.slot)] === "number")
          ? score[String(participant.slot)]
          : null
    };
  });

  const themeRows = scopedRecords(raw.themes);
  const navigationRows = scopedRecords(raw.navigation_items);
  const routeRows = camelize(raw.routes) as RecordValue[];

  return {
    ...defaultCmsData,
    siteSettings: normalizeSiteSettings(raw.site_settings[0]),
    themes: (themeRows.length ? themeRows : defaultCmsData.themes) as CmsData["themes"],
    seasons: camelize(raw.seasons) as CmsData["seasons"],
    navigationItems: (navigationRows.length
      ? navigationRows
      : defaultCmsData.navigationItems) as CmsData["navigationItems"],
    routes: (routeRows.length ? routeRows : defaultCmsData.routes) as CmsData["routes"],
    redirects: camelize(raw.redirects) as CmsData["redirects"],
    pages: pages.map((page) => ({
      ...(page as unknown as CmsData["pages"][number]),
      blocks: blocks
        .filter((block) => block.pageId === page.id)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    })),
    mediaAssets: normalizeMediaAssets(raw.media_assets) as CmsData["mediaAssets"],
    teams: teams as CmsData["teams"],
    seasonTeams: seasonTeams as CmsData["seasonTeams"],
    players: camelize(raw.players) as CmsData["players"],
    tournaments: tournaments as CmsData["tournaments"],
    stages: stages as CmsData["stages"],
    matches: matches as CmsData["matches"],
    matchParticipants: matchParticipants as CmsData["matchParticipants"],
    bracketEdges: camelize(raw.bracket_edges) as CmsData["bracketEdges"],
    newsPosts: scopedRecords(raw.news_posts) as CmsData["newsPosts"],
    rulesets: scopedRecords(raw.rulesets) as CmsData["rulesets"],
    sponsors: scopedRecords(raw.sponsors).map((sponsor) => ({
      ...sponsor,
      isActive: sponsor.status === "published"
    })) as CmsData["sponsors"]
  };
}

export const getCmsData = cache(async (): Promise<CmsData> => {
  if (!isSupabaseConfigured()) return defaultCmsData;

  const entries = await Promise.all(
    tableNames.map(async (table) => [table, await fetchTable(table)] as const)
  );
  const successfulTables = entries.filter(([, data]) => data !== null);

  if (!successfulTables.length) {
    return defaultCmsData;
  }

  const raw = Object.fromEntries(
    entries.map(([table, data]) => [table, data ?? []])
  ) as Record<SupabaseTable, unknown[]>;

  return normalizeSupabaseData(raw);
});
