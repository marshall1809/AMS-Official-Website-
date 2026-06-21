import { permanentRedirect } from "next/navigation";

export default async function RemovedSeasonSchedulePage({
  params
}: {
  params: Promise<{ seasonSlug: string }>;
}) {
  const { seasonSlug } = await params;
  permanentRedirect(`/seasons/${seasonSlug}/bracket`);
}
