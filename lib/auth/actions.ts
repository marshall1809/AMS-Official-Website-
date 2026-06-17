"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/server";

export async function signInFromFormAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const nextPath = safeNextPath(formString(formData, "next"));
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/admin-login?auth=failed&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(nextPath);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin-login");
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}
