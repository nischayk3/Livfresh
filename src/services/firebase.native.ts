import { Platform } from 'react-native';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Native SDK initializes automatically via google-services.json.
// However, we ensure safe access to the default app.
const firebaseApp = firebase.apps.length > 0 ? firebase.app() : null;

export { auth, firestore };
export default firebaseApp;
