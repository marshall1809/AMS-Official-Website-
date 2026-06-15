import type { MetadataRoute } from "next";
import { getCmsData } from "@/lib/cms/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getCmsData();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alliance-master-series.vercel.app";

  return data.routes
    .filter((route) => route.status === "published" && route.targetType === "page")
    .map((route) => ({
      url: new URL(route.path, baseUrl).toString(),
      lastModified: new Date(),
      changeFrequency: route.path === "/" ? "weekly" : "daily",
      priority: route.path === "/" ? 1 : 0.7
    }));
}
