import type { Metadata } from "next";
import { AccountPage } from "@/components/account-page";

export const metadata: Metadata = { title: "Mi cuenta" };

export default function Page() {
  return <AccountPage role="seller" path="/vendor/cuenta" />;
}
