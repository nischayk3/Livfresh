import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../utils/constants';
import { useUIStore } from '../../store';
import { BrandHeader } from '../../components/BrandHeader';

export const HelpSupportScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { showAlert } = useUIStore();
    const SUPPORT_PHONE = '+91 7676878832';
    const [message, setMessage] = useState('');

    const handleCallSupport = () => {
        Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`);
    };

    const handleWhatsAppSupport = () => {
        const whatsappUrl = `whatsapp://send?phone=${SUPPORT_PHONE.replace(/\D/g, '')}&text=${encodeURIComponent('Hi SpinZo Team, I need help with...')}`;
        const webUrl = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent('Hi SpinZo Team, I need help with...')}`;

        Linking.canOpenURL(whatsappUrl).then(supported => {
            if (supported) {
                Linking.openURL(whatsappUrl);
            } else {
                Linking.openURL(webUrl);
            }
        });
    };

    const handleSendMessage = () => {
        if (!message.trim()) {
            showAlert({
                title: 'Empty Message',
                message: 'Please enter your query before sending.',
                type: 'warning'
            });
            return;
        }

        showAlert({
            title: 'Message Sent',
            message: 'We have received your query. Our support team will contact you shortly.',
            type: 'success',
            onClose: () => setMessage('')
        });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.pageBg, '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <BrandHeader title="Help & Support" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.introSection}>
                        <Text style={styles.introTitle}>How can we help today?</Text>
                        <Text style={styles.introSubtitle}>Our team is here to ensure your experience is flawless.</Text>
                    </View>

                    <View style={styles.contactContainer}>
                        {/* Call Card */}
                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={handleCallSupport}
                            activeOpacity={0.9}
                        >
                            <View style={[styles.iconWrapper, { backgroundColor: COLORS.primaryLight }]}>
                                <Ionicons name="call" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>Call Us Directly</Text>
                                <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>

                        {/* WhatsApp Card */}
                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={handleWhatsAppSupport}
                            activeOpacity={0.9}
                        >
                            <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="logo-whatsapp" size={20} color="#2E7D32" />
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactTitle}>Chat on WhatsApp</Text>
                                <Text style={styles.contactValue}>Fast response time</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.messageSection}>
                        <Text style={styles.formLabel}>Drop us a message</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                multiline
                                placeholder="Tell us what's on your mind..."
                                placeholderTextColor={COLORS.textLight}
                                value={message}
                                onChangeText={setMessage}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity onPress={handleSendMessage}>
                            <LinearGradient
                                colors={['#1A1A1A', '#333333']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.sendButton}
                            >
                                <Text style={styles.sendButtonText}>Send Inquiry</Text>
                                <Ionicons name="send" size={16} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.pageBg,
    },
    content: {
        padding: SPACING.lg,
    },
    introSection: {
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
    },
    introTitle: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
        color: COLORS.text,
        marginBottom: 8,
    },
    introSubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontFamily: 'Outfit_400Regular',
        lineHeight: 22,
    },
    contactContainer: {
        gap: 16,
        marginBottom: SPACING.xxl,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contactInfo: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontFamily: 'Outfit_500Medium',
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 16,
        color: COLORS.text,
        fontFamily: 'Outfit_700Bold',
        fontWeight: '700',
    },
    messageSection: {
        marginTop: SPACING.lg,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        fontFamily: 'Outfit_700Bold',
        marginBottom: 12,
    },
    inputWrapper: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 20,
        padding: 16,
        minHeight: 160,
        marginBottom: 20,
        ...SHADOWS.sm,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        fontFamily: 'Outfit_400Regular',
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 10,
        ...SHADOWS.md,
    },
    sendButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
        fontFamily: 'Outfit_800ExtraBold',
    },
});
