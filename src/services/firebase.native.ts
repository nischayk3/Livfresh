import { Platform } from 'react-native';
import firebase from '@react-native-firebase/app';
import authModule from '@react-native-firebase/auth';
import firestoreModule from '@react-native-firebase/firestore';

// Native SDK initializes automatically via google-services.json.
// However, we ensure safe access to the default app.
const firebaseApp = firebase.apps.length > 0 ? firebase.app() : null;

// Export instances to match web API
export const auth = authModule();
export const db = firestoreModule();
export const firestoreInstance = db; // For internal convenience if needed

export default firebaseApp;
