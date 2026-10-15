import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { adminPlugin, authOptions } from "./auth-options";

export const auth = betterAuth({
  ...authOptions,
  plugins: [adminPlugin, nextCookies()], // nextCookies must stay last
});
