"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type GalleryImage = { url: string; width: number; height: number };

const SIZES = "(min-width: 1024px) 476px, (min-width: 768px) 50vw, 100vw";

/**
 * Product photos on the detail page: a swipeable scroll-snap strip with a
 * "Foto 2 de 4" counter on phones, and thumbnails under it from `md:`.
 */
export function ProductGallery({
  images,
  name,
  soldOut = false,
}: {
  images: GalleryImage[];
  name: string;
  soldOut?: boolean;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const many = images.length > 1;

  function onScroll() {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    setCurrent(Math.min(images.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }

  function show(index: number) {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setCurrent(index);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        ref={strip}
        onScroll={many ? onScroll : undefined}
        role={many ? "region" : undefined}
        aria-label={many ? `Fotos de ${name}` : undefined}
        tabIndex={many ? 0 : undefined}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-md bg-green-100 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <div key={img.url} className="relative aspect-[4/3] w-full flex-none snap-center">
            <Image
              src={img.url}
              alt={i === 0 ? name : `${name}, foto ${i + 1}`}
              fill
              sizes={SIZES}
              // The cover is the largest element above the fold (LCP).
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              className={`object-cover ${soldOut ? "opacity-45" : ""}`}
            />
          </div>
        ))}
      </div>

      {many ? (
        <>
          <p className="text-center text-body-sm text-ink-muted md:hidden" aria-live="polite">
            Foto {current + 1} de {images.length}
          </p>
          <div className="hidden gap-2 md:flex">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => show(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                className={`relative aspect-[4/3] w-16 flex-none overflow-hidden rounded-sm border-2 bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${
                  i === current ? "border-green-600" : "border-line hover:border-ink-muted"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
