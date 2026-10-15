# Spec 003 — Cart, checkout and orders

| | |
|---|---|
| Status | **Reviewed 2026-10-14**: decisions in §10; delivery fees added (§3a) |
| Date | 2026-10-14 |
| Scope | Buyers add products to a cart and place orders without an account; sellers and admins manage those orders. Card payments are outlined for a later phase. |
| Depends on | Spec 001 (roles, `requireRole`, throttle), spec 002 (thumbnails; optional) |

---

## 1. Goals

1. A buyer can add products to a cart from the home grid and the product page, change quantities, and check out **without creating an account**.
2. Payment options at launch: **cash on delivery** and **bank transfer**, with payment details coordinated with each seller over WhatsApp.
3. **Delivery fees are calculated in the app**: each seller sets a fee per province they deliver to, and checkout adds the right fee to each seller's order.
4. A cart with products from several farms becomes **one order per seller**, because each seller delivers separately.
5. Stock is reserved when an order is placed and returned if it's cancelled. No overselling, even with two buyers at the same moment.
6. Sellers see and update **their** orders in `/panel/pedidos`. Admins see all orders in `/admin/pedidos`.
7. Buyers can follow their order's status through a private link, and see "Mis pedidos" on the device they ordered from.

### Non-goals (this spec)

- Buyer accounts, saved addresses, order history across devices.
- Card payments: future work. Phase 5 outlines them; they need a merchant account first.
- Pickup at the farm ("Recoger en la finca"), delivery time slots, and fees by distance or weight. v1 uses one fee per province per seller.
- Automated email/SMS/WhatsApp messages from the system (Q5).
- Taxes (ITBIS) and electronic invoices (e-CF): future work. Prices shown are final prices.
- Returns and refunds flows.

---

## 2. Key decisions

| # | Decision | Why | Rejected alternatives |
|---|---|---|---|
| D1 | **Guest checkout**: name, WhatsApp phone, province, address and reference point | Lowest friction for first-time buyers on phones. The phone is how sellers coordinate anyway. Buyer accounts can be added later without changing orders (a nullable `buyer_id`). | Required buyer accounts: friction plus password resets with no email provider. Phone OTP login: needs an SMS provider and costs money per message. |
| D2 | **Cart in a cookie** (`cart`: `[{productId, qty}]`, max 30 lines), changed only through server actions | Works without JavaScript and survives reloads. The server always recomputes prices from the database, so the cookie holds no prices to tamper with. Reading it is request data, so the header count sits behind `<Suspense>` (like `AccountLink`). | `localStorage`: invisible to the server, so no server-rendered cart page and prices could drift. A database cart: needs a guest identity anyway, and is more writes. |
| D3 | **One checkout, one order per seller** (`checkouts` 1→N `orders`) | Each farm confirms, delivers and gets paid separately. Each seller only ever sees their own order. | One order with mixed sellers: every seller would see the other farms' items and the buyer's whole cart. |
| D4 | **Snapshot items at order time** (`order_items` stores name, unit, unit price) | Later price or name edits don't change past orders. | Joining live `products` rows: history changes when the seller edits. |
| D5 | **Reserve stock in the same transaction as the order**: `UPDATE products SET stock = stock - $qty WHERE id = $id AND (unlimited_stock OR stock >= $qty)`; any line with 0 rows updated rolls back the whole checkout. Cancelling returns the stock. | No overselling, without locks held across requests. The buyer gets a clear "Solo quedan 3 libras" message. | Checking stock and then writing (race condition). Reserving at cart time (abandoned carts would hold stock). |
| D6 | **Price check at submit**: the checkout form posts the unit prices it showed; if any changed, the action re-renders with "Algunos precios cambiaron, revisa tu pedido." | The buyer never pays a price they didn't see. | Silently charging the new price. |
| D7 | **Private order link instead of buyer login**: each checkout gets a short public code (`AG-7K3P9Q`) and a secret token (32 random bytes). Only the token's SHA-256 hash is stored. Status page: `/pedidos/AG-7K3P9Q?t=<token>`. The device keeps its recent orders in an httpOnly cookie for "Mis pedidos". | Guests can follow their order without an account. Without the token, codes can't be enumerated to read other people's addresses. | Lookup by code + phone only: guessable, which exposes addresses. |
| D8 | **WhatsApp click-to-chat links, not the WhatsApp API** (`https://wa.me/1809…?text=…`) | Free, no Meta business verification, and it's how buyers and farms already talk. After checkout the buyer sees one "Enviar pedido a {finca}" button per seller with the order summary and status link prefilled. Sellers get a "Escribir al comprador" button. | WhatsApp Business Platform: verification, templates, per-conversation fees. Can come later for automatic notifications (Q5). |
| D9 | **Bank details are not stored in v1.** For "Transferencia", the seller sends their account details over WhatsApp and marks the order paid when the transfer arrives. | Avoids storing and showing bank account numbers before there's a need. Sellers already do this. | Storing seller bank details for display at checkout: sensitive data, and admins must keep them current. Can be added if sellers ask (Q3). |
| D10 | **Separate statuses for fulfillment and payment**: order status `nuevo → confirmado → en_camino → entregado` (or `cancelado`), and payment status `pendiente → pagado` | Cash on delivery is paid at `entregado`; a transfer can be paid before `confirmado`. One combined status can't express both. | A single status enum. |
| D11 | **Delivery fee per seller and province** (`seller_delivery_zones`), with an optional free-delivery amount per seller | Review decision: fees are calculated in the app. A fee per province matches how farms quote delivery in the DR, and it's simple for sellers to fill in on a phone. Buyers see the total before confirming. | Fees agreed over WhatsApp (rejected in review). Distance-based fees: need addresses geocoded, which is overkill for v1. |

