import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, TYPOGRAPHY, SPACING } from '../utils/constants';

interface BrandLoaderProps {
    message?: string;
    fullscreen?: boolean;
    size?: number;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({
    message = 'Loading...',
    fullscreen = true,
    size = 40
}) => {
    const containerStyle = fullscreen ? styles.fullscreenContainer : styles.inlineContainer;

    return (
        <View style={containerStyle}>
            {fullscreen && <View style={styles.overlay} />}

            <View style={styles.contentContainer}>
                {/* Spinner Container with Pulsing Background */}
                <View style={styles.spinnerWrapper}>
                    {/* Subtle Pulsing Ring */}
                    <MotiView
                        from={{ opacity: 0.2, scale: 1 }}
                        animate={{ opacity: 0.5, scale: 1.2 }}
                        transition={{
                            type: 'timing',
                            duration: 1000,
                            loop: true,
                        }}
                        style={styles.pulsingRing}
                    />

                    {/* Outer Ring */}
                    <MotiView
                        from={{ opacity: 0.1, scale: 1 }}
                        animate={{ opacity: 0.3, scale: 1.4 }}
                        transition={{
                            type: 'timing',
                            duration: 1000,
                            delay: 150,
                            loop: true,
                        }}
                        style={styles.outerRing}
                    />

                    {/* Spinning Circle */}
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{
                            type: 'timing',
                            duration: 1200,
                            loop: true,
                        }}
                        style={styles.spinnerOuter}
                    >
                        <View style={styles.spinnerInner} />
                    </MotiView>
                </View>

                {/* Loading Text */}
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
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
    },
    spinnerWrapper: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulsingRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
    },
    outerRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: COLORS.primary,
        backgroundColor: 'transparent',
    },
    spinnerOuter: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: 'rgba(139, 92, 246, 0.2)',
        borderTopColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinnerInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        color: COLORS.primary,
        marginTop: 20,
        fontFamily: 'Outfit_500Medium',
        textAlign: 'center',
    },
});
