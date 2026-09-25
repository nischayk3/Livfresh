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
    // Wait briefly for auth state to recover if returning from an external UPI app on iOS/Android
    let user = auth.currentUser;
    if (!user) {
        for (let i = 0; i < 6; i++) {
            await new Promise(r => setTimeout(r, 500));
            user = auth.currentUser;
            if (user) break;
        }
    }
    if (!user) {
        throw new Error("User must be logged in.");
    }

    // Force-refresh (true) to avoid stale cached tokens on iOS after backgrounding
    let token: string | null = null;
    try {
        token = await user.getIdToken(true);
    } catch (tokenErr) {
        console.warn('Failed to force-refresh ID token, attempting without force:', tokenErr);
        token = await user.getIdToken(false);
    }

    if (!token) {
        throw new Error("Failed to retrieve authentication token.");
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
    
    let result: any = null;
    try {
        result = await response.json();
    } catch {
        // Response was not JSON (e.g. 504 / 502 / proxy error)
    }
    
    if (!response.ok) {
        throw new Error(result?.error?.message || `Function call failed with status ${response.status}`);
    }
    
    // Firebase wraps the response in { data: ... } or { result: ... }
    return result?.data ?? result?.result;
};

export const createRazorpayOrder = async (
    amount: number,
    currency: string = 'INR',
    orderType?: 'checkout' | 'credits' | 'subscription',
    orderId?: string
) => {
    try {
        const payload: any = { amount, currency };
        if (orderType) payload.orderType = orderType;
        if (orderId) payload.orderId = orderId;
        const data = await callFunction('createRazorpayOrder', payload) as CreateOrderResponse;
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
