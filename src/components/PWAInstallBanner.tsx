import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PWAInstallBanner: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Detect if already installed/standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        // Detect Android
        const isAndroid = /Android/i.test(navigator.userAgent);
        if (!isAndroid) return;

        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setVisible(false);
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
    };

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', '#F5F3FF']}
                style={styles.banner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.closeWrapper}>
                    <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                        <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Image
                        source={require('../../assets/SpinZo.png')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Install SpinZo</Text>
                        <Text style={styles.subtitle}>Get a smoother, faster experience</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.installButton}
                    onPress={handleInstallClick}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>Get App</Text>
                        <Ionicons name="chevron-forward" size={16} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60, // Positioned near skip button but on the left/center
        left: 20,
        right: 20,
        zIndex: 1000,
        alignItems: 'center',
    },
    banner: {
        width: '100%',
        maxWidth: 450,
        borderRadius: 20,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
        ...Platform.select({
            web: {
                boxShadow: '0px 10px 30px rgba(153, 75, 255, 0.15)',
            },
            default: SHADOWS.md,
        }),
    },
    closeWrapper: {
        position: 'absolute',
        top: -8,
        left: -8,
        zIndex: 10,
    },
    closeButton: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 10,
        marginRight: 10,
        backgroundColor: '#FFF',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        ...TYPOGRAPHY.body,
        fontWeight: '700',
        color: COLORS.text,
        fontSize: 15,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    installButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 4,
    },
    buttonText: {
        ...TYPOGRAPHY.button,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
