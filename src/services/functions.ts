import { auth } from './firebase';

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

const callFunction = async (functionName: string, data: any) => {
    // Ensure we use the correct auth instance (Native on mobile, Web on web)
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
        throw new Error("User must be logged in.");
    }
    
    // Cloud Functions endpoint
    const url = `https://us-central1-spin-it-a135a.cloudfunctions.net/${functionName}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data }) // Firebase expects the payload to be wrapped in { data: ... }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error?.message || 'Function call failed');
    }
    
    // Firebase wraps the response in { data: ... } or { result: ... }
    return result.data ?? result.result;
};

export const createRazorpayOrder = async (amount: number, currency: string = 'INR') => {
    try {
        const data = await callFunction('createRazorpayOrder', { amount, currency }) as CreateOrderResponse;
        return data;
    } catch (error) {
        console.error('Error calling createRazorpayOrder:', error);
        throw error;
    }
};

export const verifyRazorpayPayment = async (data: VerifyPaymentRequest) => {
    try {
        const resultData = await callFunction('verifyRazorpayPayment', data) as { success: boolean };
        return resultData;
    } catch (error) {
        console.error('Error calling verifyRazorpayPayment:', error);
        throw error;
    }
};
