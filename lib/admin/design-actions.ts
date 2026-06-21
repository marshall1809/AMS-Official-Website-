"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const THEMES_ROUTE = "/admin/design/themes";
const BRANDING_ROUTE = "/admin/design/branding";
const MEDIA_BUCKET = "ams-media";
const MAX_LOGO_SIZE = 4 * 1024 * 1024;
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const COLOR_FIELDS = [
  "colorBg",
  "colorBgSoft",
  "colorPanel",
  "colorText",
  "colorTextMuted",
  "colorTextSoft",
  "colorAccent",
  "colorAccentStrong",
  "colorBorder",
  "colorSuccess",
  "colorDanger"
] as const;

export async function saveThemeAction(formData: FormData) {
  const { supabase } = await requireDesignAccess(THEMES_ROUTE);
  const mode = field(formData, "mode") === "season" ? "season" : "global";
  const seasonId = field(formData, "seasonId");
  let themeId = field(formData, "themeId");

  if (mode === "season" && !seasonId) fail(THEMES_ROUTE, "season-required");

  const tokenOverrides: Record<string, string> = {};
  for (const key of COLOR_FIELDS) {
    const value = field(formData, key);
    if (!/^#[0-9a-f]{6}$/i.test(value)) fail(THEMES_ROUTE, `invalid-${key}`);
    tokenOverrides[key] = value;
  }

  tokenOverrides.radiusCard = `${clampedNumber(formData, "radiusCard", 0, 20)}px`;
  tokenOverrides.radiusButton = `${clampedNumber(formData, "radiusButton", 0, 20)}px`;
  tokenOverrides.buttonTransform =
    field(formData, "buttonTransform") === "none" ? "none" : "uppercase";

  let existingTokens: Record<string, unknown> = {};

  if (themeId) {
    const { data: theme, error } = await supabase
      .from("themes")
      .select("tokens")
      .eq("id", themeId)
      .single();

    if (error || !theme) fail(THEMES_ROUTE, error?.message ?? "theme-not-found");
    existingTokens = objectValue(theme.tokens);
  } else {
    const { data: globalTheme } = await supabase
      .from("themes")
      .select("id")
      .eq("scope", "global")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const { data: created, error } = await supabase
      .from("themes")
      .insert({
        parent_theme_id: mode === "season" ? globalTheme?.id ?? null : null,
        scope: mode,
        scope_id: mode === "season" ? seasonId : null,
        name: mode === "season" ? "Season Theme" : "AMS Global Theme",
        tokens: tokenOverrides,
        is_active: true
      })
      .select("id")
      .single();

    if (error || !created) fail(THEMES_ROUTE, error?.message ?? "theme-create-failed");
    themeId = created.id;

    if (mode === "season") {
      const { error: seasonError } = await supabase
        .from("seasons")
        .update({ theme_id: themeId, updated_at: new Date().toISOString() })
        .eq("id", seasonId);

      if (seasonError) fail(THEMES_ROUTE, seasonError.message);
    }
  }

  const { data: savedTheme, error } = await supabase
    .from("themes")
    .update({
      tokens: { ...existingTokens, ...tokenOverrides },
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", themeId)
    .select("id")
    .single();

  if (error || !savedTheme) {
    fail(THEMES_ROUTE, error?.message ?? "theme-save-failed");
  }

  if (mode === "season") {
    const { error: seasonError } = await supabase
      .from("seasons")
      .update({ theme_id: themeId, updated_at: new Date().toISOString() })
      .eq("id", seasonId);

    if (seasonError) fail(THEMES_ROUTE, seasonError.message);
  }

  refreshPublicSite();
  redirect(
    `${THEMES_ROUTE}?mode=${mode}${seasonId ? `&season=${seasonId}` : ""}&saved=1`
  );
}

export async function updateBrandTextAction(formData: FormData) {
  const { supabase } = await requireDesignAccess(BRANDING_ROUTE);
  const siteName = field(formData, "siteName");
  const logoText = field(formData, "logoText");
  const logoSubtext = field(formData, "logoSubtext");
  const footerText = field(formData, "footerText");

  if (!siteName || !logoText) fail(BRANDING_ROUTE, "invalid-branding");

  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (settingsError) fail(BRANDING_ROUTE, settingsError.message);

  const values = {
    site_name: siteName,
    default_title: siteName,
    logo_text: logoText,
    logo_subtext: logoSubtext || null,
    footer_text: footerText || null,
    updated_at: new Date().toISOString()
  };
  const query = settings?.id
    ? supabase.from("site_settings").update(values).eq("id", settings.id)
    : supabase.from("site_settings").insert(values);
  const { error } = await query;

  if (error) fail(BRANDING_ROUTE, error.message);

  refreshPublicSite();
  redirect(`${BRANDING_ROUTE}?saved=1`);
}

export async function uploadBrandLogoAction(formData: FormData) {
  const { supabase, userId } = await requireDesignAccess(BRANDING_ROUTE);
  const input = formData.get("logo");

  if (!(input instanceof File) || input.size === 0) fail(BRANDING_ROUTE, "select-logo");
  if (!LOGO_TYPES.has(input.type)) fail(BRANDING_ROUTE, "logo-type");
  if (input.size > MAX_LOGO_SIZE) fail(BRANDING_ROUTE, "logo-too-large");

  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("id, logo_image_asset_id, settings")
    .limit(1)
    .maybeSingle();

  if (settingsError || !settings) {
    fail(BRANDING_ROUTE, settingsError?.message ?? "site-settings-not-found");
  }

  const path = `global/branding/${randomUUID()}.${extensionFor(input.type)}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, await input.arrayBuffer(), {
      contentType: input.type,
      upsert: false
    });

  if (uploadError) fail(BRANDING_ROUTE, uploadError.message);

  const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      bucket: MEDIA_BUCKET,
      path,
      public_url: publicUrlData.publicUrl,
      title: "AMS primary logo",
      alt_text: "Alliance Master Series logo",
      mime_type: input.type,
      size_bytes: input.size,
      state: "active",
      scope: "global",
      scope_id: null,
      uploaded_by: userId,
      metadata: { originalFilename: input.name }
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    fail(BRANDING_ROUTE, assetError?.message ?? "logo-media-record-failed");
  }

  const currentSettings = objectValue(settings.settings);
  const { error: updateError } = await supabase
    .from("site_settings")
    .update({
      logo_image_asset_id: asset.id,
      settings: { ...currentSettings, logoImageUrl: publicUrlData.publicUrl },
      updated_at: new Date().toISOString()
    })
    .eq("id", settings.id);

  if (updateError) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    await supabase.from("media_assets").update({ state: "unused" }).eq("id", asset.id);
    fail(BRANDING_ROUTE, updateError.message);
  }

  if (settings.logo_image_asset_id) {
    await retireLogo(supabase, settings.logo_image_asset_id, "replaced");
  }

  refreshPublicSite();
  redirect(`${BRANDING_ROUTE}?logoUploaded=1`);
}

export async function removeBrandLogoAction() {
  const { supabase } = await requireDesignAccess(BRANDING_ROUTE);
  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("id, logo_image_asset_id, settings")
    .limit(1)
    .maybeSingle();

  if (settingsError || !settings) {
    fail(BRANDING_ROUTE, settingsError?.message ?? "site-settings-not-found");
  }

  const currentSettings = objectValue(settings.settings);
  const { error } = await supabase
    .from("site_settings")
    .update({
      logo_image_asset_id: null,
      settings: { ...currentSettings, logoImageUrl: null },
      updated_at: new Date().toISOString()
    })
    .eq("id", settings.id);

  if (error) fail(BRANDING_ROUTE, error.message);

  if (settings.logo_image_asset_id) {
    await retireLogo(supabase, settings.logo_image_asset_id, "unused");
  }

  refreshPublicSite();
  redirect(`${BRANDING_ROUTE}?logoRemoved=1`);
}

async function retireLogo(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  assetId: string,
  state: "replaced" | "unused"
) {
  const { data: asset } = await supabase
    .from("media_assets")
    .select("bucket, path")
    .eq("id", assetId)
    .maybeSingle();

  if (asset?.bucket && asset.path) {
    await supabase.storage.from(asset.bucket).remove([asset.path]);
  }

  await supabase
    .from("media_assets")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("id", assetId);
}

async function requireDesignAccess(nextPath: string) {
  const access = await getAdminAccess("manage_themes");

  if (access.status === "unauthenticated") {
    redirect(`/admin-login?next=${encodeURIComponent(nextPath)}`);
  }

  if (access.status !== "allowed" || !access.user) {
    redirect("/admin?error=forbidden");
  }

  return {
    supabase: await createSupabaseServerClient(),
    userId: access.user.id
  };
}

function refreshPublicSite() {
  revalidatePath("/admin/design/themes");
  revalidatePath("/admin/design/branding");
  revalidatePath("/", "layout");
}

function clampedNumber(formData: FormData, key: string, minimum: number, maximum: number) {
  const parsed = Number(field(formData, key));
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/svg+xml") return "svg";
  return mimeType.split("/")[1];
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(route: string, message: string): never {
  redirect(`${route}?error=${encodeURIComponent(message)}`);
}
