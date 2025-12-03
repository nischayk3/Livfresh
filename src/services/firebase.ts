import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
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

// Initialize Firebase Auth
// Note: For React Native, auth state persistence works automatically
// The AsyncStorage warning is informational - auth will still work
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app;

