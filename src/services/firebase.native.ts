import firebase from '@react-native-firebase/app';
import authInstance, { onAuthStateChanged, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import firestore, {
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
} from '@react-native-firebase/firestore';

// Native SDK initializes automatically via GoogleService-Info.plist.
// We get the default app instance.
const firebaseApp = firebase.apps.length > 0 ? firebase.app() : firebase.app();

// Export instances to match web API
export const auth = authInstance();
export const db = firestore();

// Admin app isolation on native
const adminApp = firebase.apps.find(a => a.name === 'Admin') || null;
export const adminAuth = adminApp ? authInstance(adminApp) : auth;
export const adminDb = adminApp ? getFirestore(adminApp) : db;

// Export modular-style functions from Native SDK
export {
    onAuthStateChanged,
    signInWithPhoneNumber,
    signOut,
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

export default firebaseApp;
