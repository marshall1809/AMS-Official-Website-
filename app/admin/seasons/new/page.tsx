import type { CSSProperties } from "react";
import Link from "next/link";
import { AdminAccessBlocked } from "@/components/admin/admin-frame";
import { AdminPageHeader } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin-shell.module.css";
import { requireAdminAccess } from "@/lib/admin/permissions";
import { createSeasonAction } from "@/lib/admin/season-actions";

export const metadata = {
  title: "Create Season | AMS Admin"
};

export const dynamic = "force-dynamic";

export default async function NewSeasonPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdminAccess("manage_seasons");

  if (access.status !== "allowed") {
    return <AdminAccessBlocked access={access} />;
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader
        path="/admin/seasons/new"
        title="Create Season"
        description="Create an empty Season package. Competition data is added separately after creation."
      />

      {error ? (
        <div style={feedbackStyle}>
          {error === "invalid" ? "Enter a valid name and slug." : `Could not create season: ${error}`}
        </div>
      ) : null}

      <section className={styles.placeholderCard} style={{ maxWidth: 760 }}>
        <form action={createSeasonAction} style={formStyle}>
          <label style={labelStyle}>
            <span>Season name</span>
            <input
              name="name"
              placeholder="Season 1"
              required
              minLength={2}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Slug</span>
            <input
              name="slug"
              placeholder="season-1"
              pattern="[a-z0-9-]+"
              title="Use lowercase letters, numbers, and hyphens only."
              style={fieldStyle}
            />
            <small style={helpStyle}>Leave empty to generate it from the name.</small>
          </label>

          <label style={labelStyle}>
            <span>Summary</span>
            <textarea
              name="summary"
              placeholder="Short public description of this season"
              rows={5}
              style={fieldStyle}
            />
          </label>

          <div style={dateGridStyle}>
            <label style={labelStyle}>
              <span>Starts</span>
              <input name="startsAt" type="date" style={fieldStyle} />
            </label>

            <label style={labelStyle}>
              <span>Ends</span>
              <input name="endsAt" type="date" style={fieldStyle} />
            </label>
          </div>

          <div style={statusStyle}>
            <strong>Initial status</strong>
            <span>Draft</span>
          </div>

          <div style={actionsStyle}>
            <Link href="/admin/seasons" style={cancelStyle}>
              Cancel
            </Link>
            <button className={styles.primaryAction} type="submit" style={{ border: 0 }}>
              Create Season
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

const formStyle: CSSProperties = {
  display: "grid",
  gap: 20,
  width: "100%",
  fontFamily: "Arial, Helvetica, sans-serif"
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#eef3fb",
  fontSize: "0.84rem",
  fontWeight: 700
};

const fieldStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(201, 168, 76, 0.28)",
  borderRadius: 6,
  background: "#050b16",
  color: "#eef3fb",
  fontSize: "0.95rem",
  padding: "11px 12px",
  resize: "vertical"
};

const helpStyle: CSSProperties = {
  color: "#8ea0ba",
  fontWeight: 400
};

const dateGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16
};

const statusStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 6,
  background: "rgba(4, 10, 21, 0.55)",
  padding: "12px 14px"
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 12
};

const cancelStyle: CSSProperties = {
  color: "#aeb9ca",
  fontWeight: 700,
  padding: "10px 12px"
};

const feedbackStyle: CSSProperties = {
  border: "1px solid rgba(224, 92, 92, 0.4)",
  borderRadius: 7,
  background: "rgba(224, 92, 92, 0.1)",
  color: "#ffb4b4",
  padding: "12px 14px"
};
