import { PublicRulesPage } from "@/components/cms/public-rules-page";
import { getCmsData } from "@/lib/cms/repository";

export const metadata = {
  title: "Official Rules | Alliance Master Series",
  description: "Official competition rules for the current Alliance Master Series Season."
};

export const dynamic = "force-dynamic";

export default async function CurrentRulesPage() {
  const data = await getCmsData();
  const season =
    data.seasons.find((item) => item.status === "active") ??
    data.seasons.find((item) => item.status === "ready") ??
    data.seasons.find((item) => item.status === "finished") ??
    data.seasons.find((item) => item.status !== "archived" && item.status !== "deleted");

  return <PublicRulesPage data={data} season={season} />;
}
