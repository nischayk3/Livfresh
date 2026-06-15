import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandLoader } from '../../components/BrandLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';
import { subscribeToUserOrders } from '../../services/firestore';
import {
  ArrowLeft,
  ShoppingBag,
  Shirt,
  ChevronRight,
  Clock,
  Check,
  Footprints,
  WashingMachine,
  BedDouble,
} from 'lucide-react-native';

// 5 key order steps aligned with OrderDetailScreen's flow
const ORDER_STEPS = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pickup_completed', label: 'Pick Up' },
  { key: 'processing', label: 'Processing' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_PILL: Record<string, { label: string; bg: string; text: string }> = {
  placed: { label: 'ACTIVE', bg: '#F5F3FF', text: '#7C3AED' },
  confirmed: { label: 'ACTIVE', bg: '#F5F3FF', text: '#7C3AED' },
  pickup_assigned: { label: 'ACTIVE', bg: '#F5F3FF', text: '#7C3AED' },
  pickup_completed: { label: 'ACTIVE', bg: '#F5F3FF', text: '#7C3AED' },
  processing: { label: 'PROCESSING', bg: '#FFFBEB', text: '#D97706' },
  ready: { label: 'PROCESSING', bg: '#FFFBEB', text: '#D97706' },
  out_for_delivery: { label: 'OUT FOR DELIVERY', bg: '#EFF6FF', text: '#2563EB' },
  delivered: { label: 'DELIVERED', bg: '#ECFDF5', text: '#059669' },
  cancelled: { label: 'CANCELLED', bg: '#FFF1F2', text: '#E11D48' },
  refund_processed: { label: 'REFUNDED', bg: '#F1F5F9', text: '#64748B' },
};

const getStepperIndex = (status: string): number => {
  const map: Record<string, number> = {
    placed: 0,
    confirmed: 0,
    pickup_assigned: 1,
    pickup_completed: 1,
    processing: 2,
    ready: 2,
    out_for_delivery: 3,
    delivered: 4,
  };
  return map[status] ?? 0;
};

const getServiceIcon = (item: any, size: number, color: string) => {
  const type = item?.serviceType || item?.serviceId || '';
  if (type.includes('blanket')) return <BedDouble size={size} color={color} />;
  if (type.includes('shoe') || type.includes('clean')) return <Footprints size={size} color={color} />;
  if (type.includes('wash') || type.includes('laundry')) return <WashingMachine size={size} color={color} />;
  return <Shirt size={size} color={color} />;
};

const PulsingDot = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.activeDot, { opacity }]}
    />
  );
};

