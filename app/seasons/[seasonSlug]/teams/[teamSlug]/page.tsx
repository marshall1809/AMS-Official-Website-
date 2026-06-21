import { notFound } from "next/navigation";
import {
  PublicTeamProfile,
  findSeasonTeamEntry
} from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const dynamic = "force-dynamic";

export default async function SeasonTeamProfilePage({
  params
}: {
  params: Promise<{ seasonSlug: string; teamSlug: string }>;
}) {
  const { seasonSlug, teamSlug } = await params;
  const data = await getCmsData();
  const season = data.seasons.find(
    (item) => item.slug === seasonSlug && item.status !== "deleted"
  );

  if (!season) notFound();

  const entry = findSeasonTeamEntry(data, season.id, teamSlug);
  if (!entry) notFound();

  return <PublicTeamProfile data={data} season={season} entry={entry} />;
}
