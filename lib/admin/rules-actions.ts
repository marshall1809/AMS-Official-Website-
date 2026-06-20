"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const RULES_PATH = "/admin/content/rules";
const allowedStatuses = ["draft", "published", "archived"] as const;

export async function createRulesetAction(formData: FormData) {
  await requireRulesAccess();

  const seasonId = text(formData, "seasonId");
  const title = text(formData, "title");
  const body = text(formData, "body");

  if (!seasonId || title.length < 2 || body.length < 10) {
    redirect(withParams({ season: seasonId, error: "invalid-ruleset" }));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("rulesets").insert({
    scope: "season",
    scope_id: seasonId,
    title,
    body,
    status: "draft",
    created_by: user?.id ?? null
  });

  if (error) {
    redirect(withParams({ season: seasonId, error: error.message }));
  }

  revalidatePath(RULES_PATH);
  redirect(withParams({ season: seasonId, created: "1" }));
}

export async function updateRulesetAction(formData: FormData) {
  await requireRulesAccess();

  const seasonId = text(formData, "seasonId");
  const rulesetId = text(formData, "rulesetId");
  const title = text(formData, "title");
  const body = text(formData, "body");

  if (!seasonId || !rulesetId || title.length < 2 || body.length < 10) {
    redirect(withParams({ season: seasonId, error: "invalid-ruleset" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("rulesets")
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq("id", rulesetId)
    .eq("scope", "season")
    .eq("scope_id", seasonId);

  if (error) {
    redirect(withParams({ season: seasonId, error: error.message }));
  }

  revalidatePath(RULES_PATH);
  redirect(withParams({ season: seasonId, updated: "1" }));
}

export async function updateRulesetStatusAction(formData: FormData) {
  await requireRulesAccess();

  const seasonId = text(formData, "seasonId");
  const rulesetId = text(formData, "rulesetId");
  const status = text(formData, "status");

  if (!seasonId || !rulesetId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    redirect(withParams({ season: seasonId, error: "invalid-status" }));
  }

  const supabase = await createSupabaseServerClient();
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

  revalidatePath(RULES_PATH);
  redirect(withParams({ season: seasonId, statusUpdated: "1" }));
}

async function requireRulesAccess() {
  const access = await getAdminAccess("manage_pages");

  if (access.status === "unauthenticated") {
    redirect("/admin-login?next=/admin/content/rules");
  }

  if (access.status !== "allowed") {
    redirect("/admin?error=forbidden");
  }
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
