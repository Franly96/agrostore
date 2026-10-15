import type { Role } from "@/src/db/schema";

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/vendedores",
  seller: "/vendor/productos",
};

const ROLE_AREAS: Record<Role, string> = { admin: "/admin", seller: "/vendor" };

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "seller";
}

/**
 * Returns `next` only when it is a same-site path the role may open,
 * otherwise the role's home. Blocks open redirects such as "//evil.com".
 */
export function safeNext(next: unknown, role: Role): string {
  if (typeof next !== "string") return ROLE_HOME[role];
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return ROLE_HOME[role];
  }
  const area = ROLE_AREAS[role];
  if (next === area || next.startsWith(`${area}/`) || next.startsWith(`${area}?`)) {
    return next;
  }
  return ROLE_HOME[role];
}
