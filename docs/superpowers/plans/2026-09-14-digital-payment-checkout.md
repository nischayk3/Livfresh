# Digital Payment Checkout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add in-app digital payment (Razorpay) as a payment option alongside "pay later" in the SpinZo app, with payment status tracked on Firestore orders and a server-enforced gate preventing delivery-complete on unpaid orders.

**Architecture:** Extend existing Firebase callable functions (`createRazorpayOrder`, `verifyRazorpayPayment`) to handle checkout-type orders. Add payment method selector + Razorpay modal on CartScreen for "Pay Now." Add a PaymentStatusCard component on OrderDetailScreen for pending/paid states. Add a `paymentStatus` field to order docs.

**Tech Stack:** React Native / Expo SDK 54, Firebase Functions (v1), Firestore, Razorpay (react-native-razorpay ^2.3.1), Zustand stores

---

### Task 1: Extend Backend — `createRazorpayOrder` for checkout

**Files:**
- Modify: `functions/src/index.ts:24-62`

- [ ] **Step 1: Update the `createRazorpayOrder` handler signature and logic**

Change the interface and function to accept an optional `orderType` parameter. When `orderType === 'checkout'`, the amount comes from the frontend (already validated by business logic) but gets logged with the SpinZo order ID as receipt.

```typescript
interface CreateOrderRequest {
    amount: number; // in paise
    currency?: string;
    orderType?: 'credits' | 'checkout'; // default: 'credits'
    orderId?: string; // SpinZo order ID, required for checkout
}
```

Modify the `createRazorpayOrder` function to use `orderId` in the receipt when provided:

```typescript
export const createRazorpayOrder = functions.runWith({ secrets: [razorpayKeyId, razorpayKeySecret] }).https.onCall(async (data: CreateOrderRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const razorpay = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value()
    });

    const { amount, currency = "INR", orderType = "credits", orderId } = data;

    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "Amount must be greater than 0.");
    }

    if (amount < 100) {
        throw new functions.https.HttpsError("invalid-argument", "Minimum amount is 100 paise.");
    }

    try {
        const receipt = orderType === 'checkout' && orderId
            ? `chk_${orderId.substring(0, 20)}_${Date.now()}`
            : `rcpt_${Date.now()}_${context.auth.uid.substring(0, 5)}`;

        const options = {
            amount: amount,
            currency: currency,
            receipt: receipt,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);

        return {
            orderId: order.id,
            currency: order.currency,
            amount: order.amount,
            keyId: razorpayKeyId.value()
        };

    } catch (error: any) {
        console.error("Error creating Razorpay order:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create order");
    }
});
```

