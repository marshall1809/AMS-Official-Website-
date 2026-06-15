import Link from "next/link";
import { Shield } from "lucide-react";
import { themeToStyle } from "@/lib/cms/theme";
import type { CmsData, PageRecord, SeasonRecord, ThemeRecord } from "@/lib/cms/types";

export function SiteShell({
  data,
  season,
  theme,
  page,
  children
}: {
  data: CmsData;
  season?: SeasonRecord;
  theme: ThemeRecord;
  page: PageRecord;
  children: React.ReactNode;
}) {
  const navigation = data.navigationItems
    .filter((item) => item.isVisible)
    .filter((item) => item.scope === "global" || item.seasonId === season?.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="theme-root" style={themeToStyle(theme.tokens)} data-page-id={page.id}>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link href="/" className="brand" aria-label={data.siteSettings.siteName}>
            <span className="brand__mark">{data.siteSettings.logoText}</span>
            <span className="brand__copy">
              <strong>{data.siteSettings.logoText}</strong>
              <small>{data.siteSettings.logoSubtext}</small>
            </span>
          </Link>
          <nav className="site-header__nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <Link href={item.href} key={item.id}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className="site-header__admin" href="/admin" aria-label="Open admin area">
            <Shield size={16} />
            Admin
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="brand compact" aria-label={data.siteSettings.siteName}>
            <span className="brand__mark">{data.siteSettings.logoText}</span>
            <span className="brand__copy">
              <strong>{data.siteSettings.logoText}</strong>
              <small>{data.siteSettings.logoSubtext}</small>
            </span>
          </div>
          <p>{data.siteSettings.footerText}</p>
        </div>
      </footer>
    </div>
  );
}
