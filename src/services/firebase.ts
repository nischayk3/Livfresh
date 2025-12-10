import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// Compat import for expo-firebase-recaptcha
import firebase from 'firebase/compat/app';

export const firebaseConfig = {
  apiKey: "AIzaSyCd3rL-yXGffHSAcbeMEZbCDdBXgRlN8zU",
  authDomain: "livfresh.firebaseapp.com",
  projectId: "livfresh",
  storageBucket: "livfresh.firebasestorage.app",
  messagingSenderId: "6391153790",
  appId: "1:6391153790:web:8fad0ebc9c4079978bc42f",
  measurementId: "G-8WJLSGV5RL"
};

// Initialize modular Firebase
const app = initializeApp(firebaseConfig);

// Initialize compat Firebase for expo-firebase-recaptcha (Web)
if (Platform.OS === 'web' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase Auth with Persistence
// Use browserLocalPersistence for Web, and ReactNativeAsyncStorage for Mobile
const persistence = Platform.OS === 'web'
  ? browserLocalPersistence
  : getReactNativePersistence(ReactNativeAsyncStorage);

export const auth = initializeAuth(app, {
  persistence
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;

