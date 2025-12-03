import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { requestOTP } from '../../services/auth';
import { checkUserExists } from '../../services/firestore';
import { useAuthStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

export const PhoneLoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { setLoading, setError } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLocalLoading] = useState(false);

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    return numbers.slice(0, 10);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
  };

  const handleContinue = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLocalLoading(true);
    setLoading(true);

    try {
      const formattedPhone = `+91${phone}`;
      
      // Check if user exists
      const existingUser = await checkUserExists(formattedPhone);
      
      // Request OTP
      await requestOTP(formattedPhone);
      
      // Store phone in store
      const { setOTPData } = useAuthStore.getState();
      setOTPData(formattedPhone, existingUser?.name || '');
      
      // Navigate based on user existence
      if (existingUser) {
        // Existing user - go directly to OTP
        navigation.navigate('OTP' as never);
      } else {
        // New user - collect details first
        navigation.navigate('UserDetails' as never, { phone: formattedPhone } as never);
      }
    } catch (error: any) {
      console.error('Phone auth error:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
      setError(error.message);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
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
          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="phone-portrait" size={80} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.heading}>Welcome to Spinit</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to get started with{'\n'}
            premium laundry services
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.phoneInputWrapper}>
              <LinearGradient
                colors={[COLORS.primaryLight, COLORS.primary]}
                style={styles.phonePrefix}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" style={styles.prefixIcon} />
                <Text style={styles.phonePrefixText}>+91</Text>
              </LinearGradient>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter phone number"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={COLORS.textLight}
                autoFocus
              />
              {phone.length === 10 && (
                <View style={styles.checkContainer}>
                  <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={phone.length !== 10 || loading}
            style={styles.buttonContainer}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.button}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : (
              <LinearGradient
                colors={phone.length === 10 ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.disabled, COLORS.disabled]}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              </LinearGradient>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xl,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
    paddingVertical: SPACING.lg,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
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
  inputContainer: {
    marginBottom: SPACING.xl * 2,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundLight,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 6,
    minWidth: 100,
  },
  prefixIcon: {
    marginRight: SPACING.xs,
  },
  phonePrefixText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 6,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '500',
  },
  checkContainer: {
    paddingRight: SPACING.md,
  },
  buttonContainer: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  button: {
    paddingVertical: SPACING.md + 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    marginRight: SPACING.xs,
  },
  buttonIcon: {
    marginLeft: SPACING.xs,
  },
  termsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
