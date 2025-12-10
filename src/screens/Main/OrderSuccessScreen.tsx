import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../utils/constants';

// NOTE: Ideally use Lottie here, but for now using a custom Animated sequence 
// to guarantee it works without external asset dependencies immediately. 
// If user has Lottie assets, we can swap this out easily.

export const OrderSuccessScreen: React.FC = () => {
    const navigation = useNavigation();
    const scaleValue = useRef(new Animated.Value(0)).current;
    const fadeValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.elastic(1.5),
            }),
            Animated.timing(fadeValue, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handleViewOrders = () => {
        // Reset stack and navigate to MyOrders tab
        navigation.navigate('MainTabs' as never, { screen: 'MyOrders' } as never);
    };

    const handleBackHome = () => {
        navigation.navigate('MainTabs' as never, { screen: 'Home' } as never);
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleValue }] }]}>
                    <View style={styles.circle}>
                        <Ionicons name="checkmark" size={80} color="#FFFFFF" />
                    </View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, { opacity: fadeValue }]}>
                    <Text style={styles.title}>Order Confirmed!</Text>
                    <Text style={styles.subtitle}>
                        Your laundry pickup has been scheduled successfully.
                    </Text>
                    <Text style={styles.subtext}>
                        Our delivery partner will arrive at your location shortly.
                    </Text>
                </Animated.View>
            </View>

            <Animated.View style={[styles.footer, { opacity: fadeValue }]}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleViewOrders}>
                    <Text style={styles.primaryButtonText}>Check Order Status</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleBackHome}>
                    <Text style={styles.secondaryButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    content: {
        alignItems: 'center',
        flex: 0.7,
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: SPACING.xl,
    },
    circle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.success,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        ...TYPOGRAPHY.heading,
        fontSize: 28,
        color: COLORS.text,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        lineHeight: 24,
    },
    subtext: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textLight,
        textAlign: 'center',
        maxWidth: 260,
    },
    footer: {
        flex: 0.3,
        justifyContent: 'flex-end',
        gap: SPACING.md,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryButton: {
        paddingVertical: 16,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: 16,
    },
});
