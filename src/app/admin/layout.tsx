import type { ReactNode } from "react";
import { ADMIN_LINKS } from "@/components/dashboard-links";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell title="Administración" links={ADMIN_LINKS}>
      {children}
    </DashboardShell>
  );
}
