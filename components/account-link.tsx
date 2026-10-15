import { ButtonLink } from "@/components/agrostore";
import { getCurrentUser } from "@/src/lib/dal";
import { ROLE_HOME } from "@/src/lib/roles";

/** Header account button; reads the session, so render it inside <Suspense>. */
export async function AccountLink() {
  const user = await getCurrentUser();
  if (!user) return <SignInLink />;
  return (
    <ButtonLink href={ROLE_HOME[user.role]} variant="secondary" size="sm">
      {user.role === "admin" ? "Admin" : "Mi panel"}
    </ButtonLink>
  );
}

export function SignInLink() {
  return (
    <ButtonLink href="/ingresar" variant="secondary" size="sm">
      Ingresar
    </ButtonLink>
  );
}
