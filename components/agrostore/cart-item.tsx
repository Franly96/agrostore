"use client";

import { Button } from "./button";
import { cx, formatRD } from "./format";
import { Leaf } from "./leaf";
import { PriceTag } from "./price-tag";
import { QuantityStepper } from "./quantity-stepper";

export type CartItemProps = {
  name: string;
  /** Unit price in pesos. */
  price: number;
  unit?: string;
  seller?: string;
  quantity: number;
  /** Available stock; caps the stepper. */
  max?: number;
  quantityUnit?: string;
  imageSrc?: string;
  imageAlt?: string;
  onQuantityChange?: (quantity: number) => void;
  onRemove?: () => void;
  className?: string;
};

/** One line in the cart: thumbnail, name, seller, unit price, quantity, subtotal and remove. */
export function CartItem({
  name,
  price,
  unit,
  seller,
  quantity,
  max,
  quantityUnit,
  imageSrc,
  imageAlt,
  onQuantityChange,
  onRemove,
  className,
}: CartItemProps) {
  return (
    <div className={cx("ag-cart-item", className)}>
      <div className="ag-cart-thumb">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- seller photos come from arbitrary hosts
          <img src={imageSrc} alt={imageAlt ?? name} />
        ) : (
          <Leaf size={28} />
        )}
      </div>
      <div className="ag-cart-info">
        <p className="ag-cart-name">{name}</p>
        {seller ? <p className="ag-cart-meta">{seller}</p> : null}
        <PriceTag amount={price} unit={unit} />
      </div>
      <div className="ag-cart-actions">
        <QuantityStepper
          value={quantity}
          min={1}
          max={max}
          unit={quantityUnit}
          onChange={onQuantityChange}
          label={`Cantidad de ${name}`}
        />
        <span className="ag-cart-total" aria-label="Subtotal">
          {formatRD(price * quantity)}
        </span>
        <Button variant="ghost" size="sm" className="min-h-11" onClick={onRemove}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}
