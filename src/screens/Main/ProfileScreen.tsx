import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore, useUIStore } from '../../store';
import { BrandHeader } from '../../components/BrandHeader';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout, deleteAccount } = useAuthStore();
    const { showAlert } = useUIStore();
    const insets = useSafeAreaInsets();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
            // Navigate to home after logout 
            (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Main', state: { routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }] } }] } }],
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleDeleteAccount = () => {
        showAlert({
            title: 'Delete Account',
            message: 'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
            type: 'error',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: executeDeleteAccount
                }
            ]
        });
    };

    const executeDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await deleteAccount();
            // Store handles navigation/state clearing
        } catch (error: any) {
            console.error('Delete account error:', error);
            if (error.code === 'auth/requires-recent-login') {
                showAlert({
                    title: 'Authentication Required',
                    message: 'For security, please logout and login again before deleting your account.',
                    type: 'info',
                    buttons: [{ text: 'OK', onPress: executeLogout }]
                });
            } else {
                showAlert({
                    title: 'Error',
                    message: 'Failed to delete account. Please contact support.',
                    type: 'error'
                });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const getInitials = (name: string) => {
        return name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U';
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[COLORS.pageBg, '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                />
                <BrandHeader title="Profile" />
                <View style={[styles.emptyContainer, { flex: 1 }]}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="person-outline" size={64} color={COLORS.primaryLight} />
                    </View>
                    <Text style={[styles.emptyText, { textAlign: 'center' }]}>Create an Account</Text>
                    <Text style={[styles.emptySubtext, { textAlign: 'center' }]}>Save addresses and access your order history</Text>
                    <TouchableOpacity
                        style={styles.browseButton}
                        onPress={() => (navigation as any).navigate('PhoneLogin', { returnTo: 'Profile' })}
                    >
                        <Text style={styles.browseButtonText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.pageBg, '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />
            <BrandHeader title="Profile" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Header Card */}
                <View style={styles.profileCard}>
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.avatarContainer}
                    >
                        <Text style={styles.avatarText}>{getInitials(user?.name || '')}</Text>
                    </LinearGradient>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                        <Text style={styles.userPhone}>{user?.phone || ''}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editButtonBg}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'EditProfile' })}
                    >
                        <View style={styles.editButtonBg}>
                            <Ionicons name="pencil" size={18} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Sections Header */}
                <Text style={styles.sectionTitle}>Account Settings</Text>

                {/* Menu Options */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'AddressList' })}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: '#F0E7FF' }]}>
                            <Ionicons name="location-sharp" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.menuText}>Your Addresses</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => (navigation as any).navigate('MyOrders')}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="receipt-sharp" size={20} color="#0EA5E9" />
                        </View>
                        <Text style={styles.menuText}>My Orders</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => (navigation as any).navigate('Main', { screen: 'HelpSupport' })}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="headset-sharp" size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.menuText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Admin Dashboard - Seamless entry for authorized numbers only */}
                    {['9661802634', '9852030638', '9108558715'].some(p => user?.phone && user.phone.indexOf(p) !== -1) && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => (navigation as any).navigate('AdminLogin')}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#F5F3FF' }]}>
                                <Ionicons name="shield-checkmark-sharp" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.menuText}>Admin Dashboard</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    )}
                </View >

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <View style={styles.logoutIconBg}>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.logoutText}>Logout from SpinZo</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity
                    style={[styles.logoutButton, { marginTop: SPACING.sm, opacity: isDeleting ? 0.7 : 1 }]}
                    onPress={handleDeleteAccount}
                    disabled={isDeleting}
                >
                    <View style={[styles.logoutIconBg, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </View>
                    <Text style={[styles.logoutText, { color: COLORS.error }]}>
                        {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F7FF',
    },
    header: {
        marginBottom: SPACING.md,
    },
    backButton: {
        padding: SPACING.xs,
    },
    backButtonBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
        color: '#1A1A1A',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        ...SHADOWS.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    avatarContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
        ...SHADOWS.md,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        fontFamily: 'Outfit_800ExtraBold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: 'Outfit_700Bold',
        marginBottom: 2,
    },
    userPhone: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        fontFamily: 'Outfit_500Medium',
    },
    editButtonBg: {
        padding: 8,
        backgroundColor: '#F5F3FF',
        borderRadius: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
        fontFamily: 'Outfit_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
    },
    menuContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.xs,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...SHADOWS.md,
        marginBottom: SPACING.xl,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md + 2,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    menuIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        fontFamily: 'Outfit_600SemiBold',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md + 4,
        backgroundColor: '#FFF1F2',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#FFE4E6',
        gap: 12,
        ...SHADOWS.sm,
    },
    logoutIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#E11D48',
        fontFamily: 'Outfit_700Bold',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#F1F5F9',
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
        color: '#FFFFFF',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        ...SHADOWS.md,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        fontFamily: 'Outfit_800ExtraBold',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        fontFamily: 'Outfit_400Regular',
        marginBottom: 24,
        paddingHorizontal: 40,
    },
    browseButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        ...SHADOWS.primary,
    },
    browseButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        fontFamily: 'Outfit_800ExtraBold',
    },
});
