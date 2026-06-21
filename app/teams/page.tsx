import { PublicTeamsPage, currentPublicSeason } from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const metadata = {
  title: "Teams | Alliance Master Series",
  description: "Teams competing in the current Alliance Master Series Season."
};

export const dynamic = "force-dynamic";

export default async function CurrentTeamsPage() {
  const data = await getCmsData();
  return <PublicTeamsPage data={data} season={currentPublicSeason(data)} />;
}