---

## 3. Data model

```
checkouts 1 ──< orders 1 ──< order_items >── products
                   │
                   └── seller_id → users
```

**`checkouts`**: one per buyer submit
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `code` | text unique not null | `AG-` + 6 chars Crockford base32 (no 0/O/1/I confusion) |
| `token_hash` | text not null | SHA-256 of the secret token |
| `buyer_name` | text not null | |
| `buyer_phone` | text not null | 10 digits, DR format (reuses `normalizeDrPhone`) |
| `province` | text not null | from `PROVINCES` |
| `address` | text not null | street, sector, municipality |
| `reference` | text | "Frente al colmado…" |
| `notes` | text | to all sellers |
| `payment_method` | text not null | `contra_entrega` \| `transferencia` |
| `total_cents` | int not null | sum of all orders' totals, delivery included |
| `created_at` | timestamp not null | |

**`orders`**: one per seller in the checkout
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `checkout_id` | int not null → checkouts | |
| `seller_id` | int not null → users | |
| `status` | text not null default `'nuevo'` | `nuevo`, `confirmado`, `en_camino`, `entregado`, `cancelado` |
| `payment_status` | text not null default `'pendiente'` | `pendiente`, `pagado` |
| `subtotal_cents` | int not null | sum of items |
| `delivery_fee_cents` | int not null | snapshot of the seller's fee for the buyer's province (0 when free delivery applies) |
| `total_cents` | int not null | `subtotal_cents + delivery_fee_cents` |
| `cancel_reason` | text | |
| `cancelled_by` | text | `comprador`, `vendedor`, `admin` |
| `created_at`, `updated_at` | timestamp not null | |
| `confirmed_at`, `delivered_at`, `cancelled_at` | timestamp | for timelines |

**`order_items`**
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `order_id` | int not null → orders on delete cascade | |
| `product_id` | int → products (set null on delete) | for stock return |
| `name`, `unit` | text not null | snapshot |
| `unit_price_cents` | int not null | snapshot |
| `quantity` | int not null, 1–999 | |
| `line_total_cents` | int not null | |

**`seller_delivery_zones`**: where each seller delivers and for how much
| Column | Type | Notes |
|---|---|---|
| `seller_id` | int not null → users on delete cascade | |
| `province` | text not null | from `PROVINCES` |
| `fee_cents` | int not null, ≥ 0 | 0 = free delivery to that province |
| `estimated_days` | smallint | optional, e.g. 2 → "Entrega en 1–2 días" |
| | | primary key `(seller_id, province)` |

