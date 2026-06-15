import { notFound, permanentRedirect, redirect } from "next/navigation";
import { mergeThemes } from "@/lib/cms/theme";
import type { CmsData, ResolvedRoute } from "@/lib/cms/types";

export function normalizePath(parts?: string[]) {
  const path = `/${(parts ?? []).filter(Boolean).join("/")}`;
  return path === "/" ? path : path.replace(/\/+$/, "");
}

export function resolveRoute(data: CmsData, path: string): ResolvedRoute {
  const normalizedPath = path === "/" ? "/" : path.replace(/\/+$/, "");
  const redirectRecord = data.redirects.find(
    (item) => item.isActive && item.sourcePath === normalizedPath
  );

  if (redirectRecord) {
    return {
      kind: "redirect",
      destination: redirectRecord.destinationPath,
      permanent: redirectRecord.statusCode === 301 || redirectRecord.statusCode === 308
    };
  }

  const route = data.routes.find((item) => item.path === normalizedPath);
  if (!route) return { kind: "not_found" };
  if (route.status === "gone" || route.targetType === "gone") return { kind: "gone" };
  if (route.status === "deleted" && route.redirectTo) {
    return { kind: "redirect", destination: route.redirectTo, permanent: true };
  }
  if (route.status === "deleted") return { kind: "gone" };

  if (route.targetType !== "page" || !route.targetId) return { kind: "not_found" };

  const page = data.pages.find((item) => item.id === route.targetId);
  if (!page || page.status === "deleted") return { kind: "gone" };
  if (page.status !== "published") return { kind: "not_found" };

  const season = page.seasonId
    ? data.seasons.find((item) => item.id === page.seasonId && item.status !== "deleted")
    : undefined;

  const globalTheme = data.themes.find((item) => item.scope === "global") ?? data.themes[0];
  const seasonTheme = season?.themeId
    ? data.themes.find((item) => item.id === season.themeId)
    : undefined;

  return {
    kind: "page",
    page,
    season,
    theme: mergeThemes(globalTheme, seasonTheme)
  };
}

export function handleResolvedRoute(resolved: ResolvedRoute) {
  if (resolved.kind === "redirect") {
    if (resolved.permanent) permanentRedirect(resolved.destination);
    redirect(resolved.destination);
  }

  if (resolved.kind === "not_found") notFound();

  return null;
}
