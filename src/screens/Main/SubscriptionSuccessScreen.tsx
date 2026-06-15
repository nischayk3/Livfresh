import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { ASSET_URLS } from '../../utils/assetUrls';

const successIllustration = { uri: ASSET_URLS.subscription_illustration };

export const SubscriptionSuccessScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { subscriptionId, planType, creditCount, totalAmount } = (route.params as any) || {};

    const scaleValue = useRef(new Animated.Value(0)).current;
    const fadeValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.elastic(1.2),
            }),
            Animated.timing(fadeValue, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();

        // Auto-navigate to Credits tab after 3 seconds
        const timer = setTimeout(() => {
            (navigation as any).navigate('Main', {
                screen: 'MainTabs',
                params: { screen: 'Credits' }
            });
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigation, scaleValue, fadeValue]);

    const handleBackHome = () => {
        (navigation as any).navigate('Main', {
            screen: 'MainTabs',
            params: { screen: 'Home' }
        });
    };

    const handleViewCredits = () => {
        (navigation as any).navigate('Main', {
            screen: 'MainTabs',
            params: { screen: 'Credits' }
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Animated.View style={[styles.illustrationContainer, { transform: [{ scale: scaleValue }] }]}>
                    <Image source={successIllustration} style={styles.illustration} resizeMode="contain" />
                    <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={40} color="#FFFFFF" />
                    </View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, { opacity: fadeValue }]}>
                    <Text style={styles.title}>Credits Purchased Successfully! 🎉</Text>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Plan Type</Text>
                            <Text style={styles.summaryValue}>
                                {planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'Credit'} Plan
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Credits Purchased</Text>
                            <Text style={styles.summaryValue}>{creditCount || 0} Credits</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Validity</Text>
                            <Text style={styles.summaryValue}>30 days</Text>
                        </View>
                        <View style={[styles.summaryItem, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>₹{totalAmount || 0}</Text>
                        </View>
                    </View>

                    <Text style={styles.benefitsText}>
                        Credits added successfully! You can start using them now.
                    </Text>
                </Animated.View>
            </View>

            <Animated.View style={[styles.footer, { opacity: fadeValue, paddingBottom: insets.bottom + SPACING.xl }]}>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, { flex: 1 }]}
                        onPress={handleBackHome}
                    >
                        <Text style={styles.secondaryButtonText}>Go to Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.primaryButton, { flex: 1 }]}
                        onPress={handleViewCredits}
                    >
                        <Text style={styles.primaryButtonText}>View Credits</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.autoNavigateText}>
                    Redirecting to Credits in 3 seconds...
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    illustrationContainer: {
        width: '100%',
        height: 200, // Horizontal aspect ratio
        marginBottom: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: '35%', // Centerish relative to image
        backgroundColor: COLORS.success,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    textContainer: {
        alignItems: 'center',
        width: '100%',
    },
    // welcomeText removed
    title: {
        ...TYPOGRAPHY.heading,
        fontSize: 28,
        color: COLORS.text,
        marginBottom: SPACING.xl,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    summaryCard: {
        backgroundColor: COLORS.backgroundLight,
        width: '100%',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    summaryLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.md,
        marginTop: SPACING.xs,
        marginBottom: 0,
    },
    totalLabel: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 18,
    },
    totalValue: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 20,
        color: COLORS.primary,
    },
    benefitsText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.md,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...SHADOWS.md,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: COLORS.background,
        paddingVertical: 18,
        borderRadius: RADIUS.xl,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    autoNavigateText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.sm,
        fontSize: 11,
    },
});
