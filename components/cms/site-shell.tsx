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
          <Brand data={data} />
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
          <Brand data={data} compact />
          <p>{data.siteSettings.footerText}</p>
        </div>
      </footer>
    </div>
  );
}

function Brand({ data, compact = false }: { data: CmsData; compact?: boolean }) {
  const logoUrl = data.siteSettings.logoImageUrl || "/ams-logo.png";

  return (
    <Link href="/" className={compact ? "brand compact" : "brand"} aria-label={data.siteSettings.siteName}>
      <span className="brand__mark">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={data.siteSettings.siteName} />
        ) : (
          data.siteSettings.logoText
        )}
      </span>
      <span className="brand__copy">
        <strong>{data.siteSettings.logoText}</strong>
        <small>{data.siteSettings.logoSubtext}</small>
      </span>
    </Link>
  );
}
