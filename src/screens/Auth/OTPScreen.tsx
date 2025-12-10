import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { verifyOTP, getCurrentPhoneNumber } from '../../services/auth';
import { useAuthStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

export const OTPScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { otpPhone, setUser, setLoading } = useAuthStore();
  const phone = otpPhone || getCurrentPhoneNumber();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLocalLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [error, setError] = useState('');

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Auto-dismiss keyboard when all 6 digits are entered
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6) {
      // Small delay to ensure last digit is set
      setTimeout(() => {
        Keyboard.dismiss();
      }, 100);
    }
  }, [otp]);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const pastedOtp = text.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const lastFilledIndex = Math.min(index + pastedOtp.length - 1, 5);

      // If all 6 digits pasted, dismiss keyboard
      if (newOtp.every(d => d !== '')) {
        setTimeout(() => {
          inputRefs[lastFilledIndex].current?.blur();
          Keyboard.dismiss();
        }, 100);
      } else {
        inputRefs[lastFilledIndex].current?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');

    if (text && index < 5) {
      // Move to next input
      inputRefs[index + 1].current?.focus();
    } else if (text && index === 5) {
      // Last digit entered - dismiss keyboard
      setTimeout(() => {
        inputRefs[index].current?.blur();
        Keyboard.dismiss();
      }, 100);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter 6-digit code');
      return;
    }

    // Ensure keyboard is dismissed
    Keyboard.dismiss();

    setLocalLoading(true);
    setLoading(true);
    setError('');

    try {
      const user = await verifyOTP(otpCode);

      // Get user name from Firestore (it was saved during verification)
      const { checkUserExists } = await import('../../services/firestore');
      const userData: any = await checkUserExists(phone);

      setUser({
        uid: user.uid,
        phone: user.phoneNumber || phone,
        name: userData?.name || ''
      });

      // Navigation is handled by RootNavigator/Auth state change
      // navigation.navigate('LocationPermission' as never); 
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      // Re-focus first input on error
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 300);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendAttempts >= 3) {
      Alert.alert('Limit Reached', 'Maximum resend attempts reached. Please contact support.');
      return;
    }

    try {
      const { requestOTP } = await import('../../services/auth');
      await requestOTP(phone);
      Alert.alert('OTP Resent', 'A new OTP has been sent to your number');
      setResendCountdown(30);
      setResendAttempts(resendAttempts + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  const last4Digits = phone ? phone.slice(-4) : '';
  const isOtpComplete = otp.join('').length === 6;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={[COLORS.backgroundGradient, COLORS.background]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { paddingTop: insets.top + SPACING.lg }]}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={64} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.heading}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneText}>+91 {last4Digits}</Text>
            </Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={inputRefs[index]}
                  style={[
                    styles.otpInput,
                    error && styles.otpInputError,
                    digit && styles.otpInputFilled,
                    isOtpComplete && styles.otpInputComplete,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  returnKeyType={index === 5 ? 'done' : 'next'}
                  onSubmitEditing={() => {
                    if (index < 5) {
                      inputRefs[index + 1].current?.focus();
                    } else {
                      Keyboard.dismiss();
                    }
                  }}
                  blurOnSubmit={index === 5}
                />
              ))}
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isOtpComplete && (
              <View style={styles.completeIndicator}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.completeText}>OTP entered</Text>
              </View>
            )}

            <View style={styles.resendContainer}>
              {resendCountdown > 0 ? (
                <Text style={styles.resendText}>
                  Resend code in <Text style={styles.countdownText}>{resendCountdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleVerify}
              disabled={!isOtpComplete || loading}
              style={styles.verifyButton}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <LinearGradient
                  colors={isOtpComplete ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.disabled, COLORS.disabled]}
                  style={styles.verifyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.verifyButtonText}>Verify</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.verifyIcon} />
                </LinearGradient>
              )}
            </TouchableOpacity>

            {resendAttempts >= 3 && (
              <TouchableOpacity style={styles.supportButton}>
                <Ionicons name="help-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.supportText}>Contact Support</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundLight,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xl * 2,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneText: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  otpInput: {
    width: 52,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  otpInputComplete: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    marginLeft: SPACING.xs,
  },
  completeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  completeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.success,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resendText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  countdownText: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  resendButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  resendButtonText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.primary,
  },
  verifyButton: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  verifyButtonGradient: {
    paddingVertical: SPACING.md + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    marginRight: SPACING.xs,
  },
  verifyIcon: {
    marginLeft: SPACING.xs,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  supportText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
});
