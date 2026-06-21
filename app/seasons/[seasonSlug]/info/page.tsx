import { notFound } from "next/navigation";
import { PublicInfoPage } from "@/components/cms/public-rules-page";
import { getCmsData } from "@/lib/cms/repository";

export const dynamic = "force-dynamic";

export default async function SeasonInfoPage({
  params
}: {
  params: Promise<{ seasonSlug: string }>;
}) {
  const { seasonSlug } = await params;
  const data = await getCmsData();
  const season = data.seasons.find(
    (item) => item.slug === seasonSlug && item.status !== "deleted"
  );

  if (!season) notFound();

  return <PublicInfoPage data={data} season={season} />;
}
