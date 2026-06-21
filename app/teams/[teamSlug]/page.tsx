import { notFound } from "next/navigation";
import {
  PublicTeamProfile,
  currentPublicSeason,
  findSeasonTeamEntry
} from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const dynamic = "force-dynamic";

export default async function CurrentTeamProfilePage({
  params
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  const data = await getCmsData();
  const season = currentPublicSeason(data);

  if (!season) notFound();

  const entry = findSeasonTeamEntry(data, season.id, teamSlug);
  if (!entry) notFound();

  return <PublicTeamProfile data={data} season={season} entry={entry} />;
}
