import { Platform } from 'react-native';
import { createRazorpayOrder as createRzOrder, verifyRazorpayPayment as verifyRzPayment } from './functions';
import { COLORS } from '../utils/constants';

// NOTE: Only the publishable Key ID belongs in the client. The Key Secret
// must live exclusively in Cloud Functions config — never in this file.
const RAZORPAY_KEY_ID = 'rzp_live_Tbuy3Cyyz5yEqc';

// Loads Razorpay checkout.js on web (mirrors the credit flow's loadRazorpayScript)
const loadRazorpayScriptWeb = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface PaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
}

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
    /**
     * Simple One-time payment (used for Credits)
     */
    async initiateOneTimePayment(amount: number, description: string, user: { name: string; email?: string; phone: string }): Promise<PaymentResponse> {
        const options = {
            description,
            image: 'https://i.imgur.com/3g7nmJC.png', // Or local logo URI if accessible
            currency: 'INR',
            key: RAZORPAY_KEY_ID,
            amount: amount * 100, // Amount in paise
            name: 'SpinZo Laundry',
            prefill: {
                email: user.email || 'customer@example.com',
                contact: user.phone,
                name: user.name,
            },
            theme: { color: COLORS.primary },
        };

        if (Platform.OS === 'web') {
            throw new Error('Payments are not supported on web.');
        }
        try {
            const RazorpayCheckout = (await import('react-native-razorpay')).default;
            const data = await RazorpayCheckout.open(options);
            return data;
        } catch (error: any) {
            console.error('Payment Error:', error.description);
            throw new Error(error.description || 'Payment Failed');
        }
    },

    /**
     * Subscription Payment (Recurring)
     * Note: Requires a Subscription ID created on the server
     */
    async initiateSubscription(subscriptionId: string, user: { name: string; email?: string; phone: string }): Promise<PaymentResponse> {
        const options = {
            key: RAZORPAY_KEY_ID,
            subscription_id: subscriptionId,
            name: 'SpinZo Premium',
            description: 'Monthly Laundry Subscription',
            prefill: {
                email: user.email || 'customer@example.com',
                contact: user.phone,
                name: user.name,
            },
            theme: { color: COLORS.primary },
        };

        if (Platform.OS === 'web') {
            throw new Error('Payments are not supported on web.');
        }
        try {
            const RazorpayCheckout = (await import('react-native-razorpay')).default;
            const data = await RazorpayCheckout.open(options);
            return data;
        } catch (error: any) {
            console.error('Subscription Error:', error.description);
            throw new Error(error.description || 'Subscription Failed');
        }
    },

    /**
     * Initiate payment for a checkout order.
     * Opens Razorpay modal. On success, verifies payment on the backend.
     * Handles modal dismiss and payment.failed gracefully.
     */
    async payForOrder({ amount, spinzoOrderId, user }: PayForOrderParams): Promise<PayForOrderResult> {
        try {
            // Step 1: Create Razorpay order on backend (mirrors the credit flow's approach)
            const order = await createRzOrder(Math.round(amount * 100));

            // Step 2: Build Razorpay options (same shape as the credit flow)
            const options: any = {
                description: `Order #${spinzoOrderId.substring(0, 8).toUpperCase()}`,
                image: 'https://i.imgur.com/3g7nmJC.png',
                currency: order.currency,
                key: order.keyId,
                amount: order.amount,
                name: 'SpinZo Laundry',
                order_id: order.orderId,
                prefill: {
                    email: user.email || '',
                    contact: user.phone || '',
                    name: user.name || '',
                },
                theme: { color: COLORS.primary },
            };

            // Step 3: Load Razorpay checkout.js on web (exactly like credits flow)
            if (Platform.OS === 'web') {
                const scriptLoaded = await loadRazorpayScriptWeb();
                if (!scriptLoaded) {
                    return { success: false, error: 'Razorpay SDK failed to load on this browser.' };
                }
            }

            // Step 4: Open Razorpay via platform-adaptive helper (same as credits flow)
            const { openRazorpay } = await import('../utils/payment_helper');

            return new Promise<PayForOrderResult>((resolve) => {
                openRazorpay(options)
                    .then(async (data: any) => {
                        try {
                            // Success — verify payment on backend
                            await verifyRzPayment({
                                orderId: data.razorpay_order_id,
                                paymentId: data.razorpay_payment_id,
                                signature: data.razorpay_signature,
                                planDetails: { type: 'checkout' },
                                spinzoOrderId,
                            });
                            resolve({
                                success: true,
                                paymentId: data.razorpay_payment_id,
                            });
                        } catch (verifyError: any) {
                            console.error('payForOrder: verification failed', verifyError);
                            resolve({
                                success: true,
                                paymentId: data.razorpay_payment_id,
                                error: 'Payment completed but verification had an issue.',
                            });
                        }
                    })
                    .catch((error: any) => {
                        // User cancelled or payment failed
                        const errDesc = (error?.description || error?.message || '').toLowerCase();
                        if (errDesc.includes('cancelled') || error?.code === 'PAYMENT_CANCELLED') {
                            resolve({ success: false, error: 'Payment cancelled. You can pay anytime from your order.' });
                        } else {
                            resolve({ success: false, error: error?.description || error?.message || 'Payment was not completed.' });
                        }
                    });
            });
        } catch (error: any) {
            console.error('payForOrder error:', error);
            return {
                success: false,
                error: error?.message || 'Payment failed. Please try again.',
            };
        }
    },
};
