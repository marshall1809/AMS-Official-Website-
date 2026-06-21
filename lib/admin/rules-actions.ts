"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const RULES_PATH = "/admin/content/rules";
const MEDIA_BUCKET = "ams-media";
const MAX_INFO_FILE_SIZE = 10 * 1024 * 1024;
const INFO_FILE_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["text/plain", "txt"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"]
]);
const allowedStatuses = ["draft", "published", "archived"] as const;

export async function createRulesetAction(formData: FormData) {
  const { supabase, userId } = await requireRulesAccess();
  const seasonId = text(formData, "seasonId");
  const title = text(formData, "title");
  const body = text(formData, "body");

  if (!seasonId || title.length < 2 || body.length < 10) {
    redirect(withParams({ season: seasonId, error: "invalid-ruleset" }));
  }

  const { error } = await supabase.from("rulesets").insert({
    scope: "season",
    scope_id: seasonId,
    title,
    body,
    status: "draft",
    created_by: userId
  });

  if (error) {
    redirect(withParams({ season: seasonId, error: error.message }));
  }

  refreshRules();
  redirect(withParams({ season: seasonId, created: "1" }));
}

export async function updateRulesetAction(formData: FormData) {
  const { supabase } = await requireRulesAccess();
  const seasonId = text(formData, "seasonId");
  const rulesetId = text(formData, "rulesetId");
  const title = text(formData, "title");
  const body = text(formData, "body");

  if (!seasonId || !rulesetId || title.length < 2 || body.length < 10) {
    redirect(withParams({ season: seasonId, error: "invalid-ruleset" }));
  }

  const { error } = await supabase
    .from("rulesets")
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq("id", rulesetId)
    .eq("scope", "season")
    .eq("scope_id", seasonId);

  if (error) {
    redirect(withParams({ season: seasonId, error: error.message }));
  }

  refreshRules();
  redirect(withParams({ season: seasonId, updated: "1" }));
}

export async function updateRulesetStatusAction(formData: FormData) {
  const { supabase } = await requireRulesAccess();
  const seasonId = text(formData, "seasonId");
  const rulesetId = text(formData, "rulesetId");
  const status = text(formData, "status");

  if (!seasonId || !rulesetId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    redirect(withParams({ season: seasonId, error: "invalid-status" }));
  }

  const { error } = await supabase
    .from("rulesets")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", rulesetId)
    .eq("scope", "season")
    .eq("scope_id", seasonId);

  if (error) {
    redirect(withParams({ season: seasonId, error: error.message }));
  }

  refreshRules();
  redirect(withParams({ season: seasonId, statusUpdated: "1" }));
}

export async function uploadRulesetPdfAction(formData: FormData) {
  const { supabase, userId } = await requireRulesAccess();
  const seasonId = text(formData, "seasonId");
  const rulesetId = text(formData, "rulesetId");
  const input = formData.get("file") ?? formData.get("pdf");

  if (!seasonId || !rulesetId || !(input instanceof File) || input.size === 0) {
    redirect(withParams({ season: seasonId, error: "select-file" }));
  }

  const extension = INFO_FILE_TYPES.get(input.type);

  if (!extension) {
    redirect(withParams({ season: seasonId, error: "file-type" }));
  }

  if (input.size > MAX_INFO_FILE_SIZE) {
    redirect(withParams({ season: seasonId, error: "file-too-large" }));
  }

  const { data: ruleset, error: rulesetError } = await supabase
    .from("rulesets")
    .select("id, title, pdf_asset_id")
    .eq("id", rulesetId)
    .eq("scope", "season")
    .eq("scope_id", seasonId)
    .single();

  if (rulesetError || !ruleset) {
    redirect(withParams({ season: seasonId, error: rulesetError?.message ?? "ruleset-not-found" }));
  }

  const path = `${seasonId}/info/${rulesetId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, await input.arrayBuffer(), {
      contentType: input.type,
      upsert: false
    });

  if (uploadError) {
    redirect(withParams({ season: seasonId, error: uploadError.message }));
  }

  const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      bucket: MEDIA_BUCKET,
      path,
      public_url: publicUrlData.publicUrl,
      title: `${ruleset.title} document`,
      alt_text: `${ruleset.title} information document`,
      mime_type: input.type,
      size_bytes: input.size,
      state: "active",
      scope: "season",
      scope_id: seasonId,
      uploaded_by: userId,
      metadata: { originalFilename: input.name }
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    redirect(withParams({ season: seasonId, error: assetError?.message ?? "file-media-record-failed" }));
  }

  const { error: updateError } = await supabase
    .from("rulesets")
    .update({
      pdf_asset_id: asset.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", rulesetId)
    .eq("scope_id", seasonId);

  if (updateError) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    await supabase.from("media_assets").update({ state: "unused" }).eq("id", asset.id);
    redirect(withParams({ season: seasonId, error: updateError.message }));
  }

  if (ruleset.pdf_asset_id) {
    await retirePdfAsset(supabase, ruleset.pdf_asset_id, "replaced");
  }

  refreshRules();
  redirect(withParams({ season: seasonId, pdfUploaded: "1" }));
}

export async function removeRulesetPdfAction(formData: FormData) {
  const { supabase } = await requireRulesAccess();
  const seasonId = text(formData, "seasonId");
  const rulesetId = text(formData, "rulesetId");

  if (!seasonId || !rulesetId) {
    redirect(withParams({ season: seasonId, error: "invalid-ruleset" }));
  }

  const { data: ruleset, error: rulesetError } = await supabase
    .from("rulesets")
    .select("pdf_asset_id")
    .eq("id", rulesetId)
    .eq("scope", "season")
    .eq("scope_id", seasonId)
    .single();

  if (rulesetError || !ruleset) {
    redirect(withParams({ season: seasonId, error: rulesetError?.message ?? "ruleset-not-found" }));
  }

  if (!ruleset.pdf_asset_id) {
    redirect(withParams({ season: seasonId, error: "pdf-not-found" }));
  }

  const { error: updateError } = await supabase
    .from("rulesets")
    .update({
      pdf_asset_id: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", rulesetId)
    .eq("scope_id", seasonId);

  if (updateError) {
    redirect(withParams({ season: seasonId, error: updateError.message }));
  }

  await retirePdfAsset(supabase, ruleset.pdf_asset_id, "unused");
  refreshRules();
  redirect(withParams({ season: seasonId, pdfRemoved: "1" }));
}

async function retirePdfAsset(
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

async function requireRulesAccess() {
  const access = await getAdminAccess("manage_pages");

  if (access.status === "unauthenticated") {
    redirect("/admin-login?next=/admin/content/rules");
  }

  if (access.status !== "allowed" || !access.user) {
    redirect("/admin?error=forbidden");
  }

  return {
    supabase: await createSupabaseServerClient(),
    userId: access.user.id
  };
}

function refreshRules() {
  revalidatePath(RULES_PATH);
  revalidatePath("/info");
  revalidatePath("/seasons/[seasonSlug]/info", "page");
  revalidatePath("/rules");
  revalidatePath("/seasons/[seasonSlug]/rules", "page");
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function withParams(values: Record<string, string>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }

  return `${RULES_PATH}?${params.toString()}`;
}
