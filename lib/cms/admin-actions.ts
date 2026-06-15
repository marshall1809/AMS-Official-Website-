"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAnyRole } from "@/lib/auth/server";

const createSeasonSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  themeTokens: z.record(z.string(), z.unknown()).default({})
});

const seasonStatusSchema = z.object({
  seasonId: z.string().uuid(),
  status: z.enum(["draft", "active", "archived", "deleted"])
});

const themeSchema = z.object({
  themeId: z.string().uuid(),
  tokens: z.record(z.string(), z.unknown())
});

const createPageSchema = z.object({
  title: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  scope: z.enum(["global", "season"]),
  seasonId: z.string().uuid().optional(),
  routePath: z.string().min(1).startsWith("/"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
});

const blockSchema = z.object({
  pageId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  type: z.string().min(2),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  content: z.record(z.string(), z.unknown()).default({})
});

const advanceWinnerSchema = z.object({
  matchId: z.string().uuid(),
  winnerTeamId: z.string().uuid()
});

const navigationSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1).startsWith("/"),
  scope: z.enum(["global", "season"]).default("global"),
  seasonId: z.string().uuid().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true)
});

const teamSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  logoText: z.string().max(6).optional(),
  description: z.string().optional(),
  socialLinks: z.record(z.string(), z.unknown()).default({}),
  seasonId: z.string().uuid().optional(),
  seed: z.number().int().optional(),
  status: z.enum(["confirmed", "pending", "withdrawn"]).default("pending")
});

const playerSchema = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  role: z.string().optional(),
  teamId: z.string().uuid().optional(),
  seasonId: z.string().uuid().optional()
});

const matchSchema = z.object({
  seasonId: z.string().uuid(),
  tournamentId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  title: z.string().min(1),
  status: z.enum(["scheduled", "live", "completed", "postponed", "cancelled"]).default("scheduled"),
  startsAt: z.string().optional(),
  roundLabel: z.string().optional(),
  bracketPosition: z.number().int().optional(),
  streamUrl: z.string().optional(),
  vodUrl: z.string().optional(),
  teamAId: z.string().uuid().optional(),
  teamBId: z.string().uuid().optional()
});

const newsSchema = z.object({
  seasonId: z.string().uuid().optional(),
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedAt: z.string().optional(),
  href: z.string().optional(),
  body: z.record(z.string(), z.unknown()).default({})
});

const rulesetSchema = z.object({
  seasonId: z.string().uuid().optional(),
  title: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  body: z.string().min(1)
});

const sponsorSchema = z.object({
  seasonId: z.string().uuid().optional(),
  name: z.string().min(1),
  url: z.string().optional(),
  logoText: z.string().max(8).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
});

const mediaAssetSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
  title: z.string().optional(),
  altText: z.string().optional(),
  mimeType: z.string().optional(),
  publicUrl: z.string().optional()
});

const siteSettingsSchema = z.object({
  siteName: z.string().min(1),
  defaultTitle: z.string().min(1),
  defaultDescription: z.string().optional(),
  contactLabel: z.string().optional(),
  contactUrl: z.string().optional(),
  footerText: z.string().optional(),
  logoText: z.string().min(1),
  logoSubtext: z.string().optional()
});

export async function createSeasonAction(input: unknown) {
  const payload = createSeasonSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin"]);

  const { data, error } = await supabase.rpc("create_season_from_template", {
    season_name: payload.name,
    season_slug: payload.slug,
    theme_tokens: payload.themeTokens
  });

  if (error) throw error;
  revalidatePath("/");
  return data as string;
}

export async function updateSeasonStatusAction(input: unknown) {
  const payload = seasonStatusSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin"]);

  const update =
    payload.status === "deleted"
      ? { status: payload.status, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: payload.status, deleted_at: null, updated_at: new Date().toISOString() };

  const { error } = await supabase.from("seasons").update(update).eq("id", payload.seasonId);
  if (error) throw error;
  revalidatePath("/");
}

export async function updateThemeTokensAction(input: unknown) {
  const payload = themeSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "designer"]);

  const { error } = await supabase
    .from("themes")
    .update({ tokens: payload.tokens, updated_at: new Date().toISOString() })
    .eq("id", payload.themeId);

  if (error) throw error;
  revalidatePath("/");
}

