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
import { requestOTP, setUserData } from '../../services/auth';
import { useAuthStore, useUIStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/constants';
import { BrandLoader } from '../../components/BrandLoader';

export const WelcomeBackScreen: React.FC = () => {
  const navigation = useNavigation();
  const { setLoading, setError } = useAuthStore();
  const { showAlert } = useUIStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLocalLoading] = useState(false);

  const formatPhone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    return numbers.slice(0, 10);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
  };

  const isValid = name.length >= 2 && phone.length === 10 && termsAccepted;

  const handleContinue = async () => {
    if (!isValid) {
      showAlert({
        title: 'Validation Error',
        message: 'Please fill all fields correctly',
        type: 'warning'
      });
      return;
    }

    setLocalLoading(true);
    setLoading(true);

    try {
      const formattedPhone = `+91${phone}`;

      // Store name for later use
      setUserData({ name });

      // Request OTP
      await requestOTP(formattedPhone);

      // Store phone and name in store (not navigation params)
      const { setOTPData } = useAuthStore.getState();
      setOTPData(formattedPhone, name);

      navigation.navigate('OTP' as never);
    } catch (error: any) {
      console.error('Phone auth error:', error);
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to send OTP. Please try again.',
        type: 'error'
      });
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Please enter your details to continue</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneContainer}>
            <Text style={styles.phonePrefix}>+91</Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter phone number"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setTermsAccepted(!termsAccepted)}
          style={styles.checkboxContainer}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the <Text style={styles.link}>Terms & Conditions</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isValid || loading}
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        {/* Branded Loader overlay */}
        {loading && <BrandLoader fullscreen message="Sending OTP..." />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl * 2,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xl,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
    marginBottom: SPACING.sm,
    color: COLORS.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  phonePrefix: {
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 24,
    width: 1,
    backgroundColor: COLORS.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: SPACING.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.border,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: 12,
  },
  checkboxText: {
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
    color: COLORS.textSecondary,
  },
  link: {
    color: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.background,
  },
});
