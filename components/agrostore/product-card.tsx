import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "./badge";
import { Button } from "./button";
import { cx } from "./format";
import { Leaf } from "./leaf";
import { PriceTag } from "./price-tag";

export type ProductCardProps = {
  name: string;
  /** Price in pesos. */
  price: number;
  unit?: string;
  originalPrice?: number;
  seller?: string;
  province?: string;
  imageSrc?: string;
  imageAlt?: string;
  /** Photo element (e.g. next/image with `fill`); takes precedence over `imageSrc`. */
  image?: ReactNode;
  badges?: { label: string; tone?: BadgeTone }[];
  soldOut?: boolean;
  /** Makes the whole card a link to this URL. */
  href?: string;
  /** The card's button, e.g. an add-to-cart control. Sold-out cards show a disabled "Agotado" button instead. */
  action?: ReactNode;
  className?: string;
};

/** Catalogue tile: photo, badges, name, seller and province, price and an optional action. */
export function ProductCard({
  name,
  price,
  unit,
  originalPrice,
  seller,
  province,
  imageSrc,
  imageAlt,
  image,
  badges = [],
  soldOut = false,
  href,
  action,
  className,
}: ProductCardProps) {
  const meta = [seller, province].filter(Boolean).join(" · ");
  const footer = soldOut ? (
    <Button fullWidth variant="secondary" disabled>
      Agotado
    </Button>
  ) : (
    action
  );

  return (
    <article className={cx("ag-card", soldOut && "ag-card-soldout", className)}>
      <div className="ag-card-media">
        {image ? (
          image
        ) : imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- seller photos come from arbitrary hosts
          <img src={imageSrc} alt={imageAlt ?? name} loading="lazy" />
        ) : (
          <Leaf />
        )}
        {badges.length > 0 || soldOut ? (
          <div className="ag-card-badges">
            {soldOut ? <Badge tone="danger">Agotado</Badge> : null}
            {badges.map((b) => (
              <Badge key={b.label} tone={b.tone}>
                {b.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ag-card-body">
        <h2 className="ag-card-name">
          {href ? (
            <Link href={href} className="ag-card-link">
              {name}
            </Link>
          ) : (
            name
          )}
        </h2>
        {meta ? <p className="ag-card-meta">{meta}</p> : null}
        <PriceTag amount={price} unit={unit} originalAmount={originalPrice} />
        {footer ? <div className="ag-card-action">{footer}</div> : null}
      </div>
    </article>
  );
}