export async function createPageAction(input: unknown) {
  const payload = createPageSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "content_manager"]);

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .insert({
      title: payload.title,
      slug: payload.slug,
      scope: payload.scope,
      season_id: payload.scope === "season" ? payload.seasonId : null,
      status: payload.status,
      seo_title: payload.seoTitle || null,
      seo_description: payload.seoDescription || null
    })
    .select("id")
    .single();

  if (pageError) throw pageError;

  const { error: routeError } = await supabase.from("routes").insert({
    path: payload.routePath,
    status: payload.status,
    target_type: "page",
    target_id: page.id
  });

  if (routeError) throw routeError;
  revalidatePath("/");
  return page.id as string;
}

export async function upsertPageBlockAction(input: unknown) {
  const payload = blockSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "content_manager"]);

  const { error } = await supabase.from("page_blocks").upsert({
    id: payload.blockId,
    page_id: payload.pageId,
    type: payload.type,
    sort_order: payload.sortOrder,
    is_visible: payload.isVisible,
    content: payload.content,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function advanceBracketWinnerAction(input: unknown) {
  const payload = advanceWinnerSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "tournament_manager"]);

  const { error } = await supabase.rpc("advance_match_winner", {
    match_id_input: payload.matchId,
    winner_team_id_input: payload.winnerTeamId
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function createNavigationItemAction(input: unknown) {
  const payload = navigationSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "content_manager"]);

  const { error } = await supabase.from("navigation_items").insert({
    label: payload.label,
    href: payload.href,
    scope: payload.scope,
    season_id: payload.scope === "season" ? payload.seasonId : null,
    sort_order: payload.sortOrder,
    is_visible: payload.isVisible
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function createTeamAction(input: unknown) {
  const payload = teamSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin"]);

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name: payload.name,
      slug: payload.slug,
      logo_text: payload.logoText || null,
      description: payload.description || null,
      social_links: payload.socialLinks
    })
    .select("id")
    .single();

  if (error) throw error;

  if (payload.seasonId) {
    const { error: seasonTeamError } = await supabase.from("season_teams").insert({
      season_id: payload.seasonId,
      team_id: team.id,
      seed: payload.seed ?? null,
      status: payload.status
    });

    if (seasonTeamError) throw seasonTeamError;
  }

  revalidatePath("/");
}

export async function createPlayerAction(input: unknown) {
  const payload = playerSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin"]);

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      name: payload.name,
      handle: payload.handle,
      slug: payload.slug,
      role: payload.role || null
    })
    .select("id")
    .single();

  if (error) throw error;

  if (payload.teamId) {
    const { error: membershipError } = await supabase.from("team_memberships").insert({
      player_id: player.id,
      team_id: payload.teamId,
      season_id: payload.seasonId || null,
      role: payload.role || null
    });

    if (membershipError) throw membershipError;
  }

  revalidatePath("/");
}

export async function createMatchAction(input: unknown) {
  const payload = matchSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "tournament_manager"]);

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      season_id: payload.seasonId,
      tournament_id: payload.tournamentId || null,
      stage_id: payload.stageId || null,
      title: payload.title,
      status: payload.status,
      starts_at: payload.startsAt || null,
      round_label: payload.roundLabel || null,
      bracket_position: payload.bracketPosition ?? null,
      stream_url: payload.streamUrl || null,
      vod_url: payload.vodUrl || null
    })
    .select("id")
    .single();

  if (error) throw error;

  const participants = [
    payload.teamAId ? { match_id: match.id, team_id: payload.teamAId, slot: 1 } : null,
    payload.teamBId ? { match_id: match.id, team_id: payload.teamBId, slot: 2 } : null
  ].filter(isDefined);

  if (participants.length) {
    const { error: participantError } = await supabase
      .from("match_participants")
      .insert(participants);

    if (participantError) throw participantError;
  }

  revalidatePath("/");
}

