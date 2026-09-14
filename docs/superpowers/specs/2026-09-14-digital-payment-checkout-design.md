# Digital-First In-App Payment & Fraud-Elimination Design

**Date:** 2026-09-14
**Status:** Design approved, ready for implementation plan

## 1. Problem Statement

**Cash on delivery creates three interconnected problems for SpinZo:**

1. **Cash skimming fraud** — delivery partners collect ₹X in cash at the door but report ₹Y < ₹X to the business, pocketing the difference. Some partners collude with customers to mark orders "refused" while splitting the cash.
2. **Reconciliation overhead** — every COD order requires manual matching of delivery-agent reports against what arrived in the bank, consuming operations hours daily.
3. **Delayed cash flow** — cash COD settlements take 7-14 days through 3PL partners vs T+1 for digital payments.

The business goal is **complete elimination of cash from the last mile**. The customer experience goal is to keep the trust benefit of "pay when I get my clothes" while moving the actual money flow to digital rails.

## 2. Design Principle: In-App Payment Only

**The delivery partner never touches money — cash, card, or QR.**

The customer completes payment entirely within the SpinZo app, at any point in the order lifecycle they choose:

- **At checkout (preferred):** "Pay now" option on CartScreen opens Razorpay modal inside the app
- **Mid-lifecycle (convenience):** OrderDetailScreen shows a persistent "Pay ₹X" card — always visible, never blocking
- **At delivery (last resort):** Pre-delivery push notification + prominent button when status is `out_for_delivery`

The delivery partner has zero payment surface. No QR on their phone, no card machine, no cash pouch. This makes skimming architecturally impossible — there is no money to intercept.

## 3. Customer Journey (3 Payment Moments)

### Moment 1: At Checkout (CartScreen)

```
┌────────────────────────────────────────┐
│  Total:  ₹419                          │
│                                        │
│  Choose payment option                 │
│  ● Pay now — UPI, Card, Wallet         │  ← selected = runs Razorpay
│  ○ Pay later — complete anytime         │  ← no charge now
│                                        │
│  🛡️ 100% digital — we never handle cash│
│                                        │
│  [  Place Order  ]                     │
└────────────────────────────────────────┘
```

- **"Pay now":** Calls `createRazorpayOrder` → opens `RazorpayCheckout.open()` → on success calls `verifyRazorpayPayment` → order created with `paymentStatus: 'paid'`
- **"Pay later":** Order created with `paymentStatus: 'pending'`, `paymentMode: 'later'`

### Moment 2: Mid-Lifecycle (OrderDetailScreen)

```
┌────────────────────────────────────────┐
│  Bill Details                          │
│  Item total                   ₹350     │
│  Delivery fee                 ₹69      │
│  ─────────────────────────────────     │
│  Total                       ₹419     │
│  Status: Payment pending               │
│                                        │
│  [  Pay ₹419 Now — UPI, Card  ]        │  ← one tap, Razorpay modal
└────────────────────────────────────────┘
```

- Always visible when `paymentStatus === 'pending'`
- Never a modal, never a blocker
- The customer can freely scroll, track, cancel, contact support
- **Not** shown when `paymentStatus === 'paid'` — replaced with a green receipt chip

### Moment 3: At Delivery Trigger

When an order reaches `out_for_delivery` and `paymentStatus: 'pending'`:

1. **Push notification:** "Your order is on the way! Complete your payment to speed up delivery."
2. **OrderDetailScreen hero:** A prominent banner above the timeline:

```
┌──────────────────────────────────────┐
│  🚚 Your clothes are arriving soon!  │
│  Complete payment so everything's    │
│  ready when we get there.            │
│                                      │
│  [  Pay ₹419 Now  ]                  │
└──────────────────────────────────────┘
```

The customer pays in-app while the rider is en route. When the rider arrives, it's already paid. No awkward "wait while I scan" moment at the door.

## 4. The Completion Lock (Fraud Fix)

This is the most critical rule and is **enforced server-side, not in UI**:

```
Order lifecycle (simplified):

  placed / pending
    ├── payment: 'pending'  →  all actions available EXCEPT marking delivered
    └── payment: 'paid'     →  all actions available

  out_for_delivery
    ├── payment: 'pending'  →  delivery-complete flag on Ops side IS BLOCKED
    └── payment: 'paid'     →  delivery-complete flag on Ops side IS ALLOWED

  delivered  ← ONLY reachable when paymentStatus === 'paid'
```

