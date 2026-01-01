import { create } from 'zustand';
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult, signOut } from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from '../services/firebase';
import { isAdminPhone } from '../services/adminFirestore';

// Store OTP confirmation result during admin verification flow
let currentAdminConfirmationResult: ConfirmationResult | null = null;
let currentAdminPhoneNumber: string = '';

// Helper to get or create verifier (web only)
const getVerifier = () => {
  if (Platform.OS !== 'web') return null;
  
  // @ts-ignore - RecaptchaVerifier isn't typed on window clearly
  if (!(window as any).adminRecaptchaVerifier) {
    try {
      (window as any).adminRecaptchaVerifier = new RecaptchaVerifier(auth, 'admin-recaptcha-container', {
        size: 'invisible',
        callback: () => console.log('Admin Recaptcha verified')
      });
    } catch (e) {
      console.warn("Admin Recaptcha init warning:", e);
    }
  }
  return (window as any).adminRecaptchaVerifier;
};

interface AdminAuthState {
  isAdmin: boolean;
  adminPhone: string | null;
  loading: boolean;
  error: string | null;
  
  // Check if phone is admin
  checkAdminAccess: (phone: string) => Promise<boolean>;
  
  // Send OTP to admin phone
  sendOTP: (phone: string) => Promise<void>;
  
  // Verify OTP and login
  verifyOTP: (otp: string) => Promise<boolean>;
  
  // Logout
  logout: () => Promise<void>;
  
  // Clear state
  clearError: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  isAdmin: false,
  adminPhone: null,
  loading: false,
  error: null,

  checkAdminAccess: async (phone: string) => {
    try {
      const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
      const formattedPhone = `+91${cleanPhone}`;
      return await isAdminPhone(formattedPhone);
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  },

  sendOTP: async (phone: string) => {
    set({ loading: true, error: null });
    
    try {
      // Clean and format phone
      const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
      const formattedPhone = `+91${cleanPhone}`;
      
      // Check if phone is admin
      const hasAccess = await get().checkAdminAccess(formattedPhone);
      if (!hasAccess) {
        throw new Error('This phone number is not authorized for admin access');
      }
      
      currentAdminPhoneNumber = formattedPhone;
      
      // TEST MODE: If Firebase OTP is not enabled, skip actual OTP sending
      // Store a mock confirmation result for testing
      const TEST_MODE = true; // Set to false when Firebase OTP is enabled
      
      if (TEST_MODE) {
        // Create a mock confirmation result for testing
        currentAdminConfirmationResult = {
          verificationId: 'TEST_VERIFICATION_ID',
          confirm: async (code: string) => {
            // Accept any 6-digit code in test mode
            if (code.length === 6 && /^\d+$/.test(code)) {
              // Create a mock user credential
              return {
                user: {
                  uid: 'test_admin_uid',
                  phoneNumber: formattedPhone,
                },
              } as any;
            }
            throw new Error('Invalid OTP code');
          },
        } as any;
        
        set({ loading: false });
        return;
      }
      
      // Production: Setup reCAPTCHA (web only)
      let appVerifier = null;
      if (Platform.OS === 'web') {
        appVerifier = getVerifier();
      }
      
      // Send OTP
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier || undefined);
      currentAdminConfirmationResult = confirmation;
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error sending admin OTP:', error);
      set({ 
        loading: false, 
        error: error.message || 'Failed to send OTP. Please try again.' 
      });
      throw error;
    }
  },

  verifyOTP: async (otp: string) => {
    if (!currentAdminConfirmationResult) {
      const error = 'No OTP request found. Please request OTP again.';
      set({ error });
      throw new Error(error);
    }

    set({ loading: true, error: null });

    try {
      // TEST MODE: If using mock confirmation, verify with mock
      const TEST_MODE = true; // Set to false when Firebase OTP is enabled
      
      if (TEST_MODE && currentAdminConfirmationResult.verificationId === 'TEST_VERIFICATION_ID') {
        // Accept any 6-digit OTP in test mode
        if (otp.length === 6 && /^\d+$/.test(otp)) {
          // Set admin state with test phone
          set({ 
            isAdmin: true, 
            adminPhone: currentAdminPhoneNumber,
            loading: false 
          });
          
          // Cleanup
          currentAdminConfirmationResult = null;
          currentAdminPhoneNumber = '';
          
          return true;
        } else {
          throw new Error('Please enter a valid 6-digit OTP');
        }
      }
      
      // Production: Verify OTP with Firebase
      const userCredential = await currentAdminConfirmationResult.confirm(otp);
      const user = userCredential.user;
      
      if (!user.phoneNumber) {
        throw new Error('Phone number not found in user credential');
      }
      
      // Double-check admin access
      const hasAccess = await get().checkAdminAccess(user.phoneNumber);
      if (!hasAccess) {
        await signOut(auth);
        throw new Error('This phone number is not authorized for admin access');
      }
      
      // Set admin state
      set({ 
        isAdmin: true, 
        adminPhone: user.phoneNumber,
        loading: false 
      });
      
      // Cleanup
      currentAdminConfirmationResult = null;
      currentAdminPhoneNumber = '';
      
      return true;
    } catch (error: any) {
      console.error('Error verifying admin OTP:', error);
      set({ 
        loading: false, 
        error: error.message || 'Invalid OTP. Please try again.' 
      });
      
      // Cleanup on error
      currentAdminConfirmationResult = null;
      currentAdminPhoneNumber = '';
      
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ 
        isAdmin: false, 
        adminPhone: null,
        error: null 
      });
      
      // Cleanup
      currentAdminConfirmationResult = null;
      currentAdminPhoneNumber = '';
    } catch (error: any) {
      console.error('Error logging out admin:', error);
      set({ error: error.message || 'Failed to logout' });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

