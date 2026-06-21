import { PublicHomepage } from "@/components/cms/public-homepage";
import { getCmsData } from "@/lib/cms/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const data = await getCmsData();

  return {
    title: data.siteSettings.defaultTitle || data.siteSettings.siteName,
    description: data.siteSettings.defaultDescription
  };
}

export default async function HomePage() {
  return <PublicHomepage data={await getCmsData()} />;
}
