import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';
import { getUserOrders } from '../../services/firestore';

export const MyOrdersScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = async () => {
        if (!user?.uid) return;
        try {
            const userOrders = await getUserOrders(user.uid);
            setOrders(userOrders);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'placed': return COLORS.primary;
            case 'in_progress': return COLORS.warning;
            case 'out_for_delivery': return COLORS.info;
            case 'delivered': return COLORS.success;
            case 'cancelled': return COLORS.error;
            default: return COLORS.textSecondary;
        }
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, ' ').toUpperCase();
    };

    const renderOrderItem = ({ item }: { item: any }) => {
        // Safe access for timestamps
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
        const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        // Item summary
        const itemCount = item.items?.length || 0;
        const totalAmount = item.billDetails?.total || 0;

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('Main' as never, { screen: 'OrderDetail', params: { orderId: item.id } } as never)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.orderDate}>{dateString}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {formatStatus(item.status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="basket-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{itemCount} Items</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="wallet-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.amountText}>₹{totalAmount}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.orderId}>Order #{item.id.slice(-6).toUpperCase()}</Text>
                    <View style={styles.viewDetailsBtn}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Orders</Text>
            </View>

            <FlatList
                data={orders}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>No orders yet</Text>
                        <Text style={styles.emptySubtext}>Your order history will appear here</Text>
                    </View>
                }
            />
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
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        backgroundColor: COLORS.background,
    },
    headerTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: SPACING.md,
    },
    orderCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    orderDate: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderLight,
        marginVertical: SPACING.sm,
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xs,
    },
    orderId: {
        fontSize: 10,
        color: COLORS.textLight,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    viewDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewDetailsText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.text,
        marginTop: SPACING.md,
    },
    emptySubtext: {
        color: COLORS.textLight,
        marginTop: SPACING.xs,
    },
});
