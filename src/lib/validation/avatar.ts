import { z } from "zod";

export const AVATAR_MSG = "La foto no es válida. Súbela de nuevo.";

/** The uploaded profile photo as the browser reports it. Ownership is checked in the action. */
export const avatarSchema = z.object({
  url: z.string({ error: AVATAR_MSG }).min(1, { error: AVATAR_MSG }).max(500, { error: AVATAR_MSG }),
  pathname: z.string({ error: AVATAR_MSG }).min(1, { error: AVATAR_MSG }).max(300, { error: AVATAR_MSG }),
});
