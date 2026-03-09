import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../utils/constants';
import { useUIStore } from '../store';

const { width } = Dimensions.get('window');

export const BrandAlert: React.FC = () => {
    const { alert, hideAlert } = useUIStore();
    const [fadeAnim] = React.useState(new Animated.Value(0));
    const [scaleAnim] = React.useState(new Animated.Value(0.9));

    React.useEffect(() => {
        if (alert.visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
            scaleAnim.setValue(0.9);
        }
    }, [alert.visible]);

    if (!alert.visible && (fadeAnim as any)._value === 0) return null;

    const getTypeConfig = () => {
        switch (alert.type) {
            case 'success':
                return {
                    icon: 'checkmark-circle' as const,
                    color: COLORS.success,
                    bg: '#ECFDF5',
                };
            case 'error':
                return {
                    icon: 'close-circle' as const,
                    color: COLORS.error,
                    bg: '#FEF2F2',
                };
            case 'warning':
                return {
                    icon: 'warning' as const,
                    color: COLORS.warning,
                    bg: '#FFFBEB',
                };
            default:
                return {
                    icon: 'information-circle' as const,
                    color: COLORS.primary,
                    bg: '#FDF2F8',
                };
        }
    };

    const config = getTypeConfig();

    return (
        <Modal
            transparent
            visible={alert.visible}
            animationType="none"
            onRequestClose={hideAlert}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.dismissArea}
                        activeOpacity={1}
                        onPress={hideAlert}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                        <Ionicons name={config.icon} size={40} color={config.color} />
                    </View>

                    <Text style={styles.title}>{alert.title}</Text>
                    <Text style={styles.message}>{alert.message}</Text>

                    <View style={styles.buttonContainer}>
                        {alert.buttons.map((btn, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    btn.style === 'cancel' ? styles.cancelButton :
                                        btn.style === 'destructive' ? styles.destructiveButton :
                                            styles.primaryButton,
                                    alert.buttons.length > 1 && { flex: 1 },
                                ]}
                                onPress={() => {
                                    if (btn.onPress) btn.onPress();
                                    hideAlert();
                                }}
                            >
                                <Text
                                    style={[
                                        styles.buttonText,
                                        btn.style === 'cancel' ? styles.cancelButtonText : styles.primaryButtonText,
                                    ]}
                                >
                                    {btn.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    dismissArea: {
        flex: 1,
    },
    container: {
        width: Math.min(width * 0.85, 340),
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.text,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: SPACING.sm,
    },
    button: {
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.primary,
        width: '100%',
    },
    cancelButton: {
        backgroundColor: COLORS.backgroundLight,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    destructiveButton: {
        backgroundColor: COLORS.error,
    },
    primaryButtonText: {
        ...TYPOGRAPHY.button,
        color: '#FFF',
    },
    cancelButtonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.textSecondary,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
