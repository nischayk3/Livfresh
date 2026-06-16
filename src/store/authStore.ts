import { create } from 'zustand';
import { auth, signOut, deleteUser } from '../services/firebase';
// import { deleteUserAccount } from '../services/firestore';
import { useAddressStore } from './addressStore';

// Session timeout: 12 hours in milliseconds
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

interface User {
  uid: string;
  phone: string;
  name: string;
  email: string | null;
  subscriptionStatus?: 'active' | 'inactive';
  credits?: number;
  subscriptionType?: 'schedule' | 'credits';
  subscriptionSchedule?: {
    pickupDay?: string;
    pickupTime?: string;
    deliveryDay?: string;
    deliveryTime?: string;
  };
  expoPushToken?: string | null;
  notificationPreferences?: {
    orderUpdates?: boolean;
    weeklyReminders?: boolean;
    promotions?: boolean;
  };
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  loginTimestamp: number | null;
  // Store OTP request data
  otpPhone: string;
  otpName: string;
  setOTPData: (phone: string, name: string) => void;
  clearOTPData: () => void;
  setUser: (user: User) => void;
  setLoginTimestamp: (timestamp: number) => void;
  isSessionExpired: () => boolean;
  updateSubscription: (status: 'active' | 'inactive', credits: number, type?: 'schedule' | 'credits', schedule?: any) => void;
  cancelLocalSubscription: () => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  loading: false,
  error: null,
  loginTimestamp: null,
  otpPhone: '',
  otpName: '',
  setOTPData: (phone, name) => set({ otpPhone: phone, otpName: name }),
  clearOTPData: () => set({ otpPhone: '', otpName: '' }),
  setUser: (user) => set({ user, isLoggedIn: true, error: null }),
  setLoginTimestamp: (timestamp) => set({ loginTimestamp: timestamp }),
  isSessionExpired: () => {
    const { loginTimestamp } = get();
    if (!loginTimestamp) return false;
    return Date.now() - loginTimestamp > SESSION_TIMEOUT_MS;
  },
  updateSubscription: (status, credits, type, schedule) =>
    set((state) => ({
      user: state.user ? {
        ...state.user,
        subscriptionStatus: status,
        credits: (state.user.credits || 0) + credits,
        subscriptionType: type,
        subscriptionSchedule: schedule
      } : null
    })),
  cancelLocalSubscription: () =>
    set((state) => ({
      user: state.user ? { ...state.user, subscriptionStatus: 'inactive', subscriptionSchedule: undefined, subscriptionType: undefined, credits: 0 } : null
    })),
  clearUser: () => set({ user: null, isLoggedIn: false, error: null, loginTimestamp: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  logout: async () => {
    try {
      // Sign out from Firebase Auth - this triggers onAuthStateChanged
      await signOut(auth);
      console.log('✅ Firebase signOut successful');
    } catch (error) {
      console.error('Firebase signOut error:', error);
    }
    // Clear other stores
    useAddressStore.getState().setHasSkippedLocation(false);
    useAddressStore.getState().clearCurrentAddress();

    // Clear local state
    set({
      user: null,
      isLoggedIn: false,
      error: null,
      otpPhone: '',
      otpName: '',
      loginTimestamp: null
    });
  },
  deleteAccount: async () => {
    try {
      set({ loading: true, error: null });
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No user logged in');
      }

      // 1. Delete Firestore Data
      // await deleteUserAccount(user.uid);

      // 2. Delete Firebase Auth User
      // This might throw 'auth/requires-recent-login'
      await deleteUser(user);

      console.log('✅ Account deleted successfully');

      // 3. Clear Local State (same as logout)
      useAddressStore.getState().setHasSkippedLocation(false);
      useAddressStore.getState().clearCurrentAddress();

      set({
        user: null,
        isLoggedIn: false,
        error: null,
        otpPhone: '',
        otpName: '',
        loginTimestamp: null
      });

    } catch (error: any) {
      console.error('Delete account error:', error);
      set({ error: error.message });
      throw error; // Re-throw to handle UI alerts
    } finally {
      set({ loading: false });
    }
  },
}));
