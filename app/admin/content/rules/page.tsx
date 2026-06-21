import Link from "next/link";
import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import shellStyles from "@/components/admin/admin-shell.module.css";
import styles from "@/components/admin/rules-manager.module.css";
import { requireAdminAccess } from "@/lib/admin/permissions";
import {
  createRulesetAction,
  removeRulesetPdfAction,
  updateRulesetAction,
  updateRulesetStatusAction,
  uploadRulesetPdfAction
} from "@/lib/admin/rules-actions";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Info | AMS Admin"
};

export const dynamic = "force-dynamic";

type SeasonRow = {
  id: string;
  name: string;
  status: string;
};

type RulesetRow = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived" | "deleted";
  published_at: string | null;
  pdf_asset_id: string | null;
  updated_at: string;
};

type PdfAssetRow = {
  id: string;
  public_url: string | null;
  title: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function RulesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const access = await requireAdminAccess("manage_pages");

  if (access.status !== "allowed") {
    return <AdminAccessBlocked access={access} />;
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: seasonData, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, status")
    .is("deleted_at", null)
    .neq("status", "deleted")
    .order("updated_at", { ascending: false });

  const seasons = (seasonData ?? []) as SeasonRow[];
  const requestedSeasonId = stringParam(params.season);
  const selectedSeason =
    seasons.find((season) => season.id === requestedSeasonId) ??
    seasons.find((season) => season.status === "active") ??
    seasons[0] ??
    null;

  let rulesets: RulesetRow[] = [];
  let pdfAssets: PdfAssetRow[] = [];
  let rulesError: string | undefined;

  if (selectedSeason) {
    const { data, error } = await supabase
      .from("rulesets")
      .select("id, title, body, status, published_at, pdf_asset_id, updated_at")
      .eq("scope", "season")
      .eq("scope_id", selectedSeason.id)
      .neq("status", "deleted")
      .order("updated_at", { ascending: false });

    rulesets = (data ?? []) as RulesetRow[];
    rulesError = error?.message;

    const pdfAssetIds = rulesets
      .map((ruleset) => ruleset.pdf_asset_id)
      .filter((id): id is string => Boolean(id));

    if (pdfAssetIds.length) {
      const { data: assetData, error: assetError } = await supabase
        .from("media_assets")
        .select("id, public_url, title")
        .in("id", pdfAssetIds);

      pdfAssets = (assetData ?? []) as PdfAssetRow[];
      rulesError = rulesError ?? assetError?.message;
    }
  }

  const feedback = getFeedback(params, seasonError?.message ?? rulesError);

  return (
    <div className={shellStyles.pageStack}>
      <AdminPageHeader
        path="/admin/content/rules"
        title="Info"
        description="Publish Season information, PDFs, images, and downloadable documents."
      />

      {feedback ? <div className={styles.feedback}>{feedback}</div> : null}

      {!seasons.length ? (
        <section className={shellStyles.placeholderCard}>
          <h2>No Season available</h2>
          <p>Create Season 1 before adding its information.</p>
          <Link className={shellStyles.primaryAction} href="/admin/seasons/new">
            Create Season
          </Link>
        </section>
      ) : (
        <>
          <form className={styles.toolbar} method="get">
            <label>
              Season context
              <select defaultValue={selectedSeason?.id} name="season">
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.status})
                  </option>
                ))}
              </select>
            </label>
            <button className={styles.secondaryButton} type="submit">
              Change Season
            </button>
          </form>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <h2>{selectedSeason?.name} information</h2>
              <p>Published information is visible to visitors. Archived entries remain stored but hidden.</p>

              {!rulesets.length ? (
                <div className={styles.empty}>No information entry exists for this Season yet.</div>
              ) : (
                <div className={styles.ruleList}>
                  {rulesets.map((ruleset) => (
                    <article className={styles.ruleCard} key={ruleset.id}>
                      <div className={styles.ruleHeader}>
                        <div>
                          <h3>{ruleset.title}</h3>
                          <div className={styles.preview}>{ruleset.body}</div>
                        </div>
                        <span className={styles.badge}>{ruleset.status}</span>
                      </div>

                      <section className={styles.pdfBox}>
                        {ruleset.pdf_asset_id ? (
                          <>
                            <div>
                              <strong>Attached document</strong>
                              <a
                                href={
                                  pdfAssets.find((asset) => asset.id === ruleset.pdf_asset_id)
                                    ?.public_url ?? "#"
                                }
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open current file
                              </a>
                            </div>
                            <form action={removeRulesetPdfAction}>
                              <input name="seasonId" type="hidden" value={selectedSeason!.id} />
                              <input name="rulesetId" type="hidden" value={ruleset.id} />
                              <button className={styles.dangerButton} type="submit">
                                Remove file
                              </button>
                            </form>
                          </>
                        ) : (
                          <span>No PDF uploaded</span>
                        )}

                        <form
                          action={uploadRulesetPdfAction}
                          className={styles.pdfUpload}
                          encType="multipart/form-data"
                        >
                          <input name="seasonId" type="hidden" value={selectedSeason!.id} />
                          <input name="rulesetId" type="hidden" value={ruleset.id} />
                          <label className={styles.field}>
                            {ruleset.pdf_asset_id ? "Replace file" : "Upload file"}
                            <input accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" name="file" type="file" required />
                          </label>
                          <small>PDF, image, text, DOC or DOCX, maximum 10 MB.</small>
                          <button className={styles.secondaryButton} type="submit">
                            {ruleset.pdf_asset_id ? "Replace file" : "Upload file"}
                          </button>
                        </form>
                      </section>

                      <div className={styles.actions}>
                        {ruleset.status !== "published" ? (
                          <StatusForm
                            label="Publish"
                            rulesetId={ruleset.id}
                            seasonId={selectedSeason!.id}
                            status="published"
                          />
                        ) : (
                          <StatusForm
                            label="Unpublish"
                            rulesetId={ruleset.id}
                            seasonId={selectedSeason!.id}
                            status="draft"
                          />
                        )}
                        {ruleset.status !== "archived" ? (
                          <StatusForm
                            danger
                            label="Archive"
                            rulesetId={ruleset.id}
                            seasonId={selectedSeason!.id}
                            status="archived"
                          />
                        ) : (
                          <StatusForm
                            label="Restore draft"
                            rulesetId={ruleset.id}
                            seasonId={selectedSeason!.id}
                            status="draft"
                          />
                        )}
                      </div>

                      <details>
                        <summary className={styles.secondaryButton}>Edit information</summary>
                        <form action={updateRulesetAction} className={styles.editor}>
                          <input name="seasonId" type="hidden" value={selectedSeason!.id} />
                          <input name="rulesetId" type="hidden" value={ruleset.id} />
                          <label className={styles.field}>
                            Title
                            <input defaultValue={ruleset.title} maxLength={160} name="title" required />
                          </label>
                          <label className={styles.field}>
                            Information text
                            <textarea defaultValue={ruleset.body} name="body" required />
                          </label>
                          <button className={styles.button} type="submit">
                            Save changes
                          </button>
                        </form>
                      </details>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <h2>Create information entry</h2>
              <p>Start as a draft and publish it when the information is ready.</p>
              <form action={createRulesetAction} className={styles.form}>
                <input name="seasonId" type="hidden" value={selectedSeason?.id} />
                <label className={styles.field}>
                  Title
                  <input maxLength={160} name="title" placeholder="Season 1 Information" required />
                </label>
                <label className={styles.field}>
                  Information text
                  <textarea
                    name="body"
                    placeholder="Enter the information shown to visitors..."
                    required
                  />
                </label>
                <button className={styles.button} type="submit">
                  Create draft
                </button>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatusForm({
  seasonId,
  rulesetId,
  status,
  label,
  danger = false
}: {
  seasonId: string;
  rulesetId: string;
  status: "draft" | "published" | "archived";
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updateRulesetStatusAction}>
      <input name="seasonId" type="hidden" value={seasonId} />
      <input name="rulesetId" type="hidden" value={rulesetId} />
      <input name="status" type="hidden" value={status} />
      <button className={danger ? styles.dangerButton : styles.secondaryButton} type="submit">
        {label}
      </button>
    </form>
  );
}

function stringParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function getFeedback(params: SearchParams, queryError?: string) {
  if (queryError) return `Could not load information: ${queryError}`;
  if (params.created === "1") return "Information draft created.";
  if (params.updated === "1") return "Information saved.";
  if (params.statusUpdated === "1") return "Information status updated.";
  if (params.pdfUploaded === "1") return "File uploaded successfully.";
  if (params.pdfRemoved === "1") return "File removed.";
  if (params.error === "invalid-ruleset") return "Please enter a title and at least 10 characters of rules text.";
  if (params.error === "invalid-status") return "The requested ruleset status is invalid.";
  if (params.error === "select-file") return "Please select a file.";
  if (params.error === "file-type") return "Use PDF, PNG, JPG, WebP, TXT, DOC or DOCX.";
  if (params.error === "file-too-large") return "The file must be 10 MB or smaller.";
  if (params.error === "pdf-not-found") return "This information entry has no file to remove.";
  if (typeof params.error === "string") return `Action failed: ${params.error}`;
  return null;
}
