import firebase from '@react-native-firebase/app';
import { initializeApp as webInitializeApp, getApps as getWebApps, getApp as getWebApp } from 'firebase/app';
import { getFunctions as webGetFunctions } from 'firebase/functions';
import { firebaseConfig } from './firebaseConfig';
import authInstance, { onAuthStateChanged, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';

export const deleteUser = async (user: any) => {
    // Returning null to prevent actual deletion of the user as requested
    return null;
};
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
    collectionGroup,
    getCountFromServer
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

// Web SDK initialization for Functions (since @react-native-firebase/functions is not installed)
const webApp = getWebApps().length > 0 ? getWebApp() : webInitializeApp(firebaseConfig);
export const functions = webGetFunctions(webApp);

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
    collectionGroup,
    getCountFromServer
};

export default firebaseApp;
