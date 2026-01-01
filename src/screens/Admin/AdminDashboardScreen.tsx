import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAuthStore, useAdminStore } from '../../store';
import { useUIStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

type DateRangeOption = 'today' | '7days' | '30days' | '6months' | '1year';

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { adminPhone, logout } = useAdminAuthStore();
  const { showAlert } = useUIStore();
  const {
    orderStats,
    revenue,
    userStats,
    statsLoading,
    revenueLoading,
    userStatsLoading,
    fetchOrderStats,
    fetchRevenue,
    fetchUserStats,
  } = useAdminStore();

  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch stats on mount and set up polling
  useEffect(() => {
    fetchOrderStats();
    fetchUserStats();

    // Poll every 15 seconds for real-time updates
    const interval = setInterval(() => {
      fetchOrderStats(true);
      fetchUserStats(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchOrderStats, fetchUserStats]);

  // Fetch revenue when date range changes
  useEffect(() => {
    const { startDate, endDate } = getDateRange();
    fetchRevenue(startDate, endDate);
  }, [dateRange, fetchRevenue]);

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    switch (dateRange) {
      case 'today':
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  };

  const statCards = [
    {
      label: 'Total Orders Today',
      value: orderStats.total,
      icon: 'bag-outline',
      color: COLORS.primary,
      bgColor: COLORS.primaryLight,
    },
    {
      label: 'Confirmed',
      value: orderStats.confirmed,
      icon: 'checkmark-circle-outline',
      color: COLORS.info,
      bgColor: COLORS.info + '20',
    },
    {
      label: 'Pickup Completed',
      value: orderStats.pickup_completed,
      icon: 'car-outline',
      color: COLORS.warning,
      bgColor: COLORS.warning + '20',
    },
    {
      label: 'Processing',
      value: orderStats.processing,
      icon: 'settings-outline',
      color: '#FF6B35',
      bgColor: '#FF6B3520',
    },
    {
      label: 'Ready for Delivery',
      value: orderStats.ready,
      icon: 'cube-outline',
      color: '#9B59B6',
      bgColor: '#9B59B620',
    },
    {
      label: 'Out for Delivery',
      value: orderStats.out_for_delivery,
      icon: 'navigate-outline',
      color: '#1ABC9C',
      bgColor: '#1ABC9C20',
    },
    {
      label: 'Delivered Today',
      value: orderStats.delivered,
      icon: 'checkmark-done-circle-outline',
      color: COLORS.success,
      bgColor: COLORS.success + '20',
    },
  ];

  const handleExportCSV = async () => {
    if (!revenue?.orders || revenue.orders.length === 0) {
      showAlert({
        title: 'No Data',
        message: 'No orders available to export',
        type: 'warning',
      });
      return;
    }

    setExportLoading(true);

    try {
      // Create CSV content
      const headers = [
        'Order Date',
        'Customer Name',
        'Customer Phone',
        'Address',
        'Service Type',
        'Pickup Date',
        'Delivery Date',
        'Amount Paid',
        'Payment Status',
        'Order Status',
      ];

      const rows = revenue.orders.map((order: any) => {
        const orderDate = order.createdAt?.toDate
          ? order.createdAt.toDate().toLocaleDateString('en-IN')
          : new Date(order.createdAt).toLocaleDateString('en-IN');

        const address = order.address
          ? `${order.address.addressLine || ''}, ${order.address.city || ''} - ${order.address.pincode || ''}`
          : 'N/A';

        return [
          orderDate,
          order.customerName || 'N/A',
          order.customerPhone || 'N/A',
          address,
          order.items?.map((i: any) => i.serviceName || i.name).join(', ') || 'N/A',
          order.pickupDate || 'N/A',
          order.deliveryDate || 'N/A',
          order.totalAmount || 0,
          order.paymentStatus || 'pending',
          order.status || 'N/A',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // For web, download directly
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert({
          title: 'Export Successful',
          message: `Exported ${revenue.orders.length} orders to CSV`,
          type: 'success',
        });
      } else {
        // For mobile, show alert with instructions
        showAlert({
          title: 'Export Ready',
          message: `CSV data prepared for ${revenue.orders.length} orders. Mobile export coming soon.`,
          type: 'info',
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      showAlert({
        title: 'Export Failed',
        message: error.message || 'Failed to export CSV',
        type: 'error',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const dateRangeOptions: { label: string; value: DateRangeOption }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'Last 6 Months', value: '6months' },
    { label: 'Last 1 Year', value: '1year' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {adminPhone ? `Logged in as: ${adminPhone}` : 'Welcome back, Admin'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>User Statistics</Text>
          </View>

          {userStatsLoading && userStats.totalUsers === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.userStatsGrid}>
              <View style={styles.userStatCard}>
                <View style={[styles.statIconContainer, { backgroundColor: COLORS.info + '20' }]}>
                  <Ionicons name="people" size={24} color={COLORS.info} />
                </View>
                <Text style={styles.statValue}>{userStats.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.userStatCard}>
                <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '20' }]}>
                  <Ionicons name="person-check" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.statValue}>{userStats.activeUsers}</Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Status Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Today's Orders Overview</Text>
          </View>

          {statsLoading && orderStats.total === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {statCards.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                    <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Revenue Analytics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Revenue Analytics</Text>
          </View>

          {/* Date Range Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateRangeContainer}
            contentContainerStyle={styles.dateRangeContent}
          >
            {dateRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dateRangeButton,
                  dateRange === option.value && styles.dateRangeButtonActive,
                ]}
                onPress={() => setDateRange(option.value)}
              >
                <Text
                  style={[
                    styles.dateRangeText,
                    dateRange === option.value && styles.dateRangeTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Revenue Card */}
          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
            {revenueLoading ? (
              <View style={styles.revenueLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.revenueLoadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.revenueAmount}>
                  ₹{revenue?.revenue.toLocaleString('en-IN') || '0'}
                </Text>
                <View style={styles.revenueBreakdown}>
                  <Text style={styles.revenueBreakdownText}>
                    Orders: ₹{revenue?.orderRevenue.toLocaleString('en-IN') || '0'} (
                    {revenue?.orderCount || 0} order{revenue?.orderCount !== 1 ? 's' : ''})
                  </Text>
                  <Text style={styles.revenueBreakdownText}>
                    Subscriptions: ₹{revenue?.subscriptionRevenue.toLocaleString('en-IN') || '0'} (
                    {revenue?.subscriptionCount || 0} purchase
                    {revenue?.subscriptionCount !== 1 ? 's' : ''})
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Export Button */}
          <TouchableOpacity
            style={[
              styles.exportButton,
              (exportLoading || !revenue?.orders || revenue.orders.length === 0) &&
              styles.exportButtonDisabled,
            ]}
            onPress={handleExportCSV}
            disabled={exportLoading || !revenue?.orders || revenue.orders.length === 0}
          >
            {exportLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.exportButtonText}>
                  Export CSV Report ({revenue?.orders.length || 0} orders)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => (navigation as any).navigate('Admin', { screen: 'AdminTabs', params: { screen: 'Orders' } })}
            >
              <Ionicons name="bag" size={32} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Manage Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => (navigation as any).navigate('Admin', { screen: 'AdminTabs', params: { screen: 'Subscriptions' } })}
            >
              <Ionicons name="card" size={32} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Subscriptions</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 16,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.heading,
    fontSize: 28,
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  dateRangeContainer: {
    marginBottom: SPACING.md,
  },
  dateRangeContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  dateRangeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dateRangeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateRangeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  dateRangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  revenueCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  revenueLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  revenueAmount: {
    ...TYPOGRAPHY.heading,
    fontSize: 36,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  revenueBreakdown: {
    gap: 4,
  },
  revenueBreakdownText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  revenueLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  revenueLoadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  quickActionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginTop: SPACING.sm,
    fontWeight: '600',
  },
  userStatsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  userStatCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
    alignItems: 'center',
  },
});
