import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandLoader } from '../../components/BrandLoader';
import { BrandHeader } from '../../components/BrandHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';
import { subscribeToUserOrders } from '../../services/firestore';

export const MyOrdersScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
    const insets = useSafeAreaInsets();

    const fetchOrders = async () => {
        // This is now handled by the real-time listener below
        // but we keep the loading state logic if needed for first load
    };

    // Filter orders
    const currentOrders = orders.filter(o =>
        !['delivered', 'cancelled', 'refund_processed'].includes(o.status)
    );

    const pastOrders = orders.filter(o =>
        ['delivered', 'cancelled', 'refund_processed'].includes(o.status)
    );

    const displayOrders = activeTab === 'current' ? currentOrders : pastOrders;

    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);
        const unsubscribe = subscribeToUserOrders(user.uid, (userOrders) => {
            // Sort manually to ensure time-based sorting
            const sortedOrders = userOrders.sort((a: any, b: any) => {
                const getTime = (date: any) => {
                    if (!date) return 0;
                    if (date.toDate && typeof date.toDate === 'function') return date.toDate().getTime();
                    if (date.seconds) return date.seconds * 1000;
                    if (date instanceof Date) return date.getTime();
                    if (typeof date === 'string') return new Date(date).getTime();
                    return 0;
                };
                return getTime(b.createdAt) - getTime(a.createdAt);
            });

            setOrders(sortedOrders);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

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
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
        const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const year = date.getFullYear();

        const itemCount = item.items?.length || 0;
        const totalAmount = item.billDetails?.total || 0;
        const status = item.status || 'placed';

        return (
            <TouchableOpacity
                style={styles.compactCard}
                onPress={() => (navigation as any).navigate('OrderDetail', { orderId: item.id })}
                activeOpacity={0.8}
            >
                <View style={styles.cardAccent} />
                <View style={styles.cardMain}>
                    <View style={styles.cardHeaderArea}>
                        <View>
                            <Text style={styles.cardDateText}>{dateString}, {year}</Text>
                            <Text style={styles.cardIdText}>Order #{item.id.slice(-6).toUpperCase()}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: getStatusColor(status) + '15' }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                            <Text style={[styles.statusPillText, { color: getStatusColor(status) }]}>
                                {formatStatus(status)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardContentArea}>
                        <View style={styles.itemSummary}>
                            <View style={styles.summaryIcon}>
                                <Ionicons name="shirt-outline" size={14} color="#64748B" />
                            </View>
                            <Text style={styles.summaryText}>{itemCount} Items</Text>
                        </View>
                        <View style={styles.priceSummary}>
                            <Text style={styles.currency}>₹</Text>
                            <Text style={styles.amount}>{totalAmount}</Text>
                        </View>
                    </View>

                    <View style={styles.cardFooterArea}>
                        <View style={styles.detailsLink}>
                            <Text style={styles.detailsLinkText}>Track Order</Text>
                            <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <BrandHeader title="My Orders" />
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="receipt-outline" size={64} color={COLORS.primaryLight} />
                    </View>
                    <Text style={styles.emptyText}>Sign in to view orders</Text>
                    <Text style={styles.emptySubtext}>Track your laundry and view past orders</Text>
                    <TouchableOpacity
                        style={styles.browseButton}
                        onPress={() => (navigation as any).navigate('PhoneLogin', { returnTo: 'MyOrders' })}
                    >
                        <Text style={styles.browseButtonText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (loading && !refreshing) {
        return <BrandLoader message="Fetching your orders..." />;
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.pageBg, '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />
            <BrandHeader title="My Orders" />

            {/* Tabs */}
            <View style={styles.tabOuterContainer}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'current' && styles.activeTab]}
                        onPress={() => setActiveTab('current')}
                    >
                        <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
                            Running {currentOrders.length > 0 && `(${currentOrders.length})`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'past' && styles.activeTab]}
                        onPress={() => setActiveTab('past')}
                    >
                        <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
                            History {pastOrders.length > 0 && `(${pastOrders.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={displayOrders}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons
                                name={activeTab === 'current' ? "cube-outline" : "time-outline"}
                                size={64}
                                color={COLORS.textLight}
                            />
                        </View>
                        <Text style={styles.emptyText}>
                            {activeTab === 'current' ? 'No active orders' : 'No past orders'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {activeTab === 'current'
                                ? 'Your running orders will show up here.'
                                : 'Your delivered and cancelled orders will show up here.'}
                        </Text>
                        {activeTab === 'current' && (
                            <TouchableOpacity
                                style={styles.browseButton}
                                onPress={() => (navigation as any).navigate('Home')}
                            >
                                <Text style={styles.browseButtonText}>Book Now</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.pageBg,
    },
    header: {
        marginBottom: SPACING.md,
    },
    backButton: {
        padding: 4,
    },
    backButtonBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
        color: '#1A1A1A',
    },
    tabOuterContainer: {
        paddingHorizontal: SPACING.md,
        marginTop: 20,
        marginBottom: 10,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        ...SHADOWS.sm,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_600SemiBold',
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    listContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: 8,
    },
    compactCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardAccent: {
        width: 6,
        backgroundColor: COLORS.primary,
        opacity: 0.8,
    },
    cardMain: {
        flex: 1,
        padding: 16,
    },
    cardHeaderArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardDateText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A1A',
        fontFamily: 'Outfit_800ExtraBold',
    },
    cardIdText: {
        fontSize: 11,
        color: '#94A3B8',
        fontFamily: 'Outfit_500Medium',
        marginTop: 2,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    cardContentArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    itemSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryIcon: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    summaryText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
        fontFamily: 'Outfit_600SemiBold',
    },
    priceSummary: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    currency: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    amount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        fontFamily: 'Outfit_800ExtraBold',
    },
    cardFooterArea: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    detailsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailsLinkText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: 'Outfit_700Bold',
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
