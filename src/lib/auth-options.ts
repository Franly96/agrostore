// Shared Better Auth options. The app uses src/lib/auth.ts (adds the Next.js
// cookie plugin and the server-only guard); scripts call createScriptAuth().
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import { db } from "@/src/db";
import * as schema from "@/src/db/schema";

const ac = createAccessControl(defaultStatements);

// Sellers get no admin-plugin permissions; admins get all of them.
export const adminPlugin = admin({
  ac,
  roles: {
    admin: ac.newRole(adminAc.statements),
    seller: ac.newRole({ user: [], session: [] }),
  },
  defaultRole: "seller",
  bannedUserMessage: "Tu cuenta está desactivada. Contacta a Agrostore.",
});

// BETTER_AUTH_URL is set for production (and locally). Preview deployments
// don't set it, so the deployment's own Vercel URL is used instead.
const vercelHosts = [
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
].filter((host): host is string => Boolean(host));

export const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL ?? (vercelHosts[0] ? `https://${vercelHosts[0]}` : undefined),
  trustedOrigins: vercelHosts.map((host) => `https://${host}`),
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  advanced: { database: { generateId: "serial" } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      farmName: { type: "string", required: false, input: false },
      phone: { type: "string", required: false, input: false },
      province: { type: "string", required: false, input: false },
    },
  },
  rateLimit: { enabled: true, storage: "database" },
} satisfies BetterAuthOptions;

export function createScriptAuth() {
  return betterAuth({ ...authOptions, plugins: [adminPlugin] });
}
