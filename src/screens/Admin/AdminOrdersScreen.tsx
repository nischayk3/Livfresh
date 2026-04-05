import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../utils/constants';
import { useAdminStore } from '../../store/adminStore';
import { useUIStore } from '../../store/uiStore';
import { format, addDays, startOfToday } from 'date-fns';
import { BrandLoader } from '../../components/BrandLoader';
import { subscribeToAllOrdersAdmin, checkSlotAvailabilityAdmin, scheduleOrderDeliveryAdmin } from '../../services/adminFirestore';

// Status tabs configuration - mirroring SpinZo flow
const STATUS_TABS = [
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'pickup_completed', label: 'Pickup' }, // "Pickup" means completed, waiting processing
  { id: 'processing', label: 'Processing' }, // Washing/Ironing
  { id: 'ready', label: 'Ready' }, // Ready for delivery
  { id: 'out_for_delivery', label: 'Out' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const CANCELLATION_REASONS = [
  "Customer didn’t pickup the call",
  "Customer not available at location",
  "Customer requested cancellation",
  "Invalid/ incorrect address",
  "Other"
];

export const AdminOrdersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    orders,
    ordersLoading: isLoading,
    fetchAllOrders,
    updateOrderStatus
  } = useAdminStore();
  const { showAlert } = useUIStore();

  // Local State
  const [activeTab, setActiveTab] = useState('confirmed');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // OTP Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [actionType, setActionType] = useState<'pickup' | 'delivery'>('pickup');
  const [processing, setProcessing] = useState(false);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Edit Modal State
  const [editOrderModalVisible, setEditOrderModalVisible] = useState(false);

  // Options Menu State (Three-dots)
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedOrderForOptions, setSelectedOrderForOptions] = useState<any>(null);

  // Reschedule Modal State
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedRescheduleDateIndex, setSelectedRescheduleDateIndex] = useState(0);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string | null>(null);
  const [busySlotsForReschedule, setBusySlotsForReschedule] = useState<string[]>([]);
  const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);

  // Dynamic next 5 days for reschedule
  const RESCHEDULE_DATES = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = startOfToday();
      return addDays(d, i);
    });
  }, []);

  // Initial Fetch & Real-time Listener
  useEffect(() => {
    const unsubscribe = subscribeToAllOrdersAdmin((newOrders) => {
      // Direct store update for real-time sync
      useAdminStore.setState({ orders: newOrders, ordersLoading: false });
    });

    return () => unsubscribe();
  }, []);



  // Debug: Inspect raw order count
  useEffect(() => {
    console.log(`[UI DEBUG] Total Fetched Orders: ${orders.length}`);
    if (orders.length > 0) {
      // Check for any orders from today to verify "recent" fetch
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => {
        const created = (o.createdAt as any);
        const d = created?.toDate ? created.toDate() : new Date(created);
        try { return d.toISOString().split('T')[0] === today; } catch (e) { return false; }
      });
      console.log(`[UI DEBUG] Orders with date ${today}: ${todayOrders.length}`);

      // Log top 5 orders to identify missing ones
      console.log('[UI DEBUG] Top 5 Recent Orders:', orders.slice(0, 5).map(o => `${o.id} (${o.status})`));
    }
  }, [orders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllOrders();
    setRefreshing(false);
  };

  // Filter Orders
  const filteredOrders = useMemo(() => {
    console.log(`[UI] Filtering ${orders.length} orders. ActiveTab: ${activeTab}`);

    // Log available statuses
    if (orders.length > 0) {
      const statuses = [...new Set(orders.map(o => o.status))];
      console.log('[UI] Available statuses in orders:', statuses);
    }

    let filtered = orders;

    // 1. Filter by Tab Status
    // Special handling for 'pickup_completed' tab which might show 'pickup_completed' status
    filtered = filtered.filter(order => {
      // DEBUG: If you want to see ALL orders regardless of tab, comment the return logic below temporarily
      if (activeTab === 'confirmed') return order.status === 'confirmed' || order.status === 'placed';
      if (activeTab === 'pickup_completed') return order.status === 'pickup_completed';
      if (activeTab === 'out_for_delivery') return order.status === 'out_for_delivery';
      return order.status === activeTab;
    });

    // 2. Filter by Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(lowerQuery) ||
        order.id.toLowerCase().includes(lowerQuery) ||
        (order.customerPhone || '').includes(lowerQuery) ||
        (order.customerName || '').toLowerCase().includes(lowerQuery) ||
        (order.pickupOTP || '').includes(lowerQuery)
      );
    }

    console.log(`[UI] Returning ${filtered.length} filtered orders for ${activeTab}`);
    return filtered;
  }, [orders, activeTab, searchQuery]);

  // Action Handlers
  const handleVerifyPickup = (order: any) => {
    setSelectedOrder(order);
    setActionType('pickup');
    setOtpInput('');
    setTokenInput('');
    setOtpModalVisible(true);
  };

  const handleVerifyDelivery = (order: any) => {
    setSelectedOrder(order);
    setActionType('delivery');
    setOtpInput('');
    setOtpModalVisible(true);
  };

  const handleMarkProcessed = (order: any) => {
    showAlert({
      title: "Confirm Processing",
      message: "Are you sure you want to move this order to Processing?",
      type: 'info',
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            setProcessing(true);
            try {
              await updateOrderStatus(order.userId, order.id, 'processing');
            } catch (error) {
              showAlert({ title: "Error", message: "Failed to update status", type: 'error' });
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    });
  };

  const handleCancelOrder = (order: any) => {
    setOrderToCancel(order);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCancelNote('');
    setCancelModalVisible(true);
  };

  const processCancellation = async () => {
    if (!orderToCancel) return;

    setProcessing(true);
    try {
      const additionalData = {
        cancellationReason: cancelReason,
        cancellationNote: cancelNote,
        isCancelled: true, // redundancy for easy querying
        cancelledAt: new Date(), // Client side date, server timestamp added in service
      };

      await updateOrderStatus(
        orderToCancel.userId,
        orderToCancel.id,
        'cancelled',
        { additionalData }
      );

      setCancelModalVisible(false);
      setProcessing(false);
      Alert.alert("Success", "Order cancelled successfully");
    } catch (error) {
      setProcessing(false);
      Alert.alert("Error", "Failed to cancel order");
    }
  };

  // Render Item
  // ... (render item logic is above)




  const handleMarkReady = (order: any) => {
    showAlert({
      title: "Confirm Ready",
      message: "Is the order packed and ready for delivery? A delivery OTP will be generated.",
      type: 'warning',
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Ready",
          style: "default",
          onPress: async () => {
            setProcessing(true);
            try {
              await updateOrderStatus(order.userId, order.id, 'ready');
            } catch (error) {
              showAlert({ title: "Error", message: "Failed to update status", type: 'error' });
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    });
  };

  const handleMarkOutForDelivery = (order: any) => {
    // Delivery Scheduling Guard - Aligned with SpinZo business logic
    if (!order.deliveryDate || !order.deliveryTime) {
      showAlert({
        title: "Action Blocked",
        message: "This order hasn't been scheduled for delivery by the customer yet. Please wait for the customer to pick a time slot.",
        type: 'warning'
      });
      return;
    }

    showAlert({
      title: "Start Delivery",
      message: `Are you sending this order out for delivery now? \n\nScheduled for: ${order.deliveryDate}, ${order.deliveryTime}`,
      type: 'info',
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Out for Delivery",
          style: "default",
          onPress: async () => {
            setProcessing(true);
            try {
              await updateOrderStatus(order.userId, order.id, 'out_for_delivery');
            } catch (error) {
              showAlert({ title: "Error", message: "Failed to update status", type: 'error' });
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    });
  };

  const handleSubmitOTP = async () => {
    if (!selectedOrder) return;
    if (otpInput.length !== 4) {
      Alert.alert("Error", "Please enter a valid 4-digit OTP");
      return;
    }

    setProcessing(true);
    try {
      if (actionType === 'pickup') {
        await updateOrderStatus(
          selectedOrder.userId,
          selectedOrder.id,
          'pickup_completed', // Next status
          {
            verifyPickup: true,
            pickupOTP: otpInput,
            tokenNumber: tokenInput || undefined
          }
        );
      } else {
        await updateOrderStatus(
          selectedOrder.userId,
          selectedOrder.id,
          'delivered', // Next status
          {
            verifyDelivery: true,
            deliveryOTP: otpInput
          }
        );
      }
      setOtpModalVisible(false);
      setProcessing(false);
    } catch (error: any) {
      setProcessing(false);
      Alert.alert("Verification Failed", error.message || "Invalid OTP");
    }
  };

  const handleGetDirections = (item: any) => {
    const { latitude, longitude, address } = item;
    const addressStr = typeof address === 'string' ? address : (address?.formattedAddress || '');

    const url = latitude && longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open map application");
    });
  };

  const handleWhatsAppContact = (item: any) => {
    const phone = item.customerPhone || item.userPhone;
    if (!phone) {
      Alert.alert("Error", "No phone number available");
      return;
    }

    // Clean phone number: keep only digits
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // PRE-FILLED MESSAGES BASED ON STATUS
    let message = `Hi ${item.customerName || 'Customer'},\n\nI'm reaching out from *SpinZo* regarding your order *#${(item.id || '').toUpperCase()}*.`;

    if (item.status === 'confirmed' || item.status === 'placed') {
      message += `\n\nYour order is confirmed! Our pickup executive will reach you within the scheduled time.`;
    } else if (item.status === 'processing') {
      message += `\n\nYour garments are currently being processed. We'll update you once they are ready for delivery!`;
    } else if (item.status === 'ready') {
      message += `\n\nYour order is *Packed & Ready*! 🧺\nPlease schedule your delivery slot in the app to receive your fresh clothes.`;
    } else if (item.status === 'out_for_delivery') {
      message += `\n\nYour order is out for delivery! 🚚\nPlease keep your *Delivery OTP* ready.`;
    }

    // Add Direct Order Link
    if (item.id) {
      message += `\n\nView Order Details: https://spinzo.in/order/${item.id}`;
    }

    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${finalPhone}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to web link
        Linking.openURL(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`);
      }
    });
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setEditOrderModalVisible(true);
  };

  const handleSaveEditedOrder = async (updatedItems: any[], itemTotal: number, discount: number, grandTotal: number, deliveryFee: number) => {
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      await updateOrderStatus(
        selectedOrder.userId,
        selectedOrder.id,
        selectedOrder.status, // Keep same status
        {
          additionalData: {
            items: updatedItems,
            totalAmount: grandTotal,
            billDetails: {
              ...(selectedOrder.billDetails || {}),
              itemTotal: itemTotal,
              discount: discount,
              deliveryFee: deliveryFee,
              total: grandTotal
            }
          }
        }
      );
      setEditOrderModalVisible(false);
      Alert.alert("Success", "Order updated successfully");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update order");
    } finally {
      setProcessing(false);
    }
  };

  // --- Ready Tab Action Handlers ---

  const handleShowOptions = (order: any) => {
    setSelectedOrderForOptions(order);
    setOptionsModalVisible(true);
  };

  const handleRescheduleOption = () => {
    setOptionsModalVisible(false);
    setSelectedRescheduleSlot(null);
    setSelectedRescheduleDateIndex(0);
    setRescheduleModalVisible(true);
  };

  const handleCancelOption = () => {
    setOptionsModalVisible(false);
    if (selectedOrderForOptions) {
      setOrderToCancel(selectedOrderForOptions);
      setCancelReason(CANCELLATION_REASONS[0]);
      setCancelNote('');
      setCancelModalVisible(true);
    }
  };

  useEffect(() => {
    if (rescheduleModalVisible) {
      fetchBusySlotsForReschedule();
    }
  }, [rescheduleModalVisible, selectedRescheduleDateIndex]);

  const fetchBusySlotsForReschedule = async () => {
    setIsLoadingBusySlots(true);
    try {
      const dateStr = format(RESCHEDULE_DATES[selectedRescheduleDateIndex], 'yyyy-MM-dd');
      const busy = await checkSlotAvailabilityAdmin(dateStr);
      setBusySlotsForReschedule(busy || []);
    } catch (error) {
      console.error('Error fetching busy slots for reschedule:', error);
      setBusySlotsForReschedule([]);
    } finally {
      setIsLoadingBusySlots(false);
    }
  };

  const confirmReschedule = async () => {
    if (!selectedOrderForOptions || !selectedRescheduleSlot) return;

    setProcessing(true);
    try {
      const dateStr = format(RESCHEDULE_DATES[selectedRescheduleDateIndex], 'yyyy-MM-dd');
      await scheduleOrderDeliveryAdmin(
        selectedOrderForOptions.userId,
        selectedOrderForOptions.id,
        dateStr,
        selectedRescheduleSlot
      );
      setRescheduleModalVisible(false);
      Alert.alert("Success", "Delivery rescheduled successfully");
    } catch (error) {
      console.error('Reschedule error:', error);
      Alert.alert("Error", "Failed to reschedule delivery");
    } finally {
      setProcessing(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 9; i < 21; i++) {
      const p1 = `${i.toString().padStart(2, '0')}:00`;
      const p2 = `${i.toString().padStart(2, '0')}:30`;
      const p3 = `${(i + 1).toString().padStart(2, '0')}:00`;
      slots.push(`${p1} - ${p2}`);
      slots.push(`${p2} - ${p3}`);
    }
    return slots;
  };

  const getSlotFromDate = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // If before 9 AM, use first slot
    if (hours < 9) return "09:00 - 09:30";
    // If after 9 PM, use last slot (or indicate day shift over)
    if (hours >= 21) return "20:30 - 21:00";

    const startHour = hours.toString().padStart(2, '0');
    if (minutes < 30) {
      return `${startHour}:00 - ${startHour}:30`;
    } else {
      const nextHour = (hours + 1).toString().padStart(2, '0');
      return `${startHour}:30 - ${nextHour}:00`;
    }
  };

  // Render Item
  const renderOrderItem = ({ item }: { item: any }) => {
    const getFormattedDate = (dateField: any) => {
      if (!dateField) return null;
      let date: Date | undefined;
      if (dateField.toDate && typeof dateField.toDate === 'function') {
        date = dateField.toDate();
      } else if (dateField.seconds) {
        date = new Date(dateField.seconds * 1000);
      } else if (dateField instanceof Date) {
        date = dateField;
      } else if (typeof dateField === 'string' || typeof dateField === 'number') {
        date = new Date(dateField);
      }
      if (date && !isNaN(date.getTime())) {
        return format(date, 'MMM dd, yyyy • hh:mm a');
      }
      return null;
    };

    const placementDate = getFormattedDate(item.createdAt) || 'Date N/A';
    const cancellationDate = getFormattedDate(item.cancelledAt) || getFormattedDate(item.updatedAt);

    return (
      <View style={styles.orderCard}>
        {/* Header with Cancel Option */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>{item.id ? item.id.toUpperCase() : 'NO ID'}</Text>
            <Text style={[styles.orderDate, item.status === 'cancelled' && { color: COLORS.error }]}>
              {item.status === 'cancelled' ? `Cancelled: ${cancellationDate || 'N/A'}` : placementDate}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {item.status === 'cancelled' && (
                <View style={[styles.tokenBadge, { backgroundColor: COLORS.error + '10' }]}>
                  <Ionicons name="alert-circle-outline" size={12} color={COLORS.error} />
                  <Text style={[styles.tokenText, { color: COLORS.error }]}>
                    Reason: {item.cancellationReason || 'Not specified'}
                  </Text>
                </View>
              )}
              {item.status === 'cancelled' && (
                <View style={[styles.tokenBadge, { backgroundColor: COLORS.backgroundLight }]}>
                  <Ionicons name="cart-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={[styles.tokenText, { color: COLORS.textSecondary }]}>
                    Ordered: {placementDate}
                  </Text>
                </View>
              )}
              {item.tokenNumber && (
                <View style={styles.tokenBadge}>
                  <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.tokenText}>Token: {item.tokenNumber}</Text>
                </View>
              )}
              {item.deliveryDate && item.deliveryTime && (
                <View style={[styles.tokenBadge, { backgroundColor: COLORS.success + '10' }]}>
                  <Ionicons name="time-outline" size={12} color={COLORS.success} />
                  <Text style={[styles.tokenText, { color: COLORS.success }]}>Slot: {item.deliveryDate}, {item.deliveryTime}</Text>
                </View>
              )}
              {!item.deliveryDate && item.status === 'ready' && (
                <View style={[styles.tokenBadge, { backgroundColor: COLORS.warning + '10' }]}>
                  <Ionicons name="alert-circle-outline" size={12} color={COLORS.warning} />
                  <Text style={[styles.tokenText, { color: COLORS.warning }]}>Waiting for Schedule</Text>
                </View>
              )}
              {item.items && item.items.some((orderItem: any) => orderItem.isCreditItem) && (
                <View style={[styles.tokenBadge, { backgroundColor: COLORS.primary + '11' }]}>
                  <Ionicons name="card-outline" size={12} color={COLORS.primary} />
                  <Text style={[styles.tokenText, { color: COLORS.primary }]}>Subscription Credit</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            {/* Cancel Button only for New orders */}
            {['placed', 'confirmed'].includes(item.status) && (
              <TouchableOpacity onPress={() => handleCancelOrder(item)} style={styles.cancelButtonSmall}>
                <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Edit Button for Pickup Completed */}
            {item.status === 'pickup_completed' && (
              <TouchableOpacity
                onPress={() => handleEditOrder(item)}
                style={[styles.cancelButtonSmall, { backgroundColor: COLORS.primary + '15' }]}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.cancelButtonText, { color: COLORS.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}

            {/* Options Button for Ready status */}
            {item.status === 'ready' && (
              <TouchableOpacity
                onPress={() => handleShowOptions(item)}
                style={[styles.cancelButtonSmall, { backgroundColor: COLORS.primary + '15' }]}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.primary} />
                <Text style={[styles.cancelButtonText, { color: COLORS.primary }]}>Options</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.customerName}>{item.customerName || 'Unknown User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              const phoneNumber = item.customerPhone?.replace(/\D/g, '');
              if (phoneNumber) {
                Linking.openURL(`tel:${phoneNumber}`);
              }
            }}
          >
            <Ionicons name="call-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.customerPhone, { color: COLORS.primary, textDecorationLine: 'underline' }]}>{item.customerPhone || 'No Phone'}</Text>
          </TouchableOpacity>
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.addressText, { flex: 1 }]} numberOfLines={2}>
                {typeof item.address === 'string' ? item.address : (item.address?.formattedAddress || 'No Address')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => handleWhatsAppContact(item)}
                  style={styles.whatsappButton}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                  <Text style={[styles.directionsText, { color: '#25D366' }]}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleGetDirections(item)}
                  style={styles.directionsButton}
                >
                  <Ionicons name="navigate-circle" size={24} color={COLORS.primary} />
                  <Text style={styles.directionsText}>Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Photos Section */}
        {item.items && item.items.some((orderItem: any) => orderItem.photoUrls && orderItem.photoUrls.length > 0) && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' }}>
              📸 Customer Photos
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING.sm }}>
              {item.items.flatMap((orderItem: any, idx: number) =>
                (orderItem.photoUrls || []).map((photoUrl: string, photoIdx: number) => (
                  <TouchableOpacity
                    key={`${idx}-${photoIdx}`}
                    style={{
                      width: 80,
                      height: 80,
                      marginHorizontal: 4,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: COLORS.backgroundLight,
                    }}
                    onPress={() => setSelectedImage(photoUrl)}
                  >
                    <Image
                      source={{ uri: photoUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Detailed Items (SpinZo Style) */}
        <View style={styles.itemsContainer}>
          {item.items && item.items.length > 0 ? (
            item.items.map((srv: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemTag}>
                  {srv.serviceName} {'\u2022'} {
                    srv.serviceType === 'blanket_wash'
                      ? (srv.description || (srv.quantity || '0') + ' Blankets')
                      : srv.serviceType === 'shoe_clean'
                        ? `${srv.shoeQuantity || srv.quantity || 0} pairs`
                        : srv.serviceType === 'dry_clean'
                          ? (srv.weight ? `${srv.weight}kg` : `${srv.items?.length || srv.quantity || 0} units`)
                          : srv.serviceType === 'ironing'
                            ? `${srv.ironingCount || srv.clothesCount || srv.quantity || 0} Clothes`
                            : (
                              // Combined logic for wash_fold, wash_iron, premium, etc.
                              (srv.weight ? `${srv.weight}kg` : `${srv.quantity || 1} units`) +
                              ((srv.ironingCount || srv.ironingEnabled) ? ` + ${srv.ironingCount || 0} Ironing` : '')
                            )
                  }
                </Text>
                {srv.specialInstructions ? (
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 4, marginLeft: 4, fontStyle: 'italic' }}>
                    " {srv.specialInstructions} "
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.itemTag}>No items</Text>
          )}

          {/* Pickup Slot display */}
          {item.pickupDetails && (
            <View style={styles.slotRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.slotText}>
                Pickup: {item.pickupDetails.scheduledDate || 'Today'} • {
                  (item.pickupDetails.type === 'instant' || item.pickupDetails.isInstant)
                    ? (item.pickupDetails.scheduledTime || (() => {
                      const createdAt = item.createdAt;
                      let date: Date | null = null;
                      if (createdAt?.toDate) date = createdAt.toDate();
                      else if (createdAt?.seconds) date = new Date(createdAt.seconds * 1000);
                      else if (createdAt instanceof Date) date = createdAt;

                      return date ? getSlotFromDate(date) : 'Anytime';
                    })())
                    : (item.pickupDetails.scheduledTime || 'Anytime')
                }
              </Text>
            </View>
          )}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.totalPrice}>₹{item.billDetails?.total || item.totalAmount || 0}</Text>
          </View>
        </View>

        {/* Full Width Action Button */}
        < View style={styles.actionRowFull} >
          {(item.status === 'confirmed' || item.status === 'placed') && (
            <TouchableOpacity
              style={[styles.actionButtonFull, { backgroundColor: COLORS.primary }]} // SpinZo Purple
              onPress={() => handleVerifyPickup(item)}
            >
              <Text style={styles.actionButtonTextFull}>Mark Pickup Completed</Text>
            </TouchableOpacity>
          )}
          {/* ... other status buttons can follow same pattern ... */}


          {item.status === 'pickup_completed' && (
            <TouchableOpacity
              style={[styles.actionButtonFull, { backgroundColor: '#6366F1' }]} // Indigo
              onPress={() => handleMarkProcessed(item)}
            >
              <Text style={styles.actionButtonTextFull}>Start Processing</Text>
            </TouchableOpacity>
          )}

          {item.status === 'processing' && (
            <TouchableOpacity
              style={[styles.actionButtonFull, { backgroundColor: COLORS.success }]}
              onPress={() => handleMarkReady(item)}
            >
              <Text style={styles.actionButtonTextFull}>Mark Ready</Text>
            </TouchableOpacity>
          )}

          {item.status === 'ready' && (
            <TouchableOpacity
              style={[styles.actionButtonFull, { backgroundColor: COLORS.warning }]}
              onPress={() => handleMarkOutForDelivery(item)}
            >
              <Text style={styles.actionButtonTextFull}>Out for Delivery</Text>
            </TouchableOpacity>
          )}

          {item.status === 'out_for_delivery' && (
            <TouchableOpacity
              style={[styles.actionButtonFull, { backgroundColor: COLORS.primary }]}
              onPress={() => handleVerifyDelivery(item)}
            >
              <Text style={styles.actionButtonTextFull}>Verify Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Calculate Status Counts
  const tabsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {
      confirmed: 0,
      pickup_completed: 0,
      processing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach(order => {
      const status = order.status || 'placed';
      if (status === 'placed') {
        counts.confirmed++; // Map placed to confirmed/New
      } else if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return STATUS_TABS.map(tab => ({
      ...tab,
      label: tab.id === 'confirmed' ? 'New' : tab.label, // Rename Confirmed -> New
      count: counts[tab.id] || 0
    }));
  }, [orders]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <BrandLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? SPACING.lg : insets.top + SPACING.md }]}>
        <Text style={styles.headerTitle}>Orders Management</Text>
        <Text style={styles.headerSubtitle}>{orders.length} total orders</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Order ID, Name, or Phone..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabsWithCounts.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : `order-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* OTP/Verification Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'pickup' ? 'Verify Pickup' : 'Verify Delivery'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter the OTP provided by the customer
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 4-digit OTP"
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />

            {actionType === 'pickup' && (
              <View style={styles.tokenContainer}>
                <Text style={styles.inputLabel}>Assign Token Number (Optional)</Text>
                <TextInput
                  style={styles.tokenInput}
                  placeholder="e.g. 34 or 34,57,58"
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  placeholderTextColor={COLORS.textSecondary}
                />
                <Text style={[styles.inputLabel, { marginTop: 4, fontSize: 10, opacity: 0.8 }]}>
                  Assign a token for vendor batch tracking
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setOtpModalVisible(false)}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyButton, processing && { opacity: 0.7 }]}
                onPress={handleSubmitOTP}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>Please select a reason for cancellation</Text>

            <View style={{ marginBottom: 16 }}>
              {CANCELLATION_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonRow,
                    cancelReason === reason && styles.selectedReasonRow
                  ]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Ionicons
                    name={cancelReason === reason ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={cancelReason === reason ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[
                    styles.reasonText,
                    cancelReason === reason && styles.selectedReasonText
                  ]}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.tokenInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter any additional details..."
                value={cancelNote}
                onChangeText={setCancelNote}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCancelModalVisible(false)}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: COLORS.error }, processing && { opacity: 0.7 }]}
                onPress={processCancellation}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
        animationType="fade"
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: '90%', height: '80%' }}
              contentFit="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Edit Order Modal */}
      {selectedOrder && (
        <EditOrderModal
          visible={editOrderModalVisible}
          onClose={() => setEditOrderModalVisible(false)}
          order={selectedOrder}
          onSave={handleSaveEditedOrder}
          processing={processing}
        />
      )}
      {/* Options Selection Modal */}
      <Modal
        visible={optionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlayBottom}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={[styles.modalContent, { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Actions</Text>
              <TouchableOpacity onPress={() => setOptionsModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.optionItem} onPress={handleRescheduleOption}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Reschedule Delivery</Text>
                <Text style={styles.optionSub}>Change the delivery date or time</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={handleCancelOption}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.error + '15' }]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Cancel Order</Text>
                <Text style={styles.optionSub}>Move order to cancelled tab</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule Delivery</Text>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Select New Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateList}>
                {RESCHEDULE_DATES.map((date, index) => {
                  const isActive = selectedRescheduleDateIndex === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.dateItem, isActive && styles.dateItemActive]}
                      onPress={() => setSelectedRescheduleDateIndex(index)}
                    >
                      <Text style={[styles.dateDay, isActive && styles.dateTextActive]}>
                        {format(date, 'eee')}
                      </Text>
                      <Text style={[styles.dateNum, isActive && styles.dateTextActive]}>
                        {format(date, 'd')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionTitle}>Select New Slot (9 AM - 9 PM)</Text>
              {isLoadingBusySlots ? (
                <View style={[styles.loaderContainer, { height: 200 }]}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                  <Text style={styles.loaderText}>Checking availability...</Text>
                </View>
              ) : (
                <View style={styles.slotGrid}>
                  {generateTimeSlots().map((slot) => {
                    const isBusy = busySlotsForReschedule.includes(slot);
                    const isSelected = selectedRescheduleSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.timeSlotPill,
                          isSelected && styles.timeSlotSelected,
                          isBusy && styles.timeSlotDisabled
                        ]}
                        disabled={isBusy}
                        onPress={() => setSelectedRescheduleSlot(slot)}
                      >
                        <Text style={[
                          styles.timeText,
                          isSelected && styles.timeTextSelected,
                          isBusy && styles.timeTextDisabled
                        ]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedRescheduleSlot || processing) && { opacity: 0.6 }
              ]}
              disabled={!selectedRescheduleSlot || processing}
              onPress={confirmReschedule}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// --- Edit Order Modal Component ---

const EditOrderModal = ({ visible, onClose, order, onSave, processing }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [itemTotal, setItemTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    if (order && order.items) {
      // Deep copy items to avoid direct mutation
      setItems(JSON.parse(JSON.stringify(order.items)));
      setDiscount(order.billDetails?.discount || 0);
      const fee = order.billDetails?.deliveryFee || 0;
      setDeliveryFee(fee);
      const initialItemTotal = order.billDetails?.itemTotal || order.totalAmount || 0;
      setItemTotal(initialItemTotal);
      setGrandTotal(order.billDetails?.total || order.totalAmount || 0);
    }
  }, [order]);

  // Pricing Logic (Mirrors ServiceDetailScreen)
  const calculateItemPrice = (item: any) => {
    if (item.serviceId === 'wash_fold') {
      const base = (item.weight || 5) * 85;
      const ironing = (item.ironingEnabled && item.ironingCount) ? (item.ironingCount * 15) : 0;
      if (item.isCreditItem) return item.totalPrice;
      return base + ironing;
    }
    if (item.serviceId === 'wash_iron') {
      return (item.weight || 5) * 120;
    }
    if (item.serviceId === 'ironing_addon' || item.serviceName?.toLowerCase().includes('ironing')) {
      const count = item.clothesCount || item.ironingCount || 0;
      return count * 15;
    }
    if (item.serviceId === 'blanket_wash') {
      const single = item.singleBlanketCount || 0;
      const double = item.doubleBlanketCount || 0;
      return (single * 299) + (double * 399);
    }

    if (item.serviceId === 'ironing') {
      const count = item.ironingCount || item.clothesCount || 0;
      return count * 15;
    }

    // Default fallback to existing price if logic unknown
    return item.totalPrice;
  };

  useEffect(() => {
    // Recalculate total whenever items change — preserve deliveryFee and other fees
    const newItemTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    setItemTotal(newItemTotal);
    setGrandTotal(newItemTotal + deliveryFee - discount);
  }, [items, discount, deliveryFee]);

  const updateItem = (index: number, updates: any) => {
    const newItems = [...items];
    const updatedItem = { ...newItems[index], ...updates };

    // Update derived fields
    if (updatedItem.serviceId === 'blanket_wash') {
      updatedItem.blanketQuantity = (updatedItem.singleBlanketCount || 0) + (updatedItem.doubleBlanketCount || 0);
      // Update description potentially? 
      const parts = [];
      if (updatedItem.singleBlanketCount > 0) parts.push(`${updatedItem.singleBlanketCount} Single`);
      if (updatedItem.doubleBlanketCount > 0) parts.push(`${updatedItem.doubleBlanketCount} Double`);
      updatedItem.description = parts.join(', ');
    }

    // Keep ironingPrice in sync for standalone ironing service
    if (updatedItem.serviceId === 'ironing') {
      updatedItem.ironingPrice = (updatedItem.ironingCount || 0) * 15;
    }

    // Recalculate price for this item
    updatedItem.totalPrice = calculateItemPrice(updatedItem);

    // Update label/description based on new weight
    if (updatedItem.serviceId === 'wash_fold' && !updatedItem.isCreditItem) {
      updatedItem.quantity = 1;
      const maxPieces = Math.round((updatedItem.weight || 5) * 3.5);
      if (updatedItem.ironingCount > maxPieces) updatedItem.ironingCount = maxPieces;
    }

    newItems[index] = updatedItem;
    setItems(newItems);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={TYPOGRAPHY.heading}>Edit Order</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16, backgroundColor: '#FFF9C4', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="warning-outline" size={20} color="#F59E0B" />
          <Text style={{ ...TYPOGRAPHY.caption, flex: 1, color: '#B45309' }}>
            Actual weight is verified at pickup. Changes are allowed only before processing starts.
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {items.map((item, index) => (
            <View key={index} style={{ marginBottom: 24, padding: 16, backgroundColor: '#FFF', borderRadius: 12, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={TYPOGRAPHY.subheading}>{item.serviceName}</Text>
                <Text style={{ ...TYPOGRAPHY.subheading, color: COLORS.primary }}>₹{item.totalPrice}</Text>
              </View>

              {/* Wash & Fold Editing */}
              {item.serviceId === 'wash_fold' && !item.isCreditItem && (
                <View style={{ gap: 12 }}>
                  <Text style={TYPOGRAPHY.caption}>Adjust Weight (₹85/kg)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, { weight: Math.max(5, (item.weight || 5) - 1) })}
                      disabled={(item.weight || 5) <= 5}
                    >
                      <Ionicons name="remove" size={20} color={(item.weight || 5) <= 5 ? '#CBD5E1' : COLORS.text} />
                    </TouchableOpacity>
                    <Text style={{ ...TYPOGRAPHY.heading, minWidth: 50, textAlign: 'center' }}>
                      {item.weight || 5} kg
                    </Text>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, { weight: Math.min(50, (item.weight || 5) + 1) })}
                      disabled={(item.weight || 5) >= 50}
                    >
                      <Ionicons name="add" size={20} color={(item.weight || 5) >= 50 ? '#CBD5E1' : COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Ironing Toggle/Count for Wash & Fold */}
                  {(item.ironingEnabled || item.ironingCount > 0) && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={TYPOGRAPHY.caption}>Ironing Count (₹15/pc)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                          onPress={() => updateItem(index, { ironingCount: Math.max(0, (item.ironingCount || 0) - 1) })}
                        >
                          <Ionicons name="remove" size={20} />
                        </TouchableOpacity>
                        <Text style={TYPOGRAPHY.subheading}>{item.ironingCount || 0}</Text>
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                          onPress={() => updateItem(index, { ironingCount: (item.ironingCount || 0) + 1 })}
                        >
                          <Ionicons name="add" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {item.serviceId === 'wash_fold' && item.isCreditItem && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 13, color: COLORS.info, marginBottom: 4 }}> Subscription Item (Paid via Credit) </Text>
                  <Text style={TYPOGRAPHY.caption}>Adjust Weight</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, { weight: Math.max(5, (item.weight || 5) - 1) })}
                      disabled={(item.weight || 5) <= 5}
                    >
                      <Ionicons name="remove" size={20} color={(item.weight || 5) <= 5 ? '#CBD5E1' : COLORS.text} />
                    </TouchableOpacity>
                    <Text style={{ ...TYPOGRAPHY.heading, minWidth: 50, textAlign: 'center' }}>
                      {item.weight || 5} kg
                    </Text>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, { weight: Math.min(50, (item.weight || 5) + 1) })}
                      disabled={(item.weight || 5) >= 50}
                    >
                      <Ionicons name="add" size={20} color={(item.weight || 5) >= 50 ? '#CBD5E1' : COLORS.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}


              {/* Standalone Steam Press / Ironing Editing */}
              {item.serviceId === 'ironing' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={TYPOGRAPHY.caption}>Number of Pieces (₹15/pc)</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 }}>
                    Admin can adjust piece count (original customer limit does not apply)
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, {
                        ironingCount: Math.max(1, (item.ironingCount || item.clothesCount || 0) - 1),
                        clothesCount: Math.max(1, (item.ironingCount || item.clothesCount || 0) - 1),
                      })}
                    >
                      <Ionicons name="remove" size={20} />
                    </TouchableOpacity>
                    <Text style={{ ...TYPOGRAPHY.heading, minWidth: 40, textAlign: 'center' }}>
                      {item.ironingCount || item.clothesCount || 0}
                    </Text>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, {
                        ironingCount: (item.ironingCount || item.clothesCount || 0) + 1,
                        clothesCount: (item.ironingCount || item.clothesCount || 0) + 1,
                      })}
                    >
                      <Ionicons name="add" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Ironing Add-on Editing */}
              {(item.serviceId === 'ironing_addon' || item.serviceName?.toLowerCase().includes('ironing')) && (
                <View style={{ marginTop: 8 }}>
                  <Text style={TYPOGRAPHY.caption}>Number of Clothes (₹15/pc)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, {
                        clothesCount: Math.max(0, (item.clothesCount || 0) - 1),
                        ironingCount: Math.max(0, (item.clothesCount || 0) - 1)
                      })}
                    >
                      <Ionicons name="remove" size={20} />
                    </TouchableOpacity>

                    <Text style={{ ...TYPOGRAPHY.heading, minWidth: 40, textAlign: 'center' }}>
                      {item.clothesCount || item.ironingCount || 0}
                    </Text>

                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, {
                        clothesCount: (item.clothesCount || 0) + 1,
                        ironingCount: (item.clothesCount || 0) + 1
                      })}
                    >
                      <Ionicons name="add" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Blanket Wash Editing */}
              {item.serviceId === 'blanket_wash' && (
                <View style={{ gap: 16 }}>
                  {/* Single Blanket */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={TYPOGRAPHY.caption}>Single Blankets (₹299)</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                        onPress={() => updateItem(index, { singleBlanketCount: Math.max(0, (item.singleBlanketCount || 0) - 1) })}
                      >
                        <Ionicons name="remove" size={20} />
                      </TouchableOpacity>
                      <Text style={TYPOGRAPHY.subheading}>{item.singleBlanketCount || 0}</Text>
                      <TouchableOpacity
                        style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                        onPress={() => updateItem(index, { singleBlanketCount: (item.singleBlanketCount || 0) + 1 })}
                      >
                        <Ionicons name="add" size={20} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Double Blanket */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={TYPOGRAPHY.caption}>Double Blankets (₹399)</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                        onPress={() => updateItem(index, { doubleBlanketCount: Math.max(0, (item.doubleBlanketCount || 0) - 1) })}
                      >
                        <Ionicons name="remove" size={20} />
                      </TouchableOpacity>
                      <Text style={TYPOGRAPHY.subheading}>{item.doubleBlanketCount || 0}</Text>
                      <TouchableOpacity
                        style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                        onPress={() => updateItem(index, { doubleBlanketCount: (item.doubleBlanketCount || 0) + 1 })}
                      >
                        <Ionicons name="add" size={20} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Wash & Iron Editing */}
              {item.serviceId === 'wash_iron' && !item.serviceName?.includes('Ironing Add-on') && (
                <View style={{ gap: 12 }}>
                  <Text style={TYPOGRAPHY.caption}>Adjust Weight (₹120/kg)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, { weight: Math.max(5, (item.weight || 5) - 1) })}
                      disabled={(item.weight || 5) <= 5}
                    >
                      <Ionicons name="remove" size={20} color={(item.weight || 5) <= 5 ? '#CBD5E1' : COLORS.text} />
                    </TouchableOpacity>
                    <Text style={{ ...TYPOGRAPHY.heading, minWidth: 50, textAlign: 'center' }}>
                      {item.weight || 5} kg
                    </Text>
                    <TouchableOpacity
                      style={{ padding: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 8 }}
                      onPress={() => updateItem(index, { weight: Math.min(50, (item.weight || 5) + 1) })}
                      disabled={(item.weight || 5) >= 50}
                    >
                      <Ionicons name="add" size={20} color={(item.weight || 5) >= 50 ? '#CBD5E1' : COLORS.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Read Only or generic for others */}
              {!['wash_fold', 'wash_iron', 'ironing_addon', 'blanket_wash', 'ironing'].includes(item.serviceId) && !item.serviceName?.includes('Ironing') && (
                <Text style={{ color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 12 }}>
                  Checking/Editing specifics for this service is limited to price override.
                </Text>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: COLORS.borderLight,
          ...SHADOWS.lg
        }}>
          <View style={{ gap: 4, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={TYPOGRAPHY.bodySmall}>Item Total</Text>
              <Text style={TYPOGRAPHY.bodySmall}>₹{itemTotal}</Text>
            </View>
            {deliveryFee > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={TYPOGRAPHY.bodySmall}>Pick up & Delivery Fee</Text>
                <Text style={TYPOGRAPHY.bodySmall}>₹{deliveryFee}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.success }]}>Applied Discount</Text>
                <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.success }]}>-₹{discount}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: COLORS.borderLight }}>
              <Text style={TYPOGRAPHY.subheading}>Updated Total</Text>
              <Text style={{ ...TYPOGRAPHY.heading, color: COLORS.primary }}>₹{grandTotal}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' }}
            onPress={() => onSave(items, itemTotal, discount, grandTotal, deliveryFee)}
            disabled={processing}
          >
            {processing ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Helpers
const getStatusColor = (status: string) => {
  switch (status) {
    case 'placed': return COLORS.info;
    case 'confirmed': return COLORS.info;
    case 'pickup_completed': return '#6366F1'; // Indigo
    case 'processing': return COLORS.warning;
    case 'ready': return COLORS.success;
    case 'out_for_delivery': return '#FF8C00'; // Dark Orange
    case 'delivered': return COLORS.success;
    case 'cancelled': return COLORS.error;
    default: return COLORS.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  optionSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  dateList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateItem: {
    width: 60,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateDay: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateTextActive: {
    color: '#FFF',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  timeSlotPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    minWidth: '47%',
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#F3F4F6',
    opacity: 0.5,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.text,
  },
  timeTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  timeTextDisabled: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    marginTop: 10,
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.md,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    height: '100%',
    color: COLORS.text,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    minHeight: 60,        // Relaxed constraint
    flexGrow: 0,          // Prevent expansion
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,  // Moved padding here
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  orderId: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  customerInfo: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  customerName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  customerPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  addressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  directionsButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsText: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: -2,
  },
  orderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  statValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    ...TYPOGRAPHY.button,
    color: '#fff',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  otpInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: SPACING.md,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: SPACING.md,
  },
  tokenContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  tokenInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: SPACING.sm,
    ...TYPOGRAPHY.body,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
  verifyButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  verifyButtonText: {
    ...TYPOGRAPHY.button,
    color: '#fff',
  },
  // New Styles for Detailed Look
  itemsContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  itemRow: {
    marginBottom: 4,
  },
  itemTag: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6
  },
  slotText: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  tokenText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  cancelButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    backgroundColor: COLORS.error + '10',
    gap: 4
  },
  actionRowFull: {
    marginTop: 8,
  },
  actionButtonFull: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonTextFull: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  selectedReasonRow: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10', // 10% opacity
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedReasonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});


