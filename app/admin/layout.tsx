import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminFrame } from "@/components/admin/admin-frame";
import { requireAdminAccess } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "AMS Admin"
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await requireAdminAccess("view_admin");

  return <AdminFrame access={access}>{children}</AdminFrame>;
}