**`users.free_delivery_over_cents`** (new, nullable): when a seller's order subtotal reaches this amount, delivery is free. Null = never free.

Indexes: `orders(seller_id, status, created_at desc)`, `orders(checkout_id)`, `order_items(order_id)`.

---

## 3a. Delivery fees

- **Seller setup** (`/panel/entregas`): the seller picks the provinces they deliver to and the fee for each. Shortcuts: "Mismo precio para todas" and "Agregar provincias vecinas". Optional free-delivery amount ("Envío gratis desde RD$ …"). Until a seller has at least one zone, their products show "Este vendedor aún no ha configurado sus entregas" and can't be added to the cart.
- **Buyer province**: the cart has a province `Select` (remembered in the `cart` cookie). It's prefilled into `/pagar`, where changing it recalculates the fees.
- **Calculation** (`src/lib/orders/delivery.ts`, pure function, unit-tested): for each seller in the cart, the fee is
  - not available: the seller doesn't deliver to that province;
  - 0: the seller's subtotal is at or above `free_delivery_over_cents`;
  - otherwise: the zone's `fee_cents`.
- **Not available**: the cart and `/pagar` show "{finca} no entrega en {provincia}. Quita sus productos o elige otra provincia." on that seller's group, and "Confirmar pedido" is disabled until it's resolved.
- **Where it shows**:
  - product detail: "Entrega en {n} provincias · desde RD$ {min fee}", or the exact fee once the buyer has picked a province;
  - cart and `/pagar`: subtotal, "Envío" and total per seller, then a grand total;
  - the order: everything above, as stored snapshots.
- **Price check (D6)** covers delivery fees too: if a seller changed a fee between page view and submit, the buyer sees "Algunos precios cambiaron" and reviews again.
- **Admin**: the seller page in `/admin/vendedores/[id]` shows the seller's provinces and fees (read-only).

## 4. Order lifecycle

| From → To | Who | Effect |
|---|---|---|
| (checkout) → `nuevo` | buyer | stock reserved; order shown to the seller |
| `nuevo` → `confirmado` | seller | seller has agreed delivery with the buyer |
| `confirmado` → `en_camino` | seller | optional step |
| `confirmado`/`en_camino` → `entregado` | seller | for cash on delivery, the payment status is set to `pagado` at the same time |
| `nuevo` → `cancelado` | buyer (via the order link) | stock returned |
| `nuevo`/`confirmado`/`en_camino` → `cancelado` | seller or admin (reason required) | stock returned |
| payment `pendiente` → `pagado` | seller | any time before `cancelado` |

Transitions are a fixed map in `src/lib/orders/transitions.ts`. Any other move is rejected. Every change sets the matching timestamp, done in one `UPDATE … WHERE id = $id AND seller_id = $seller AND status = $expected`, so two clicks can't apply it twice.

---

## 5. Routes and screens

All screens use the design system (`CartItem`, `QuantityStepper`, `PriceTag`, `Badge`, `TextField`, `Select`, `Button`) and the responsive rules in `AGENTS.md`.