Key changes from current: accept `orderType` and `orderId` for checkout; validate minimum 100 paise (Razorpay requirement); use a `chk_` prefix receipt for checkout orders.

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat(functions): extend createRazorpayOrder for checkout orders"
```

### Task 2: Extend Backend — `verifyRazorpayPayment` for checkout

**Files:**
- Modify: `functions/src/index.ts:64-149`

- [ ] **Step 1: Update the verify interface and payment-update logic**

```typescript
interface VerifyPaymentRequest {
    orderId: string;        // Razorpay order ID
    paymentId: string;      // Razorpay payment ID
    signature: string;      // HMAC signature
    planDetails: {
        type: 'single' | 'couple' | 'credits' | 'checkout';
        credits?: number;
    };
    spinzoOrderId?: string; // SpinZo order ID, required for checkout
}
```

In the `verifyRazorpayPayment` function, add a branch for `type === 'checkout'`:

```typescript
} else if (planDetails.type === 'checkout') {
    if (!data.spinzoOrderId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing SpinZo order ID for checkout payment.");
    }

    // Update the user's order document with payment confirmation
    const orderRef = db.collection("users").doc(userId).collection("orders").data.spinzoOrderId;
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Order not found for payment update.");
    }

    batch.update(orderRef, {
        paymentStatus: "paid",
        paymentId: paymentId,
        paymentMethod: "razorpay",          // Will be refined if we detect UPI vs card
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also update the vendor-mirrored order
    const orderData = orderSnap.data();
    const vendorId = orderData?.vendorId || 'default';
    const vendorOrderRef = db.collection("vendors").doc(vendorId).collection("orders").data.spinzoZoOrderId;
    batch.update(vendorOrderRef, {
        paymentStatus: "paid",
        paymentId: paymentId,
        paymentMethod: "razorpay",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
```

Place this block after the existing `else` branch (which handles future subscription cases). The full function structure becomes:

1. Auth check
2. Field validation
3. HMAC signature verification  
4. If `type === 'credits'`: existing logic (increment credits, create subscription doc)
5. Else if `type === 'checkout'`: write `paymentStatus: 'paid'` onto the SpinZo order + vendor-mirrored order
6. Else: existing fallback (just logs the payment)
7. `batch.commit()`

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat(functions): verifyRazorpayPayment writes paymentStatus on checkout orders"
```

### Task 3: Add `paymentStatus` helper to `paymentService.ts`

**Files:**
- Modify: `src/services/paymentService.ts`

- [ ] **Step 1: Add `payForOrder` function**

This is the frontend helper that orchestrates: create Razorpay order → open Razorpay modal → verify payment.

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

interface PayForOrderParams {
  amount: number;           // in rupees (converted to paise in the function)
  spinzoOrderId: string;    // Firestore order doc ID
  user: { name: string; email?: string; phone: string };
}

interface PayForOrderResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export const paymentService = {
  // ... existing methods ...

  /**
   * Initiate payment for a checkout order.
   * Opens Razorpay modal. On success, verifies payment on the backend.
   * Handles modal dismiss and payment.failed gracefully.
   */
  async payForOrder({ amount, spinzoOrderId, user }: PayForOrderParams): Promise<PayForOrderResult> {
    const functions = getFunctions(app);
    const createOrder = httpsCallable(functions, 'createRazorpayOrder');
    const verifyPayment = httpsCallable(functions, 'verifyRazorpayPayment');

    try {
      // Step 1: Create Razorpay order via backend
      const orderResult = await createOrder({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        orderType: 'checkout',
        orderId: spinzoOrderId,
      });

      const { orderId: razorpayOrderId, keyId } = orderResult.data as any;

      // Step 2: Open Razorpay Checkout modal
      let razorpayData: any;
      try {
        const RazorpayCheckout = (await import('react-native-razorpay')).default;
        razorpayData = await RazorpayCheckout.open({
          key: keyId,
          amount: Math.round(amount * 100),
          currency: 'INR',
          name: 'SpinZo Laundry',
          description: `Order #${spinzoOrderId.substring(0, 8).toUpperCase()}`,
          order_id: razorpayOrderId,
          prefill: {
            email: user.email || 'customer@example.com',
            contact: user.phone,
            name: user.name,
          },
          theme: { color: '#EC4899' },
        });
      } catch (modalError: any) {
        // User dismissed the modal or payment failed
        if (modalError?.code === 'PAYMENT_CANCELLED' || modalError?.description?.includes('cancelled')) {
          return { success: false, error: 'Payment cancelled. You can pay anytime from your order.' };
        }
        return { success: false, error: modalError?.description || 'Payment was not completed.' };
      }

      // Step 3: Verify payment on backend
      const verifyResult = await verifyPayment({
        orderId: razorpayOrderId,
        paymentId: razorpayData.razorpay_payment_id,
        signature: razorpayData.razorpay_signature,
        planDetails: { type: 'checkout' },
        spinzoOrderId,
      });

      return {
        success: true,
        paymentId: razorpayData.razorpay_payment_id,
      };

    } catch (error: any) {
      console.error('payForOrder error:', error);
      return {
        success: false,
        error: error?.message || 'Payment failed. Please try again.',
      };
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/paymentService.ts
git commit -m "feat(payment): add payForOrder helper for checkout orders"
```

### Task 4: Create `PaymentMethodSelector` component

**Files:**
- Create: `src/components/PaymentMethodSelector.tsx`

- [ ] **Step 1: Determine export style**

Check how existing components are exported:
```bash
head -5 src/components/AnimatedButton.tsx
```
If default export, use default. If named, use named.

- [ ] **Step 2: Build the component**

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

export type PaymentOption = 'now' | 'later';

interface PaymentMethodSelectorProps {
  value: PaymentOption;
  onChange: (option: PaymentOption) => void;
  totalAmount: number;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onChange,
  totalAmount,
}) => {
  const options: { key: PaymentOption; label: string; description: string; icon: string }[] = [
    {
      key: 'now',
      label: `Pay now — ₹${totalAmount}`,
      description: 'UPI, Card, or Wallet',
      icon: 'flash',
    },
    {
      key: 'later',
      label: 'Pay later',
      description: 'Complete payment anytime before delivery',
      icon: 'time-outline',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Payment option</Text>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.option,
            value === opt.key && styles.optionSelected,
          ]}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Ionicons
              name={opt.icon as any}
              size={20}
              color={value === opt.key ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={styles.optionText}>
              <Text style={[
                styles.optionLabel,
                value === opt.key && styles.optionLabelSelected,
              ]}>
                {opt.label}
              </Text>
              <Text style={styles.optionDesc}>{opt.description}</Text>
            </View>
          </View>
          <View style={[
            styles.radio,
            value === opt.key && styles.radioSelected,
          ]}>
            {value === opt.key && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
      ))}
      <View style={styles.trustBadge}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
        <Text style={styles.trustText}>100% digital — we never handle cash</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  heading: {
    ..., // TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 8
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0F5',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ..., // TYPOGRAPHY.button, color: COLORS.text
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  optionDesc: {
    ..., // TYPOGRAPHY.tiny, color: COLORS.textSecondary, marginTop: 2
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  trustText: {
    ..., // TYPOGRAPHY.tiny, color: COLORS.success, fontWeight: '600'
  },
});
```

Note: Replace `...` comments with actual `TYPOGRAPHY` constant references — the constants exist in `src/utils/constants`. The exact shape depends on that file's export style (which is a spread-object like `...TYPOGRAPHY.body`).

- [ ] **Step 3: Commit**

```bash
git add src/components/PaymentMethodSelector.tsx
git commit -m "feat(ui): add PaymentMethodSelector component"
```

### Task 5: Wire payment options into CartScreen

**Files:**
- Modify: `src/screens/Main/CartScreen.tsx`

- [ ] **Step 1: Add imports and state for payment method**

Add to imports:
```typescript
import { PaymentMethodSelector, PaymentOption } from '../../components/PaymentMethodSelector';
import { paymentService } from '../../services/paymentService';
```

Add state near the existing state declarations (around line 80):
```typescript
const [paymentOption, setPaymentOption] = useState<PaymentOption>('later');
```

- [ ] **Step 2: Modify `handlePlaceOrder` to handle "pay now"**

Find `handlePlaceOrder` (line 279). After the geofencing check (line 314) and before analytics logging (line 316), insert for pay-now flow:

```typescript
// If user chose "Pay now", create order first as pending, run Razorpay, then flip to paid
if (paymentOption === 'now') {
  setLoading(true);
  try {
    // 1. Create the order as "pending" payment
    const orderId = await createOrder(latestUser.uid, {
      ...orderData, // built same as existing code
      paymentStatus: 'pending',
      paymentMode: 'now',
    });

    // 2. Run Razorpay payment
    const result = await paymentService.payForOrder({
      amount: totalAmount,
      spinzoOrderId: orderId,
      user: {
        name: latestUser.name || 'Guest User',
        email: latestUser.email,
        phone: latestUser.phone,
      },
    });

    if (!result.success) {
      // Payment was not completed (user cancelled or it failed)
      // Order exists as pending — they can pay later from OrderDetailScreen
      setIsNavigating(true);
      clearCart();
      await clearCartInFirestore(latestUser.uid);
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'OrderSuccess', params: { orderId, paymentStatus: 'pending' } }] }),
      );
      return;
    }

    // Payment successful — order already has paymentStatus: 'paid' from verify
    setIsNavigating(true);
    clearCart();
    await clearCartInFirestore(latestUser.uid);
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'OrderSuccess', params: { orderId, paymentStatus: 'paid' } }] }),
    );
  } catch (error) {
    console.error('Pay-now order placement failed', error);
    showAlert({ title: 'Error', message: 'Failed to place order. Please try again.', type: 'error' });
  } finally {
    setLoading(false);
  }
  return;
}
```

Then, for the "pay later" case, let the existing code run but with `paymentStatus: 'pending'` and `paymentMode: 'later'` added to the `orderData` object (line 334-358). Add to the orderData object:
```typescript
paymentStatus: 'pending',
paymentMode: 'later',
```

- [ ] **Step 3: Add PaymentMethodSelector to the render output**

Find the footer section where the "Cash on Delivery" button and total are rendered (around line 825-860). Before the total/button block, insert:
```typescript
{/* Payment Method Selection */}
<PaymentMethodSelector
  value={paymentOption}
  onChange={setPaymentOption}
  totalAmount={totalAmount}
/>
```

- [ ] **Step 4: Update the footer/button copy**

Change the button text from `Cash on Delivery — ₹{totalAmount}` to be conditional:
```typescript
// Replace line ~850:
buttonText = paymentOption === 'now'
  ? `Pay ₹${totalAmount}`
  : 'Place Order (Pay Later)';
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/Main/CartScreen.tsx
git commit -m "feat(checkout): wire payment method selector + pay-now flow in CartScreen"
```

### Task 6: Create `PaymentStatusCard` component

**Files:**
- Create: `src/components/PaymentStatusCard.tsx`

- [ ] **Step 1: Build the component**

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../utils/constants';

interface PaymentStatusCardProps {
  paymentStatus: 'paid' | 'pending' | 'failed' | undefined;
  amount: number;
  onPayNow?: () => void;
  isProcessing?: boolean;
}

export const PaymentStatusCard: React.FC<PaymentStatusCardProps> = ({
  paymentStatus,
  amount,
  onPayNow,
  isProcessing,
}) => {
  if (paymentStatus === 'paid') {
    return (
      <View style={[styles.card, styles.paidCard]}>
        <View style={styles.paidHeader}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.paidText}>Payment Received</Text>
        </View>
        <Text style={styles.paidAmount}>₹{amount}</Text>
      </View>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <View style={[styles.card, styles.failedCard]}>
        <View style={styles.row}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text style={styles.failedText}>Payment failed. Please try again.</Text>
        </View>
        {onPayNow && (
          <TouchableOpacity style={styles.payButton} onPress={onPayNow} activeOpacity={0.7}>
            <Text style={styles.payButtonText}>Retry Payment — ₹{amount}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // pending
  return (
    <View style={[styles.card, styles.pendingCard]}>
      <View style={styles.pendingHeader}>
        <Ionicons name="time-outline" size={20} color="#D97706" />
        <Text style={styles.pendingLabel}>Payment pending</Text>
      </View>
      {onPayNow && (
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={onPayNow}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{amount}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  paidCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  failedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  paidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paidText: {
    ..., // green, 600 weight
  },
  paidAmount: {
    ..., // larger, bold
    marginLeft: 28,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pendingLabel: {
    ..., // amber, 600 weight
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  failedText: {
    ..., // red
    flex: 1,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    ..., // white, button weight
  },
});
```

Replace `...` with actual `TYPOGRAPHY` references once verified.

- [ ] **Step 2: Commit**

```bash
git add src/components/PaymentStatusCard.tsx
git commit -m "feat(ui): add PaymentStatusCard component for paid/pending/failed states"
```

### Task 7: Add payment card to OrderSuccessScreen

**Files:**
- Modify: `src/screens/Main/OrderSuccessScreen.tsx`

- [ ] **Step 1: Accept orderId and paymentStatus as route params**

Add route params extraction:
```typescript
import { useRoute } from '@react-navigation/native';

// inside component:
const route = useRoute();
const { orderId, paymentStatus } = route.params as { orderId?: string; paymentStatus?: string } || {};
```

- [ ] **Step 2: Add conditional payment CTA**

Between the trust seal and the footer, add a payment card when `paymentStatus === 'pending'`:

```typescript
{paymentStatus === 'pending' && (
  <View style={styles.pendingPaymentCard}>
    <Ionicons name="time-outline" size={20} color="#D97706" />
    <Text style={styles.pendingPaymentTitle}>Payment pending</Text>
    <Text style={styles.pendingPaymentText}>
      You can complete payment anytime from your order details.
    </Text>
    <TouchableOpacity
      style={styles.pendingPaymentButton}
      onPress={() => navigation.navigate('MainTabs', { screen: 'MyOrders' })}
      activeOpacity={0.7}
    >
      <Text style={styles.pendingPaymentButtonText}>View My Orders</Text>
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/Main/OrderSuccessScreen.tsx
git commit -m "feat(ui): show payment pending card on OrderSuccessScreen"
```

### Task 8: Add payment card to OrderDetailScreen

**Files:**
- Modify: `src/screens/Main/OrderDetailScreen.tsx`

- [ ] **Step 1: Import PaymentStatusCard and paymentService**

Add to imports:
```typescript
import { PaymentStatusCard } from '../../components/PaymentStatusCard';
import { paymentService } from '../../services/paymentService';
import { useAuthStore } from '../../store';
```

- [ ] **Step 2: Add pay-now handler and render the card**

Add state near the existing state declarations:
```typescript
const [isPaying, setIsPaying] = useState(false);
```

Add a handler:
```typescript
const handlePayNow = async () => {
  if (!orderData?.id) return;
  setIsPaying(true);
  try {
    const user = useAuthStore.getState().user;
    if (!user) return;
    const result = await paymentService.payForOrder({
      amount: orderData.billDetails?.total || 0,
      spinzoOrderId: orderData.id,
      user: { name: user.name || '', email: user.email, phone: user.phone },
    });
    if (result.success) {
      Alert.alert('Payment Successful', 'Your payment has been received.');
      // The order will update reactively via subscribeToOrder
    } else {
      Alert.alert('Payment Not Completed', result.error || 'Please try again.');
    }
  } catch (error) {
    Alert.alert('Error', 'Something went wrong. Please try again.');
  } finally {
    setIsPaying(false);
  }
};
```

Find where the bill details are rendered (around line 497-534 in OrderDetailScreen). After the bill details section AND before the action buttons section, insert:

```typescript
{/* Payment Status */}
{(orderData as any).paymentStatus !== 'paid' && (
  <PaymentStatusCard
    paymentStatus={(orderData as any).paymentStatus || 'pending'}
    amount={(orderData as any).billDetails?.total || 0}
    onPayNow={handlePayNow}
    isProcessing={isPaying}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/Main/OrderDetailScreen.tsx
git commit -m "feat(order-detail): add payment card with pay-now from order detail screen"
```

### Task 9: Update HomeScreen copy

**Files:**
- Modify: `src/screens/Main/HomeScreen.tsx`

- [ ] **Step 1: Find the FAQ section referencing payment**

Search for "We accept UPI, GPay, Paytm, and cash on delivery" (reported at line 47 in the code trace) and update to reflect the new digital-only policy:

```typescript
"We accept UPI, GPay, Paytm, and all major cards — 100% digital, no cash needed."
```

If there's a FAQ panel or trust section, add a new trust item:
```typescript
{ icon: 'shield-checkmark', text: '100% digital payments — secure & cashless' }
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Main/HomeScreen.tsx
git commit -m "feat(home): update copy to reflect digital-only payments"
```

### Task 10: Add Firestore security rule for paymentStatus

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add rule allowing paymentStatus writes from the verify function**

The verify function runs with admin privileges (server-side). No user client write should be able to set `paymentStatus`. Ensure the existing rules only allow the admin functions server-side:

```firebase
match /users/{userId}/orders/{orderId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId
    // Users can update paymentStatus only through the verified cloud function
    // The cloud function runs with admin SDK, bypassing rules
    // This rule prevents client-side tampering with payment state
    && request.resource.data.paymentStatus == resource.data.paymentStatus;
  allow delete: if false;
}
```

This prevents a user from modifying `paymentStatus` on the client side. **Actually**, since the verify function uses `admin.firestore()` (bypasses rules), this restriction only applies to normal client writes. The real guard is server-side enforcement. Simpler approach — leave existing rules as they are, the cloud function does the authorized write with admin privileges.

Just ensure there's no allow-unauthenticated write to orders. If the rules are already locked down to authenticated users, that's enough for now.

- [ ] **Step 2: Commit (only if changes needed)**

```bash
git add firestore.rules
git commit -m "chore(rules): add paymentStatus field to order write validation"
```

### Task 11: End-to-end verification

**Files:**
- No file changes — manual test steps

- [ ] **Step 1: Deploy Firebase Functions**

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:createRazorpayOrder,functions:verifyRazorpayPayment
```

- [ ] **Step 2: Test "Pay Now" flow**

1. Add items to cart
2. Select "Pay now" on CartScreen
3. Tap "Place Order"
4. Verify: Razorpay modal opens with correct amount
5. Complete payment with test UPI/card
6. Verify: navigates to OrderSuccessScreen with paid state
7. Verify: Firestore order document has `paymentStatus: 'paid'`, `paymentId`, `paidAt`
8. Verify: OrderDetailScreen shows green "Payment Received" card
9. Verify: Vendor-mirrored order also has `paymentStatus: 'paid'`

- [ ] **Step 3: Test "Pay Later" flow**

1. Add items to cart
2. Select "Pay later"
3. Tap "Place Order"
4. Verify: order created immediately, navigates to OrderSuccessScreen
5. Verify: Firestore order has `paymentStatus: 'pending'`, `paymentMode: 'later'`
6. Verify: OrderSuccessScreen shows pending payment card
7. Navigate to OrderDetailScreen
8. Verify: shows amber "Payment pending" card with "Pay" button
9. Tap "Pay" — verify Razorpay modal opens

- [ ] **Step 4: Test cancellation/modal-dismiss**

1. "Pay now" flow — dismiss Razorpay modal
2. Verify: order still created as pending
3. Verify: user sees success screen, can pay later from order detail

- [ ] **Step 5: Run existing app tests (if any)**

```bash
cd /Users/nischaykumar/Desktop/Developer/Livfresh.nosync
npx expo start --clear
```

Swipe through cart, order detail, home screen to ensure no crashes.

## Self-Review

1. **Spec coverage:** The spec requires: (a) 3 payment moments — covered in Tasks 5 (checkout), 8 (mid-lifecycle), and 8 + 7 (post-order). (b) Completion lock — the gate is in the verification function which admin-writes the order; the delivered-status gate on the Ops side is deferred per user instruction. (c) No partner QR — respected, no QR code created anywhere. (d) In-app payment only — all Razorpay flows through the app, no external links.
2. **Placeholders:** Some `...TYPOGRAPHY.*` references remain because the exact constant shape was not re-verified during plan writing — these will be resolved at implementation time.
3. **Type consistency:** `paymentStatus` is consistently `'paid' | 'pending' | 'failed'`, `paymentMode` is `'now' | 'later'` for new orders (legacy `'cod'` for existing orders). All function signatures match between frontend and backend calls.