import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isSameDay, parse, addDays, startOfToday } from 'date-fns';
import { useAuthStore } from '../../store';
import { scheduleOrderDelivery, subscribeToOrder, checkSlotAvailability } from '../../services/firestore';
import { generateTimeSlots } from '../../utils/slotUtils';
import { BrandLoader } from '../../components/BrandLoader';
import {
  ArrowLeft,
  Share2,
  MapPin,
  Clock,
  ClipboardList,
  CircleCheck,
  Bike,
  Droplets,
  Package,
  Truck,
  Home,
  ShoppingBag,
  Receipt,
  RefreshCw,
  Headphones,
  Shirt,
  Footprints,
  WashingMachine,
  BedDouble,
} from 'lucide-react-native';

const ORDER_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: ClipboardList },
  { key: 'confirmed', label: 'Confirmed', icon: CircleCheck },
  { key: 'pickup_completed', label: 'Pickup Completed', icon: Bike },
  { key: 'processing', label: 'Processing', icon: Droplets },
  { key: 'ready', label: 'Ready for Delivery', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

const getStepIndex = (status: string): number => {
  if (status === 'cancelled' || status === 'refund_processed') return 0;
  const idx = ORDER_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
};

const PulsingGlow = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.pulseRing, { opacity }]} />;
};

const getServiceIcon = (item: any, size: number, color: string) => {
  const type = item?.serviceType || item?.serviceId || '';
  if (type.includes('blanket')) return <BedDouble size={size} color={color} />;
  if (type.includes('shoe') || type.includes('clean')) return <Footprints size={size} color={color} />;
  if (type.includes('wash') || type.includes('laundry')) return <WashingMachine size={size} color={color} />;
  if (type.includes('dry_clean')) return <Shirt size={size} color={color} />;
  return <Shirt size={size} color={color} />;
};

const getStepTimestamp = (order: any, stepKey: string): string => {
  // Never show timestamps on the delivered step
  if (stepKey === 'delivered') return '';

  // For placed step, always show the order creation time
  if (stepKey === 'placed' && order.createdAt) {
    const d = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    return format(d, 'h:mm a');
  }

  // Check for statusTimestamps set by the system
  const timestamps = order.statusTimestamps || {};
  const ts = timestamps[stepKey];
  if (ts) {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'h:mm a');
  }

  // For the current non-delivered status step, show "Just now"
  if (stepKey === order.status) return 'Just now';

  return '';
};

const getOrderTimeString = (date: any): string => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return format(d, 'MMM d, yyyy · h:mm a');
};

