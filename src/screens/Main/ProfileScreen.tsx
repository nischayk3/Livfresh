import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => logout()
                }
            ]
        );
    };

    const getInitials = (name: string) => {
        return name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    headerTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: 24,
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
});
