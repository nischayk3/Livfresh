import React, { useState, useEffect } from 'react';
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
  Image,
  Keyboard,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { requestOTP } from '../../services/auth';
import { checkUserExists } from '../../services/firestore';
import { useAuthStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

const { width } = Dimensions.get('window');

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

    // Auto-dismiss keyboard when 10 digits are entered
    if (formatted.length === 10) {
      Keyboard.dismiss();
    }
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
          {/* Logo & Branding */}
          <View style={styles.brandingContainer}>
            <Image
              source={require('../../../assets/spinit_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Spinit</Text>
            <Text style={styles.tagline}>Premium Laundry Services</Text>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.heading}>Welcome Back!</Text>
            <Text style={styles.subtitle}>
              Enter your mobile number to login or signup
            </Text>
          </View>

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
                placeholder="Mobile Number"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="number-pad"
                maxLength={10}
                placeholderTextColor={COLORS.textLight}
                autoFocus={true}
                selectionColor={COLORS.primary}
              />
              {phone.length === 10 && (
                <View style={styles.checkContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
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
                <Text style={styles.buttonText}>Get OTP</Text>
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
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    justifyContent: 'center', // Center content vertically
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  welcomeContainer: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  heading: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.xs,
    color: COLORS.text,
    textAlign: 'center',
    fontSize: 24,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: SPACING.xl,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.backgroundLight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 56,
    ...SHADOWS.sm,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: 70,
  },
  prefixIcon: {
    display: 'none', // Hiding icon for cleaner look, just text +91
  },
  phonePrefixText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 18,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  checkContainer: {
    paddingRight: SPACING.md,
  },
  buttonContainer: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  button: {
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    marginRight: SPACING.xs,
    fontSize: 18,
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
