import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { checkUserExists } from './firestore';

// Store OTP data during verification flow
let currentPhoneNumber: string = '';
let currentUserData: {
  name?: string;
  email?: string;
  gender?: string;
} = {};

// Test phone numbers configured in Firebase Console
const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+919108558715': '123456',
};

export const requestOTP = async (phoneNumber: string): Promise<any> => {
  currentPhoneNumber = phoneNumber;
  const isTestNumber = TEST_PHONE_NUMBERS.hasOwnProperty(phoneNumber);
  
  if (isTestNumber) {
    console.log(`✅ Test number: ${phoneNumber}, OTP: ${TEST_PHONE_NUMBERS[phoneNumber]}`);
  }
  
  return {
    phoneNumber,
    _testMode: isTestNumber,
    _testOTP: isTestNumber ? TEST_PHONE_NUMBERS[phoneNumber] : null,
  };
};

export const verifyOTP = async (code: string): Promise<any> => {
  if (!currentPhoneNumber) {
    throw new Error('No OTP request found. Please request OTP again.');
  }

  const isTestNumber = TEST_PHONE_NUMBERS.hasOwnProperty(currentPhoneNumber);
  
  if (isTestNumber) {
    const expectedOTP = TEST_PHONE_NUMBERS[currentPhoneNumber];
    if (code !== expectedOTP) {
      throw new Error(`Invalid OTP. Expected: ${expectedOTP}`);
    }
  } else {
    throw new Error('Real phone numbers require backend service.');
  }
  
  // Create user ID and document
  const userId = `phone_${currentPhoneNumber.replace(/[^0-9]/g, '')}`;
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  const userData = {
    phone: currentPhoneNumber,
    name: currentUserData.name || '',
    email: currentUserData.email || '',
    gender: currentUserData.gender || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  if (!userSnap.exists()) {
    await setDoc(userRef, userData);
  } else {
    // Update existing user with new data if provided
    const existingData = userSnap.data();
    await setDoc(userRef, {
      ...existingData,
      phone: currentPhoneNumber,
      name: currentUserData.name || existingData.name || '',
      email: currentUserData.email || existingData.email || '',
      gender: currentUserData.gender || existingData.gender || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  
  const verifiedPhone = currentPhoneNumber;
  const verifiedName = currentUserData.name || userSnap.data()?.name || '';
  currentPhoneNumber = '';
  currentUserData = {};
  
  return {
    uid: userId,
    phoneNumber: verifiedPhone,
    displayName: verifiedName,
  };
};

export const getCurrentPhoneNumber = (): string => currentPhoneNumber;
export const setUserData = (data: { name?: string; email?: string; gender?: string }): void => {
  currentUserData = { ...currentUserData, ...data };
};
export const clearOTPRequest = (): void => {
  currentPhoneNumber = '';
  currentUserData = {};
};
