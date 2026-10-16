"use client";

import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useId, useMemo, useState, useTransition, type ChangeEvent } from "react";
import { Button, buttonClassName } from "@/components/agrostore";
import { Leaf } from "@/components/agrostore/leaf";
import { FormAlert } from "@/components/form-alert";
import { removeAvatar, setAvatar } from "@/src/app/vendor/cuenta/actions";
import { avatarUploader } from "@/src/lib/images/upload-photo";

type Notice = { tone: "success" | "error"; text: string } | null;

/** Mi cuenta (seller): pick a photo → resized and uploaded → saved right away. */
export function AvatarForm({ sellerId, initialUrl }: { sellerId: number; initialUrl: string | null }) {
  const inputId = useId();
  const upload = useMemo(() => avatarUploader(sellerId), [sellerId]);
  const [url, setUrl] = useState(initialUrl);
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, startSaving] = useTransition();
  const busy = progress !== null || saving;

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNotice(null);
    setProgress(0);
    let uploaded: { url: string; pathname: string };
    try {
      uploaded = await upload(file, setProgress);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No pudimos subir la foto." });
      return;
    } finally {
      setProgress(null);
    }
    startSaving(async () => {
      const result = await setAvatar({ url: uploaded.url, pathname: uploaded.pathname });
      if (result.ok) {
        setUrl(result.url);
        setNotice({ tone: "success", text: "Foto de perfil actualizada." });
      } else {
        setNotice({ tone: "error", text: result.message });
      }
    });
  }

  function onRemove() {
    setNotice(null);
    startSaving(async () => {
      const result = await removeAvatar();
      if (result.ok) {
        setUrl(null);
        setNotice({ tone: "success", text: "Quitamos tu foto de perfil." });
      } else {
        setNotice({ tone: "error", text: result.message });
      }
    });
  }

  const status =
    progress !== null ? `Subiendo foto… ${Math.round(progress)}%` : saving ? "Guardando…" : null;

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="flex max-w-[560px] flex-col gap-4 rounded-md border border-line bg-surface p-4 md:p-6"
    >
      <h2 id={`${inputId}-title`} className="text-title text-ink">
        Foto de perfil
      </h2>
      {notice ? <FormAlert tone={notice.tone}>{notice.text}</FormAlert> : null}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex size-24 flex-none items-center justify-center overflow-hidden rounded-pill bg-green-100">
          {url ? (
            <Image src={url} alt="Tu foto de perfil" fill sizes="96px" className="object-cover" />
          ) : (
            <Leaf size={40} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-body-sm text-ink-muted">
            Aparece junto al nombre de tu finca en tus productos. Usa una foto cuadrada o la recortamos al centro.
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              className={`${buttonClassName({ variant: "secondary" })} relative min-h-11 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-green-600 ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
            >
              <ImagePlus size={18} aria-hidden="true" />
              <span>{url ? "Cambiar foto" : "Agregar foto"}</span>
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={onPick}
                className="absolute inset-0 size-full cursor-pointer text-[16px] opacity-0"
              />
            </label>
            {url ? (
              <Button variant="ghost" className="min-h-11" disabled={busy} onClick={onRemove}>
                Quitar foto
              </Button>
            ) : null}
          </div>
          {status ? (
            <p className="text-body-sm text-ink-muted" aria-live="polite">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
