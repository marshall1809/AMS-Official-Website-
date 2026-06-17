import { notFound } from "next/navigation";
import { AdminPlaceholderPage } from "@/components/admin/admin-page";
import { getAdminPageByPath } from "@/lib/admin/navigation";

export const dynamic = "force-dynamic";

type AdminPathPageProps = {
  params: Promise<{ path: string[] }>;
};

export async function generateMetadata({ params }: AdminPathPageProps) {
  const resolvedParams = await params;
  const href = `/admin/${resolvedParams.path.join("/")}`;
  const page = getAdminPageByPath(href);

  return {
    title: page ? `${page.title} | AMS Admin` : "AMS Admin"
  };
}

export default async function AdminPathPage({ params }: AdminPathPageProps) {
  const resolvedParams = await params;
  const href = `/admin/${resolvedParams.path.join("/")}`;
  const page = getAdminPageByPath(href);

  if (!page) {
    notFound();
  }

  return <AdminPlaceholderPage page={page} />;
}
