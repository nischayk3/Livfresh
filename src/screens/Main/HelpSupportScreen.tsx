import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../utils/constants';
import { useUIStore } from '../../store';

export const HelpSupportScreen: React.FC = () => {
    const navigation = useNavigation();
    const { showAlert } = useUIStore();
    const SUPPORT_PHONE = '+91 9108558715';
    const [message, setMessage] = useState('');

    const handleCallSupport = () => {
        Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`);
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

        // Mock sending message
        showAlert({
            title: 'Message Sent',
            message: 'We have received your query. Our support team will contact you shortly.',
            type: 'success',
            onClose: () => setMessage('')
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Call Card */}
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="call" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Call Us Directly</Text>
                            <Text style={styles.cardSubtitle}>Get immediate assistance</Text>
                            <Text style={styles.phoneNumber}>{SUPPORT_PHONE}</Text>
                        </View>
                        <TouchableOpacity style={styles.callButton} onPress={handleCallSupport}>
                            <Text style={styles.callButtonText}>Call Now</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionDivider}>OR</Text>

                    {/* Message Input */}
                    <Text style={styles.formLabel}>Send us a message</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            multiline
                            placeholder="Describe your issue or query..."
                            placeholderTextColor={COLORS.textLight}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                        <Text style={styles.sendButtonText}>Send Message</Text>
                        <Ionicons name="send" size={16} color="#FFF" />
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backButton: {
        marginRight: SPACING.md,
    },
    headerTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
    },
    content: {
        padding: SPACING.lg,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginBottom: SPACING.xl,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    cardText: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    cardTitle: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 16,
        marginBottom: 4,
    },
    cardSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 8,
    },
    phoneNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    callButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: RADIUS.xl,
        width: '100%',
        alignItems: 'center',
    },
    callButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    sectionDivider: {
        textAlign: 'center',
        color: COLORS.textLight,
        fontWeight: '700',
        marginVertical: SPACING.md,
    },
    formLabel: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: SPACING.sm,
    },
    inputContainer: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        minHeight: 120,
        marginBottom: SPACING.lg,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
    },
    sendButton: {
        backgroundColor: COLORS.text, // Dark button for contrast
        paddingVertical: 16,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    sendButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
});
