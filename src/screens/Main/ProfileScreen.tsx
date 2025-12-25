import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuthStore();
    const insets = useSafeAreaInsets();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            // On web, show custom modal instead of Alert.alert
            setShowLogoutModal(true);
        } else {
            // On native, use native Alert
            Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Logout',
                        style: 'destructive',
                        onPress: executeLogout
                    }
                ]
            );
        }
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
            setShowLogoutModal(false);
        }
    };

    const getInitials = (name: string) => {
        return name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U';
    };

    // Web Logout Confirmation Modal
    const renderLogoutModal = () => (
        <Modal
            visible={showLogoutModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowLogoutModal(false)}
        >
            <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="log-out-outline" size={48} color={COLORS.error} />
                            </View>
                            <Text style={styles.modalTitle}>Logout</Text>
                            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setShowLogoutModal(false)}
                                    disabled={isLoggingOut}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.confirmButton, isLoggingOut && { opacity: 0.7 }]}
                                    onPress={executeLogout}
                                    disabled={isLoggingOut}
                                >
                                    <Text style={styles.confirmButtonText}>
                                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? SPACING.lg : insets.top + SPACING.sm }]}>
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
                        onPress={() => navigation.navigate('Main' as never, { screen: 'EditProfile' } as never)}
                    >
                        <Ionicons name="pencil" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Menu Options */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('Main' as never, { screen: 'AddressList' } as never)}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <Ionicons name="location-outline" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.menuText}>Your Addresses</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('MyOrders' as never)}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: COLORS.info + '20' }]}>
                            <Ionicons name="receipt-outline" size={22} color={COLORS.info} />
                        </View>
                        <Text style={styles.menuText}>My Orders</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('Main' as never, { screen: 'HelpSupport' } as never)}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: COLORS.warning + '20' }]}>
                            <Ionicons name="headset-outline" size={22} color={COLORS.warning} />
                        </View>
                        <Text style={styles.menuText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Web Logout Modal */}
            {renderLogoutModal()}
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
        fontSize: 18,
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
