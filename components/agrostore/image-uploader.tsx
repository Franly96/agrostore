"use client";

import { ArrowLeft, ArrowRight, ImagePlus, RotateCcw, Star, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { buttonClassName } from "./button";
import { cx } from "./format";

export type UploadedPhoto = { url: string; pathname: string; width: number; height: number };

/** Resizes and uploads one file; reports progress as 0–100. Throws an Error with a Spanish message. */
export type PhotoUploader = (
  file: File,
  onProgress: (percent: number) => void,
) => Promise<UploadedPhoto>;

export type ImageUploaderProps = {
  initialPhotos?: UploadedPhoto[];
  uploadPhoto: PhotoUploader;
  /** Finished photos in display order; the first one is the cover. */
  onChange: (photos: UploadedPhoto[]) => void;
  /** True while any photo is still uploading or has failed (block saving). */
  onBusyChange?: (busy: boolean) => void;
  max?: number;
  error?: string;
  className?: string;
};

type Item = {
  id: string;
  status: "uploading" | "done" | "error";
  progress: number;
  preview: string;
  photo?: UploadedPhoto;
  file?: File;
  error?: string;
};

const FAILED = "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.";

/** Photo picker for the seller form: previews, progress, retry, cover, reorder and remove. */
export function ImageUploader({
  initialPhotos = [],
  uploadPhoto,
  onChange,
  onBusyChange,
  max = 5,
  error,
  className,
}: ImageUploaderProps) {
  const inputId = useId();
  const counter = useRef(0);
  const objectUrls = useRef(new Set<string>());
  const [items, setItems] = useState<Item[]>(() =>
    initialPhotos.map((photo) => ({
      id: `saved-${photo.pathname}`,
      status: "done",
      progress: 100,
      preview: photo.url,
      photo,
    })),
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    onChange(items.flatMap((i) => (i.status === "done" && i.photo ? [i.photo] : [])));
    onBusyChange?.(items.some((i) => i.status !== "done"));
  }, [items, onChange, onBusyChange]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const patch = useCallback((id: string, changes: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }, []);

  const start = useCallback(
    (id: string, file: File) => {
      uploadPhoto(file, (progress) => patch(id, { progress }))
        .then((photo) => patch(id, { status: "done", progress: 100, photo, file: undefined }))
        .catch((e: unknown) =>
          patch(id, { status: "error", error: e instanceof Error && e.message ? e.message : FAILED }),
        );
    },
    [uploadPhoto, patch],
  );

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const room = max - items.length;
    setNotice(files.length > room ? `Solo puedes subir hasta ${max} fotos.` : null);
    const added = files.slice(0, Math.max(room, 0)).map((file): Item => {
      const preview = URL.createObjectURL(file);
      objectUrls.current.add(preview);
      return { id: `new-${counter.current++}`, status: "uploading", progress: 0, preview, file };
    });
    if (added.length === 0) return;
    setItems((prev) => [...prev, ...added]);
    added.forEach((item) => start(item.id, item.file as File));
  }

  function retry(item: Item) {
    if (!item.file) return;
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    start(item.id, item.file);
  }

  function remove(id: string) {
    setNotice(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function move(from: number, to: number) {
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  const full = items.length >= max;

  return (
    <div className={cx("ag-photos", className)}>
      <div className="ag-photos-head">
        <span className="ag-field-label" id={`${inputId}-label`}>
          Fotos <span className="ag-photos-count">({items.length} de {max})</span>
        </span>
        {!full ? (
          <label className={cx(buttonClassName({ variant: "secondary" }), "ag-photos-add")}>
            <ImagePlus size={18} aria-hidden="true" />
            <span>Agregar fotos</span>
            <input
              id={inputId}
              className="ag-photos-input"
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              aria-labelledby={`${inputId}-label`}
            />
          </label>
        ) : null}
      </div>
      <p className="ag-field-msg">La primera foto es la portada. Se reducen automáticamente antes de subir.</p>

      {items.length > 0 ? (
        <ul className="ag-photos-grid">
          {items.map((item, index) => {
            const n = index + 1;
            return (
              <li key={item.id} className={cx("ag-photo", item.status === "error" && "ag-photo-error")}>
                <div className="ag-photo-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt={`Foto ${n}`} />
                  {index === 0 ? <span className="ag-photo-cover">Portada</span> : null}
                  {item.status === "uploading" ? (
                    <div
                      className="ag-photo-progress"
                      role="progressbar"
                      aria-label={`Subiendo foto ${n}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(item.progress)}
                    >
                      <span style={{ width: `${item.progress}%` }} />
                    </div>
                  ) : null}
                </div>
                {item.status === "error" ? (
                  <p className="ag-field-msg ag-field-msg-error" role="alert">
                    {item.error}
                  </p>
                ) : null}
                <div className="ag-photo-actions">
                  {item.status === "error" && item.file ? (
                    <button type="button" className="ag-photo-btn" aria-label={`Reintentar foto ${n}`} onClick={() => retry(item)}>
                      <RotateCcw size={18} aria-hidden="true" />
                    </button>
                  ) : null}
                  {item.status === "done" && index > 0 ? (
                    <button type="button" className="ag-photo-btn" aria-label={`Usar foto ${n} como portada`} onClick={() => move(index, 0)}>
                      <Star size={18} aria-hidden="true" />
                    </button>
                  ) : null}
                  {item.status === "done" ? (
                    <>
                      <button type="button" className="ag-photo-btn" aria-label={`Mover foto ${n} a la izquierda`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                        <ArrowLeft size={18} aria-hidden="true" />
                      </button>
                      <button type="button" className="ag-photo-btn" aria-label={`Mover foto ${n} a la derecha`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="ag-photo-btn" aria-label={`Quitar foto ${n}`} onClick={() => remove(item.id)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {notice || error ? (
        <p className="ag-field-msg ag-field-msg-error" role="alert">
          {error ?? notice}
        </p>
      ) : null}
    </div>
  );
}
