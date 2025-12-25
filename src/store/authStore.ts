import { create } from 'zustand';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

// Session timeout: 12 hours in milliseconds
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000;

interface User {
  uid: string;
  phone: string;
  name: string;
  subscriptionStatus?: 'active' | 'inactive';
  credits?: number;
  subscriptionType?: 'schedule' | 'credits';
  subscriptionSchedule?: {
    pickupDay?: string;
    pickupTime?: string;
    deliveryDay?: string;
    deliveryTime?: string;
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
}));
