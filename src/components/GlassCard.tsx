import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../utils/constants';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    intensity?: 'low' | 'medium' | 'high';
    cornerRadius?: keyof typeof RADIUS;
}

/**
 * A reusable premium card component with Glassmorphism 2.0 effects.
 * Uses semi-transparent backgrounds, subtle borders, and soft shadows.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 'medium',
    cornerRadius = 'xl',
}) => {
    const getGlassStyles = () => {
        let opacity = 0.7;
        let blur = 10;

        if (intensity === 'low') {
            opacity = 0.85;
            blur = 5;
        } else if (intensity === 'high') {
            opacity = 0.5;
            blur = 20;
        }

        return {
            backgroundColor: `rgba(255, 255, 255, ${opacity})`,
            ...(Platform.OS === 'web' ? { backdropFilter: `blur(${blur}px)` } : {}),
        };
    };

    return (
        <View style={[
            styles.card,
            getGlassStyles(),
            { borderRadius: RADIUS[cornerRadius] },
            style,
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...SHADOWS.md,
        overflow: 'hidden',
    },
});
