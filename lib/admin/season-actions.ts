"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const statuses = ["draft", "setup", "ready", "active", "finished", "archived"] as const;

export async function createSeasonAction(formData: FormData) {
  await requireSeasonAccess();

  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  const summary = text(formData, "summary");

  if (name.length < 2 || !slug) {
    redirect("/admin/seasons/new?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("seasons").insert({
    name,
    slug,
    summary: summary || null,
    status: "draft",
    starts_at: nullableDate(formData, "startsAt"),
    ends_at: nullableDate(formData, "endsAt"),
    settings: {}
  });

  if (error) {
    redirect(`/admin/seasons/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/seasons");
  redirect("/admin/seasons?created=1");
}

export async function updateSeasonStatusAction(formData: FormData) {
  await requireSeasonAccess();

  const seasonId = text(formData, "seasonId");
  const status = text(formData, "status");

  if (!seasonId || !statuses.includes(status as (typeof statuses)[number])) {
    redirect("/admin/seasons?error=invalid");
  }

  const supabase = await createSupabaseServerClient();

  if (status === "active") {
    const { data, error: activeSeasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("status", "active")
      .neq("id", seasonId)
      .is("deleted_at", null)
      .limit(1);

    if (activeSeasonError) {
      redirect(`/admin/seasons?error=${encodeURIComponent(activeSeasonError.message)}`);
    }

    if (data?.length) {
      redirect("/admin/seasons?error=active-season-exists");
    }
  }

  const { error } = await supabase
    .from("seasons")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", seasonId);

  if (error) {
    redirect(`/admin/seasons?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/seasons");
  redirect("/admin/seasons?updated=1");
}

async function requireSeasonAccess() {
  const access = await getAdminAccess("manage_seasons");

  if (access.status === "unauthenticated") {
    redirect("/admin-login?next=/admin/seasons");
  }

  if (access.status !== "allowed") {
    redirect("/admin?error=forbidden");
  }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
