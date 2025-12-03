import { create } from 'zustand';

interface User {
  uid: string;
  phone: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  // Store OTP request data
  otpPhone: string;
  otpName: string;
  setOTPData: (phone: string, name: string) => void;
  clearOTPData: () => void;
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  loading: false,
  error: null,
  otpPhone: '',
  otpName: '',
  setOTPData: (phone, name) => set({ otpPhone: phone, otpName: name }),
  clearOTPData: () => set({ otpPhone: '', otpName: '' }),
  setUser: (user) => set({ user, isLoggedIn: true, error: null }),
  clearUser: () => set({ user: null, isLoggedIn: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, isLoggedIn: false, error: null, otpPhone: '', otpName: '' }),
}));

