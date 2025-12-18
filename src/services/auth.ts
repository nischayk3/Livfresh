import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase'; // Ensure auth is imported
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

// Store OTP confirmation result during verification flow
let currentConfirmationResult: ConfirmationResult | null = null;
let currentPhoneNumber: string = '';
let currentUserData: {
  name?: string;
  email?: string;
  gender?: string;
} = {};

// Helper to get or create verifier
const getVerifier = () => {
  // @ts-ignore - RecaptchaVerifier isn't typed on window clearly or we create a new one
  if (!window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => console.log('Recaptcha verified')
      });
    } catch (e) {
      console.warn("Recaptcha init warning:", e);
    }
  }
  return window.recaptchaVerifier;
};

export const requestOTP = async (phoneNumber: string, verifier?: any): Promise<any> => {
  currentPhoneNumber = phoneNumber.trim();
  console.log(`Requesting OTP for: '${currentPhoneNumber}'`);

  try {
    const appVerifier = verifier || getVerifier();
    const confirmation = await signInWithPhoneNumber(auth, currentPhoneNumber, appVerifier);
    currentConfirmationResult = confirmation;
    console.log("✅ OTP Sent via Firebase Auth");
    return {
      phoneNumber: currentPhoneNumber,
      success: true
    };
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    throw error; // Rethrow to let caller handle alerts
  }
};

export const verifyOTP = async (code: string): Promise<any> => {
  if (!currentConfirmationResult) {
    throw new Error('No OTP request found. Please request OTP again.');
  }

  console.log(`Verifying OTP for: '${currentPhoneNumber}' with code: '${code}'`);

  try {
    // 1. Confirm OTP with Firebase Auth
    const userCredential = await currentConfirmationResult.confirm(code);
    const user = userCredential.user;
    console.log(`✅ Phone Authenticated.UID: ${user.uid} `);

    // 2. Create/Update User in Firestore
    // We utilize the Auth UID for the document ID to ensure straightforward permission rules (request.auth.uid == resource.id).
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      phone: currentPhoneNumber,
      authUid: user.uid,
      name: currentUserData.name || '',
      email: currentUserData.email || '',
      gender: currentUserData.gender || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, userData);
    } else {
      const existingData = userSnap.data();
      await setDoc(userRef, {
        ...existingData,
        authUid: user.uid,
        phone: currentPhoneNumber,
        name: currentUserData.name || existingData.name || '',
        email: currentUserData.email || existingData.email || '',
        gender: currentUserData.gender || existingData.gender || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    const verifiedName = currentUserData.name || userSnap.data()?.name || '';

    // Cleanup
    currentConfirmationResult = null;
    currentPhoneNumber = '';
    currentUserData = {};

    return {
      uid: user.uid, // Return the real Auth UID
      phoneNumber: user.phoneNumber || currentPhoneNumber,
      displayName: verifiedName,
    };

  } catch (error: any) {
    console.error("OTP Verification Failed:", error);
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
