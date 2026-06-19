import type { CSSProperties } from "react";
import Link from "next/link";
import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin-shell.module.css";
import { requireAdminAccess } from "@/lib/admin/permissions";
import { updateSeasonStatusAction } from "@/lib/admin/season-actions";
import { createSupabaseServerClient } from "@/lib/auth/server";

export const metadata = {
  title: "Seasons | AMS Admin"
};

export const dynamic = "force-dynamic";

type SeasonStatus = "draft" | "setup" | "ready" | "active" | "finished" | "archived";

type SeasonRow = {
  id: string;
  name: string;
  slug: string;
  status: SeasonStatus;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
};

const nextStatus: Partial<Record<SeasonStatus, SeasonStatus>> = {
  draft: "setup",
  setup: "ready",
  ready: "active",
  active: "finished",
  finished: "archived"
};

const statusLabels: Record<SeasonStatus, string> = {
  draft: "Move to setup",
  setup: "Mark ready",
  ready: "Activate",
  active: "Finish",
  finished: "Archive",
  archived: "Archived"
};

export default async function SeasonsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdminAccess("manage_seasons");

  if (access.status !== "allowed") {
    return <AdminAccessBlocked access={access} />;
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, slug, status, starts_at, ends_at, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const seasons = (data ?? []) as SeasonRow[];
  const feedback = getFeedback(params, error?.message);

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader
        path="/admin/seasons"
        title="Seasons"
        description="Manage the Season 1 lifecycle without deleting historical competition data."
        action={{ label: "Create Season", href: "/admin/seasons/new" }}
      />

      {feedback ? <div style={feedbackStyle}>{feedback}</div> : null}

      {!seasons.length ? (
        <section className={styles.placeholderCard}>
          <h2>No seasons yet</h2>
          <p>Create Season 1 to begin configuring teams, matches, rules, and branding.</p>
          <Link className={styles.primaryAction} href="/admin/seasons/new">
            Create Season
          </Link>
        </section>
      ) : (
        <section className={styles.placeholderCard} style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Name", "Slug", "Status", "Starts", "Ends", "Updated", "Action"].map((label) => (
                    <th style={headerCellStyle} key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => {
                  const targetStatus = nextStatus[season.status];

                  return (
                    <tr key={season.id}>
                      <td style={cellStyle}><strong>{season.name}</strong></td>
                      <td style={cellStyle}><code>{season.slug}</code></td>
                      <td style={cellStyle}>{season.status}</td>
                      <td style={cellStyle}>{formatDate(season.starts_at)}</td>
                      <td style={cellStyle}>{formatDate(season.ends_at)}</td>
                      <td style={cellStyle}>{formatDate(season.updated_at)}</td>
                      <td style={cellStyle}>
                        {targetStatus ? (
                          <form action={updateSeasonStatusAction}>
                            <input name="seasonId" type="hidden" value={season.id} />
                            <input name="status" type="hidden" value={targetStatus} />
                            <button style={actionStyle} type="submit">
                              {statusLabels[season.status]}
                            </button>
                          </form>
                        ) : (
                          <span>Complete</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function getFeedback(
  params: Record<string, string | string[] | undefined>,
  queryError?: string
) {
  if (queryError) return `Could not load seasons: ${queryError}`;
  if (params.created === "1") return "Season created successfully.";
  if (params.updated === "1") return "Season status updated.";
  if (params.error === "active-season-exists") return "Finish the active season before activating another.";
  if (typeof params.error === "string") return `Action failed: ${params.error}`;
  return null;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(value));
}

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: 900,
  borderCollapse: "collapse",
  color: "#eef3fb",
  fontFamily: "Arial, Helvetica, sans-serif"
};

const headerCellStyle: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.24)",
  color: "#8ea0ba",
  fontSize: "0.72rem",
  textAlign: "left",
  textTransform: "uppercase"
};

const cellStyle: CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
  verticalAlign: "middle"
};

const actionStyle: CSSProperties = {
  minHeight: 36,
  border: 0,
  borderRadius: 6,
  background: "#c9a84c",
  color: "#08101d",
  cursor: "pointer",
  fontWeight: 800,
  padding: "0 12px"
};

const feedbackStyle: CSSProperties = {
  border: "1px solid rgba(201, 168, 76, 0.35)",
  borderRadius: 7,
  background: "rgba(201, 168, 76, 0.1)",
  color: "#f6df8d",
  padding: "12px 14px"
};
