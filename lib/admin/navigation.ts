import type { ComponentType } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Boxes,
  Brush,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  ImageIcon,
  Landmark,
  LayoutDashboard,
  Library,
  ListTree,
  Medal,
  Megaphone,
  Newspaper,
  Palette,
  PlusCircle,
  Route,
  ScrollText,
  Settings,
  Shield,
  Swords,
  Trophy,
  Users
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  description?: string;
  requiredCapability?: string;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavGroup[] = [
  {
    title: "Dashboard",
    items: [{ title: "Overview", href: "/admin", icon: LayoutDashboard, description: "Admin overview" }]
  },
  {
    title: "Seasons",
    items: [
      { title: "All Seasons", href: "/admin/seasons", icon: Trophy, description: "Manage season lifecycle", requiredCapability: "manage_seasons" },
      { title: "Create Season", href: "/admin/seasons/new", icon: PlusCircle, description: "Prepare a clean season", requiredCapability: "manage_seasons" }
    ]
  },
  {
    title: "Content",
    items: [
      { title: "Pages", href: "/admin/content/pages", icon: FileText, description: "CMS pages", requiredCapability: "manage_pages" },
      { title: "Navigation", href: "/admin/content/navigation", icon: Route, description: "Menus and links", requiredCapability: "manage_pages" },
      { title: "News", href: "/admin/content/news", icon: Newspaper, description: "Posts and announcements", requiredCapability: "manage_pages" },
      { title: "Rules", href: "/admin/content/rules", icon: BookOpen, description: "Rulesets and documents", requiredCapability: "manage_pages" }
    ]
  },
  {
    title: "Competition",
    items: [
      { title: "Divisions", href: "/admin/competition/divisions", icon: Landmark, description: "Division structure", requiredCapability: "manage_divisions" },
      { title: "Competitions", href: "/admin/competition/competitions", icon: Swords, description: "Formats and stages", requiredCapability: "manage_competitions" },
      { title: "Teams", href: "/admin/competition/teams", icon: Users, description: "Season participation", requiredCapability: "manage_teams" },
      { title: "Matches", href: "/admin/competition/matches", icon: ClipboardList, description: "Results and reports", requiredCapability: "enter_results" },
      { title: "Standings", href: "/admin/competition/standings", icon: BarChart3, description: "Tables and rankings", requiredCapability: "manage_standings" },
      { title: "Brackets", href: "/admin/competition/brackets", icon: Boxes, description: "Advancement paths", requiredCapability: "manage_brackets" }
    ]
  },
  {
    title: "Media",
    items: [
      { title: "Library", href: "/admin/media", icon: Library, description: "All media assets", requiredCapability: "manage_media" },
      { title: "Logos", href: "/admin/media/logos", icon: ImageIcon, description: "Brand and team logos", requiredCapability: "manage_media" },
      { title: "Documents", href: "/admin/media/documents", icon: ScrollText, description: "PDFs and files", requiredCapability: "manage_media" }
    ]
  },
  {
    title: "Design",
    items: [
      { title: "Themes", href: "/admin/design/themes", icon: Palette, description: "Theme tokens", requiredCapability: "manage_themes" },
      { title: "Branding", href: "/admin/design/branding", icon: Brush, description: "Logos and visual identity", requiredCapability: "manage_themes" }
    ]
  },
  {
    title: "Hall of Fame",
    items: [{ title: "Hall of Fame", href: "/admin/hall-of-fame", icon: Medal, description: "Champions, awards, records", requiredCapability: "manage_hall_of_fame" }]
  },
  {
    title: "Administration",
    items: [
      { title: "Users", href: "/admin/settings/users", icon: Users, description: "Admin users", requiredCapability: "manage_users" },
      { title: "Roles", href: "/admin/settings/roles", icon: Shield, description: "Permissions and scopes", requiredCapability: "manage_permissions" },
      { title: "Audit Log", href: "/admin/settings/audit-log", icon: ListTree, description: "Security history", requiredCapability: "view_audit_log" },
      { title: "Settings", href: "/admin/settings", icon: Settings, description: "Global platform settings", requiredCapability: "manage_settings" }
    ]
  }
];

export const adminPageMap = new Map(
  adminNavigation.flatMap((group) =>
    group.items.map((item) => [
      item.href,
      {
        ...item,
        group: group.title
      }
    ])
  )
);

export function getAdminPageByPath(path: string) {
  return adminPageMap.get(path);
}

export function getAdminBreadcrumbs(path: string) {
  const page = getAdminPageByPath(path);
  if (!page) return ["AMS Admin"];
  if (path === "/admin") return ["AMS Admin", "Dashboard"];
  return ["AMS Admin", page.group, page.title];
}

export const adminDashboardCards = [
  { title: "Active Season", key: "activeSeason", icon: Gauge },
  { title: "Competitions", key: "competitions", icon: Swords },
  { title: "Teams", key: "teams", icon: Users },
  { title: "Matches", key: "matches", icon: CalendarDays },
  { title: "Pending Results", key: "pendingResults", icon: Megaphone },
  { title: "Recent Changes", key: "recentChanges", icon: Award }
] as const;
