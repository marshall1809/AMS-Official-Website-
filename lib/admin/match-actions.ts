"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

const SCHEDULE_ROUTE = "/admin/competition/schedule";
const statuses = new Set(["scheduled", "live", "completed"]);

export async function updateMatchScheduleAction(formData: FormData) {
  const access = await getAdminAccess("manage_competitions");

  if (access.status === "unauthenticated") {
    redirect("/admin-login?next=" + SCHEDULE_ROUTE);
  }

  if (access.status !== "allowed") {
    redirect("/admin?error=forbidden");
  }

  const matchId = field(formData, "matchId");
  const status = field(formData, "status");
  const startsAtLocal = field(formData, "startsAtLocal");
  const timezoneOffset = Number(field(formData, "timezoneOffset") || 0);
  const clearStartsAt = formData.get("clearStartsAt") === "on";
  const streamUrl = optionalUrl(field(formData, "streamUrl"));
  const vodUrl = optionalUrl(field(formData, "vodUrl"));
  const report = field(formData, "report");

  if (!matchId || !statuses.has(status)) fail("invalid-match");
  if (streamUrl === false || vodUrl === false) fail("invalid-url");

  const startsAt = clearStartsAt
    ? null
    : startsAtLocal
      ? localDateTimeToIso(startsAtLocal, timezoneOffset)
      : null;

  if (startsAtLocal && !startsAt) fail("invalid-date");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({
      starts_at: startsAt,
      status,
      stream_url: streamUrl || null,
      vod_url: vodUrl || null,
      report: report || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", matchId);

  if (error) fail(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/competition/matches");
  revalidatePath(SCHEDULE_ROUTE);
  redirect(SCHEDULE_ROUTE + "?updated=1");
}

function localDateTimeToIso(value: string, timezoneOffset: number) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match || !Number.isFinite(timezoneOffset)) return null;

  const [, year, month, day, hour, minute] = match;
  const utcMilliseconds =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) +
    timezoneOffset * 60_000;

  const date = new Date(utcMilliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function optionalUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : false;
  } catch {
    return false;
  }
}

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string): never {
  redirect(`${SCHEDULE_ROUTE}?error=${encodeURIComponent(message)}`);
}
