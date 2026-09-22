import firebase from '@react-native-firebase/app';
import { firebaseConfig } from './firebaseConfig';
import authInstance, { onAuthStateChanged, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';

export const deleteUser = async (user: any) => {
    if (user && typeof user.delete === 'function') {
        return await user.delete();
    }
    const currentUser = authInstance().currentUser;
    if (currentUser && typeof currentUser.delete === 'function') {
        return await currentUser.delete();
    }
    throw new Error('No user logged in to delete');
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
