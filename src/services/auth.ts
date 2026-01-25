import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  signInWithPhoneNumber,
} from './firebase';
import { Platform } from 'react-native';
// Recaptcha and ConfirmationResult are type-only or platform-specific
// We'll import them only for Web if possible, or use any
import type { ConfirmationResult } from 'firebase/auth';

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
// Initialize verifier for better performance
export const initializeRecaptcha = () => {
  if (Platform.OS !== 'web') return null; // Only needed for web
  return getVerifier();
};

const getVerifier = () => {
  if (typeof window === 'undefined') return null;

  // @ts-ignore
  if (!window.recaptchaVerifier) {
    try {
      console.log("Initializing RecaptchaVerifier...");
      const { RecaptchaVerifier } = require('firebase/auth');
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

    if (!user) throw new Error('User confirmation failed');

    console.log(`✅ Phone Authenticated. UID: ${user.uid}`);

    // 2. Create/Update User in Firestore (Hydration logic from native)
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      phone: currentPhoneNumber,
      authUid: user.uid,
      name: currentUserData.name || '',
      email: currentUserData.email || '',
      gender: currentUserData.gender || '',
      updatedAt: serverTimestamp(),
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, userData, { merge: true });
    }

    // Cleanup session data
    const phone = currentPhoneNumber;
    currentConfirmationResult = null;
    currentPhoneNumber = '';
    currentUserData = {};

    return {
      uid: user.uid,
      phoneNumber: user.phoneNumber || phone,
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
