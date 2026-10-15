import type { z } from "zod";

export type ActionState<F extends string = string> = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<F, string>>;
};

export const idleState: ActionState = { status: "idle" };

/** First error message per field, from a failed Zod parse. */
export function fieldErrorsFrom<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key as F] = issue.message;
  }
  return out;
}
