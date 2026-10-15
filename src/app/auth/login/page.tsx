import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/src/lib/dal";
import { ROLE_HOME } from "@/src/lib/roles";
import { siteConfig } from "@/src/lib/site-config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function Page({ searchParams }: PageProps<"/auth/login">) {
  return (
    <main>
      <h1 className="text-heading text-ink">Ingresar</h1>
      <p className="mt-2 text-body-sm text-ink-muted">Para vendedores y administradores.</p>
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-body-sm text-ink-muted">
        ¿Olvidaste tu contraseña? Escríbenos por WhatsApp al{" "}
        <a
          href={siteConfig.contact.whatsappLink}
          className="font-semibold text-green-600 hover:text-green-800"
        >
          {siteConfig.contact.whatsapp}
        </a>
        .
      </p>
    </main>
  );
}

async function LoginGate({ searchParams }: { searchParams: PageProps<"/auth/login">["searchParams"] }) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

function LoginFormSkeleton() {
  return (
    <div className="mt-6 flex animate-pulse flex-col gap-4" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="h-5 w-20 rounded-sm bg-line" />
          <div className="h-11 rounded-sm bg-line" />
        </div>
      ))}
      <div className="h-10 rounded-pill bg-line" />
    </div>
  );
}
