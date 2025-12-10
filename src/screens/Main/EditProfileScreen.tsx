import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';
import { updateUser } from '../../services/firestore';

export const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, setUser } = useAuthStore();

    // Fallback if user object is somehow null, shouldn't happen if navigating from Profile
    const [name, setName] = useState(user?.name || '');
    // Assuming 'email' might exist on user object in future, for now treating it as potentially undefined in type
    const [email, setEmail] = useState((user as any)?.email || '');
    const [loading, setLoading] = useState(false);

    // Sync specific fields when user store updates (e.g. after hydration)
    React.useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail((user as any).email || '');
        }
    }, [user]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setLoading(true);
        try {
            if (user?.uid) {
                // Update Firestore
                await updateUser(user.uid, { name, email });

                // Update Local Store
                setUser({ ...user, name, email } as any);

                Alert.alert('Success', 'Profile updated successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor={COLORS.textLight}
                            />
                        </View>
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Phone Input (Read Only) */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={[styles.inputContainer, styles.disabledInput]}>
                            <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: COLORS.textSecondary }]}
                                value={user?.phone}
                                editable={false}
                            />
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        </View>
                        <Text style={styles.helperText}>Phone number cannot be changed.</Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
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
        paddingBottom: 100,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: 8,
        color: COLORS.text,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.background,
        height: 50,
    },
    inputIcon: {
        marginRight: SPACING.sm,
    },
    input: {
        flex: 1,
        ...TYPOGRAPHY.body,
        color: COLORS.text,
    },
    disabledInput: {
        backgroundColor: COLORS.backgroundLight,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.success + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.success,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        backgroundColor: COLORS.background,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
});
