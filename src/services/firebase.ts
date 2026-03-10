import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - known issue with firebase/auth types in SDK 10+
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  deleteUser
} from 'firebase/auth';
import { getFunctions } from 'firebase/functions'; // Import getFunctions from sdk
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  collectionGroup
} from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { firebaseConfig } from './firebaseConfig';

// Initialize modular Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth with Persistence
const persistence = Platform.OS === 'web'
  ? browserLocalPersistence
  : getReactNativePersistence(ReactNativeAsyncStorage);

export const auth = initializeAuth(app, {
  persistence
});

// Admin session isolation (Multi-app support)
const adminApp = getApps().find(a => a.name === 'Admin') || initializeApp(firebaseConfig, 'Admin');
export const adminAuth = initializeAuth(adminApp, {
  persistence
});

// Initialize Firestore
export const db = getFirestore(app);
export const adminDb = getFirestore(adminApp);
export const functions = getFunctions(app); // Initialize Functions

// Export modular-style functions
export {
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  deleteUser,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  collectionGroup
};

export default app;

