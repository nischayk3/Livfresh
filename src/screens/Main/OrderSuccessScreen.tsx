import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { AnimatedButton } from '../../components/AnimatedButton';

// NOTE: Ideally use Lottie here, but for now using a custom Animated sequence 
// to guarantee it works without external asset dependencies immediately. 
// If user has Lottie assets, we can swap this out easily.

export const OrderSuccessScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const handleViewOrders = () => {
        (navigation as any).navigate('MainTabs', { screen: 'MyOrders' });
    };

    const handleBackHome = () => {
        (navigation as any).navigate('MainTabs', { screen: 'Home' });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#E0E7FF', '#F8FAFC']}
                style={StyleSheet.absoluteFill}
            />

            <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
                <MotiView
                    from={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 200 }}
                    style={styles.iconWrapper}
                >
                    <LinearGradient
                        colors={[COLORS.success, '#10B981']}
                        style={styles.iconCircle}
                    >
                        <Ionicons name="checkmark" size={60} color="#FFFFFF" />
                    </LinearGradient>
                </MotiView>

                <MotiView
                    from={{ translateY: 20, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    transition={{ delay: 500 }}
                    style={styles.textContainer}
                >
                    <Text style={styles.title}>Order Confirmed!</Text>
                    <Text style={styles.subtitle}>
                        Sit back and relax. We're on our way to pick up your clothes.
                    </Text>
                </MotiView>

                {/* Trust Seal */}
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 800 }}
                    style={styles.trustSeal}
                >
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                    <Text style={styles.trustSealText}>Premium Care Guaranteed</Text>
                </MotiView>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <AnimatedButton
                    onPress={handleViewOrders}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>Track My Order</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </AnimatedButton>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleBackHome}
                    activeOpacity={0.6}
                >
                    <Text style={styles.secondaryButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    iconWrapper: {
        marginBottom: 40,
        ...SHADOWS.md,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.success,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        ...TYPOGRAPHY.display,
        fontSize: 32,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        fontSize: 17,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    trustSeal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
        ...SHADOWS.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    trustSealText: {
        ...TYPOGRAPHY.tiny,
        color: COLORS.primary,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    footer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...SHADOWS.primary,
    },
    primaryButtonText: {
        ...TYPOGRAPHY.button,
        color: '#FFFFFF',
        fontSize: 16,
    },
    secondaryButton: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.textSecondary,
        fontSize: 15,
    },
});
