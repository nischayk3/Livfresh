import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore, useUIStore } from '../../store';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuthStore();
    const { showAlert } = useUIStore();
    const insets = useSafeAreaInsets();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        showAlert({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: executeLogout
                }
            ]
        });
    };

    const executeLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            console.log('✅ User logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const getInitials = (name: string) => {
        return name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U';
    };




    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? SPACING.lg : insets.top + SPACING.headerTop }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Header Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || '')}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                        <Text style={styles.userPhone}>{user?.phone || ''}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'EditProfile' })}
                    >
                        <Ionicons name="pencil" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Menu Options */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'AddressList' })}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <Ionicons name="location-outline" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.menuText}>Your Addresses</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => (navigation as any).navigate('MyOrders')}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: COLORS.info + '20' }]}>
                            <Ionicons name="receipt-outline" size={22} color={COLORS.info} />
                        </View>
                        <Text style={styles.menuText}>My Orders</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'HelpSupport' })}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: COLORS.warning + '20' }]}>
                            <Ionicons name="headset-outline" size={22} color={COLORS.warning} />
                        </View>
                        <Text style={styles.menuText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View >

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

            </ScrollView>
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
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        ...TYPOGRAPHY.subheading,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.lg,
        ...SHADOWS.md,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: SPACING.md,
    },
    avatarText: {
        ...TYPOGRAPHY.heading,
        color: COLORS.primary,
        fontSize: 24,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        ...TYPOGRAPHY.subheading,
        marginBottom: 4,
    },
    userPhone: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    editButton: {
        padding: 8,
    },
    menuContainer: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.sm,
        marginBottom: SPACING.xl,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    menuText: {
        flex: 1,
        ...TYPOGRAPHY.body,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.error + '10',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.error + '30',
        gap: 8,
    },
    logoutText: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.error,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '85%',
        maxWidth: 340,
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    modalHeader: {
        marginBottom: SPACING.md,
    },
    modalTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: 22,
        marginBottom: SPACING.sm,
    },
    modalMessage: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.backgroundLight,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
    },
    confirmButton: {
        backgroundColor: COLORS.error,
    },
    confirmButtonText: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.white,
    },
});