| URL | Access | Content |
|---|---|---|
| Home grid / `/productos/[id]` | public | "Agregar al carrito" (card button; `QuantityStepper` + button on the detail page). Sold-out products show "Agotado". Adding shows a confirmation with "Ver carrito". |
| `/carrito` | public | Province selector; items **grouped by seller** (`CartItem` with stepper and "Eliminar"); subtotal, delivery fee and total per seller; grand total. Lines whose product is now sold out or gone are flagged. "Continuar" → `/pagar`. Empty state with "Ver productos". |
| `/pagar` | public | Contact and delivery form (name, WhatsApp, province, address, reference, notes), payment method (contra entrega / transferencia), and a summary per seller with subtotal, delivery fee and total, then the grand total. "Confirmar pedido" is disabled while any seller doesn't deliver to the chosen province. |
| `/panel/entregas` | seller | Delivery zones and fees per province; free-delivery amount (§3a) |
| `/pedidos/[code]?t=…` | anyone with the link | Thanks message, per-seller status timeline, items, totals, "Enviar pedido a {finca}" WhatsApp buttons, and "Cancelar pedido" while `nuevo`. A wrong or missing token → 404. |
| `/pedidos` | public | "Mis pedidos en este dispositivo" (from the httpOnly cookie, most recent first) and how to find an order ("Usa el enlace que guardaste o escribe a la finca"). |
| `/panel/pedidos` | seller | Own orders. Filter chips: Nuevos (count) / En curso / Entregados / Cancelados. Cards on phone, table from `md:`. |
| `/panel/pedidos/[id]` | seller (owner) | Buyer contact and address, items, status actions (one primary per step), "Marcar como pagado", cancel with reason, "Escribir al comprador" WhatsApp link |
| `/admin/pedidos` | admin | All orders, filterable by status and seller, searchable by code |
| `/admin/pedidos/[id]` | admin | Read-only detail plus "Cancelar" with reason |

Header: "Carrito" gets a count badge (`<Suspense>`). The buyer "Cuenta" link is removed, since buyers have no accounts; "Mis pedidos" stays. The seller panel nav gets "Pedidos" with a count of `nuevo` orders.

---

## 6. Server actions

Same contract as spec 001: `ActionState`, Zod schemas in `src/lib/validation/`, Spanish messages, `useActionState` with controlled inputs.

| Action | Gate | Notes |
|---|---|---|
| `addToCart(productId, qty)` / `updateCartLine` / `removeCartLine` | public | `parseId`; product exists, active seller, not sold out; caps qty at available stock (unless unlimited) and 999; max 30 lines. Writes the `cart` cookie (`httpOnly`, `sameSite=lax`, `secure` in production, 30 days). |
| `saveDeliveryZones(prev, formData)` | `requireRole("seller")` | replaces the seller's zones in one transaction; fees 0–RD$ 10,000; provinces from `PROVINCES`; free-delivery amount optional |
| `setCartProvince(province)` | public | stores the buyer's province in the `cart` cookie |
| `placeOrder(prev, formData)` | public, throttled | `consumeAttempt`: 5 per IP per 10 minutes and 3 per phone per hour. Validate the form. Load cart lines, current prices and delivery fees for the chosen province. Every seller must deliver there. Price check (D6), delivery fees included. **One transaction**: insert the checkout, then per seller an order + items, and reserve stock for each line (D5). Generate code + token. Clear the cart, add `{code, token}` to the `my_orders` cookie, redirect to `/pedidos/{code}?t=…`. |
| `cancelOrderAsBuyer(code, token)` | token match (constant-time compare of hashes) | only `nuevo` orders; returns stock |
| `setOrderStatus(orderId, to)` | `requireRole("seller")` + ownership in `WHERE` | transition map; returns stock on `cancelado` |
| `markOrderPaid(orderId)` | seller, ownership | |
| `adminCancelOrder(orderId, reason)` | `requireRole("admin")` | returns stock |

---

## 7. Security and privacy

- [ ] Prices, availability and totals always come from the database at submit; the cookie holds only ids and quantities (Zod-validated, ignored if malformed).
- [ ] The order token is stored hashed; the status page compares hashes in constant time; a wrong token is a 404.
- [ ] Sellers only ever read orders with `seller_id = user.id`; the buyer's phone and address are shown only on their own orders.
- [ ] Checkout throttling (IP + phone). Sellers can cancel fake orders, which returns stock.
- [ ] `my_orders` and `cart` cookies are httpOnly. `my_orders` keeps at most 20 entries.
- [ ] Privacy notice on `/pagar`: what's collected and why, linking the privacy policy (spec 004 launch checklist). Buyer data is kept as long as needed for the order and accounting (Q8).
- [ ] Order and status-page routes are excluded from search engines (`robots: noindex`).

---

## 8. Phases and acceptance criteria

**Phase 1 — Cart**
- Cart cookie, add/update/remove actions, `/carrito`, header badge, "Agregar al carrito" on cards and the detail page.
- ✅ Works with JavaScript disabled. Quantities can't exceed stock. A sold-out or removed product is flagged in the cart. Phone / tablet / desktop layouts are checked.

