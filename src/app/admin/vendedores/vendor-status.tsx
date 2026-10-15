"use client";

import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/agrostore";

/**
 * Deactivate / reactivate with an inline confirmation step (no browser dialog).
 * The page keys this component by `banned`, so the confirm step starts fresh
 * after each status change.
 */
export function VendorStatus({
  banned,
  setActive,
}: {
  banned: boolean;
  setActive: (active: boolean) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(active: boolean) {
    startTransition(async () => {
      await setActive(active);
    });
  }

  return (
    <section className="ag-form max-w-none md:max-w-[560px]">
      <h2 className="ag-form-title flex items-center gap-2">
        Estado <Badge tone={banned ? "danger" : "green"}>{banned ? "Desactivado" : "Activo"}</Badge>
      </h2>
      {banned ? (
        <>
          <p className="text-body-sm text-ink-muted">
            El vendedor no puede ingresar y sus productos no aparecen en la tienda.
          </p>
          <div className="ag-form-actions">
            <Button variant="secondary" disabled={pending} onClick={() => run(true)}>
              {pending ? "Reactivando…" : "Reactivar vendedor"}
            </Button>
          </div>
        </>
      ) : confirming ? (
        <>
          <p className="text-body-sm font-semibold text-danger">
            ¿Desactivar este vendedor? Se cerrarán sus sesiones y sus productos dejarán de
            aparecer en la tienda. Puedes reactivarlo después.
          </p>
          <div className="ag-form-actions">
            <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => run(false)}>
              {pending ? "Desactivando…" : "Sí, desactivar"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-body-sm text-ink-muted">
            Desactívalo si deja de vender en Agrostore. Sus datos y productos se conservan.
          </p>
          <div className="ag-form-actions">
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              Desactivar vendedor
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
