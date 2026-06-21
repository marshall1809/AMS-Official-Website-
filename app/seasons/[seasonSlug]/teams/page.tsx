import { notFound } from "next/navigation";
import { PublicTeamsPage } from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const dynamic = "force-dynamic";

export default async function SeasonTeamsPage({
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

  return <PublicTeamsPage data={data} season={season} />;
}
