import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS, SHADOWS } from '../utils/constants';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    intensity?: 'low' | 'medium' | 'high';
    cornerRadius?: keyof typeof RADIUS;
}

/**
 * A reusable premium card component with Glassmorphism 2.0 effects.
 * Uses BlurView for native platforms and backdrop-filter for web.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 'medium',
    cornerRadius = 'xl',
}) => {
    const getIntensityValue = () => {
        if (intensity === 'low') return 30;
        if (intensity === 'high') return 80;
        return 50;
    };

    const getBgOpacity = () => {
        if (intensity === 'low') return 0.5;
        if (intensity === 'high') return 0.15;
        return 0.3;
    };

    const cardStyles = [
        styles.card,
        {
            borderRadius: RADIUS[cornerRadius],
            backgroundColor: `rgba(255, 255, 255, ${getBgOpacity()})`,
        },
        style,
    ];

    if (Platform.OS === 'web') {
        return (
            <View style={[...cardStyles, { backdropFilter: `blur(${getIntensityValue() / 5}px)` } as any]}>
                {children}
            </View>
        );
    }

    return (
        <BlurView
            intensity={getIntensityValue()}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={cardStyles}
        >
            {children}
        </BlurView>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        overflow: 'hidden',
    },
});
