import RazorpayCheckout from 'react-native-razorpay';
import { COLORS } from '../utils/constants';

const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_HERE'; // Replace with actual key

export interface PaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
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
            name: 'Spinit Laundry',
            prefill: {
                email: user.email || 'customer@example.com',
                contact: user.phone,
                name: user.name,
            },
            theme: { color: COLORS.primary },
        };

        try {
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
            name: 'Spinit Premium',
            description: 'Monthly Laundry Subscription',
            prefill: {
                email: user.email || 'customer@example.com',
                contact: user.phone,
                name: user.name,
            },
            theme: { color: COLORS.primary },
        };

        try {
            const data = await RazorpayCheckout.open(options);
            return data;
        } catch (error: any) {
            console.error('Subscription Error:', error.description);
            throw new Error(error.description || 'Subscription Failed');
        }
    }
};
