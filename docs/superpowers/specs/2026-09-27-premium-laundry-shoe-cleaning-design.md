# Design: Premium Laundry & Shoe Cleaning Services

**Date:** 2026-09-27
**Status:** Approved by owner
**Codebase:** Spinit (Expo SDK 54, RN 0.81, Zustand, NativeWind, Firebase)

## Goal

Add two new orderable services to the Spinit laundry app, each with a service-detail sheet, full cart/order integration, and admin availability toggle, matching the existing service patterns. Both service IDs (`premium_laundry`, `shoe_clean`) already have **partial, outdated scaffolding** in the codebase that must be **rewritten** to match this spec.

## Decisions (locked by tech owner)

1. **Leather shoes** → built in code but **not rendered** (3 launch rows only). Hidden behind a `SHOW_LEATHER` flag for one-line enable later.
2. **Premium Laundry min order (₹1,000)** → hard block at "Add to Cart" if weight < 5kg.
3. **Premium Laundry delivery fee** → **no** delivery fee charged.
4. **Premium Laundry credits** → pay-per-order only. No `creditPricing.ts` / subscription integration this phase.
5. **Shoe delivery fee (₹50)** → breakout UI in the shoe sheet (Subtotal ₹X + Pickup & Delivery ₹50 = Total). The ₹50 is folded into the cart item so it flows through ordering.
6. **Premium weight bounds** → min 5kg, max 50kg (matches Wash & Fold convention), ₹200/kg, ~3.5 clothes/kg.

---

## Service 1: Premium Laundry (`premium_laundry`)

### Pricing
- Rate: **₹200/kg**
- Min **5 kg**, max **50 kg** (5kg → ₹1,000 minimum order)
- **No "Need Ironing?" toggle** — ironing is included.
- **No delivery fee.**
- **No credit/subscription.**

### Service-detail sheet layout (`renderPremiumLaundry` — REWRITE)
1. **ServiceStats** header (rating 4.8, ~900 reviews).
2. **Intro section** — Title "Premium Laundry", subtitle "Extra-care wash & iron for high-value clothes", explanation text: *"Recommended for high-value, delicate or premium clothing that needs extra care."*
3. **Select Weight** — kg stepper, min 5 / max 50, ~N clothes estimate. Price tag "₹200 per kg" (no fake strike-through discount — premium tier).
4. **What's Included** section (bullets):
   - Pre-stain treatment
   - Colour-wise separation
   - Whites washed separately
   - Premium wash & drying
   - Professional ironing
   - Premium packaging
   - Secure delivery
5. **How It Works** — 9-step sequence: Pickup → Pre-Stain → Tagging → Colour Separation → Separate Wash → Dry → Iron → Premium Packaging → Deliver.
6. **Positioning note** (info box): *"Have clothes that are high-value, expensive, delicate or premium? Premium Laundry gives them an extra-care washing, ironing and packaging process."*
7. **Special Instructions** + media attach (existing shared controls).
8. **FAQs** — `PREMIUM_LAUNDRY_FAQS` (10 items, see below).

### Premium FAQs (10)
1. What kind of clothes should I give to Premium Laundry? → Premium/high-value, delicate, branded, or clothes you want handled with extra care.
2. Difference between Premium Laundry and Wash & Fold? → Includes pre-stain treatment, colour-wise separation, separate white washing, professional ironing, premium packaging.
3. Are white clothes washed separately? → Yes, white/light separated from darker/coloured.
4. Will my clothes be tagged individually? → Yes, tagging during processing for sorting & tracking.
5. Does Premium Laundry include ironing? → Yes, ironing is included; no separate ironing option inside this service.
6. Will you treat stains before washing? → Pre-stain treatment before the main wash where appropriate.
7. How are my clothes packaged? → Washed, dried, ironed, packed in premium packaging before delivery.
8. Is it suitable for very delicate clothes? → Designed for higher-care garments; special-care instructions, fabric labels and condition checked before processing.
9. How is it different from regular Wash & Iron? → Adds pre-stain treatment, colour separation, separate white washing, premium packaging.
10. How is Premium Laundry priced? → ₹200/kg with a minimum order of 5 kg.

