import { permanentRedirect } from "next/navigation";

export default function LegacyRulesPage() {
  permanentRedirect("/info");
}