export const MyOrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const insets = useSafeAreaInsets();

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

  // --- Helpers ---

  const getServiceSummary = (items: any[]) => {
    if (!items?.length) return { name: 'Items', weight: 0 };
    const names = [...new Set(items.map((i: any) => i.serviceName).filter(Boolean))];
    const totalWeight = items.reduce((sum: number, i: any) => sum + (Number(i.weight) || 0), 0);
    return { name: names.join(' + ') || 'Services', weight: totalWeight };
  };

  const getOrderTime = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Format "Apr 6, 2026" style
  const formatShortDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const formatYear = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.getFullYear().toString();
  };

  // Best time info — pickup > delivery > placed
  const getTimeInfoText = (order: any) => {
    const pickup = order.pickupDetails;
    if (pickup?.scheduledDate && pickup?.scheduledTime) {
      const d = new Date(pickup.scheduledDate + 'T00:00:00');
      const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return `Pickup: ${dateStr}, ${pickup.scheduledTime}`;
    }
    if (order.deliveryDate && order.deliveryTime) {
      const d = new Date(order.deliveryDate + 'T00:00:00');
      const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return `Delivery: ${dateStr}, ${order.deliveryTime}`;
    }
    return `Placed at ${getOrderTime(order.createdAt)}`;
  };

  // --- Render: Active Order Card (Live Order) ---

  const renderActiveOrderCard = (order: any) => {
    const summary = getServiceSummary(order.items);
    const totalAmount = order.billDetails?.total || 0;
    const currentStep = getStepperIndex(order.status);
    const firstItem = order.items?.[0];

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.liveCard}
        onPress={() => (navigation as any).navigate('OrderDetail', { orderId: order.id })}
        activeOpacity={0.85}
      >
        {/* Top row: Order ID + ACTIVE pill */}
        <View style={styles.liveCardTop}>
          <View style={styles.orderIdRow}>
            <View style={styles.orderIdIcon}>
              <ShoppingBag size={16} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.orderIdLabel}>ORDER ID</Text>
              <Text style={styles.orderIdValue}>#{order.id.slice(-6).toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.activePill}>
            <PulsingDot />
            <Text style={styles.activePillText}>ACTIVE</Text>
          </View>
        </View>

        {/* Service info row */}
        <View style={styles.liveServiceRow}>
          <View style={styles.serviceIconBox}>
            {getServiceIcon(firstItem, 20, '#7C3AED')}
          </View>
          <View style={styles.serviceInfoText}>
            <Text style={styles.serviceNameText}>
              {summary.name}{summary.weight > 0 ? ` — ${summary.weight} KG` : ''}
            </Text>
            <Text style={styles.serviceStatusText}>
              {order.status === 'pickup_completed' || order.status === 'pickup_assigned'
                ? 'Pickup in progress and being prepared for processing'
                : order.status === 'processing' || order.status === 'ready'
                  ? 'Your laundry is being processed'
                  : 'Order confirmed and will be picked up soon'}
            </Text>
          </View>
        </View>

        {/* Horizontal Progress Stepper */}
        <View style={styles.stepperRow}>
          {ORDER_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === ORDER_STEPS.length - 1;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isCurrent && styles.stepCircleCurrent,
                    ]}
                  >
                    {isCompleted ? (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    ) : isCurrent ? (
                      <View style={styles.stepCurrentInner} />
                    ) : (
                      <View style={styles.stepUpcomingInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isCompleted || isCurrent) && styles.stepLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.stepConnector,
                      isCompleted && styles.stepConnectorActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Time info — pickup > delivery > placed */}
        <View style={styles.estDeliveryRow}>
          <Clock size={14} color="#7C3AED" />
          <Text style={styles.estDeliveryText}>{getTimeInfoText(order)}</Text>
        </View>

        {/* Divider */}
        <View style={styles.liveCardDivider} />

        {/* Bottom row: View Details + Amount */}
        <View style={styles.liveCardBottom}>
          <Text style={styles.liveCardAmount}>₹{totalAmount}</Text>
          <View style={styles.detailsLink}>
            <Text style={styles.detailsLinkText}>View Details</Text>
            <ChevronRight size={14} color="#7C3AED" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Render: Past / Regular Order Card ---

  const renderOrderCard = (order: any) => {
    const date = order.createdAt;
    const summary = getServiceSummary(order.items);
    const totalAmount = order.billDetails?.total || 0;
    const status = order.status || 'placed';
    const pill = STATUS_PILL[status] || { label: status.toUpperCase(), bg: '#F1F5F9', text: '#64748B' };
    const isDelivered = status === 'delivered';
    const orderDate = formatShortDate(date);
    const year = formatYear(date);

    const firstItem = order.items?.[0];

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => (navigation as any).navigate('OrderDetail', { orderId: order.id })}
        activeOpacity={0.8}
      >
        {/* Row 1: Date + Status pill */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardDateText}>
            {orderDate}{year ? `, ${year}` : ''}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.statusPillText, { color: pill.text }]}>{pill.label}</Text>
          </View>
        </View>

        {/* Row 2: Order ID + Chevron */}
        <View style={styles.cardIdRow}>
          <Text style={styles.cardIdText}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          <ChevronRight size={14} color="#CBD5E1" />
        </View>

        {/* Row 3: Service icon + name/weight */}
        <View style={styles.cardServiceRow}>
          <View style={styles.cardServiceIcon}>
            {getServiceIcon(firstItem, 16, '#64748B')}
          </View>
          <Text style={styles.cardServiceText}>
            {summary.name}{summary.weight > 0 ? ` · ${summary.weight} kg` : ''}
          </Text>
        </View>

        {/* Row 4: Amount + Action link */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardAmount}>₹{totalAmount}</Text>
          {isDelivered ? (
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Home' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.reorderText}>Reorder →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('OrderDetail', { orderId: order.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewDetailsText}>View Details →</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // --- Main render ---

  // Determine what to show on Active tab: live orders + last 2 past orders
  const showRecentOnActive = activeTab === 'current' && currentOrders.length > 0 && pastOrders.length > 0;
  const recentPastOrders = showRecentOnActive ? pastOrders.slice(0, 2) : [];
  const listData = showRecentOnActive ? recentPastOrders : displayOrders;

  // ListHeader for Active tab: live order card + Recent Orders heading
  const renderListHeader = () => {
    if (activeTab === 'current' && currentOrders.length > 0) {
      return (
        <>
          {currentOrders.map(order => renderActiveOrderCard(order))}
          {pastOrders.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeaderRow}>
                <Text style={styles.recentTitle}>Recent Orders</Text>
                <TouchableOpacity onPress={() => setActiveTab('past')}>
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.recentSubtitle}>Tap to view full details</Text>
            </View>
          )}
        </>
      );
    }
    return null;
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <ShoppingBag size={32} color="#A78BFA" />
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
        colors={['#F5F3FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Custom header matching design */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else (navigation as any).navigate('MainTabs', { screen: 'Home' });
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Pill-shaped tab toggle */}
      <View style={styles.tabOuterContainer}>
        <View style={styles.tabPill}>
          <TouchableOpacity
            style={[styles.tabPillBtn, activeTab === 'current' && styles.tabPillActive]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabPillText, activeTab === 'current' && styles.tabPillTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPillBtn, activeTab === 'past' && styles.tabPillActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabPillText, activeTab === 'past' && styles.tabPillTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={listData}
        renderItem={({ item }) => renderOrderCard(item)}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
          }} tintColor="#7C3AED" colors={['#7C3AED']} />
        }
        ListEmptyComponent={
          activeTab === 'current' && currentOrders.length > 0 ? null : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <ShoppingBag size={32} color="#C4B5FD" />
              </View>
              <Text style={styles.emptyText}>
                {activeTab === 'current' ? 'No active orders' : 'No past orders'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'current'
                  ? 'Place your first order to see it here.'
                  : 'Your completed orders will show up here.'}
              </Text>
              {activeTab === 'current' && (
                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Home' })}
                >
                  <Text style={styles.browseButtonText}>Book Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  // --- Header ---
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
    letterSpacing: -0.4,
  },
  // --- Tabs ---
  tabOuterContainer: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    padding: 4,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tabPillBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9999,
  },
  tabPillActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#94A3B8',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // --- Recent Orders section ---
  recentSection: {
    paddingTop: 8,
    marginBottom: 4,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  recentSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 4,
  },
  // --- List ---
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // --- Live Order Card ---
  liveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  liveCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIdLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  orderIdValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#7C3AED',
  },
  liveServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
  },
  serviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  serviceInfoText: {
    flex: 1,
  },
  serviceNameText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
  },
  serviceStatusText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
  // --- Stepper ---
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  stepCircleCompleted: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  stepCircleCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7C3AED',
    borderWidth: 2.5,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stepCurrentInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  stepUpcomingInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 13,
    marginHorizontal: -2,
  },
  stepConnectorActive: {
    backgroundColor: '#7C3AED',
  },
  // --- Est. Delivery ---
  estDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  estDeliveryText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#1E1B4B',
    flex: 1,
  },
  liveCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  liveCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveCardAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsLinkText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  // --- Order Card (Past / History) ---
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDateText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  cardIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardIdText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#94A3B8',
  },
  cardServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  cardServiceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardServiceText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#475569',
    flex: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
  },
  reorderText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  // --- Empty State ---
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
    marginBottom: 6,
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
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit_800ExtraBold',
  },
});