export const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { orderId: paramOrderId, id: fallbackId } = (route.params || {}) as { orderId?: string; id?: string };
  const orderId = (paramOrderId || fallbackId) as string;

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const DATES = Array.from({ length: 5 }, (_, i) => {
    const d = startOfToday();
    return addDays(d, i);
  });

  const fetchOrder = async () => {};

  useEffect(() => {
    if (!orderId) {
      navigation.goBack();
      return;
    }
    if (!user) {
      (navigation as any).navigate('PhoneLogin', {
        returnTo: 'OrderDetail',
        orderId: orderId,
      });
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToOrder(user.uid, orderId, (data) => {
      setOrder(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [orderId, user?.uid]);

  useEffect(() => {
    const params = route.params as any;
    if (params?.autoOpenScheduler && order?.status === 'ready' && !order?.deliveryDate) {
      setShowScheduler(true);
      navigation.setParams({ autoOpenScheduler: undefined } as any);
    }
  }, [order?.status, order?.deliveryDate, route.params]);

  useEffect(() => {
    if (showScheduler) {
      fetchBusySlots();
    }
  }, [showScheduler, selectedDateIndex]);

  const fetchBusySlots = async () => {
    setIsLoadingBusySlots(true);
    try {
      const dateStr = format(DATES[selectedDateIndex], 'yyyy-MM-dd');
      const slots = await checkSlotAvailability(dateStr);
      setBusySlots(slots);
    } catch (error) {
      console.error('Error fetching busy slots:', error);
      setBusySlots([]);
    } finally {
      setIsLoadingBusySlots(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    try {
      const dateStr = format(DATES[selectedDateIndex], 'yyyy-MM-dd');
      await scheduleOrderDelivery(user?.uid || '', orderId, dateStr, selectedSlot);
      setShowScheduler(false);
      Alert.alert(
        'Success',
        `Delivery scheduled for ${selectedSlot} on ${format(DATES[selectedDateIndex], 'MMM d')}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule delivery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <BrandLoader message="Loading order details..." />;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'refund_processed';
  const isDelivered = order.status === 'delivered';
  const activeStepIndex = getStepIndex(order.status);
  const statusLabel = isCancelled ? 'Cancelled' : ORDER_STEPS[activeStepIndex]?.label || order.status;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* ═══════ HERO BANNER ═══════ */}
        <View style={styles.heroBanner}>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />
          <View style={styles.heroOrb3} />

          {/* Top row: back + title + share */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else (navigation as any).navigate('MainTabs', { screen: 'MyOrders' });
              }}
              style={styles.heroIconBtn}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.heroTitleText}>ORDER DETAILS</Text>
            <TouchableOpacity style={styles.heroIconBtn}>
              <Share2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Order ID */}
          <View style={styles.heroContent}>
            <Text style={styles.heroOrderId}>#{order.id.slice(-6).toUpperCase()}</Text>

            {/* Status pill — green for active, red for cancelled */}
            <View style={styles.heroStatusPill}>
              <View style={[styles.heroStatusDot, isCancelled && { backgroundColor: '#FCA5A5' }]} />
              <Text style={styles.heroStatusText}>{statusLabel}</Text>
            </View>

            {/* Date */}
            <Text style={styles.heroDateText}>
              Placed on {getOrderTimeString(order.createdAt)}
            </Text>
          </View>
        </View>

        {/* ═══════ WHITE SHEET ═══════ */}
        <View style={styles.whiteSheet}>
          {/* OTP BANNERS */}
          {((['placed', 'confirmed', 'pickup_assigned'].includes(order.status)) && order.pickupOTP) && (
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Share this OTP for Pickup</Text>
              <View style={styles.otpBoxContainer}>
                {order.pickupOTP.toString().split('').map((digit: string, idx: number) => (
                  <View key={idx} style={styles.otpDigitBox}>
                    <Text style={styles.otpDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {((['ready', 'out_for_delivery'].includes(order.status)) && order.deliveryOTP && order.deliveryDate) && (
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Share this OTP for Delivery</Text>
              <View style={styles.otpBoxContainer}>
                {order.deliveryOTP.toString().split('').map((digit: string, idx: number) => (
                  <View key={idx} style={styles.otpDigitBox}>
                    <Text style={styles.otpDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* DELIVERY SCHEDULING CTA */}
          {order.status === 'ready' && !order.deliveryDate && (
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleIconContainer}>
                <ShoppingBag size={24} color="#7C3AED" />
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>Schedule Your Delivery</Text>
                <Text style={styles.scheduleSub}>Pick a 1-hour slot that works for you</Text>
                <TouchableOpacity style={styles.scheduleButton} onPress={() => setShowScheduler(true)}>
                  <Text style={styles.scheduleButtonText}>Schedule Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {order.deliveryDate && !isDelivered && !isCancelled && (
            <View style={styles.scheduledInfoCard}>
              <MapPin size={16} color="#10B981" />
              <Text style={styles.scheduledInfoText}>
                Scheduled for:{' '}
                <Text style={{ fontWeight: '700' }}>
                  {(() => {
                    try {
                      return format(parse(order.deliveryDate, 'yyyy-MM-dd', new Date()), 'MMM d');
                    } catch (e) {
                      return order.deliveryDate;
                    }
                  })()}
                  , {order.deliveryTime}
                </Text>
              </Text>
            </View>
          )}

          {/* Pickup / Delivery time info — always show when available */}
          {(() => {
            const pickup = order.pickupDetails;
            const rows: React.ReactNode[] = [];
            if (pickup?.scheduledDate && pickup?.scheduledTime) {
              const d = new Date(pickup.scheduledDate + 'T00:00:00');
              const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
              rows.push(
                <View key="pickup" style={styles.pickupInfoRow}>
                  <Clock size={14} color="#7C3AED" />
                  <Text style={styles.pickupInfoText}>
                    Pickup: {dateStr}, {pickup.scheduledTime}
                  </Text>
                </View>
              );
            }
            // Show delivery time even after delivered (when green badge is hidden)
            if (order.deliveryDate && order.deliveryTime && (isDelivered || isCancelled)) {
              const d = new Date(order.deliveryDate + 'T00:00:00');
              const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
              rows.push(
                <View key="delivery" style={[styles.pickupInfoRow, { backgroundColor: '#ECFDF5' }]}>
                  <Truck size={14} color="#10B981" />
                  <Text style={[styles.pickupInfoText, { color: '#059669' }]}>
                    Delivered: {dateStr}, {order.deliveryTime}
                  </Text>
                </View>
              );
            }
            return rows.length > 0 ? <>{rows}</> : null;
          })()}

          {/* ═══════ 1. ORDER STATUS TIMELINE ═══════ */}
          {!isCancelled && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPin size={20} color="#7C3AED" />
                <Text style={styles.cardTitle}>Order Status</Text>
              </View>
              <View style={styles.timeline}>
                {ORDER_STEPS.map((step, index) => {
                  const isActive = index <= activeStepIndex;
                  const isLast = index === ORDER_STEPS.length - 1;
                  // If order is delivered, the last step is completed not current
                  const showAsCurrent = index === activeStepIndex && !(isLast && isDelivered);
                  const StepIcon = step.icon;
                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineCol}>
                        <View
                          style={[
                            styles.timelineCircle,
                            isActive && !showAsCurrent && styles.timelineCircleCompleted,
                            showAsCurrent && styles.timelineCircleCurrent,
                          ]}
                        >
                          {showAsCurrent && <PulsingGlow />}
                          <StepIcon
                            size={16}
                            color={
                              showAsCurrent ? '#7C3AED' : isActive ? '#FFFFFF' : '#94A3B8'
                            }
                          />
                        </View>
                        {index < ORDER_STEPS.length - 1 && (
                          <View
                            style={[
                              styles.timelineLine,
                              isActive && !showAsCurrent && styles.timelineLineActive,
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineLabelRow}>
                          <Text
                            style={[
                              styles.timelineLabel,
                              (isActive || showAsCurrent) && styles.timelineLabelActive,
                            ]}
                          >
                            {step.label}
                          </Text>
                          <Text style={styles.timelineTime}>
                            {getStepTimestamp(order, step.key)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* ═══════ 2. ITEMS ORDERED ═══════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShoppingBag size={20} color="#7C3AED" />
              <Text style={styles.cardTitle}>Items Ordered</Text>
            </View>
            {order.items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemIconBox}>
                  {getServiceIcon(item, 22, '#7C3AED')}
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemName}>{item.serviceName}</Text>
                    {item.weight && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>{item.weight} KG</Text>
                      </View>
                    )}
                    {item.clothesCount > 0 && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>{item.clothesCount} PCS</Text>
                      </View>
                    )}
                    {item.ironingCount > 0 && !item.weight && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>{item.ironingCount} PCS</Text>
                      </View>
                    )}
                    {item.serviceType === 'blanket_wash' && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>
                          {item.singleBlanketCount > 0 || item.doubleBlanketCount > 0
                            ? [
                                item.singleBlanketCount > 0 ? `${item.singleBlanketCount} Single` : null,
                                item.doubleBlanketCount > 0 ? `${item.doubleBlanketCount} Double` : null,
                              ].filter(Boolean).join(' / ')
                            : `${item.blanketQuantity || item.quantity || 0} Blankets`}
                        </Text>
                      </View>
                    )}
                    {item.serviceType === 'shoe_clean' && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>
                          {item.shoeQuantity || item.quantity || 0} Pairs
                        </Text>
                      </View>
                    )}
                    {item.serviceType === 'dry_clean' && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>
                          {item.weight ? `${item.weight} KG` : `${item.quantity || 0} Pcs`}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDesc}>
                    {item.serviceType === 'wash_fold'
                      ? 'Includes sorting, wash, fold'
                      : item.serviceType === 'wash_iron'
                        ? 'Wash followed by professional ironing'
                        : item.serviceType === 'ironing'
                          ? 'Wrinkle-free finishing'
                          : item.serviceType === 'blanket_wash'
                            ? (item.description || 'Deep cleaning for blankets')
                            : item.serviceType === 'shoe_clean'
                              ? (item.description || 'Professional shoe laundry')
                              : item.serviceType === 'dry_clean'
                                ? (item.description || 'Premium chemical dry cleaning')
                                : item.description || 'Service'}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* ═══════ 3. BILL DETAILS ═══════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Receipt size={20} color="#7C3AED" />
              <Text style={styles.cardTitle}>Bill Details</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total</Text>
              <Text style={styles.billValue}>₹{order.billDetails?.itemTotal}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Pickup & Delivery</Text>
              <Text style={[styles.billValue, { color: '#10B981' }]}>
                {order.billDetails?.deliveryFee > 0 ? `₹${order.billDetails?.deliveryFee}` : 'Free'}
              </Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Credits Applied</Text>
              <Text style={[styles.billValue, { color: '#94A3B8' }]}>−₹{order.billDetails?.creditsApplied || 0}</Text>
            </View>
            {order.billDetails?.discount > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Discount</Text>
                <Text style={[styles.billValue, { color: '#94A3B8' }]}>−₹{order.billDetails?.discount}</Text>
              </View>
            )}
            {order.billDetails?.gst > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST</Text>
                <Text style={styles.billValue}>₹{order.billDetails?.gst}</Text>
              </View>
            )}
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>₹{order.billDetails?.total}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ═══════ 4. DELIVERY ADDRESS ═══════ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MapPin size={20} color="#7C3AED" />
              <Text style={styles.cardTitle}>Delivery Address</Text>
            </View>
            <Text style={styles.addressText}>
              {order.address?.label ? `${order.address.label} · ` : ''}
              {typeof order.address === 'string'
                ? order.address
                : order.address?.formattedAddress || order.address?.address || ''}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ═══════ 5. ACTION BUTTONS ═══════ */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Home' })}
            >
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Reorder →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={() => (navigation as any).navigate('HelpSupport')}
            >
              <Headphones size={20} color="#7C3AED" />
              <Text style={styles.secondaryBtnText}>Need Help?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ═══════ DELIVERY SCHEDULER MODAL ═══════ */}
      <Modal
        visible={showScheduler}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduler(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Slot</Text>
              <TouchableOpacity onPress={() => setShowScheduler(false)}>
                <Text style={{ fontSize: 24, color: '#1E1B4B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateList}>
              {DATES.map((date, index) => {
                const isSelected = selectedDateIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dateItem, isSelected && styles.dateItemActive]}
                    onPress={() => setSelectedDateIndex(index)}
                  >
                    <Text style={[styles.dateDay, isSelected && styles.dateTextActive]}>
                      {format(date, 'eee')}
                    </Text>
                    <Text style={[styles.dateNum, isSelected && styles.dateTextActive]}>
                      {format(date, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalSubtitle}>Select 1-Hour Slot</Text>
            {isLoadingBusySlots ? (
              <View style={styles.slotLoader}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.loaderText}>Checking availability...</Text>
              </View>
            ) : (
              <ScrollView style={styles.slotList} contentContainerStyle={styles.slotListContent}>
                <View style={styles.timeGrid}>
                  {generateTimeSlots().map((slot) => {
                    const isBusy = busySlots.includes(slot);
                    const isSelected = selectedSlot === slot;
                    const [startStr] = slot.split(' - ');
                    const [hoursStr, minsStr] = startStr.split(':');
                    const slotHour = parseInt(hoursStr, 10);
                    const slotMin = parseInt(minsStr, 10);

                    let isPast = false;
                    if (isSameDay(DATES[selectedDateIndex], new Date())) {
                      const now = new Date();
                      const slotTime = new Date();
                      slotTime.setHours(slotHour, slotMin, 0, 0);
                      isPast = slotTime <= now;
                    }

                    const isDisabled = isBusy || isPast;

                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.timeSlot,
                          isSelected && styles.timeSlotSelected,
                          isDisabled && { opacity: 0.5, backgroundColor: '#F3F4F6' },
                        ]}
                        disabled={isDisabled}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            isSelected && styles.timeTextSelected,
                            isDisabled && { color: '#94A3B8', textDecorationLine: isBusy ? 'line-through' : 'none' },
                          ]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, !selectedSlot && styles.confirmButtonDisabled]}
              onPress={handleConfirmSchedule}
              disabled={!selectedSlot || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Delivery Slot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // ═══ HERO BANNER ═══
  heroBanner: {
    backgroundColor: '#7C3AED',
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrb1: {
    position: 'absolute',
    top: 6,
    left: -8,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ scaleX: 1.5 }],
  },
  heroOrb2: {
    position: 'absolute',
    top: 40,
    right: 2,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroOrb3: {
    position: 'absolute',
    top: 64,
    left: '50%',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginLeft: -56,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 4.48,
  },
  heroContent: {
    alignItems: 'center',
    marginTop: 16,
    position: 'relative',
    zIndex: 1,
  },
  heroOrderId: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6EE7B7',
  },
  heroStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroDateText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
  },
  // ═══ WHITE SHEET ═══
  whiteSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 5,
  },
  // ═══ CARD ═══
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
    marginBottom: 4,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
    letterSpacing: -0.4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
    marginHorizontal: 8,
  },
  // ═══ OTP ═══
  otpContainer: {
    backgroundColor: '#7C3AED',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  otpLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 12,
    opacity: 0.9,
  },
  otpBoxContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  otpDigitBox: {
    width: 48,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  otpDigitText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
  },
  // ═══ DELIVERY SCHEDULING ═══
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  scheduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  scheduleSub: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
    marginBottom: 12,
  },
  scheduleButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  scheduleButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scheduledInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  scheduledInfoText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#059669',
    marginLeft: 8,
  },
  // Pickup info row
  pickupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  pickupInfoText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#1E1B4B',
  },
  // ═══ TIMELINE ═══
  timeline: {
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineCol: {
    alignItems: 'center',
    width: 40,
    marginRight: 12,
  },
  timelineCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F5',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  timelineCircleCompleted: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  timelineCircleCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7C3AED',
    borderWidth: 2.5,
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#7C3AED',
    top: -6,
    left: -6,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 2,
  },
  timelineLineActive: {
    borderLeftColor: '#7C3AED',
    borderStyle: 'dashed',
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#94A3B8',
  },
  timelineLabelActive: {
    color: '#1E1B4B',
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
    color: '#94A3B8',
  },
  // ═══ ITEMS ═══
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.6)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
  },
  weightBadge: {
    backgroundColor: 'rgba(124,58,237,0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  weightText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  itemDesc: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
  },
  // ═══ BILL ═══
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#1E1B4B',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#7C3AED',
  },
  // ═══ ADDRESS ═══
  addressText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  // ═══ ACTION BUTTONS ═══
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 9999,
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 9999,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.20)',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  // ═══ MODAL ═══
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#1E1B4B',
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    color: '#1E1B4B',
    marginBottom: 12,
    marginTop: 8,
  },
  dateList: {
    marginBottom: 16,
  },
  dateItem: {
    width: 60,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dateItemActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  dateDay: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontFamily: 'Outfit_500Medium',
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
    fontFamily: 'Outfit_700Bold',
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  slotList: {
    maxHeight: 300,
  },
  slotListContent: {
    paddingBottom: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  timeSlotSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#1E1B4B',
  },
  timeTextSelected: {
    color: '#FFFFFF',
  },
  slotLoader: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#64748B',
    fontFamily: 'Outfit_500Medium',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
});
