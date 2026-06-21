import { PublicBracketPage } from "@/components/cms/public-competition";
import { currentPublicSeason } from "@/components/cms/public-teams";
import { getCmsData } from "@/lib/cms/repository";

export const metadata = {
  title: "Bracket | Alliance Master Series",
  description: "Knockout bracket for the current Alliance Master Series Season."
};

export const dynamic = "force-dynamic";

export default async function CurrentBracketPage() {
  const data = await getCmsData();
  return <PublicBracketPage data={data} season={currentPublicSeason(data)} />;
}
