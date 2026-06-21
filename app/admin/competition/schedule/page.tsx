import { redirect } from "next/navigation";

export default function RemovedAdminSchedulePage() {
  redirect("/admin/competition/brackets");
}
