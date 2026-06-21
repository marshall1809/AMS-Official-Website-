import { PublicInfoPage } from "@/components/cms/public-rules-page";
import { currentPublicSeason } from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const metadata = {
  title: "Info | Alliance Master Series",
  description: "Official information and documents for the current Alliance Master Series Season."
};

export const dynamic = "force-dynamic";

export default async function CurrentInfoPage() {
  const data = await getCmsData();
  return <PublicInfoPage data={data} season={currentPublicSeason(data)} />;
}
