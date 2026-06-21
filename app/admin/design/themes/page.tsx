import Link from "next/link";
import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { ThemeEditor } from "@/components/admin/theme-editor";
import shellStyles from "@/components/admin/admin-shell.module.css";
import styles from "@/components/admin/design-manager.module.css";
import { requireAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { defaultCmsData } from "@/lib/cms/default-data";
import type { ThemeTokens } from "@/lib/cms/types";

export const metadata = {
  title: "Themes | AMS Admin"
};

export const dynamic = "force-dynamic";

type SeasonRow = {
  id: string;
  name: string;
  status: string;
};

type ThemeRow = {
  id: string;
  scope: string;
  scope_id: string | null;
  tokens: Record<string, unknown>;
  is_active: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ThemesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const access = await requireAdminAccess("manage_themes");
  if (access.status !== "allowed") return <AdminAccessBlocked access={access} />;

  const params = await searchParams;
  const mode = params.mode === "season" ? "season" : "global";
  const supabase = await createSupabaseServerClient();
  const [{ data: seasonData, error: seasonError }, { data: themeData, error: themeError }] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, name, status")
        .is("deleted_at", null)
        .neq("status", "deleted")
        .order("updated_at", { ascending: false }),
      supabase
        .from("themes")
        .select("id, scope, scope_id, tokens, is_active")
        .eq("is_active", true)
    ]);

  const seasons = (seasonData ?? []) as SeasonRow[];
  const requestedSeasonId = typeof params.season === "string" ? params.season : "";
  const selectedSeason =
    seasons.find((season) => season.id === requestedSeasonId) ??
    seasons.find((season) => season.status === "active") ??
    seasons[0];
  const themes = (themeData ?? []) as ThemeRow[];
  const globalTheme = themes.find((theme) => theme.scope === "global");
  const seasonTheme = selectedSeason
    ? themes.find(
        (theme) => theme.scope === "season" && theme.scope_id === selectedSeason.id
      )
    : undefined;
  const defaults = defaultCmsData.themes[0].tokens;
  const initialTokens = {
    ...defaults,
    ...(globalTheme?.tokens ?? {}),
    ...(mode === "season" ? seasonTheme?.tokens ?? {} : {})
  } as ThemeTokens;
  const feedback = getFeedback(params, seasonError?.message ?? themeError?.message);

  return (
    <div className={shellStyles.pageStack}>
      <AdminPageHeader
        path="/admin/design/themes"
        title="Themes"
        description="Control the global AMS palette or override it for the selected Season."
      />

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}

      <section className={styles.contextBar}>
        <nav aria-label="Theme scope">
          <Link className={mode === "global" ? styles.activeTab : ""} href="/admin/design/themes">
            Global
          </Link>
          <Link
            className={mode === "season" ? styles.activeTab : ""}
            href={`/admin/design/themes?mode=season${selectedSeason ? `&season=${selectedSeason.id}` : ""}`}
          >
            Season
          </Link>
        </nav>

        {mode === "season" && seasons.length ? (
          <form method="get">
            <input name="mode" type="hidden" value="season" />
            <select defaultValue={selectedSeason?.id} name="season">
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.status})
                </option>
              ))}
            </select>
            <button type="submit">Change</button>
          </form>
        ) : null}
      </section>

      {mode === "season" && !selectedSeason ? (
        <section className={shellStyles.placeholderCard}>
          <h2>No Season available</h2>
          <p>Create a Season before adding a Season-specific theme.</p>
          <Link className={shellStyles.primaryAction} href="/admin/seasons/new">
            Create Season
          </Link>
        </section>
      ) : (
        <ThemeEditor
          initialTokens={initialTokens}
          mode={mode}
          seasonId={mode === "season" ? selectedSeason?.id : undefined}
          themeId={mode === "season" ? seasonTheme?.id : globalTheme?.id}
        />
      )}
    </div>
  );
}

function getFeedback(params: SearchParams, queryError?: string) {
  if (queryError) return `Could not load themes: ${queryError}`;
  if (params.saved === "1") return "Theme saved. Public pages now use the updated colors.";
  if (params.error === "season-required") return "Select a Season before saving its theme.";
  if (typeof params.error === "string") return `Action failed: ${params.error}`;
  return null;
}
