import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/src/db/schema";
import { auth } from "./auth";
import { isRole, ROLE_HOME } from "./roles";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  farmName: string | null;
};

/** The signed-in admin or seller, read once per request. Null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  if (!isRole(user.role) || user.banned) return null;
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    farmName: user.farmName ?? null,
  };
});

/**
 * Authorization gate for pages and server actions. Call it first.
 * Signed out → /ingresar (with `next`), wrong role → that role's home.
 */
export async function requireRole(role: Role, from?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(from ? `/ingresar?next=${encodeURIComponent(from)}` : "/ingresar");
  }
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}
