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
                            <Ionicons name={step.icon as any} size={24} color={COLORS.primary} />
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
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        zIndex: 2,
        borderWidth: 2,
        borderColor: '#FFFFFF',
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
