import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useUIStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

export const AdminLoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { 
    sendOTP, 
    verifyOTP, 
    loading, 
    error, 
    clearError,
    checkAdminAccess 
  } = useAdminAuthStore();
  const { showAlert } = useUIStore();

  const [phone, setPhone] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Focus first OTP input when OTP screen shows
  useEffect(() => {
    if (showOTP && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [showOTP]);

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    return numbers.slice(0, 10);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
    clearError();
    
    if (formatted.length === 10) {
      Keyboard.dismiss();
    }
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      showAlert({
        title: 'Invalid Phone',
        message: 'Please enter a valid 10-digit phone number',
        type: 'warning',
      });
      return;
    }

    setSendingOTP(true);
    clearError();

    try {
      // Check admin access first
      const hasAccess = await checkAdminAccess(phone);
      if (!hasAccess) {
        showAlert({
          title: 'Unauthorized',
          message: 'This phone number is not authorized for admin access',
          type: 'error',
        });
        setSendingOTP(false);
        return;
      }

      await sendOTP(phone);
      setShowOTP(true);
      // TEST MODE: Show different message
      showAlert({
        title: 'OTP Ready',
        message: 'Test Mode: Enter any 6-digit code (e.g., 123456)',
        type: 'success',
      });
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to send OTP. Please try again.',
        type: 'error',
      });
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    clearError();

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      showAlert({
        title: 'Invalid OTP',
        message: 'Please enter the complete 6-digit OTP',
        type: 'warning',
      });
      return;
    }

    setVerifyingOTP(true);
    clearError();

    try {
      const success = await verifyOTP(otpCode);
      if (success) {
        showAlert({
          title: 'Login Successful',
          message: 'Welcome to Admin Panel',
          type: 'success',
        });
        // Navigate to admin dashboard
        (navigation as any).navigate('Admin', { screen: 'AdminTabs', params: { screen: 'Dashboard' } });
      }
    } catch (error: any) {
      showAlert({
        title: 'Verification Failed',
        message: error.message || 'Invalid OTP. Please try again.',
        type: 'error',
      });
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleBack = () => {
    if (showOTP) {
      setShowOTP(false);
      setOtp(['', '', '', '', '', '']);
      clearError();
    } else {
      navigation.goBack();
    }
  };

  const isPhoneValid = phone.length === 10;
  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Login</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Admin Access</Text>
          <Text style={styles.subtitle}>
            Restricted access for administrators only
          </Text>

          {!showOTP ? (
            <>
              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <View style={styles.phonePrefix}>
                  <Ionicons name="call" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter admin phone number"
                  placeholderTextColor={COLORS.textSecondary}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus={false}
                  editable={!sendingOTP}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (!isPhoneValid || sendingOTP) && styles.continueButtonDisabled,
                ]}
                onPress={handleSendOTP}
                disabled={!isPhoneValid || sendingOTP}
                activeOpacity={0.8}
              >
                {sendingOTP ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <Text style={styles.otpLabel}>
                Enter OTP sent to +91 {phone}
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    onKeyPress={(e) => handleOtpKeyDown(index, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    textContentType="oneTimeCode"
                  />
                ))}
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (!isOtpComplete || verifyingOTP) && styles.verifyButtonDisabled,
                ]}
                onPress={handleVerifyOTP}
                disabled={!isOtpComplete || verifyingOTP}
                activeOpacity={0.8}
              >
                {verifyingOTP ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleSendOTP}
                disabled={sendingOTP}
              >
                <Text style={styles.resendButtonText}>
                  {sendingOTP ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* reCAPTCHA container for web */}
      {Platform.OS === 'web' && (
        <div id="admin-recaptcha-container" style={{ display: 'none' }} />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl * 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    width: '100%',
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    gap: SPACING.xs,
  },
  prefixText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    width: '100%',
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    flex: 1,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...SHADOWS.md,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  otpLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    ...TYPOGRAPHY.heading,
    fontSize: 24,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  resendButton: {
    paddingVertical: SPACING.sm,
  },
  resendButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
});

