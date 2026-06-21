import { notFound } from "next/navigation";
import { PublicBracketPage } from "@/components/cms/public-competition";
import { getCmsData } from "@/lib/cms/repository";

export const dynamic = "force-dynamic";

export default async function SeasonBracketPage({
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

  return <PublicBracketPage data={data} season={season} />;
}
