import type { Metadata } from "next";
import { ButtonLink } from "@/components/agrostore";
import { siteConfig } from "@/src/lib/site-config";

export const metadata: Metadata = { title: "Vender en Agrostore" };

export default function Page() {
  const { contact } = siteConfig;
  const rows = [
    { label: "WhatsApp", value: contact.whatsapp, href: contact.whatsappLink },
    { label: "Teléfono", value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}` },
    { label: "Correo", value: contact.email, href: `mailto:${contact.email}` },
    { label: "Horario", value: contact.hours },
  ];

  return (
    <main>
      <h1 className="text-heading text-ink">Vender en Agrostore</h1>
      <p className="mt-2 text-body text-ink-muted">
        Las cuentas de vendedor las crea el equipo de Agrostore. Escríbenos y te ayudamos a
        publicar tus productos.
      </p>
      <dl className="mt-6 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col">
            <dt className="text-label text-ink-muted">{r.label}</dt>
            <dd className="text-body text-ink">
              {r.href ? (
                <a href={r.href} className="font-semibold text-green-600 hover:text-green-800">
                  {r.value}
                </a>
              ) : (
                r.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <ButtonLink href="/ingresar" variant="secondary" fullWidth className="mt-6">
        Ya tengo cuenta
      </ButtonLink>
    </main>
  );
}