### Cart item shape (in `handleAddToCart`)
```
{
  serviceType: 'premium_laundry',
  serviceName: 'Premium Laundry',
  weight,             // kg (number)
  clothesCount,       // round(weight * 3.5)
  ironingEnabled: true,
  ironingCount,       // round(weight * 3.5)
  ironingPrice: 0,  // included, no charge
  deliveryFee: 0,
  basePrice: weight * 200,
  totalPrice: weight * 200,
  specialInstructions, photoUrls,
}
```
`calculateTotal()` branch:
```
if (serviceId === 'premium_laundry') return premiumWeight * 200;
```
Validation: require weight >= 5 (always true — stepper min 5), i.e. min order ₹1,000.

---

## Service 2: Shoe Cleaning (`shoe_clean`)

### Pricing
- Per-item rows, each **₹300**, independent quantity stepper.
- Launch rows (3): **Canvas & Sports Shoes**, **Crocs & Sandals**, **Slippers**.
- **Leather Shoes** — encoded in state, NOT rendered (`SHOW_LEATHER = false`).
- Subtotal = Σ(qty × 300). **Pickup & Delivery: ₹50**. **Total** = subtotal + 50.

### Service-detail sheet layout (`renderShoeCleaning` — REWRITE existing)
1. **ServiceStats** header + description: *"Professional shoe cleaning for everyday footwear, with material-specific cleaning and care."*
2. **Select Items** — one row per category:
   - `Canvas & Sports Shoes — ₹300 — [−] 0 [+]`
   - `Crocs & Sandals — ₹300 — [−] 0 [+]`
   - `Slippers — ₹300 — [−] 0 [+]`
   - (Leather row exists in code, not rendered)
3. **Price breakdown** at the bottom of the section:
   - Subtotal: ₹900
   - Pickup & Delivery: ₹50
   - **Total: ₹950**
4. **What's Included**:
   - Material-specific cleaning
   - Surface stain treatment
   - Deep cleaning
   - Drying
   - Finishing & inspection
5. **How It Works**: Pickup → Inspection → Cleaning → Drying → Finishing → Delivery.
6. **Special Instructions** + media attach.
7. **FAQs** — `SHOE_CLEAN_FAQS` (5–6 items, see below).

### Shoe FAQs (6)
1. What types of shoes can I clean? → Canvas, sports shoes, crocs, sandals and slippers (launch). Not leather yet.
2. Is the ₹300 rate all-inclusive? → Yes, ₹300 per pair/item with professional cleaning & care.
3. Is leather included? → Coming soon; not available yet.
4. Is there a delivery fee? → ₹50 pickup & delivery per order.
5. Do you remove stains/restore shoes? → Professional cleaning & surface stain treatment; not a restoration service.
6. How long does it take? → Typically 24–48 hours.

### Cart item shape
```
{
  serviceType: 'shoe_clean',
  serviceName: 'Shoe Cleaning',
  shoeItems: [
    { type: 'canvas_sports', name: 'Canvas & Sports Shoes', quantity, price: 300 },
    { type: 'crocs_sandals', name: 'Crocs & Sandals', quantity, price: 300 },
    { type: 'slippers', name: 'Slippers', quantity, price: 300 },
  ],
  shoeSubtotal,          // sum(qty*300)
  deliveryFee: 50,
  basePrice: shoeSubtotal,
  totalPrice: shoeSubtotal + 50,
  specialInstructions, photoUrls,
}
```
`calculateTotal()` branch:
```
if (serviceId === 'shoe_clean') {
  return shoeSubtotal + 50;   // SHOE_DELIVERY_FEE = 50
}
```
Validation: require at least one item across categories.

---

