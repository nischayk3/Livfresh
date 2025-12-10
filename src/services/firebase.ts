import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth'; // Added getAuth for compatibility if needed, but primarily using initializeAuth
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyCd3rL-yXGffHSAcbeMEZbCDdBXgRlN8zU",
  authDomain: "livfresh.firebaseapp.com",
  projectId: "livfresh",
  storageBucket: "livfresh.firebasestorage.app",
  messagingSenderId: "6391153790",
  appId: "1:6391153790:web:8fad0ebc9c4079978bc42f",
  measurementId: "G-8WJLSGV5RL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with Persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;