export async function createNewsPostAction(input: unknown) {
  const payload = newsSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "content_manager"]);

  const { error } = await supabase.from("news_posts").insert({
    season_id: payload.seasonId || null,
    title: payload.title,
    slug: payload.slug,
    excerpt: payload.excerpt || null,
    category: payload.category || null,
    status: payload.status,
    published_at: payload.publishedAt || null,
    href: payload.href || null,
    body: payload.body
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function createRulesetAction(input: unknown) {
  const payload = rulesetSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "content_manager"]);

  const { error } = await supabase.from("rulesets").insert({
    season_id: payload.seasonId || null,
    title: payload.title,
    status: payload.status,
    body: payload.body
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function createSponsorAction(input: unknown) {
  const payload = sponsorSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "content_manager"]);

  const { error } = await supabase.from("sponsors").insert({
    season_id: payload.seasonId || null,
    name: payload.name,
    url: payload.url || null,
    logo_text: payload.logoText || null,
    is_active: payload.isActive,
    sort_order: payload.sortOrder
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function createMediaAssetAction(input: unknown) {
  const payload = mediaAssetSchema.parse(input);
  const { supabase } = await requireAnyRole(["admin", "media_manager"]);

  const { error } = await supabase.from("media_assets").insert({
    bucket: payload.bucket,
    path: payload.path,
    title: payload.title || null,
    alt_text: payload.altText || null,
    mime_type: payload.mimeType || null,
    public_url: payload.publicUrl || null
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateSiteSettingsAction(input: unknown) {
  const payload = siteSettingsSchema.parse(input);
  const { supabase } = await requireAnyRole(["super_admin", "admin"]);

  const { data: existing, error: selectError } = await supabase
    .from("site_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  const values = {
    site_name: payload.siteName,
    default_title: payload.defaultTitle,
    default_description: payload.defaultDescription || null,
    contact_label: payload.contactLabel || null,
    contact_url: payload.contactUrl || null,
    footer_text: payload.footerText || null,
    logo_text: payload.logoText,
    logo_subtext: payload.logoSubtext || null,
    updated_at: new Date().toISOString()
  };

  const query = existing?.id
    ? supabase.from("site_settings").update(values).eq("id", existing.id)
    : supabase.from("site_settings").insert(values);

  const { error } = await query;
  if (error) throw error;
  revalidatePath("/");
}

export async function createSeasonFromFormAction(formData: FormData) {
  const themeTokens = parseJsonObject(formString(formData, "themeTokens"), {});

  await createSeasonAction({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    themeTokens
  });
}

export async function updateSeasonStatusFromFormAction(formData: FormData) {
  await updateSeasonStatusAction({
    seasonId: formString(formData, "seasonId"),
    status: formString(formData, "status")
  });
}

export async function updateThemeTokensFromFormAction(formData: FormData) {
  const tokenJson = parseJsonObject(formString(formData, "tokens"), {});
  const tokenOverrides = Object.fromEntries(
    [
      "colorBg",
      "colorBgSoft",
      "colorPanel",
      "colorPanelStrong",
      "colorText",
      "colorTextMuted",
      "colorTextSoft",
      "colorAccent",
      "colorAccentStrong",
      "colorBorder",
      "radiusCard",
      "radiusButton"
    ]
      .map((key) => [key, formString(formData, key)])
      .filter(([, value]) => value)
  );

  await updateThemeTokensAction({
    themeId: formString(formData, "themeId"),
    tokens: {
      ...tokenJson,
      ...tokenOverrides
    }
  });
}

export async function createPageFromFormAction(formData: FormData) {
  const scope = formString(formData, "scope") || "global";
  const seasonId = formString(formData, "seasonId");

  await createPageAction({
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    scope,
    seasonId: seasonId || undefined,
    routePath: formString(formData, "routePath"),
    status: formString(formData, "status") || "draft",
    seoTitle: formString(formData, "seoTitle") || undefined,
    seoDescription: formString(formData, "seoDescription") || undefined
  });
}

export async function upsertPageBlockFromFormAction(formData: FormData) {
  const content = parseJsonObject(formString(formData, "content"), {});
  const blockId = formString(formData, "blockId");

  await upsertPageBlockAction({
    pageId: formString(formData, "pageId"),
    blockId: blockId || undefined,
    type: formString(formData, "type"),
    sortOrder: Number(formString(formData, "sortOrder") || 0),
    isVisible: formData.get("isVisible") === "on",
    content
  });
}

export async function createNavigationItemFromFormAction(formData: FormData) {
  await createNavigationItemAction({
    label: formString(formData, "label"),
    href: formString(formData, "href"),
    scope: formString(formData, "scope") || "global",
    seasonId: formString(formData, "seasonId") || undefined,
    sortOrder: Number(formString(formData, "sortOrder") || 0),
    isVisible: formData.get("isVisible") === "on"
  });
}

export async function createTeamFromFormAction(formData: FormData) {
  await createTeamAction({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    logoText: formString(formData, "logoText") || undefined,
    description: formString(formData, "description") || undefined,
    socialLinks: parseJsonObject(formString(formData, "socialLinks"), {}),
    seasonId: formString(formData, "seasonId") || undefined,
    seed: optionalNumber(formString(formData, "seed")),
    status: formString(formData, "status") || "pending"
  });
}

export async function createPlayerFromFormAction(formData: FormData) {
  await createPlayerAction({
    name: formString(formData, "name"),
    handle: formString(formData, "handle"),
    slug: formString(formData, "slug"),
    role: formString(formData, "role") || undefined,
    teamId: formString(formData, "teamId") || undefined,
    seasonId: formString(formData, "seasonId") || undefined
  });
}

export async function createMatchFromFormAction(formData: FormData) {
  await createMatchAction({
    seasonId: formString(formData, "seasonId"),
    tournamentId: formString(formData, "tournamentId") || undefined,
    stageId: formString(formData, "stageId") || undefined,
    title: formString(formData, "title"),
    status: formString(formData, "status") || "scheduled",
    startsAt: formString(formData, "startsAt") || undefined,
    roundLabel: formString(formData, "roundLabel") || undefined,
    bracketPosition: optionalNumber(formString(formData, "bracketPosition")),
    streamUrl: formString(formData, "streamUrl") || undefined,
    vodUrl: formString(formData, "vodUrl") || undefined,
    teamAId: formString(formData, "teamAId") || undefined,
    teamBId: formString(formData, "teamBId") || undefined
  });
}

export async function advanceBracketWinnerFromFormAction(formData: FormData) {
  await advanceBracketWinnerAction({
    matchId: formString(formData, "matchId"),
    winnerTeamId: formString(formData, "winnerTeamId")
  });
}

export async function createNewsPostFromFormAction(formData: FormData) {
  await createNewsPostAction({
    seasonId: formString(formData, "seasonId") || undefined,
    title: formString(formData, "title"),
    slug: formString(formData, "slug"),
    excerpt: formString(formData, "excerpt") || undefined,
    category: formString(formData, "category") || undefined,
    status: formString(formData, "status") || "draft",
    publishedAt: formString(formData, "publishedAt") || undefined,
    href: formString(formData, "href") || undefined,
    body: parseJsonObject(formString(formData, "body"), {})
  });
}

export async function createRulesetFromFormAction(formData: FormData) {
  await createRulesetAction({
    seasonId: formString(formData, "seasonId") || undefined,
    title: formString(formData, "title"),
    status: formString(formData, "status") || "draft",
    body: formString(formData, "body")
  });
}

export async function createSponsorFromFormAction(formData: FormData) {
  await createSponsorAction({
    seasonId: formString(formData, "seasonId") || undefined,
    name: formString(formData, "name"),
    url: formString(formData, "url") || undefined,
    logoText: formString(formData, "logoText") || undefined,
    isActive: formData.get("isActive") === "on",
    sortOrder: Number(formString(formData, "sortOrder") || 0)
  });
}

export async function createMediaAssetFromFormAction(formData: FormData) {
  await createMediaAssetAction({
    bucket: formString(formData, "bucket"),
    path: formString(formData, "path"),
    title: formString(formData, "title") || undefined,
    altText: formString(formData, "altText") || undefined,
    mimeType: formString(formData, "mimeType") || undefined,
    publicUrl: formString(formData, "publicUrl") || undefined
  });
}

export async function updateSiteSettingsFromFormAction(formData: FormData) {
  await updateSiteSettingsAction({
    siteName: formString(formData, "siteName"),
    defaultTitle: formString(formData, "defaultTitle"),
    defaultDescription: formString(formData, "defaultDescription") || undefined,
    contactLabel: formString(formData, "contactLabel") || undefined,
    contactUrl: formString(formData, "contactUrl") || undefined,
    footerText: formString(formData, "footerText") || undefined,
    logoText: formString(formData, "logoText"),
    logoSubtext: formString(formData, "logoSubtext") || undefined
  });
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseJsonObject(value: string, fallback: Record<string, unknown>) {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : fallback;
  } catch {
    return fallback;
  }
}

function optionalNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
