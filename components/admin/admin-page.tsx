import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { adminDashboardCards, getAdminBreadcrumbs, type AdminNavItem } from "@/lib/admin/navigation";
import type { AdminDashboardStats } from "@/lib/admin/dashboard";
import styles from "@/components/admin/admin-shell.module.css";

export function AdminPageHeader({
  path,
  title,
  description,
  action
}: {
  path: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <section className={styles.pageHeader}>
      <div>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {getAdminBreadcrumbs(path).map((crumb, index, crumbs) => (
            <span key={`${crumb}-${index}`}>
              {crumb}
              {index < crumbs.length - 1 ? <b>→</b> : null}
            </span>
          ))}
        </nav>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <Link className={styles.primaryAction} href={action.href}>{action.label}</Link> : null}
    </section>
  );
}

export function AdminDashboard({ stats }: { stats: AdminDashboardStats }) {
  const values = {
    activeSeason: stats.activeSeason,
    competitions: String(stats.competitions),
    teams: String(stats.teams),
    matches: String(stats.matches),
    pendingResults: String(stats.pendingResults),
    recentChanges: String(stats.recentChanges)
  };

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader
        path="/admin"
        title="Dashboard"
        description="Operational overview for the AMS platform. Detailed modules will plug into this shell later."
      />

      <section className={styles.metricGrid}>
        {adminDashboardCards.map((card) => (
          <article className={styles.metricCard} key={card.key}>
            <card.icon size={20} />
            <span>{card.title}</span>
            <strong>{values[card.key]}</strong>
          </article>
        ))}
      </section>

      <section className={styles.dashboardGrid}>
        <AdminPanel title="Next Setup Tasks" href="/admin/seasons">
          <EmptyList
            items={[
              "Create or select the active Season context",
              "Configure Divisions and Competitions",
              "Attach Teams to the correct Season and Division",
              "Generate schedule, standings, and bracket data"
            ]}
          />
        </AdminPanel>
        <AdminPanel title="Recent Changes" href="/admin/settings/audit-log">
          <div className={styles.emptyState}>
            <ClipboardList size={22} />
            <strong>No audit entries loaded</strong>
            <p>Once write operations are connected, recent edits will appear here.</p>
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}

export function AdminPlaceholderPage({ page }: { page: AdminNavItem & { group: string } }) {
  return (
    <div className={styles.pageStack}>
      <AdminPageHeader path={page.href} title={page.title} description={page.description ?? "Admin module placeholder."} />
      <section className={styles.placeholderGrid}>
        <article className={styles.placeholderCard}>
          <page.icon size={24} />
          <h2>{page.title} module shell</h2>
          <p>
            This route is protected, permission-aware, and ready for the future CRUD workflow. Complex forms and data editing are intentionally not implemented yet.
          </p>
        </article>
        <article className={styles.placeholderCard}>
          <h2>Prepared context</h2>
          <p>
            Future screens can bind this module to global, Season, Division, or Competition scope without changing the admin frame.
          </p>
        </article>
      </section>
    </div>
  );
}

function AdminPanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <article className={styles.panel}>
      <header>
        <h2>{title}</h2>
        <Link href={href}>Open <ArrowRight size={15} /></Link>
      </header>
      {children}
    </article>
  );
}

function EmptyList({ items }: { items: string[] }) {
  return (
    <ul className={styles.taskList}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
