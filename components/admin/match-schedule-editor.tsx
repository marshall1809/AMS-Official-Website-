"use client";

import { updateMatchScheduleAction } from "@/lib/admin/match-actions";
import styles from "@/components/admin/match-schedule.module.css";

export type ScheduleMatch = {
  id: string;
  title: string;
  status: string;
  startsAt: string | null;
  streamUrl: string | null;
  vodUrl: string | null;
  report: string | null;
  roundLabel: string | null;
  teams: string[];
};

export function MatchScheduleEditor({ match }: { match: ScheduleMatch }) {
  return (
    <article className={styles.card}>
      <div className={styles.identity}>
        <small>{match.roundLabel ?? "Match"}</small>
        <strong>{match.teams.length ? match.teams.join(" vs ") : match.title}</strong>
      </div>

      <div className={styles.meta}>
        <small>{match.status}</small>
        <span>{match.startsAt ? formatDisplayDate(match.startsAt) : "Date not scheduled"}</span>
      </div>

      <details className={styles.edit}>
        <summary>Bearbeiten</summary>
        <form action={updateMatchScheduleAction} className={styles.form}>
          <input name="matchId" type="hidden" value={match.id} />
          <input name="timezoneOffset" type="hidden" value={new Date().getTimezoneOffset()} />

          <div className={styles.grid}>
            <label>
              Date and time
              <input
                name="startsAtLocal"
                type="datetime-local"
                defaultValue={toLocalInputValue(match.startsAt)}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={normalizeStatus(match.status)}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          <label className={styles.checkbox}>
            <input name="clearStartsAt" type="checkbox" />
            Remove scheduled date
          </label>

          <label>
            Stream URL
            <input name="streamUrl" type="url" defaultValue={match.streamUrl ?? ""} />
          </label>

          <label>
            VOD URL
            <input name="vodUrl" type="url" defaultValue={match.vodUrl ?? ""} />
          </label>

          <label>
            Match report
            <textarea name="report" defaultValue={match.report ?? ""} />
          </label>

          <button className={styles.primary} type="submit">
            Save schedule
          </button>
        </form>
      </details>
    </article>
  );
}

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes())
  ].join("");
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalizeStatus(value: string) {
  return value === "live" || value === "completed" ? value : "scheduled";
}
