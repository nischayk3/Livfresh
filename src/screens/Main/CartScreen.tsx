import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { format, addDays, startOfToday } from 'date-fns';
import {
  useCartStore,
  useAuthStore,
  useAddressStore,
  useUIStore,
} from '../../store';
import {
  createOrder,
  clearCartInFirestore,
  getUserOrders,
  checkSlotAvailability,
} from '../../services/firestore';
import tracker from '../../services/tracker';
import {
  SLOT_CONSTANTS,
  generateTimeSlots,
  getNextInstantSlot,
} from '../../utils/slotUtils';
import { BrandLoader } from '../../components/BrandLoader';

import { CartTrust } from '../../components/CartTrust';
import {
  ArrowLeft,
  ShoppingBag,
  Gift,
  MapPin,
  Trash2,
  Calendar,
  Zap,
  ChevronRight,
  Sparkles,
  Receipt,
  Shirt,
  Bike,
  Package,
  Tag,
} from 'lucide-react-native';
import {
  Coupon,
  getActivePublicCoupons,
  validateCouponForCart,
} from '../../services/couponService';
import { validateReferralCodeForCart } from '../../services/referralService';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { items, removeItem, getTotalAmount, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();
  const { showAlert } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pickupType, setPickupType] = useState<'instant' | 'scheduled'>('instant');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [instantBlockedBySlot, setInstantBlockedBySlot] = useState(false);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  // Constants
  const PLATFORM_FEE = 0;
  const GST_PERCENTAGE = 0;

  // Coupon Logic
  const isFirstOrder = orderCount === 0;
  const isNextTwoOrders = orderCount === 1 || orderCount === 2;
  const MIN_CART_VALUE = 700;
  const STANDARD_DISCOUNT = 100;

  const timeSlots = generateTimeSlots();

  const subtotal = getTotalAmount();
  const onlyIroningInCart =
    items.length > 0 && items.every((item) => item.serviceType === 'ironing');

  const getDeliveryFee = () => {
    if (items.length === 0) return 0;
    const hasWashFoldOrWashIron = items.some(
      (item) =>
        item.serviceType === 'wash_fold' ||
        item.serviceType === 'wash_iron' ||
        item.serviceType === 'premium_laundry'
    );
    const hasIroning = items.some((item) => item.serviceType === 'ironing');
    const hasBlanketWash = items.some((item) => item.serviceType === 'blanket_wash');
    if (hasWashFoldOrWashIron) return 0;
    if (hasIroning) {
      const totalIroningPieces = items.reduce((sum, item) => {
        if (item.serviceType === 'ironing') return sum + (item.ironingCount || item.clothesCount || 0);
        return sum;
      }, 0);
      return totalIroningPieces >= 20 ? 50 : 80;
    }
    if (hasBlanketWash) return 50;
    return 0;
  };

  const DELIVERY_FEE = getDeliveryFee();
  const gstAmount = Math.round(subtotal * GST_PERCENTAGE);

  const actualDiscount = isDiscountApplied ? discountAmount : 0;
  const totalAmount = Math.max(
    0,
    subtotal + PLATFORM_FEE + DELIVERY_FEE + gstAmount - actualDiscount,
  );



  const generateDates = () => {
    const dates = [];
    const today = startOfToday();
    const now = new Date();
    const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
    const lastSlotStart = SLOT_CONSTANTS.OPERATIONAL_END_HOUR - 1;
    const slotsLeftToday = currentHourDecimal < lastSlotStart;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      if (i === 0 && !slotsLeftToday) continue;
      dates.push({
        id: format(d, 'yyyy-MM-dd'),
        day: format(d, 'EEE'),
        date: d.getDate(),
        fullDate: d,
      });
    }
    return dates;
  };

  const dates = generateDates();

  // ─── Effects ───────────────────────────────────────────────────

  useEffect(() => {
    if (isNavigating) return;
    if (items.length === 0) {
      if (isDiscountApplied) {
        setIsDiscountApplied(false);
        setDiscountAmount(0);
        setAppliedCoupon(null);
      }
      return;
    }
    const isCreditApplied = items.some((item) => item.isCreditItem);
    if (isDiscountApplied && appliedCoupon) {
      if (onlyIroningInCart && appliedCoupon.excludeIroningOnly !== false) {
        setIsDiscountApplied(false);
        setDiscountAmount(0);
        setAppliedCoupon(null);
        showAlert({ title: 'Coupon Removed', message: 'This coupon is not applicable for standalone ironing orders.', type: 'info' });
      } else if (isCreditApplied) {
        setIsDiscountApplied(false);
        setDiscountAmount(0);
        setAppliedCoupon(null);
        showAlert({ title: 'Coupon Removed', message: 'Offers cannot be combined with Subscription Credits.', type: 'info' });
      } else if (subtotal < appliedCoupon.minOrderValue) {
        setIsDiscountApplied(false);
        setDiscountAmount(0);
        setAppliedCoupon(null);
        showAlert({ title: 'Coupon Removed', message: `Coupon removed because cart subtotal is less than ₹${appliedCoupon.minOrderValue}.`, type: 'info' });
      } else {
        let newDiscount = appliedCoupon.discountAmount;
        if (appliedCoupon.discountType === 'percentage') {
          const pct = appliedCoupon.discountPercent || 0;
          const maxCap = appliedCoupon.maxDiscount || Infinity;
          newDiscount = Math.min(maxCap, Math.round((subtotal * pct) / 100));
        }
        newDiscount = Math.min(subtotal, Math.max(0, newDiscount));
        if (discountAmount !== newDiscount) {
          setDiscountAmount(newDiscount);
        }
      }
    }
  }, [items, onlyIroningInCart, isDiscountApplied, appliedCoupon, subtotal, isNavigating]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      showAlert({ title: 'Enter Code', message: 'Please enter a coupon or referral code.', type: 'warning' });
      return;
    }
    setIsCheckingCoupon(true);
    try {
      // 1. Check promotional coupon engine first
      const result = await validateCouponForCart({
        code,
        userId: user?.uid,
        userPhone: user?.phone || (user as any)?.phoneNumber || '',
        subtotal,
        items,
        orderCount,
      });

      if (result.valid) {
        setIsDiscountApplied(true);
        setDiscountAmount(result.discount);
        setAppliedCoupon(result.coupon || null);
        setCouponInput('');
        showAlert({
          title: 'Coupon Applied!',
          message: `₹${result.discount} discount has been applied to your order.`,
          type: 'success',
        });
        return;
      }

      // 2. If not a promotional coupon, check if it's a friend's referral code
      if (user?.uid) {
        const refResult = await validateReferralCodeForCart(code, user.uid, subtotal);
        if (refResult.valid) {
          setIsDiscountApplied(true);
          setDiscountAmount(refResult.discount);
          setAppliedCoupon({
            code: refResult.code,
            title: 'Referral Discount — ₹200 OFF',
            description: 'Special first-order discount from your friend!',
            discountType: 'flat',
            discountAmount: refResult.discount,
            minOrderValue: refResult.minOrderValue,
            isReferral: true,
            referrerUid: refResult.referrerUid,
          } as any);
          setCouponInput('');
          showAlert({
            title: 'Referral Code Applied!',
            message: `₹${refResult.discount} discount has been applied to your first order 🎉`,
            type: 'success',
          });
          return;
        } else if (refResult.error && refResult.error !== 'Invalid coupon or referral code.') {
          showAlert({
            title: 'Referral Code',
            message: refResult.error,
            type: 'warning',
          });
          return;
        }
      }

      showAlert({
        title: 'Coupon Not Applied',
        message: result.reason || 'Invalid coupon or referral code.',
        type: 'warning',
      });
    } catch (err: any) {
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to apply offer.',
        type: 'error',
      });
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setIsDiscountApplied(false);
    setDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponInput('');
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkInstantBlock = async () => {
        const nextSlot = getNextInstantSlot(timeSlots);
        if (!nextSlot) { setInstantBlockedBySlot(true); return; }
        try {
          const today = format(new Date(), 'yyyy-MM-dd');
          const occupied = await checkSlotAvailability(today);
          setInstantBlockedBySlot(occupied.includes(nextSlot));
        } catch (error) {
          console.error('Failed to check instant slot availability', error);
        }
      };
      checkInstantBlock();

      // Fetch active public coupons
      getActivePublicCoupons().then(setAvailableCoupons).catch(console.warn);
    }, []),
  );

  const nextSlotForInstant = getNextInstantSlot(timeSlots);
  const canPlaceInstant = !!nextSlotForInstant && !instantBlockedBySlot;

  useEffect(() => {
    const fetchOrderCount = async () => {
      if (user?.uid) {
        try {
          const orders = await getUserOrders(user.uid);
          const validOrders = orders.filter((o: any) => o.status !== 'cancelled');
          setOrderCount(validOrders.length);
        } catch (error) {
          console.error('Error fetching order count:', error);
        }
      }
    };
    fetchOrderCount();
  }, [user?.uid]);

  useEffect(() => {
    if (pickupType === 'instant' && !canPlaceInstant) setPickupType('scheduled');
    if (pickupType === 'scheduled') {
      if (!selectedDate || !dates.find((d) => d.id === selectedDate)) setSelectedDate(dates[0]?.id);
    }
  }, [pickupType, canPlaceInstant]);

  useEffect(() => {
    if (selectedDate && pickupType === 'scheduled') {
      const now = new Date();
      const isToday = selectedDate === format(now, 'yyyy-MM-dd');
      const firstAvailableSlot = timeSlots.find((slot) => {
        const isOccupied = occupiedSlots.includes(slot);
        if (isOccupied) return false;
        if (isToday) {
          const [startStr] = slot.split(' - ');
          const [h, m] = startStr.split(':').map(Number);
          const slotStartTime = new Date();
          slotStartTime.setHours(h, m, 0, 0);
          return slotStartTime > now;
        }
        return true;
      });
      if (firstAvailableSlot) setSelectedTimeSlot(firstAvailableSlot);
      else setSelectedTimeSlot(null);
    }
  }, [selectedDate, occupiedSlots, pickupType]);

  useEffect(() => {
    const fetchOccupied = async () => {
      if (selectedDate && pickupType === 'scheduled') {
        setSlotsLoading(true);
        const occupied = await checkSlotAvailability(selectedDate);
        setOccupiedSlots(occupied);
        setSlotsLoading(false);
      }
    };
    fetchOccupied();
  }, [selectedDate, pickupType]);

  useFocusEffect(
    React.useCallback(() => {
      if (items.length > 0) {
        tracker.logBeginCheckout({
          value: totalAmount,
          currency: 'INR',
          num_items: items.length,
          items: items.map((i) => ({ item_id: i.id, item_name: i.serviceName, price: i.totalPrice, quantity: 1 })),
        });
      }
    }, [items.length, totalAmount]),
  );

  // ─── handlePlaceOrder ────────────────────────────────────────

  const handlePlaceOrder = async () => {
    const { user: latestUser } = useAuthStore.getState();
    if (!latestUser) {
      useAuthStore.getState().setReturnTo('Cart');
      (navigation as any).navigate('PhoneLogin', { returnTo: 'Cart' });
      return;
    }
    if (!currentAddress) {
      showAlert({
        title: 'Address Required',
        message: 'Please select a delivery address to place your order.',
        type: 'warning',
        buttons: [
          {
            text: 'Add Address',
            onPress: () => (navigation as any).navigate('AddressList', { returnTo: 'Cart' }),
          },
        ],
      });
      return;
    }
    if (pickupType === 'scheduled' && (!selectedDate || !selectedTimeSlot)) {
      showAlert({ title: 'Incomplete Details', message: 'Please select a date and time for pickup', type: 'warning' });
      return;
    }

    const { currentLatitude, currentLongitude } = useAddressStore.getState();

    // --- GEOFENCING CHECK ---
    const { isLocationServiceable } = require('../../utils/geofence');
    const { logUnserviceableRequest } = require('../../services/firestore');
    if (currentLatitude && currentLongitude) {
      const serviceable = isLocationServiceable({ latitude: currentLatitude, longitude: currentLongitude });
      if (!serviceable) {
        const itemsSummary = items
          .map((i) => {
            const qty = i.clothesCount ? `${i.clothesCount} clothes` : i.weight ? `${i.weight}kg` : '';
            return `${i.serviceName}${qty ? ` (${qty})` : ''}`;
          })
          .join(', ');

        logUnserviceableRequest(latestUser.uid, {
          latitude: currentLatitude,
          longitude: currentLongitude,
          address: currentAddress,
          userName: latestUser.name || '',
          userPhone: latestUser.phone || '',
          userEmail: latestUser.email || '',
          cartValue: totalAmount || subtotal || 0,
          itemsCount: items.length,
          itemsSummary,
          items: items.map((i) => ({
            id: i.id,
            serviceName: i.serviceName,
            totalPrice: i.totalPrice,
            weight: i.weight,
            clothesCount: i.clothesCount,
          })),
        });
        showAlert({
          title: 'Service Not Available',
          message: `Sorry, we are not serving your area yet.\n\nWe have recorded your interest and will notify you as soon as we launch near ${currentAddress.split(',')[0]}!`,
          type: 'info',
        });
        return;
      }
    }

    tracker.logCustomEvent('add_shipping_info', {
      currency: 'INR',
      value: totalAmount,
      items: items.map((i) => ({ item_id: i.id, item_name: i.serviceName, price: i.totalPrice })),
    });
    tracker.logCustomEvent('add_payment_info', {
      payment_type: 'COD',
      currency: 'INR',
      value: totalAmount,
      items: items.map((i) => ({ item_id: i.id, item_name: i.serviceName, price: i.totalPrice })),
    });

    setLoading(true);
    try {
      const itemsWithPhotoUrls = items;
      let instantSlot = null;
      if (pickupType === 'instant') instantSlot = getNextInstantSlot(timeSlots);

      const orderData = {
        vendorId: items[0]?.vendorId || 'default',
        items: itemsWithPhotoUrls,
        billDetails: {
          itemTotal: subtotal,
          platformFee: PLATFORM_FEE,
          deliveryFee: DELIVERY_FEE,
          gst: gstAmount,
          discount: discountAmount,
          total: totalAmount,
        },
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              title: appliedCoupon.title,
              discount: discountAmount,
              isReferral: Boolean((appliedCoupon as any).isReferral),
              referrerUid: (appliedCoupon as any).referrerUid || undefined,
            }
          : null,
        appliedReferralCode: (appliedCoupon as any)?.isReferral ? (appliedCoupon as any)?.code : undefined,
        referrerUid: (appliedCoupon as any)?.referrerUid || undefined,
        pickupDetails: {
          type: pickupType,
          scheduledDate: pickupType === 'scheduled' ? selectedDate : format(new Date(), 'yyyy-MM-dd'),
          scheduledTime: pickupType === 'scheduled' ? selectedTimeSlot : instantSlot,
          isInstant: pickupType === 'instant',
        },
        address: currentAddress,
        latitude: currentLatitude,
        longitude: currentLongitude,
        userName: latestUser.name || 'Guest User',
        userPhone: latestUser.phone,
        status: 'placed',
        paymentMode: totalAmount === 0 ? 'credit' : 'later',
        paymentStatus: totalAmount === 0 ? 'paid' : 'pending',
      };

      // Any credit line item is deducted inside createOrder's transaction, so
      // the order only exists if the credit was successfully burned.
      const orderId = await createOrder(latestUser.uid, orderData);

      await tracker.logPurchase({
        transaction_id: orderId,
        value: totalAmount,
        currency: 'INR',
        payment_mode: 'later',
        items: items.map((i) => ({ item_id: i.id, item_name: i.serviceName, price: i.totalPrice, quantity: 1 })),
      });

      setIsNavigating(true);

      clearCart();
      await clearCartInFirestore(latestUser.uid);

      (navigation as any).navigate('OrderSuccess');
    } catch (error: any) {
      console.error('Order placement failed', error);
      const isCreditError = typeof error?.code === 'string' && error.code.startsWith('CREDIT_');
      showAlert({
        title: isCreditError ? 'Credit Not Available' : 'Error',
        message: isCreditError ? error.message : 'Failed to place order. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Helpers ──────────────────────────────────────────

  const getServiceIcon = (item: any, size: number = 20, color: string = '#7C3AED') => {
    const type = item?.serviceType || item?.serviceId || '';
    if (type.includes('blanket')) return <Package size={size} color={color} strokeWidth={1.8} />;
    if (type.includes('shoe')) return <Bike size={size} color={color} strokeWidth={1.8} />;
    if (type.includes('wash') || type.includes('laundry')) return <Shirt size={size} color={color} strokeWidth={1.8} />;
    return <Shirt size={size} color={color} strokeWidth={1.8} />;
  };

  const renderCartItem = (item: any) => (
    <View key={item.id} style={styles.cartItemLast}>
      <View style={styles.itemRow}>
        <View style={styles.itemIconBox}>
          {getServiceIcon(item, 22, '#7C3AED')}
        </View>
        <View style={styles.itemCenter}>
          <View style={styles.itemTopRow}>
            <Text style={styles.serviceName} numberOfLines={1}>{item.serviceName}</Text>
            <View style={styles.itemTopRight}>
              <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                <Trash2 size={15} color="#EF4444" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.itemMeta}>
            {(item.serviceType === 'wash_fold' || item.serviceType === 'premium_laundry') && (
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  {item.weight ? `${item.weight} kg` : ''}
                </Text>
              </View>
            )}
            {item.serviceType === 'wash_iron' && (
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  {item.weight ? `${item.weight} kg` : ''}
                </Text>
              </View>
            )}
            {item.serviceType === 'ironing' && (
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  {item.ironingCount || item.clothesCount || 0} pcs
                </Text>
              </View>
            )}
            {item.serviceType === 'blanket_wash' && (
              <Text style={styles.metaDetail}>
                {item.blanketCount} Blankets
              </Text>
            )}
            {item.serviceType === 'shoe_clean' && (
              <Text style={styles.metaDetail}>{item.shoeCount} Pairs</Text>
            )}
            {item.ironingEnabled && item.ironingCount > 0 && !['ironing'].includes(item.serviceType) && (
              <Text style={styles.metaDetail}>+ {item.ironingCount} Ironing</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderBillDetails = () => (
    <View>
      <View style={styles.billRow}>
        <Text style={styles.billLabel}>Item Total</Text>
        <Text style={styles.billValue}>₹{subtotal}</Text>
      </View>
      {PLATFORM_FEE > 0 && (
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Platform Fee</Text>
          <Text style={styles.billValue}>₹{PLATFORM_FEE}</Text>
        </View>
      )}
      {DELIVERY_FEE > 0 ? (
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Pickup & Delivery</Text>
          <Text style={[styles.billValue, { color: '#059669' }]}>₹{DELIVERY_FEE}</Text>
        </View>
      ) : (
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Pickup & Delivery</Text>
          <Text style={[styles.billValue, { color: '#059669' }]}>Free</Text>
        </View>
      )}
      {gstAmount > 0 && (
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>GST (18%)</Text>
          <Text style={styles.billValue}>₹{gstAmount}</Text>
        </View>
      )}
      {discountAmount > 0 && (
        <View style={styles.billRow}>
          <Text style={[styles.billLabel, { color: '#059669' }]}>
            {appliedCoupon ? `Coupon (${appliedCoupon.code})` : 'Offer Discount'}
          </Text>
          <Text style={[styles.billValue, { color: '#059669' }]}>-₹{discountAmount}</Text>
        </View>
      )}
      <View style={styles.billDivider} />
      <View style={styles.billRow}>
        <Text style={styles.grandTotalLabel}>Grand Total</Text>
        <Text style={styles.grandTotalValue}>₹{totalAmount}</Text>
      </View>
      {items.some((item) => item.isCreditItem) && (
        <View style={styles.creditBadge}>
          <Sparkles size={14} color="#7C3AED" strokeWidth={1.8} />
          <Text style={styles.creditBadgeText}>Subscription Credit Applied</Text>
        </View>
      )}
    </View>
  );

  // ─── Loading / Empty States ──────────────────────────────────

  if (loading || isNavigating) {
    return <BrandLoader fullscreen message="Placing your order..." />;
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={StyleSheet.absoluteFill}>
          <View style={[styles.centeredEmpty, { paddingTop: insets.top + 60 }]}>
            <MotiView
              from={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 16 }}
            >
              <View style={styles.emptyIconCircle}>
                <ShoppingBag size={48} color="#FFFFFF" strokeWidth={1.5} />
              </View>
            </MotiView>
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 100, type: 'timing', duration: 300 }}
            >
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySubtext}>Add some services to get started!</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => {
                  (navigation as any).reset({
                    index: 0,
                    routes: [{
                      name: 'Main',
                      state: { routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }] } }] },
                    }],
                  });
                }}
              >
                <Text style={styles.browseBtnText}>Browse Services</Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ═══════ HERO BANNER ═══════ */}
      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.heroBanner}>
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />
        <View style={styles.heroOrb3} />

        <View style={[styles.heroTopRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else (navigation as any).navigate('MainTabs');
            }}
            style={styles.heroIconBtn}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.heroTitleGroup}>
            <Text style={styles.heroTitle}>My Cart</Text>
            <Text style={styles.heroSubtitle}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
          </View>

          <View style={styles.heroIconBtn} />
        </View>
      </LinearGradient>

      {/* ═══════ WHITE SHEET ═══════ */}
      <View style={styles.whiteSheet}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 180 }]}
          showsVerticalScrollIndicator={true}
          bounces={true}
          nestedScrollEnabled={true}
        >
          {/* ─── Items ─── */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100, type: 'timing', duration: 300 }}
          >
            <Text style={styles.sectionHeader}>Items ({items.length})</Text>
            <View style={styles.card}>
              {items.map(renderCartItem)}
            </View>
          </MotiView>

          {/* ─── Offers & Coupons ─── */}
          {!items.some((item) => item.isCreditItem) && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 150, type: 'timing', duration: 300 }}
              style={styles.offersSection}
            >
              <View style={styles.sectionHeaderRow}>
                <Tag size={18} color="#7C3AED" strokeWidth={2} />
                <Text style={styles.sectionHeaderTitle}>Offers & Benefits</Text>
              </View>

              {isDiscountApplied && appliedCoupon ? (
                /* Applied State */
                <View style={styles.couponCardApplied}>
                  <View style={styles.appliedIconCircle}>
                    <Gift size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={styles.couponInfo}>
                    <Text style={styles.appliedCouponTitle}>
                      {appliedCoupon.code} Applied
                    </Text>
                    <Text style={styles.appliedCouponSub}>
                      Saved ₹{discountAmount} on this order
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeCouponBadge}
                    onPress={handleRemoveCoupon}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeCouponText}>REMOVE</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Unapplied: Input Bar + Available Public Coupons */
                <View style={styles.offersContainer}>
                  {/* Coupon Code Input */}
                  <View style={styles.couponInputRow}>
                    <TextInput
                      style={styles.couponTextInput}
                      placeholder="ENTER COUPON OR REFERRAL CODE"
                      placeholderTextColor="#94A3B8"
                      value={couponInput}
                      onChangeText={(t) => setCouponInput(t.toUpperCase())}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!isCheckingCoupon}
                    />
                    <TouchableOpacity
                      style={[
                        styles.couponApplyButton,
                        (!couponInput.trim() || isCheckingCoupon) && styles.couponApplyButtonDisabled,
                      ]}
                      onPress={() => handleApplyCoupon()}
                      disabled={!couponInput.trim() || isCheckingCoupon}
                      activeOpacity={0.7}
                    >
                      {isCheckingCoupon ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.couponApplyButtonText}>APPLY</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Available Public Offers */}
                  {availableCoupons.length > 0 && (
                    <View style={styles.availableOffersList}>
                      {availableCoupons.map((coupon) => {
                        const meetsMin = subtotal >= coupon.minOrderValue;
                        const diff = coupon.minOrderValue - subtotal;
                        const isFirstOrderRestriction = coupon.isFirstOrderOnly && orderCount > 0;
                        const isMaxOrderRestriction = coupon.maxOrderCount ? orderCount >= coupon.maxOrderCount : false;
                        const isEligible = meetsMin && !isFirstOrderRestriction && !isMaxOrderRestriction && !onlyIroningInCart;

                        return (
                          <View key={coupon.code} style={styles.offerItemCard}>
                            <View style={styles.offerItemHeader}>
                              <View style={styles.offerCodeBadge}>
                                <Text style={styles.offerCodeText}>{coupon.code}</Text>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.offerItemApplyButton,
                                  !isEligible && styles.offerItemApplyButtonDisabled,
                                ]}
                                onPress={() => handleApplyCoupon(coupon.code)}
                                disabled={!isEligible || isCheckingCoupon}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.offerItemApplyText,
                                    !isEligible && styles.offerItemApplyTextDisabled,
                                  ]}
                                >
                                  APPLY
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.offerItemTitle}>{coupon.title}</Text>
                            <Text style={styles.offerItemDesc}>{coupon.description}</Text>

                            {!meetsMin && (
                              <Text style={styles.offerItemHelper}>
                                • Add items worth ₹{diff} more to unlock
                              </Text>
                            )}
                            {isFirstOrderRestriction && (
                              <Text style={styles.offerItemHelper}>
                                • Valid on first order only
                              </Text>
                            )}
                            {coupon.maxOrderCount && orderCount < coupon.maxOrderCount && (
                              <Text style={[styles.offerItemHelper, { color: '#059669', fontWeight: '600' }]}>
                                • Valid on your first {coupon.maxOrderCount} orders (Order {orderCount + 1} of {coupon.maxOrderCount})
                              </Text>
                            )}
                            {isMaxOrderRestriction && (
                              <Text style={styles.offerItemHelper}>
                                • Valid on first {coupon.maxOrderCount} orders only
                              </Text>
                            )}
                            {onlyIroningInCart && coupon.excludeIroningOnly !== false && (
                              <Text style={styles.offerItemHelper}>
                                • Not valid for standalone ironing
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </MotiView>
          )}

          {/* ─── Order Summary ─── */}
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200, type: 'timing', duration: 300 }}
          >
            <Text style={styles.sectionHeader}>Order Summary</Text>
            <View style={styles.card}>
              <View style={styles.summaryIconRow}>
                <Receipt size={20} color="#7C3AED" strokeWidth={1.8} />
                <Text style={styles.cardTitle}>Bill Details</Text>
              </View>
              {renderBillDetails()}
            </View>
          </MotiView>

          {/* ─── Pickup Details ─── */}
          <MotiView
            from={{ opacity: 0, translateY: 28 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 250, type: 'timing', duration: 300 }}
          >
            <Text style={styles.sectionHeader}>Pickup Details</Text>
            <View style={styles.card}>
              {/* Toggle */}
              <View style={styles.pickupToggle}>
                <TouchableOpacity
                  style={[styles.toggleOption, pickupType === 'instant' && styles.toggleOptionActive, !canPlaceInstant && styles.toggleOptionDisabled]}
                  disabled={!canPlaceInstant}
                  onPress={() => setPickupType('instant')}
                >
                  <Zap size={16} color={pickupType === 'instant' ? '#FFFFFF' : '#71717A'} strokeWidth={1.8} />
                  <View>
                    <Text style={[styles.toggleText, pickupType === 'instant' && { color: '#FFFFFF' }]}>
                      Instant
                    </Text>
                    {(!nextSlotForInstant || instantBlockedBySlot) && (
                      <Text style={styles.disabledHint}>
                        {!nextSlotForInstant ? 'Outside hours' : 'Fully booked'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, pickupType === 'scheduled' && styles.toggleOptionActive]}
                  onPress={() => setPickupType('scheduled')}
                >
                  <Calendar size={16} color={pickupType === 'scheduled' ? '#FFFFFF' : '#71717A'} strokeWidth={1.8} />
                  <Text style={[styles.toggleText, pickupType === 'scheduled' && { color: '#FFFFFF' }]}>Schedule</Text>
                </TouchableOpacity>
              </View>

              {/* Schedule Picker */}
              {pickupType === 'scheduled' && (
                <View style={styles.scheduleContainer}>
                  <Text style={styles.pickerLabel}>Select Date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                    {dates.map((date) => (
                      <TouchableOpacity
                        key={date.id}
                        style={[styles.dateCard, selectedDate === date.id && styles.dateCardSelected]}
                        onPress={() => setSelectedDate(date.id)}
                      >
                        <Text style={[styles.dateDay, selectedDate === date.id && { color: '#FFFFFF' }]}>
                          {date.day}
                        </Text>
                        <Text style={[styles.dateNum, selectedDate === date.id && { color: '#FFFFFF' }]}>
                          {date.date}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.pickerLabel}>
                    Select Time {slotsLoading && <ActivityIndicator size="small" color="#7C3AED" />}
                  </Text>
                  <View style={[styles.timeGrid, slotsLoading && { opacity: 0.5 }]}>
                    {(() => {
                      const now = new Date();
                      const isToday = selectedDate === format(now, 'yyyy-MM-dd');
                      return timeSlots.map((slot) => {
                        const isOccupied = occupiedSlots.includes(slot);
                        let isPast = false;
                        if (isToday) {
                          const [startStr] = slot.split(' - ');
                          const [h, m] = startStr.split(':').map(Number);
                          const slotStartTime = new Date();
                          slotStartTime.setHours(h, m, 0, 0);
                          isPast = slotStartTime <= now;
                        }
                        const isDisabled = isOccupied || isPast;
                        return (
                          <TouchableOpacity
                            key={slot}
                            disabled={isDisabled}
                            style={[styles.timeSlot, selectedTimeSlot === slot && styles.timeSlotSelected, isDisabled && styles.timeSlotDisabled]}
                            onPress={() => setSelectedTimeSlot(slot)}
                          >
                            <Text style={[styles.timeText, selectedTimeSlot === slot && { color: '#FFFFFF' }, isDisabled && { color: '#A1A1AA' }]}>
                              {slot}
                            </Text>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </View>
              )}
            </View>
          </MotiView>

          {/* ─── Delivery Address ─── */}
          <MotiView
            from={{ opacity: 0, translateY: 32 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300, type: 'timing', duration: 300 }}
          >
            <Text style={styles.sectionHeader}>Delivery Address</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => (navigation as any).navigate('AddressList', { returnTo: 'Cart' })}
            >
              <View style={styles.addressRow}>
                <MapPin size={20} color="#7C3AED" strokeWidth={1.8} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>Deliver To</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {currentAddress || 'Select Delivery Address'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#D4D4D8" strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </MotiView>



          {/* ─── Trust Signals ─── */}
          <MotiView
            from={{ opacity: 0, translateY: 36 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 350, type: 'timing', duration: 300 }}
          >
            <CartTrust />
          </MotiView>

          {/* Spacer for footer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* ═══════ FLOATING FOOTER ═══════ */}
      <MotiView
        from={{ opacity: 0, translateY: 40 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 250, type: 'timing', duration: 300 }}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.footerCard}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Total to Pay</Text>
            <Text style={styles.footerTotal}>₹{totalAmount}</Text>
            <Text style={styles.footerSub}>Pay after pickup verification</Text>
          </View>
          <TouchableOpacity
            style={styles.placeOrderBtn}
            onPress={handlePlaceOrder}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.placeOrderText} numberOfLines={1}>Place Order</Text>
                <ArrowLeft size={18} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  // ═══ HERO ═══
  heroBanner: {
    paddingBottom: 24,
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
  heroTitleGroup: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  // ═══ WHITE SHEET ═══
  whiteSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // ═══ SECTION ═══
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 16,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 4,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // ═══ CART ITEM ═══
  cartItemLast: {
    marginBottom: 10,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  itemIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'center',
  },
  itemCenter: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
    flexShrink: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: '#7C3AED',
    flexShrink: 0,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaBadge: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  metaDetail: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // ═══ BILL ═══
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
  },
  billValue: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    color: '#09090B',
  },
  grandTotalValue: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    color: '#7C3AED',
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.06)',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
  },
  creditBadgeText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  // ═══ COUPON & OFFERS ═══
  offersSection: {
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: '#09090B',
  },
  couponCardApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#059669',
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  appliedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  couponInfo: {
    flex: 1,
  },
  appliedCouponTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
  appliedCouponSub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#E6FFFA',
    marginTop: 2,
  },
  removeCouponBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  removeCouponText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  offersContainer: {
    gap: 12,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  couponTextInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: '#0F172A',
    letterSpacing: 0.5,
    height: 42,
  },
  couponApplyButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  couponApplyButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  couponApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  availableOffersList: {
    gap: 10,
  },
  offerItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 12,
  },
  offerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  offerCodeBadge: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offerCodeText: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  offerItemApplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
  },
  offerItemApplyButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  offerItemApplyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  offerItemApplyTextDisabled: {
    color: '#94A3B8',
  },
  offerItemTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  offerItemDesc: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
  },
  offerItemHelper: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: '#D97706',
    marginTop: 4,
  },
  // ═══ PICKUP ═══
  pickupToggle: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F5',
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleOptionActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleOptionDisabled: {
    opacity: 0.5,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#71717A',
  },
  disabledHint: {
    fontSize: 8,
    fontFamily: 'Outfit_400Regular',
    color: '#A1A1AA',
    marginTop: 1,
  },
  scheduleContainer: {
    marginTop: 4,
  },
  pickerLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#71717A',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateScroll: {
    marginBottom: 4,
  },
  dateCard: {
    width: 56,
    height: 66,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dateCardSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  dateDay: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#71717A',
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    color: '#09090B',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  timeSlotSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  timeSlotDisabled: {
    backgroundColor: '#F4F4F5',
    borderColor: '#E4E4E7',
    opacity: 0.6,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
  },
  // ═══ ADDRESS ═══
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#71717A',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#09090B',
    lineHeight: 20,
  },
  // ═══ FOOTER ═══
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  footerLeft: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: '#71717A',
    marginBottom: 2,
  },
  footerTotal: {
    fontSize: 24,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#09090B',
  },
  footerSub: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: '#A1A1AA',
    marginTop: 2,
  },
  placeOrderBtn: {
    height: 54,
    minWidth: 170,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 8,
    paddingHorizontal: 20,
    flexShrink: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 10,
  },
  placeOrderText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  // ═══ EMPTY STATE ═══
  centeredEmpty: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 28,
  },
  browseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  browseBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
});