import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
// @ts-ignore - known issue with firebase/auth types in SDK 10+
import { initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// Compat import for expo-firebase-recaptcha
import firebase from 'firebase/compat/app';

export const firebaseConfig = {
  apiKey: "AIzaSyBnwzJVax1qx2oN3nf7INqpXLF8rVrUWqw",
  authDomain: "spin-it-a135a.firebaseapp.com",
  projectId: "spin-it-a135a",
  storageBucket: "spin-it-a135a.firebasestorage.app",
  messagingSenderId: "597897149776",
  appId: "1:597897149776:web:c9a7d4b5c2291f8b35c055",
  measurementId: "G-YXS771G4ZJ"
};

// Initialize modular Firebase
const app = initializeApp(firebaseConfig);

// --- ADMIN SESSION ISOLATION ---
// We initialize a separate named app for Admin to prevent session clobbering on web
const adminApp = initializeApp(firebaseConfig, 'Admin');

// Initialize Firebase Auth with Persistence
// Use browserLocalPersistence for Web, and ReactNativeAsyncStorage for Mobile
const persistence = Platform.OS === 'web'
  ? browserLocalPersistence
  : getReactNativePersistence(ReactNativeAsyncStorage);

export const auth = initializeAuth(app, {
  persistence
});

// Admin specific auth instance
export const adminAuth = initializeAuth(adminApp, {
  persistence
});

// Initialize Firestore
export const db = getFirestore(app);
export const adminDb = getFirestore(adminApp);

console.log('DEBUG: firebase.ts - db initialized:', db ? 'yes' : 'no');
console.log('DEBUG: firebase.ts - adminDb initialized:', adminDb ? 'yes' : 'no');

// Initialize compat Firebase for expo-firebase-recaptcha (Web)
// Note: Compat also supports multiple apps if needed, but for now default is fine for recaptcha
if (Platform.OS === 'web' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default app;

