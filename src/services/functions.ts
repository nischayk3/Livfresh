import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

interface CreateOrderResponse {
    orderId: string;
    currency: string;
    amount: number;
    keyId: string;
}

interface VerifyPaymentRequest {
    orderId: string;
    paymentId: string;
    signature: string;
    planDetails: {
        type: 'single' | 'couple' | 'credits' | 'checkout';
        credits?: number;
        serviceType?: 'wash_fold' | 'wash_iron';
        kgPerCredit?: number;
    };
    spinzoOrderId?: string; // Required for checkout — the Firestore order doc ID
}

export const createRazorpayOrder = async (amount: number, currency: string = 'INR') => {
    try {
        const createOrderFn = httpsCallable<{ amount: number; currency: string }, CreateOrderResponse>(
            functions,
            'createRazorpayOrder'
        );
        const result = await createOrderFn({ amount, currency });
        return result.data;
    } catch (error) {
        console.error('Error calling createRazorpayOrder:', error);
        throw error;
    }
};

export const verifyRazorpayPayment = async (data: VerifyPaymentRequest) => {
    try {
        const verifyPaymentFn = httpsCallable<VerifyPaymentRequest, { success: boolean }>(
            functions,
            'verifyRazorpayPayment'
        );
        const result = await verifyPaymentFn(data);
        return result.data;
    } catch (error) {
        console.error('Error calling verifyRazorpayPayment:', error);
        throw error;
    }
};