Enforcement:
- **SpinZo Ops app** reads `order.paymentStatus` and conditionally enables the "Mark Delivered" button
- **Firebase Functions** (server-side): if an `onUpdate` handler sees status transitioning to `delivered` while `paymentStatus !== 'paid'`, it rejects the write or sends a critical alert
- **No client-side trust:** Even if someone modified the client app, the backend enforces the rule

## 5. Payment Status Field & Order Doc Changes

The order document at `users/{userId}/orders/{orderId}` gains:

```typescript
// New mandatory fields
paymentStatus: 'paid' | 'pending' | 'failed'
paymentMode: 'now' | 'later'     // 'now' = chose to pay at checkout

// Conditional — only present after successful payment
paymentId?: string               // Razorpay payment ID
paymentMethod?: string           // 'upi', 'card', 'wallet', 'netbanking'
paidAt?: Timestamp               // When payment was verified

// Future (V2)
gstin?: string                   // Optional business GSTIN
```

No breaking changes — existing orders without these fields default to `paymentStatus: 'pending'`, `paymentMode: 'cod'` (legacy).

## 6. Existing Backend: What We Reuse

The Firebase Functions in `functions/src/index.ts` already have:

- **`createRazorpayOrder`** (L24-62) — Creates order on Razorpay API. Currently used for credit purchases. **Extend** to accept `orderType: 'checkout'` tied to a SpinZo order ID.
- **`verifyRazorpayPayment`** (L74-149) — HMAC-SHA256 signature verification. Currently writes a payment log + credit subscriptions. **Extend** to write `paymentStatus:'paid'` onto the order document when `type === 'checkout'`.
- **Razorpay secrets** stored as Firebase secrets (L10-11). Already production-ready.

No new backend services are needed. We extend existing ones.

## 7. UI Components to Create/Modify

| Component | File | Change |
|---|---|---|
| PaymentMethodSelector | New (`src/components/PaymentMethodSelector.tsx`) | Radio-group with "Pay now" / "Pay later" + trust badge |
| PayNowButton | New (`src/components/PayNowButton.tsx`) | Handles Razorpay open → verify flow; exposes loading/success/error states |
| PaymentStatusCard | New (`src/components/PaymentStatusCard.tsx`) | Pending → "Pay ₹X" CTA; Paid → green receipt chip |
| CartScreen | `src/screens/Main/CartScreen.tsx` | Add PaymentMethodSelector above place-order button; wire `handlePlaceOrder` for both modes |
| OrderSuccessScreen | `src/screens/Main/OrderSuccessScreen.tsx` | If `paymentStatus: 'pending'`, add "Complete Payment" CTA below the trust seal |
| OrderDetailScreen | `src/screens/Main/OrderDetailScreen.tsx` | Add PaymentStatusCard to bill section; add delivery-day banner if `out_for_delivery + pending` |
| HomeScreen | `src/screens/Main/HomeScreen.tsx` | Update FAQ/copy: "100% digital — no cash" |

## 8. Nudge Strategy (Not in This Build)

A future layer — after digital-payment adoption stabilizes — to shift users from "pay later" to "pay now":

- "Pay now & save ₹30" discount banner on CartScreen
- First 3 orders for new users: default to "pay now" with a tooltip explaining the benefit
- Statistics on profile: "You've saved ₹180 by paying early this month"

## 9. What We Deliberately Excluded

| Thing | Why Not Now |
|---|---|
| GST invoice / B2B GSTIN | Clean separable layer after payments are solid. The receipt infrastructure is easier once every payment is digital. |
| QR-at-doorstep | Per business requirement: delivery partner shows nothing. Customer pays in-app only. |
| Wallet / stored balance | Over-engineering Phase 1. Simple UPI/card Razorpay modal covers 95%+ of Indian digital payments. |
| Cash as an option | Per business requirement: eliminate cash entirely. No cash exists in the customer journey. |
| Persistent "pay" nags | Per UX requirement: payment is **present** but **never blocks** any action except `delivered`. |

## 10. Acceptance Criteria

1. A customer can place an order without paying immediately ("Pay later")
2. A customer can pay at checkout ("Pay now") → Razorpay modal → paid status written to Firestore
3. A customer can pay from OrderDetailScreen → Razorpay modal → paid status written to Firestore
4. A customer can receive a push notification when `out_for_delivery` with payment link if still pending
5. An order with `paymentStatus: 'pending'` cannot transition to `delivered` in the data layer
6. An order with `paymentStatus: 'paid'` shows a green receipt chip with payment method + date
7. Zero cash handling at any point in the customer journey
8. All three payment-moment options work in offline-available mode (queued Razorpay calls retry on reconnect)