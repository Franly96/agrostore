import { ButtonLink } from "@/components/agrostore";
import { getCurrentUser } from "@/src/lib/dal";
import { ROLE_HOME } from "@/src/lib/roles";

/**
 * Header link to the signed-in user's area ("Mi panel" / "Admin"). Renders nothing
 * for visitors: there is no sign-in button, /auth/login is reached by URL only.
 * Returns its own <li> so a signed-out header has no empty flex item. Reads the
 * session, so render it inside <Suspense> in a <ul>.
 */
export async function AccountLink() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <li>
      <ButtonLink href={ROLE_HOME[user.role]} variant="secondary" size="sm">
        {user.role === "admin" ? "Admin" : "Mi panel"}
      </ButtonLink>
    </li>
  );
}
