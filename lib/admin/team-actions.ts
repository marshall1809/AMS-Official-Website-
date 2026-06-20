"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const TEAM_ROUTE = "/admin/competition/teams";
const LOGO_BUCKET = "ams-media";
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function createTeamAction(formData: FormData) {
  const { supabase, userId } = await requireTeamAccess();
  const seasonId = field(formData, "seasonId");
  const name = field(formData, "name");
  const tag = field(formData, "tag").slice(0, 16);
  const summary = field(formData, "summary");
  const slug = slugify(field(formData, "slug") || name);

  if (!seasonId || name.length < 2 || !slug) fail("invalid-team");

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      canonical_name: name,
      slug,
      description: summary || null,
      socials: {}
    })
    .select("id")
    .single();

  if (teamError || !team) fail(teamError?.message ?? "team-create-failed");

  const logoAssetId = await uploadTeamLogo(
    supabase,
    userId,
    seasonId,
    team.id,
    formData.get("logo")
  );

  const { data: version, error: versionError } = await supabase
    .from("team_versions")
    .insert({
      team_id: team.id,
      name,
      tag: tag || null,
      slug,
      logo_asset_id: logoAssetId,
      description: summary || null,
      created_reason: "Season team created",
      created_by: userId
    })
    .select("id")
    .single();

  if (versionError || !version) fail(versionError?.message ?? "team-version-failed");

  const { error: teamUpdateError } = await supabase
    .from("teams")
    .update({ current_version_id: version.id })
    .eq("id", team.id);

  if (teamUpdateError) fail(teamUpdateError.message);

  const { error: participationError } = await supabase.from("season_teams").insert({
    season_id: seasonId,
    team_id: team.id,
    team_version_id: version.id,
    status: "active"
  });

  if (participationError) fail(participationError.message);

  finish("created");
}

export async function updateTeamAction(formData: FormData) {
  const { supabase, userId } = await requireTeamAccess();
  const seasonTeamId = field(formData, "seasonTeamId");
  const seasonId = field(formData, "seasonId");
  const teamId = field(formData, "teamId");
  const name = field(formData, "name");
  const tag = field(formData, "tag").slice(0, 16);
  const summary = field(formData, "summary");
  const removeLogo = formData.get("removeLogo") === "on";

  if (!seasonTeamId || !seasonId || !teamId || name.length < 2) fail("invalid-team");

  const { data: participation, error: participationError } = await supabase
    .from("season_teams")
    .select("id, team_version_id")
    .eq("id", seasonTeamId)
    .eq("season_id", seasonId)
    .eq("team_id", teamId)
    .single();

  if (participationError || !participation) {
    fail(participationError?.message ?? "participation-not-found");
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, slug, current_version_id")
    .eq("id", teamId)
    .single();

  if (teamError || !team) fail(teamError?.message ?? "team-not-found");

  const currentVersionId = participation.team_version_id ?? team.current_version_id;
  let currentLogoAssetId: string | null = null;

  if (currentVersionId) {
    const { data: currentVersion, error } = await supabase
      .from("team_versions")
      .select("logo_asset_id")
      .eq("id", currentVersionId)
      .single();

    if (error) fail(error.message);
    currentLogoAssetId = currentVersion?.logo_asset_id ?? null;
  }

  const uploadedLogoId = await uploadTeamLogo(
    supabase,
    userId,
    seasonId,
    teamId,
    formData.get("logo")
  );
  const nextLogoAssetId = removeLogo ? null : uploadedLogoId ?? currentLogoAssetId;

  const { data: nextVersion, error: versionError } = await supabase
    .from("team_versions")
    .insert({
      team_id: teamId,
      name,
      tag: tag || null,
      slug: team.slug,
      logo_asset_id: nextLogoAssetId,
      description: summary || null,
      created_reason: "Admin team update",
      created_by: userId
    })
    .select("id")
    .single();

  if (versionError || !nextVersion) fail(versionError?.message ?? "team-version-failed");

  if (currentVersionId) {
    const { error } = await supabase
      .from("team_versions")
      .update({ valid_to: new Date().toISOString() })
      .eq("id", currentVersionId)
      .is("valid_to", null);

    if (error) fail(error.message);
  }

  const { error: updateTeamError } = await supabase
    .from("teams")
    .update({
      canonical_name: name,
      description: summary || null,
      current_version_id: nextVersion.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", teamId);

  if (updateTeamError) fail(updateTeamError.message);

  const { error: updateParticipationError } = await supabase
    .from("season_teams")
    .update({
      team_version_id: nextVersion.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", seasonTeamId);

  if (updateParticipationError) fail(updateParticipationError.message);

  if (currentLogoAssetId && currentLogoAssetId !== nextLogoAssetId) {
    const { error } = await supabase
      .from("media_assets")
      .update({ state: removeLogo ? "unused" : "replaced" })
      .eq("id", currentLogoAssetId);

    if (error) fail(error.message);
  }

  finish("updated");
}

export async function removeTeamFromSeasonAction(formData: FormData) {
  const { supabase } = await requireTeamAccess();
  const seasonTeamId = field(formData, "seasonTeamId");

  if (!seasonTeamId) fail("invalid-participation");

  const { count, error: usageError } = await supabase
    .from("division_teams")
    .select("id", { count: "exact", head: true })
    .eq("season_team_id", seasonTeamId);

  if (usageError) fail(usageError.message);

  const query = count
    ? supabase
        .from("season_teams")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", seasonTeamId)
    : supabase.from("season_teams").delete().eq("id", seasonTeamId);

  const { error } = await query;
  if (error) fail(error.message);

  finish(count ? "archived" : "removed");
}

async function uploadTeamLogo(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  seasonId: string,
  teamId: string,
  input: FormDataEntryValue | null
) {
  if (!(input instanceof File) || input.size === 0) return null;
  if (input.size > MAX_LOGO_SIZE) fail("logo-too-large");
  if (!LOGO_TYPES.has(input.type)) fail("unsupported-logo-type");

  const extension = extensionFor(input.type);
  const path = `${seasonId}/teams/${teamId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, await input.arrayBuffer(), {
      contentType: input.type,
      upsert: false
    });

  if (uploadError) fail(uploadError.message);

  const { data: publicUrlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      bucket: LOGO_BUCKET,
      path,
      public_url: publicUrlData.publicUrl,
      title: "Team logo",
      alt_text: "Team logo",
      mime_type: input.type,
      size_bytes: input.size,
      state: "active",
      scope: "season",
      scope_id: seasonId,
      uploaded_by: userId
    })
    .select("id")
    .single();

  if (assetError || !asset) fail(assetError?.message ?? "media-record-failed");
  return asset.id as string;
}

async function requireTeamAccess() {
  const access = await getAdminAccess("manage_teams");
  if (access.status === "unauthenticated") {
    redirect("/admin-login?next=/admin/competition/teams");
  }
  if (access.status !== "allowed" || !access.user) {
    redirect("/admin?error=forbidden");
  }

  return {
    supabase: await createSupabaseServerClient(),
    userId: access.user.id
  };
}

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/svg+xml") return "svg";
  return mimeType.split("/")[1];
}

function fail(message: string): never {
  redirect(`${TEAM_ROUTE}?error=${encodeURIComponent(message)}`);
}

function finish(message: string): never {
  revalidatePath("/admin");
  revalidatePath(TEAM_ROUTE);
  redirect(`${TEAM_ROUTE}?${message}=1`);
}
