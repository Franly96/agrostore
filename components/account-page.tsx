import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { AvatarForm } from "@/components/avatar-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { requireRole } from "@/src/lib/dal";
import type { Role } from "@/src/db/schema";
import { isDisplayableAvatar } from "@/src/lib/images/paths";
import { formatDrPhone } from "@/src/lib/validation/vendor";

/** /vendor/cuenta and /admin/cuenta: profile photo (sellers), read-only profile, change password. */
export function AccountPage({ role, path }: { role: Role; path: string }) {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-heading text-ink">Mi cuenta</h1>
      <Suspense fallback={<div className="h-40 max-w-[560px] animate-pulse rounded-md border border-line bg-surface" />}>
        <Profile role={role} path={path} />
      </Suspense>
    </main>
  );
}

async function Profile({ role, path }: { role: Role; path: string }) {
  const user = await requireRole(role, path);
  const [profile] = await db
    .select({
      name: users.name,
      email: users.email,
      farmName: users.farmName,
      phone: users.phone,
      province: users.province,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, user.id));

  const rows = [
    role === "seller" ? { label: "Finca o negocio", value: profile.farmName } : null,
    { label: "Nombre", value: profile.name },
    { label: "Correo", value: profile.email },
    role === "seller" ? { label: "Teléfono", value: formatDrPhone(profile.phone) } : null,
    role === "seller" ? { label: "Provincia", value: profile.province } : null,
  ].filter((r) => r !== null);

  return (
    <>
      {role === "seller" ? (
        <AvatarForm
          sellerId={user.id}
          initialUrl={isDisplayableAvatar(profile.image, user.id) ? profile.image : null}
        />
      ) : null}
      <section className="max-w-[560px] rounded-md border border-line bg-surface p-4 md:p-6">
        <h2 className="text-title text-ink">Tus datos</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-label text-ink-muted">{r.label}</dt>
              <dd className="text-body text-ink">{r.value || "—"}</dd>
            </div>
          ))}
        </dl>
        {role === "seller" ? (
          <p className="mt-4 text-body-sm text-ink-muted">
            Para cambiar estos datos, contacta al equipo de Agrostore.
          </p>
        ) : null}
      </section>
      <ChangePasswordForm />
    </>
  );
}
