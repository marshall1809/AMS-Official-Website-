import Link from "next/link";
import { AlertTriangle, ChevronDown, LogOut, Search, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { adminNavigation } from "@/lib/admin/navigation";
import { summarizeAdminAccess, type AdminAccess } from "@/lib/admin/permissions";
import styles from "@/components/admin/admin-shell.module.css";

export function AdminFrame({ access, children }: { access: AdminAccess; children: React.ReactNode }) {
  if (access.status !== "allowed") {
    return <AdminAccessBlocked access={access} />;
  }

  return (
    <div className={styles.adminRoot}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}>
          <span className={styles.brandMark}>AMS</span>
          <span>
            <strong>AMS</strong>
            <small>Admin</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Admin navigation">
          {adminNavigation.map((group) => (
            <section className={styles.navGroup} key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <Link href={item.href} key={item.href}>
                  <item.icon size={17} strokeWidth={1.9} />
                  <span>{item.title}</span>
                </Link>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <label className={styles.searchBox}>
            <Search size={17} />
            <input placeholder="Search seasons, teams, matches, pages..." />
          </label>

          <div className={styles.topbarRight}>
            <button className={styles.contextButton} type="button">
              <span>
                <small>Context</small>
                <strong>Season / Division / Competition</strong>
              </span>
              <ChevronDown size={16} />
            </button>

            <div className={styles.accountMenu}>
              <ShieldCheck size={18} />
              <span>
                <strong>{access.user?.email ?? "Admin user"}</strong>
                <small>{summarizeAdminAccess(access.assignments)}</small>
              </span>
              <form action={signOutAction}>
                <button type="submit" aria-label="Sign out">
                  <LogOut size={16} />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export function AdminAccessBlocked({ access }: { access: AdminAccess }) {
  return (
    <main className={styles.blockedPage}>
      <section className={styles.blockedCard}>
        <AlertTriangle size={34} />
        <p>AMS Admin</p>
        <h1>{access.status === "unconfigured" ? "Supabase is not configured" : "Access denied"}</h1>
        <span>{access.reason ?? "Your account does not have permission to open the admin workspace."}</span>
        <div className={styles.blockedActions}>
          <Link href="/">Open public site</Link>
          <Link href="/admin-login">Sign in with another account</Link>
        </div>
      </section>
    </main>
  );
}
