import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ScrollView,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { verifyOTP, getCurrentPhoneNumber } from '../../services/auth';
import { useAuthStore, useUIStore } from '../../store';
import { trackPixelEvent } from '../../utils/pixel';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { BrandLoader } from '../../components/BrandLoader';
import { AnimatedButton } from '../../components/AnimatedButton';
import { MotiView } from 'moti';

export const OTPScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const params = route.params;
    const insets = useSafeAreaInsets();
    const { otpPhone, otpName, setUser, setLoading } = useAuthStore();
    const { showAlert } = useUIStore();
    const phone = otpPhone || getCurrentPhoneNumber();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [localLoading, setLocalLoading] = useState(false);
    const isVerifying = useRef(false);
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

    // Ref for the hidden input (Web/Auto-fill support)
    const hiddenInputRef = useRef<TextInput>(null);

    // Focus the hidden input on mount
    useEffect(() => {
        if (Platform.OS === 'web') {
            hiddenInputRef.current?.focus();
        } else {
            inputRefs[0].current?.focus();
        }
    }, []);

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

    const handleHiddenInputChange = (text: string) => {
        // Sanitize input (digits only)
        const sanitized = text.replace(/[^0-9]/g, '');
        const code = sanitized.slice(0, 6).split('');
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) {
            newOtp[i] = code[i] || '';
        }
        setOtp(newOtp);
        setError('');

        if (sanitized.length === 6) {
            Keyboard.dismiss();
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        // Only used for manual typing on specific boxes if hidden input fails
        if (text.length > 1) {
            handleHiddenInputChange(text);
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        setError('');

        if (text && index < 5) {
            inputRefs[index + 1].current?.focus();
        } else if (text && index === 5) {
            Keyboard.dismiss();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handleVerify = async () => {
        if (isVerifying.current) return;

        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter 6-digit code');
            return;
        }

        // Ensure keyboard is dismissed
        Keyboard.dismiss();

        isVerifying.current = true;
        setLocalLoading(true);
        setLoading(true);
        setError('');

        try {
            const firebaseUser = await verifyOTP(otpCode);

            // Diagnostic: Check if user exists in Firestore AFTER successful verification
            // This is now allowed because the user is AUTHENTICATED.
            console.log('🔍 Diagnostic: Fetching user profile for UID:', firebaseUser.uid);
            const { getUser } = await import('../../services/firestore');
            const userData = await getUser(firebaseUser.uid);
            console.log('🔍 Diagnostic: Firestore result:', userData ? 'User Found' : 'User NOT Found');

            if (userData) {
                // EXISTING USER: Set store and RootNavigator handles the swap to 'Main'
                setUser({
                    uid: firebaseUser.uid,
                    phone: firebaseUser.phoneNumber || phone,
                    name: userData.name || '',
                    ...userData
                });
                console.log('✅ Existing user detected, state updated');
            } else {
                // NEW USER: Set minimal state (name: '') to trigger UserDetails in RootNavigator
                console.log('🆕 New user detected, triggering UserDetails via state');
                setUser({
                    uid: firebaseUser.uid,
                    phone: firebaseUser.phoneNumber || phone,
                    name: ''
                } as any);
            }

            // Track Registration/Login Success
            trackPixelEvent('CompleteRegistration', {
                currency: 'INR',
                value: 0
            });
        } catch (error: any) {
            console.error('OTP verification error:', error);
            setError(error.message || 'Invalid OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            // Re-focus first input on error
            setTimeout(() => {
                inputRefs[0].current?.focus();
            }, 300);
        } finally {
            isVerifying.current = false;
            setLocalLoading(false);
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendAttempts >= 3) {
            showAlert({
                title: 'Limit Reached',
                message: 'Maximum resend attempts reached. Please contact support.',
                type: 'warning'
            });
            return;
        }

        try {
            const { requestOTP } = await import('../../services/auth');
            await requestOTP(phone);
            showAlert({
                title: 'OTP Resent',
                message: 'A new OTP has been sent to your number',
                type: 'success'
            });
            setResendCountdown(30);
            setResendAttempts(resendAttempts + 1);
        } catch (error) {
            showAlert({
                title: 'Error',
                message: 'Failed to resend OTP. Please try again.',
                type: 'error'
            });
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
                        <MotiView
                            from={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 200, type: 'timing', duration: 800 }}
                            style={styles.illustrationContainer}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-closed" size={64} color={COLORS.primary} />
                            </View>
                        </MotiView>

                        <Text style={styles.heading}>Verify OTP</Text>
                        <Text style={styles.subtitle}>
                            Enter the 6-digit code sent to{'\n'}
                            <Text style={styles.phoneText}>{phone}</Text>
                        </Text>

                        <View style={styles.otpContainer}>
                            {/* Hidden Input for Auto-fill (Web & Mobile) */}
                            <TextInput
                                ref={hiddenInputRef}
                                style={styles.hiddenInput}
                                value={otp.join('')}
                                onChangeText={handleHiddenInputChange}
                                keyboardType="number-pad"
                                maxLength={6}
                                textContentType="oneTimeCode"
                                autoComplete="one-time-code"
                                caretHidden={true}
                                autoFocus={true} // Auto-focus on mount
                            />

                            {otp.map((digit, index) => (
                                <TouchableOpacity
                                    activeOpacity={1}
                                    key={index}
                                    onPress={() => hiddenInputRef.current?.focus()}
                                    style={[
                                        styles.otpInput,
                                        error && styles.otpInputError,
                                        digit && styles.otpInputFilled,
                                        isOtpComplete && styles.otpInputComplete,
                                    ]}
                                >
                                    <Text style={styles.otpDigit}>{digit}</Text>
                                </TouchableOpacity>
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

                        <AnimatedButton
                            onPress={handleVerify}
                            disabled={!isOtpComplete || localLoading}
                            style={styles.verifyButton}
                        >
                            <LinearGradient
                                colors={isOtpComplete ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.disabled, COLORS.disabled]}
                                style={styles.verifyButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.verifyButtonText}>Verify</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.verifyIcon} />
                            </LinearGradient>
                        </AnimatedButton>

                        {resendAttempts >= 3 && (
                            <TouchableOpacity style={styles.supportButton}>
                                <Ionicons name="help-circle-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.supportText}>Contact Support</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                {/* Fullscreen loader overlay */}
                {localLoading && <BrandLoader fullscreen message="Verifying OTP..." />}
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
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
        zIndex: 10,
    },
    otpDigit: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 60,
    },
});