## Data Model & Wiring Changes

### Files to modify

**1. `src/store/serviceAvailabilityStore.ts`**
- Add `premium_laundry: boolean` and `shoe_clean: boolean` to `ServiceAvailability` interface + `DEFAULT_AVAILABILITY` (both `true`).
- Add to `SERVICE_LABELS`: `'Premium Laundry'`, `'Shoe Cleaning'`.
- `ALL_SERVICES` auto-derives from `DEFAULT_AVAILABILITY` keys — admin toggle works with zero extra code.
- Firestore doc `config/serviceAvailability` expands automatically (schemaless).

**2. `src/screens/Main/HomeScreen.tsx`**
- Add 2 entries to `SERVICES` array after Blanket Wash (index 3), before Subscribe (index 4):
  - `premium_laundry` — "Premium Laundry", gradient `['#FDF2F8', '#FCE7F3']`, image `ASSET_URLS.services_premium_laundry`.
  - `shoe_clean` — "Shoe Cleaning", gradient `['#ECFEFF', '#CFFAFE']`, image `ASSET_URLS.services_shoe_clean`.
- Add a new `bentoRow` rendering `SERVICES[4], SERVICES[5]` (mirror existing rows).

**3. `src/screens/Main/ServiceDetailScreen.tsx`**
- Add `PREMIUM_LAUNDRY_FAQS` and `SHOE_CLEAN_FAQS` arrays.
- Rewrite `renderPremiumLaundry()` (per above).
- Rewrite `renderShoeCleaning()` (per above).
- Add the two `calculateTotal()` branches (line ~503).
- Add the two `handleAddToCart` branches (replace the stale premium branch at 636; add shoe branch).
- Replace the "Coming Soon" shoe placeholder at line 1393 with `renderShoeCleaning()`.
- Ensure both branch into the shared **Special Instructions + media** controls and FAQ sections (mirror blanket_wash structure).
- Add `premium_laundry`/`shoe_clean` to the `loadData` service descriptions and the `ViewContent` tracker name map.
- Add `services_premium_laundry` / `services_shoe_clean` to `SERVICE_IMAGES` in the file.

**4. `src/utils/assetUrls.ts`**
- Add `services_premium_laundry` and `services_shoe_clean` keys pointing to hosted WebP (Firebase Storage), matching the existing URL pattern. Placeholder images must be provided (user supplies real SKU images).

**5. `src/screens/Main/CartScreen.tsx`**
- No per-service changes required — cart sums `item.totalPrice`. Verify `renderCartItem` shows a sensible line for `shoe_clean` (it already has a branch) and `premium_laundry`.

**6. `src/screens/Admin/AdminOrdersScreen.tsx`**
- `calculateItemPrice()` — add:
  - `premium_laundry`: `(weight || 5) * 200`.
  - `shoe_clean`: `(item.shoeSubtotal || 0) + (item.deliveryFee || 50)`.
- `calculateDeliveryFee()` — shoe_clean already not in wash list ⇒ falls through; leave as-is (returns 0 for wash-mix, and premium already → 0). Confirm shoe orders carry their own ₹50 from the cart item.

**7. `src/store/cartStore.ts`**
- `CartItem` type union already contains `'premium_laundry'` and `'shoe_clean'` — no change. Add optional `shoeItems`, `shoeSubtotal`, `deliveryFee` optional fields if not present.

**8. `creditPricing.ts`** — no change (pay-per-order only).

---

## Out of Scope (explicitly)
- Smart Care subscription/credits for these two services.
- Leather shoe cleaning (code-ready hidden).
- Any pricing changes to existing 4 services.
- Actual SKU image assets (external — user provides URLs).

## Open dependency
- Real image URLs for the two new home-screen tiles. Build proceeds with the two new `ASSET_URLS` entries; images must be uploaded to Firebase Storage and URLs swapped in. A clear placeholder fallback (existing laundry illustration) is used until real URLs exist.
