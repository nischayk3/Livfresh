import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { COLORS } from '../utils/constants';

// NOTE: Only the publishable Key ID belongs in the client. The Key Secret
// must live exclusively in Cloud Functions config — never in this file.
const RAZORPAY_KEY_ID = 'rzp_test_TbtYp1s1J79R1v';

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
        const functions = getFunctions(app);
        const createOrderFn = httpsCallable(functions, 'createRazorpayOrder');
        const verifyPaymentFn = httpsCallable(functions, 'verifyRazorpayPayment');

        try {
            // Step 1: Create Razorpay order via backend
            const orderResult = await createOrderFn({
                amount: Math.round(amount * 100),
                currency: 'INR',
                orderType: 'checkout',
                orderId: spinzoOrderId,
            });

            const { orderId: razorpayOrderId, keyId } = orderResult.data as any;

            // Step 2: Open Razorpay Checkout — platform-adaptive.
            // - Web: loads https://checkout.razorpay.com/v1/checkout.js via window.Razorpay
            // - Native (iOS/Android): uses react-native-razorpay's RazorpayCheckout
            // The helper auto-resolves via Expo's platform file extensions.
            let razorpayData: any;
            try {
                const { openRazorpay } = await import('../utils/payment_helper');
                razorpayData = await openRazorpay({
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
                    theme: { color: COLORS.primary },
                });
            } catch (modalError: any) {
                // User dismissed the modal or payment failed (e.g. cancelled)
                const errDesc = (modalError?.description || modalError?.message || '').toLowerCase();
                if (modalError?.code === 'PAYMENT_CANCELLED' || errDesc.includes('cancelled')) {
                    return { success: false, error: 'Payment cancelled. You can pay anytime from your order.' };
                }
                return { success: false, error: modalError?.description || modalError?.message || 'Payment was not completed.' };
            }

            // Step 3: Verify payment on backend
            await verifyPaymentFn({
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
