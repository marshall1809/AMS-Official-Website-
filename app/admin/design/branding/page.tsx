import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import shellStyles from "@/components/admin/admin-shell.module.css";
import styles from "@/components/admin/design-manager.module.css";
import {
  removeBrandLogoAction,
  updateBrandTextAction,
  uploadBrandLogoAction
} from "@/lib/admin/design-actions";
import { requireAdminAccess } from "@/lib/admin/permissions";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Branding | AMS Admin"
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type SettingsRow = {
  id: string;
  site_name: string;
  logo_text: string;
  logo_subtext: string | null;
  footer_text: string | null;
  logo_image_asset_id: string | null;
  settings: Record<string, unknown> | null;
};

export default async function BrandingPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const access = await requireAdminAccess("manage_themes");
  if (access.status !== "allowed") return <AdminAccessBlocked access={access} />;

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "id, site_name, logo_text, logo_subtext, footer_text, logo_image_asset_id, settings"
    )
    .limit(1)
    .maybeSingle();

  const settings = data as SettingsRow | null;
  let assetUrl: string | null = null;

  if (settings?.logo_image_asset_id) {
    const { data: asset } = await supabase
      .from("media_assets")
      .select("public_url")
      .eq("id", settings.logo_image_asset_id)
      .maybeSingle();

    assetUrl = asset?.public_url ?? null;
  }

  const storedUrl =
    settings?.settings && typeof settings.settings.logoImageUrl === "string"
      ? settings.settings.logoImageUrl
      : null;
  const logoUrl = assetUrl ?? storedUrl ?? "/ams-logo.png";
  const feedback = getFeedback(params, error?.message);

  return (
    <div className={shellStyles.pageStack}>
      <AdminPageHeader
        path="/admin/design/branding"
        title="Branding"
        description="Manage the global AMS logo and identity text used across every public page."
      />

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}

      <div className={styles.brandingGrid}>
        <section className={styles.panel}>
          <header>
            <div>
              <small>Global asset</small>
              <h2>Primary logo</h2>
            </div>
          </header>

          <div className={styles.brandLogo}>
            <img src={logoUrl} alt="Current Alliance Master Series logo" />
          </div>

          <form
            action={uploadBrandLogoAction}
            className={styles.brandForm}
            encType="multipart/form-data"
          >
            <label>
              Replace logo
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                name="logo"
                type="file"
                required
              />
            </label>
            <small>PNG, JPG, WEBP or SVG. Maximum 4 MB.</small>
            <div className={styles.brandActions}>
              <button className={styles.primary} type="submit">
                Upload logo
              </button>
            </div>
          </form>

          {settings?.logo_image_asset_id || storedUrl ? (
            <form action={removeBrandLogoAction}>
              <button className={styles.danger} type="submit">
                Remove custom logo
              </button>
            </form>
          ) : null}
        </section>

        <form action={updateBrandTextAction} className={[styles.panel, styles.brandForm].join(" ")}>
          <header>
            <div>
              <small>Global identity</small>
              <h2>Brand text</h2>
            </div>
            <button className={styles.primary} type="submit">
              Save text
            </button>
          </header>

          <label>
            Site name
            <input
              defaultValue={settings?.site_name ?? "Alliance Master Series"}
              maxLength={120}
              name="siteName"
              required
            />
          </label>
          <label>
            Logo short text
            <input defaultValue={settings?.logo_text ?? "AMS"} maxLength={20} name="logoText" required />
          </label>
          <label>
            Logo subtitle
            <input
              defaultValue={settings?.logo_subtext ?? "Alliance Master Series"}
              maxLength={120}
              name="logoSubtext"
            />
          </label>
          <label>
            Footer text
            <input
              defaultValue={settings?.footer_text ?? "Alliance Master Series"}
              maxLength={180}
              name="footerText"
            />
          </label>
        </form>
      </div>
    </div>
  );
}

function getFeedback(params: SearchParams, queryError?: string) {
  if (queryError) return "Could not load branding: " + queryError;
  if (params.saved === "1") return "Brand text updated.";
  if (params.logoUploaded === "1") return "Global logo updated across the public website.";
  if (params.logoRemoved === "1") return "Custom logo removed. The bundled AMS logo is active.";
  if (params.error === "select-logo") return "Select an image before uploading.";
  if (params.error === "logo-type") return "Use PNG, JPG, WEBP or SVG.";
  if (params.error === "logo-too-large") return "The logo must be 4 MB or smaller.";
  if (typeof params.error === "string") return "Action failed: " + params.error;
  return null;
}
