import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Text, Easing, Dimensions } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../utils/constants';

const spinitLogo = require('../../assets/spinit_logo.png');
const { width, height } = Dimensions.get('window');

interface BrandLoaderProps {
    message?: string;
    fullscreen?: boolean;
    size?: number;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({
    message = 'Please wait...',
    fullscreen = true,
    size = 80
}) => {
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnimation = () => {
            spinValue.setValue(0);
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        };

        startAnimation();
    }, [spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const Container = fullscreen ? View : View;
    const containerStyle = fullscreen ? styles.fullscreenContainer : styles.inlineContainer;

    return (
        <View style={containerStyle}>
            {/* Background Overlay for fullscreen */}
            {fullscreen && <View style={styles.overlay} />}

            <View style={styles.contentContainer}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Image
                        source={spinitLogo}
                        style={{ width: size, height: size }}
                        resizeMode="contain"
                    />
                </Animated.View>
                {message ? (
                    <Text style={styles.loadingText}>{message}</Text>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullscreenContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
    },
    inlineContainer: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        color: COLORS.primary,
        marginTop: 16,
        fontWeight: '600',
    },
});
