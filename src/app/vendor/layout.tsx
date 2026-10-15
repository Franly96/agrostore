import type { ReactNode } from "react";
import { SELLER_LINKS } from "@/components/dashboard-links";
import { DashboardShell } from "@/components/dashboard-shell";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell title="Panel de vendedor" links={SELLER_LINKS}>
      {children}
    </DashboardShell>
  );
}