**Phase 1b — Delivery zones**
- `seller_delivery_zones`, `free_delivery_over_cents`, `/panel/entregas`, the delivery calculation, the province selector in the cart, fees shown on the product page and in the cart.
- ✅ A seller sets fees for 3 provinces and a free-delivery amount. The cart shows the right fee per seller for the chosen province, shows 0 above the threshold, and blocks a province the seller doesn't serve. Sellers without zones can't receive cart adds.

**Phase 2 — Checkout and order creation**
- Tables, `/pagar`, `placeOrder` with the transactional stock reservation, the status page, the WhatsApp buttons, "Mis pedidos".
- ✅ A two-farm cart produces 2 orders under one code, each with its own delivery fee and total. Two parallel checkouts for the last unit: one succeeds, the other gets "Solo quedan 0". A price change between viewing and submitting is caught. The order link without the token is a 404.

**Phase 3 — Seller order management**
- `/panel/pedidos` list and detail, transitions, mark paid, cancel with stock return, nav badge.
- ✅ A seller can't open or change another seller's order (404). Invalid transitions are rejected. Cancelling returns stock exactly once.

**Phase 4 — Admin orders**
- `/admin/pedidos` list, filters, detail, admin cancel.

**Phase 5 — Card payments (future work, needs a merchant account)**
- Integrate **AZUL Payment Page** (hosted, redirect) or CardNet, whichever merchant account is approved. The buyer is redirected to the bank-hosted page, so card data never touches our servers. On return, verify the response hash (HMAC-SHA512 with the merchant key) and the amount. Reconcile with the server-to-server status check, because browser returns can be interrupted. Adds `payment_method = 'tarjeta'`, a `payments` table and `payment_status = 'pagado'` set only by verified responses.
- Needs its own short spec once the provider, credentials and sandbox access exist.

---

## 9. Testing

- Vitest:
  - cart cookie parsing (malformed input, line cap);
  - checkout schema;
  - the transition map (every allowed and forbidden move);
  - order code format;
  - token hash compare;
  - grouping a cart into per-seller orders;
  - delivery fees (zone fee, free-delivery threshold, province not served);
  - action authorization (seller A vs seller B, admin, guest), as in spec 001.
- Integration (local Postgres): two concurrent `placeOrder` calls for the last unit; cancel returns stock once.
- Manual: full buyer journey on a phone at 375px; WhatsApp links open the app with the prefilled text.

---

## 10. Review decisions (2026-10-14)

| # | Question | Decision |
|---|---|---|
| Q2 | Payment methods at launch | **Contra entrega + transferencia** (confirmed) |
| Q4 | Delivery fee | **Calculated in the app**: fee per province set by each seller, optional free-delivery amount (D11, §3a) |
| Q6 | Card payments | **Future work** (phase 5 stays an outline) |
| Q7 | Taxes (ITBIS) and invoices | **Future work**; prices are shown as final prices |

Not discussed in review; the spec follows these recommendations unless you say otherwise:

| # | Question | Assumed |
|---|---|---|
| Q1 | Guest checkout (no buyer accounts) | Yes (D1) |
| Q3 | Store seller bank details | No; sent over WhatsApp (D9) |
| Q5 | Automatic notifications | Panel badge + the buyer's WhatsApp button for v1 |
| Q8 | How long to keep buyer contact data | While needed for the order and accounting, then anonymize; set in the privacy policy (spec 004) |
| Q9 | Minimum order per seller | None |

---

## References

- WhatsApp click-to-chat links: `https://wa.me/<number>?text=<urlencoded text>`
- AZUL Payment Page integration pattern (hosted redirect, AuthHash HMAC-SHA512, approved/declined/cancel returns, optional WebServices API): [AZUL module for Odoo](https://apps.odoo.com/apps/modules/19.0/payment_azul), [WooCommerce AZUL gateway](https://github.com/lupena/wc-azul-payment-gateway). Official AZUL developer documentation comes with the merchant account.
