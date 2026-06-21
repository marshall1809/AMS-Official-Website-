import type { CSSProperties } from "react";

export type AppRole =
  | "super_admin"
  | "admin"
  | "designer"
  | "tournament_manager"
  | "content_manager"
  | "media_manager"
  | "viewer";

export type EntityStatus = "draft" | "published" | "archived" | "deleted";
export type SeasonStatus = "draft" | "setup" | "ready" | "active" | "finished" | "archived" | "deleted";
export type TeamParticipationStatus = "active" | "inactive" | "eliminated" | "archived";
export type LegacyTeamParticipationStatus = "confirmed" | "pending" | "withdrawn";
export type MatchStatus = "scheduled" | "live" | "completed" | "postponed" | "cancelled";
export type StageType = "group" | "single_elimination" | "double_elimination";
export type RouteTargetType = "page" | "season" | "team" | "player" | "news" | "redirect" | "gone";

export type ThemeTokens = {
  colorBg: string;
  colorBgSoft: string;
  colorPanel: string;
  colorPanelStrong: string;
  colorText: string;
  colorTextMuted: string;
  colorTextSoft: string;
  colorAccent: string;
  colorAccentStrong: string;
  colorBorder: string;
  colorSuccess: string;
  colorDanger: string;
  fontDisplay: string;
  fontBody: string;
  radiusCard: string;
  radiusButton: string;
  shadowPanel: string;
  buttonTransform: string;
  backgroundTexture: "none" | "grid";
};

export type ThemeRecord = {
  id: string;
  scope: "global" | "season";
  seasonId?: string;
  name: string;
  tokens: ThemeTokens;
};

export type SiteSettings = {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  contactLabel?: string;
  contactUrl?: string;
  footerText: string;
  logoText: string;
  logoSubtext: string;
  logoImageUrl?: string;
};

export type SeasonRecord = {
  id: string;
  name: string;
  slug: string;
  status: SeasonStatus;
  themeId?: string;
  launchLabel?: string;
  mapName?: string;
  matchFormat?: string;
  minTeams?: number;
  summary?: string;
};

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  scope: "global" | "season";
  seasonId?: string;
  sortOrder: number;
  isVisible: boolean;
};

export type RouteRecord = {
  id: string;
  path: string;
  status: EntityStatus | "gone";
  targetType: RouteTargetType;
  targetId?: string;
  redirectTo?: string;
  statusCode?: 301 | 302 | 307 | 308 | 410;
};

export type RedirectRecord = {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: 301 | 302 | 307 | 308;
  isActive: boolean;
};

export type PageScope = "global" | "season";

export type PageBlockType =
  | "announcement"
  | "hero"
  | "text"
  | "image"
  | "image_text"
  | "news_list"
  | "match_list"
  | "team_list"
  | "bracket_embed"
  | "rules_block"
  | "sponsor_strip"
  | "cta"
  | "stat_cards"
  | "faq"
  | "season_list";

export type PageBlock = {
  id: string;
  type: PageBlockType;
  sortOrder: number;
  isVisible?: boolean;
  content: Record<string, unknown>;
};

export type PageRecord = {
  id: string;
  title: string;
  slug: string;
  status: EntityStatus;
  scope: PageScope;
  seasonId?: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks: PageBlock[];
};

export type MediaAsset = {
  id: string;
  bucket: string;
  path: string;
  title?: string;
  altText?: string;
  publicUrl?: string;
};

export type TeamRecord = {
  id: string;
  slug: string;
  name: string;
  tag?: string;
  logoText?: string;
  defaultLogoId?: string;
  logoAssetId?: string;
  description?: string;
  socialLinks?: Record<string, string>;
};

export type SeasonTeamRecord = {
  id?: string;
  seasonId: string;
  teamId: string;
  seed?: number;
  status: TeamParticipationStatus | LegacyTeamParticipationStatus;
  groupName?: string;
  logoAssetId?: string;
  tag?: string;
  displayName?: string;
};

export type PlayerRecord = {
  id: string;
  slug: string;
  name: string;
  handle: string;
  role?: string;
  teamId?: string;
  seasonId?: string;
};

export type TournamentRecord = {
  id: string;
  seasonId: string;
  name: string;
  slug: string;
  status: EntityStatus | "active";
};

export type StageRecord = {
  id: string;
  tournamentId: string;
  name: string;
  type: StageType;
  sortOrder: number;
};

export type MatchRecord = {
  id: string;
  seasonId: string;
  tournamentId?: string;
  stageId?: string;
  title: string;
  status: MatchStatus;
  startsAt?: string | null;
  roundLabel?: string;
  bracketPosition?: number;
  winnerTeamId?: string;
  nextMatchId?: string;
  nextMatchSlot?: 1 | 2;
  streamUrl?: string;
  vodUrl?: string;
  report?: string;
};

export type MatchParticipantRecord = {
  matchId: string;
  teamId?: string | null;
  slot: 1 | 2;
  score?: number | null;
  result?: string | null;
};

export type BracketEdgeRecord = {
  id: string;
  fromMatchId: string;
  outcome: "winner" | "loser";
  toMatchId: string;
  toSlot: 1 | 2;
};

export type NewsPostRecord = {
  id: string;
  seasonId?: string;
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  status: EntityStatus;
  publishedAt?: string;
  href?: string;
};

export type RulesetRecord = {
  id: string;
  seasonId?: string;
  title: string;
  status: EntityStatus;
  body: string;
  pdfAssetId?: string;
};

export type SponsorRecord = {
  id: string;
  seasonId?: string;
  name: string;
  url?: string;
  logoText?: string;
  logoAssetId?: string;
  isActive: boolean;
  sortOrder: number;
};

export type CmsData = {
  siteSettings: SiteSettings;
  themes: ThemeRecord[];
  seasons: SeasonRecord[];
  navigationItems: NavigationItem[];
  routes: RouteRecord[];
  redirects: RedirectRecord[];
  pages: PageRecord[];
  mediaAssets: MediaAsset[];
  teams: TeamRecord[];
  seasonTeams: SeasonTeamRecord[];
  players: PlayerRecord[];
  tournaments: TournamentRecord[];
  stages: StageRecord[];
  matches: MatchRecord[];
  matchParticipants: MatchParticipantRecord[];
  bracketEdges: BracketEdgeRecord[];
  newsPosts: NewsPostRecord[];
  rulesets: RulesetRecord[];
  sponsors: SponsorRecord[];
};

export type ResolvedRoute =
  | {
      kind: "page";
      page: PageRecord;
      season?: SeasonRecord;
      theme: ThemeRecord;
    }
  | {
      kind: "redirect";
      destination: string;
      permanent: boolean;
    }
  | {
      kind: "gone";
    }
  | {
      kind: "not_found";
    };

export type ThemeStyle = CSSProperties & Record<`--${string}`, string>;
