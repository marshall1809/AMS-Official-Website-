import { PublicSchedulePage } from "@/components/cms/public-competition";
import { currentPublicSeason } from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const metadata = {
  title: "Schedule | Alliance Master Series",
  description: "Match schedule for the current Alliance Master Series Season."
};

export const dynamic = "force-dynamic";

export default async function CurrentSchedulePage() {
  const data = await getCmsData();
  return <PublicSchedulePage data={data} season={currentPublicSeason(data)} />;
}
