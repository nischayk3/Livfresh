import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Store confirmation result
let currentConfirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;
let currentPhoneNumber: string = '';
let currentUserData: {
    name?: string;
    email?: string;
    gender?: string;
} = {};

export const requestOTP = async (phoneNumber: string, verifier?: any): Promise<any> => {
    currentPhoneNumber = phoneNumber.trim();
    console.log(`[Native] Requesting OTP for: '${currentPhoneNumber}'`);

    try {
        // Native SDK handles verification invisibly (Play Integrity/SafetyNet).
        // The 'verifier' argument is ignored here as it's web-only.
        const confirmation = await auth().signInWithPhoneNumber(currentPhoneNumber);
        currentConfirmationResult = confirmation;
        console.log("✅ [Native] OTP Sent via Firebase Auth");
        return {
            phoneNumber: currentPhoneNumber,
            success: true
        };
    } catch (error: any) {
        console.error("[Native] Error sending OTP:", error);
        throw error;
    }
};

export const verifyOTP = async (code: string): Promise<any> => {
    if (!currentConfirmationResult) {
        throw new Error('No OTP request found. Please request OTP again.');
    }

    console.log(`[Native] Verifying OTP for: '${currentPhoneNumber}' with code: '${code}'`);

    try {
        // 1. Confirm OTP
        const userCredential = await currentConfirmationResult.confirm(code);
        const user = userCredential?.user;

        if (!user) throw new Error('User confirmation failed');

        console.log(`✅ [Native] Phone Authenticated. UID: ${user.uid}`);

        // 2. Create/Update User in Firestore
        const userRef = firestore().collection('users').doc(user.uid);
        const userSnap = await userRef.get();

        const userData = {
            phone: currentPhoneNumber,
            authUid: user.uid,
            name: currentUserData.name || '',
            email: currentUserData.email || '',
            gender: currentUserData.gender || '',
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        if (!userSnap.exists) {
            await userRef.set(userData);
        } else {
            const existingData = userSnap.data() || {};
            await userRef.set({
                ...existingData,
                authUid: user.uid,
                phone: currentPhoneNumber,
                name: currentUserData.name || existingData.name || '',
                email: currentUserData.email || existingData.email || '',
                gender: currentUserData.gender || existingData.gender || '',
                updatedAt: firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        const verifiedName = currentUserData.name || userSnap.data()?.name || '';

        // Cleanup
        currentConfirmationResult = null;
        currentPhoneNumber = '';
        currentUserData = {};

        return {
            uid: user.uid,
            phoneNumber: user.phoneNumber || currentPhoneNumber,
            displayName: verifiedName,
        };

    } catch (error: any) {
        console.error("[Native] OTP Verification Failed:", error);
        throw error;
    }
};

export const getCurrentPhoneNumber = (): string => currentPhoneNumber;
export const setUserData = (data: { name?: string; email?: string; gender?: string }): void => {
    currentUserData = { ...currentUserData, ...data };
};
export const clearOTPRequest = (): void => {
    currentPhoneNumber = '';
    currentUserData = {};
    currentConfirmationResult = null;
};
