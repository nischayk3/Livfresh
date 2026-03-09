import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../utils/constants';

const STEPS = [
    {
        icon: 'phone-portrait-outline',
        title: 'Book',
        desc: 'Schedule a pickup in seconds',
    },
    {
        icon: 'bicycle-outline',
        title: 'Pickup',
        desc: 'We collect from your door',
    },
    {
        icon: 'water-outline',
        title: 'Wash',
        desc: 'Expert cleaning & premium care',
    },
    {
        icon: 'shirt-outline',
        title: 'Deliver',
        desc: 'Fresh clothes back in 24h',
    }
];

export const HowItWorks: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>How it Works</Text>
            <View style={styles.stepsContainer}>
                {STEPS.map((step, index) => (
                    <View key={index} style={styles.step}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={step.icon as any} size={28} color={COLORS.primary} />
                        </View>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDesc}>{step.desc}</Text>
                        {index < STEPS.length - 1 && (
                            <View style={styles.connector} />
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl, // Spacing before Testimonials
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.lg,
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    step: {
        alignItems: 'center',
        width: '23%',
        position: 'relative',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        zIndex: 2,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    stepTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
        textAlign: 'center',
    },
    stepDesc: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 14,
    },
    connector: {
        position: 'absolute',
        top: 24,
        left: '50%',
        width: '100%',
        height: 2,
        backgroundColor: '#E2E8F0',
        zIndex: 1,
        // trick to extend to next item
        transform: [{ translateX: 24 }] // moves it to the right
    }
});
