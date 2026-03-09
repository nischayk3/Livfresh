import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Timestamp } from '../../services/firebase';
import { format, isAfter, addMinutes, isSameDay, parse, addDays, startOfToday, getHours } from 'date-fns';

import { useCartStore, useAuthStore, useAddressStore, useUIStore, useSubscriptionStore } from '../../store';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { createOrder, saveCart, clearCartInFirestore, uploadServicePhotos, getUserOrders } from '../../services/firestore';
import { trackPixelEvent } from '../../utils/pixel';
import { BrandLoader } from '../../components/BrandLoader';
import { CartTrust } from '../../components/CartTrust';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedButton } from '../../components/AnimatedButton';

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
    const [orderCount, setOrderCount] = useState<number>(0);
    const [isDiscountApplied, setIsDiscountApplied] = useState(false);
    const [discountAmount, setDiscountAmount] = useState(0);

    // Constants
    const PLATFORM_FEE = 0;
    const GST_PERCENTAGE = 0;
    const MIN_BUFFER_MINS = 20;
    const OPERATIONAL_START_HOUR = 9; // 9:00 AM
    const LAST_INSTANT_ORDER_TIME = 19.5; // 7:30 PM in decimal hours
    const OPERATIONAL_END_HOUR = 21; // 9:00 PM

    // Coupon Logic
    const isFirstOrder = orderCount === 0;
    const isNextTwoOrders = orderCount === 1 || orderCount === 2;
    const MIN_CART_VALUE = 500;
    const STANDARD_DISCOUNT = 100;

    const subtotal = getTotalAmount();
    const onlyIroningInCart = items.length > 0 && items.every(item => item.serviceType === 'ironing');
    const DELIVERY_FEE = onlyIroningInCart ? 50 : 0;
    const gstAmount = Math.round(subtotal * GST_PERCENTAGE);

    // Calculate potential discount based on rules
    const getPotentialDiscount = () => {
        if (isFirstOrder) {
            // Flat ₹100 off, but strictly not more than subtotal
            return Math.min(subtotal, STANDARD_DISCOUNT);
        }
        if (isNextTwoOrders && subtotal >= MIN_CART_VALUE) return STANDARD_DISCOUNT;
        return 0;
    };

    const actualDiscount = isDiscountApplied ? getPotentialDiscount() : 0;
    const totalAmount = Math.max(0, subtotal + PLATFORM_FEE + DELIVERY_FEE + gstAmount - actualDiscount);

    // Generate next 7 days dates
    const generateDates = () => {
        const dates = [];
        const today = startOfToday();
        const now = new Date();

        // Check if there are any slots left today with buffer
        // Last slot starts at 20:30 (20.5)
        const currentHourDecimal = now.getHours() + (now.getMinutes() + MIN_BUFFER_MINS) / 60;
        const slotsLeftToday = currentHourDecimal < 20.5;

        for (let i = 0; i < 7; i++) {
            const d = addDays(today, i);

            // If it's today and no slots left, skip to tomorrow
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

    // Effect to revoke coupon if conditions change
    useEffect(() => {
        const isCreditApplied = items.some(item => item.isCreditItem);

        if (isDiscountApplied) {
            if (onlyIroningInCart) {
                setIsDiscountApplied(false);
                setDiscountAmount(0);
                showAlert({
                    title: 'Coupon Removed',
                    message: 'The discount is not applicable for standalone ironing orders.',
                    type: 'info'
                });
            } else if (isCreditApplied) {
                setIsDiscountApplied(false);
                setDiscountAmount(0);
                showAlert({
                    title: 'Coupon Removed',
                    message: 'Offers cannot be combined with Subscription Credits.',
                    type: 'info'
                });
            } else if (isNextTwoOrders && subtotal < MIN_CART_VALUE) {
                setIsDiscountApplied(false);
                setDiscountAmount(0);
                showAlert({
                    title: 'Coupon Removed',
                    message: `Discount removed because cart value is less than ₹${MIN_CART_VALUE}.`,
                    type: 'info'
                });
            } else {
                // Update discount amount dynamically if cart total changes (weird edge case for 1st order where it matches subtotal)
                // or if it was applied but subtotal changed.
                const newDiscount = getPotentialDiscount();
                if (discountAmount !== newDiscount) {
                    setDiscountAmount(newDiscount);
                }
            }
        }
    }, [items, onlyIroningInCart, isDiscountApplied, subtotal, orderCount]);

    // Check if store is currently open (9 AM - 7:30 PM)
    const checkInstantAvailability = () => {
        const now = new Date();
        const hour = now.getHours();
        const mins = now.getMinutes();
        const decimalTime = hour + (mins + MIN_BUFFER_MINS) / 60;

        return hour >= OPERATIONAL_START_HOUR && decimalTime <= LAST_INSTANT_ORDER_TIME;
    };

    const isInstantAvailable = checkInstantAvailability();

    // Generate time slots (9 AM to 9 PM)
    const generateTimeSlots = () => {
        const slots = [];
        // From 9:00 (9) to 21:00 (21)
        for (let i = 9; i < 21; i++) {
            // XX:00 - XX:30
            const hourStart = i > 12 ? i - 12 : i;
            const ampmStart = i >= 12 ? 'PM' : 'AM';
            // Logic for end time of first slot
            // 9:30 is just 9:30 AM

            // Actually, let's keep the format simple and consistent with Firestore string matching
            // Using 24h format for internal logic might be easier, but UI needs AM/PM.
            // Let's generate simple strings as request: "10:00 - 10:30"
            // Wait, previous code used "10:00 - 10:30" (implied 24h start, but maybe not?)
            // The previous code was: `slots.push(\`\${i}:00 - \${i}:30\`);` where i went 10 to 22. 
            // This is actually mixing 24h and AM/PM loosely or just 24h. 
            // "13:00 - 13:30" etc.
            // User requested "9 to 9". 
            // Let's stick to 24-hour format strings for consistency in DB, but maybe formatted nicely in UI if needed.
            // But for simplicity of matching existing DB / strings, let's use the code loop style but strictly 09-21.

            // Format: "09:00 - 09:30", "09:30 - 10:00" ... "20:30 - 21:00".
            // i starts 9, ends < 21. 
            // Wait, last slot is 20:30 - 21:00. So loop i from 9 to 20.

            const p1 = `${i.toString().padStart(2, '0')}:00`;
            const p2 = `${i.toString().padStart(2, '0')}:30`;
            const p3 = `${(i + 1).toString().padStart(2, '0')}:00`;

            slots.push(`${p1} - ${p2}`);
            slots.push(`${p2} - ${p3}`);
        }
        return slots;
    };
    const timeSlots = generateTimeSlots();

    useEffect(() => {
        const fetchOrderCount = async () => {
            if (user?.uid) {
                try {
                    const orders = await getUserOrders(user.uid);
                    // Filter out cancelled orders for the count
                    const validOrders = orders.filter((o: any) => o.status !== 'cancelled');
                    setOrderCount(validOrders.length);
                } catch (error) {
                    console.error("Error fetching order count:", error);
                }
            }
        };
        fetchOrderCount();
    }, [user?.uid]);

    // Select first available date/time by default
    useEffect(() => {
        if (pickupType === 'instant' && !isInstantAvailable) {
            setPickupType('scheduled');
        }

        if (pickupType === 'scheduled') {
            // Pick first available date if none selected or if selected date is no longer in list
            if (!selectedDate || !dates.find(d => d.id === selectedDate)) {
                setSelectedDate(dates[0]?.id);
            }
        }
    }, [pickupType]);

    // Auto-select first available time slot when date/occupiedSlots changes
    useEffect(() => {
        if (selectedDate && pickupType === 'scheduled') {
            const now = new Date();
            const isToday = selectedDate === format(now, 'yyyy-MM-dd');

            const firstAvailableSlot = timeSlots.find(slot => {
                const isOccupied = occupiedSlots.includes(slot);
                if (isOccupied) return false;

                if (isToday) {
                    const [startStr] = slot.split(' - ');
                    const [h, m] = startStr.split(':').map(Number);
                    const slotStartTime = new Date();
                    slotStartTime.setHours(h, m, 0, 0);
                    const bufferTime = new Date(now.getTime() + MIN_BUFFER_MINS * 60000);
                    return slotStartTime >= bufferTime;
                }
                return true;
            });

            if (firstAvailableSlot) {
                setSelectedTimeSlot(firstAvailableSlot);
            } else {
                setSelectedTimeSlot(null);
            }
        }
    }, [selectedDate, occupiedSlots, pickupType]);

    // Fetch occupied slots when date Selected
    useEffect(() => {
        const fetchOccupied = async () => {
            if (selectedDate && pickupType === 'scheduled') {
                const { checkSlotAvailability } = require('../../services/firestore');
                setSlotsLoading(true);
                const occupied = await checkSlotAvailability(selectedDate);
                setOccupiedSlots(occupied);
                setSlotsLoading(false);
            }
        };
        fetchOccupied();
    }, [selectedDate, pickupType]);

    // ... (Focus Effect) ... 

    // ... (handlePlaceOrder) ...
    // Note: handlePlaceOrder function body is large, better to leave it mostly alone via contextual replace 
    // unless we need to change it. 
    // Wait, the previous replacement was mostly "top half" of component. 
    // I need to be careful not to replace `handlePlaceOrder` with truncated placeholder logic.
    // The instructions say "Update slot rendering".

    // Let's use smaller chunks. This tool call will focus on the STATE and EFFECTS at the top.

    // ...

    // Actually, I can replace the `generateTimeSlots` and adds usages.
    // But Render is at the bottom.

    // Let's split. 
    // 1. Top chunk: State, Constants, Logic.

    // ... code ...

    /* SKIPPING handlePlaceOrder logic replacement here to avoid massive diff. 
       Use a separate call for render logic if needed, or if start/end line allows.
       Actually, `generateTimeSlots` is near top (line 65). `render` is near bottom. 
       I will target the top part first.
    */


    // Track InitiateCheckout when Cart is viewed
    useFocusEffect(
        React.useCallback(() => {
            if (items.length > 0) {
                trackPixelEvent('InitiateCheckout', {
                    value: totalAmount,
                    currency: 'INR',
                    num_items: items.length
                });
            }
        }, [items.length, totalAmount])
    );

    const handlePlaceOrder = async () => {
        // Get latest user from store to avoid closure issues during retry
        const { user: latestUser } = useAuthStore.getState();

        if (!latestUser) {
            (navigation as any).navigate('PhoneLogin', { returnTo: 'Cart' });
            return;
        }

        if (!currentAddress) {
            showAlert({
                title: 'Address Required',
                message: 'Please select a delivery address',
                type: 'warning'
            });
            return;
        }

        if (pickupType === 'scheduled' && (!selectedDate || !selectedTimeSlot)) {
            showAlert({
                title: 'Incomplete Details',
                message: 'Please select a date and time for pickup',
                type: 'warning'
            });
            return;
        }

        const { currentLatitude, currentLongitude } = useAddressStore.getState();

        // --- GEOFENCING CHECK ---
        const { isLocationServiceable } = require('../../utils/geofence');
        const { logUnserviceableRequest } = require('../../services/firestore');

        // Ensure we have lat/lng
        if (currentLatitude && currentLongitude) {
            const serviceable = isLocationServiceable({
                latitude: currentLatitude,
                longitude: currentLongitude
            });

            if (!serviceable) {
                // Log the unserviceable attempt
                logUnserviceableRequest(latestUser.uid, {
                    latitude: currentLatitude,
                    longitude: currentLongitude,
                    address: currentAddress
                });

                showAlert({
                    title: 'Service Not Available',
                    message: `Sorry, we are not serving your area yet.\n\nWe have recorded your interest and will notify you as soon as we launch near ${currentAddress.split(',')[0]}!`,
                    type: 'info' // Use 'info' so it's not scary, just informative
                });
                return;
            }
        }
        // ------------------------

        setLoading(true);

        try {
            // Re-fetch here to be safe, though we used them above
            // const { currentLatitude, currentLongitude } = useAddressStore.getState(); 

            // Upload photos logic REMOVED. Photos are already uploaded in ServiceDetailScreen.
            // Items in cart already contain valid persistent Firebase URLs.
            const itemsWithPhotoUrls = items;

            let instantSlot = null;
            if (pickupType === 'instant') {
                const now = new Date();

                // STRICT NEXT SLOT LOGIC:
                // Find the first slot where the Start Time is strictly after ANY current time.
                // e.g. 13:01 -> Next slot starting at 13:30.
                // e.g. 13:29 -> Next slot starting at 13:30.
                // e.g. 13:30 -> Next slot starting at 14:00.
                const nextSlot = timeSlots.find(slot => {
                    const [startStr] = slot.split(' - ');
                    const [h, m] = startStr.split(':').map(Number);
                    const slotStartTime = new Date();
                    slotStartTime.setHours(h, m, 0, 0);

                    return isAfter(slotStartTime, now);
                });

                // Fail-safe: if too late (e.g. 8:50 PM), take the last slot or let backend handle/reject.
                // For MVP we just default to last slot if nothing found, but operational checks should prevent this earlier.
                instantSlot = nextSlot || timeSlots[timeSlots.length - 1];
            }

            const orderData = {
                vendorId: items[0]?.vendorId || 'default', // Assuming single vendor for MVP
                items: itemsWithPhotoUrls, // Use items with uploaded photo URLs
                billDetails: {
                    itemTotal: subtotal,
                    platformFee: PLATFORM_FEE,
                    deliveryFee: DELIVERY_FEE,
                    gst: gstAmount,
                    discount: discountAmount,
                    total: totalAmount,
                },
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
                paymentMode: 'cod', // Default to COD for MVP, maybe add card option later?
            };

            // Create the order first
            const orderId = await createOrder(latestUser.uid, orderData);

            // Track Purchase Event
            await trackPixelEvent('Purchase', {
                value: totalAmount,
                currency: 'INR',
                num_items: items.length,
                content_ids: items.map(i => i.id),
                content_type: 'product'
            });

            // Set navigating state to prevent empty cart flash
            setIsNavigating(true);

            // --- CONSUME CREDIT FIRST ---
            const creditItem = items.find(item => item.isCreditItem);
            console.log("[Credit] Checking for credit item in cart. Found:", creditItem ? `Yes (${creditItem.creditSubscriptionId})` : "No");

            if (creditItem && creditItem.creditSubscriptionId) {
                try {
                    const { useCredit } = useSubscriptionStore.getState();
                    console.log("[Credit] Initiating useCredit for sub:", creditItem.creditSubscriptionId);
                    const success = await useCredit(latestUser.uid, creditItem.creditSubscriptionId, orderId);

                    if (success) {
                        console.log("[Credit] Subscription credit successfully consumed for order:", orderId);
                    } else {
                        console.warn("[Credit] Credit utilization failed internally (returned false), but proceeding with order flow to prevent stuck cart.");
                    }
                } catch (creditError) {
                    console.error("[Credit] Critical error during credit consumption:", creditError);
                }
            }

            // --- CLEAR CART ---
            clearCart();
            await clearCartInFirestore(latestUser.uid);

            // Navigate to Success screen and reset stack to prevent going back to Cart
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [
                        { name: 'OrderSuccess' }
                    ],
                })
            );

        } catch (error) {
            console.error("Order placement failed", error);
            showAlert({
                title: 'Error',
                message: 'Failed to place order. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderCartItem = (item: any) => (
        <View key={item.id} style={styles.cartItem}>
            <View style={styles.itemHeader}>
                <View style={styles.serviceIcon}>
                    <Ionicons name="shirt" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.serviceName}>{item.serviceName}</Text>
                    <Text style={styles.serviceType}>{item.serviceType.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
            </View>

            {/* Dynamic details based on service type */}
            <View style={styles.itemDetails}>
                {/* Wash & Fold / Premium Laundry Details */}
                {(item.serviceType === 'wash_fold' || item.serviceType === 'premium_laundry') && (
                    <Text style={styles.detailText}>
                        {item.weight ? `${item.weight}kg` : ''}
                        {item.ironingEnabled && item.ironingCount > 0 ? ` + ${item.ironingCount} Ironing` : ''}
                    </Text>
                )}

                {/* Wash & Iron / Ironing Add-on Details */}
                {item.serviceType === 'wash_iron' && (
                    <Text style={styles.detailText}>
                        {item.serviceId === 'ironing_addon'
                            ? `${item.ironingCount || item.clothesCount || 0} Clothes`
                            : (item.weight ? `${item.weight}kg` : '')}
                    </Text>
                )}

                {/* Shoe Details */}
                {item.serviceType === 'shoe_clean' && (
                    <Text style={styles.detailText}>
                        {item.shoeCount} Pairs
                    </Text>
                )}

                {/* Blanket Details */}
                {item.serviceType === 'blanket_wash' && (
                    <Text style={styles.detailText}>
                        {item.blanketCount} Blankets
                    </Text>
                )}
                {item.ironingEnabled && (
                    <Text style={styles.detailText}>
                        + {item.ironingCount || 0} Ironing
                    </Text>
                )}
            </View>

            <AnimatedButton
                style={styles.removeButton}
                onPress={() => removeItem(item.id)}
            >
                <Text style={styles.removeButtonText}>Remove</Text>
            </AnimatedButton>
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
            {DELIVERY_FEE > 0 && (
                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Pick up and Delivery Fee</Text>
                    <Text style={styles.billValue}>₹{DELIVERY_FEE}</Text>
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
                    <Text style={[styles.billLabel, { color: COLORS.success }]}>First Order Discount</Text>
                    <Text style={[styles.billValue, { color: COLORS.success }]}>-₹{discountAmount}</Text>
                </View>
            )}
            <View style={[styles.billRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>₹{totalAmount}</Text>
            </View>
            {items.some(item => item.isCreditItem) && (
                <View style={styles.creditBadge}>
                    <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                    <Text style={styles.creditBadgeText}>Subscription Credit Applied</Text>
                </View>
            )}
        </View>
    );

    // Show loader during order placement and navigation
    if (loading || isNavigating) {
        return <BrandLoader fullscreen message="Placing your order..." />;
    }

    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
                </View>
                <Text style={styles.emptyText}>Your cart is empty!</Text>
                <Text style={styles.emptySubtext}>Add some services to get started.</Text>
                <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => {
                        (navigation as any).reset({
                            index: 0,
                            routes: [{ name: 'Main', state: { routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }] } }] } }],
                        });
                    }}
                >
                    <Text style={styles.browseButtonText}>Browse Services</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // removed import

    // ... (render)



    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            (navigation as any).navigate('MainTabs');
                        }
                    }}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Cart</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.scrollContainer}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    nestedScrollEnabled={true}
                >
                    {/* Items List */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                        {items.map(renderCartItem)}
                    </View>

                    {/* Coupon Section - Hide if subscription credit is applied */}
                    {orderCount < 3 && !items.some(item => item.isCreditItem) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Offers & Benefits</Text>
                            <TouchableOpacity
                                style={[styles.couponCard, isDiscountApplied && styles.couponCardApplied]}
                                onPress={() => {
                                    if (isDiscountApplied) {
                                        setIsDiscountApplied(false);
                                        setDiscountAmount(0);
                                    } else {
                                        if (onlyIroningInCart) {
                                            showAlert({
                                                title: 'Coupon Not Applicable',
                                                message: 'The FIRST100 discount is not available for standalone ironing orders. Add another service to use this offer!',
                                                type: 'info'
                                            });
                                            return;
                                        }

                                        if (isNextTwoOrders && subtotal < MIN_CART_VALUE) {
                                            showAlert({
                                                title: 'Cart Value Too Low',
                                                message: `Add items worth ₹${MIN_CART_VALUE - subtotal} more to apply this coupon!`,
                                                type: 'warning'
                                            });
                                            return;
                                        }

                                        const discount = getPotentialDiscount();
                                        setIsDiscountApplied(true);
                                        setDiscountAmount(discount);

                                        showAlert({
                                            title: 'Coupon Applied!',
                                            message: `₹${discount} discount has been added to your order.`,
                                            type: 'success'
                                        });
                                    }
                                }}
                            >
                                <View style={styles.couponIconContainer}>
                                    <Ionicons name="gift-outline" size={24} color={isDiscountApplied ? '#FFF' : COLORS.primary} />
                                </View>
                                <View style={styles.couponInfo}>
                                    <Text style={[styles.couponTitle, isDiscountApplied && styles.couponTextApplied]}>
                                        {isDiscountApplied ? 'FIRST100 Applied' : 'Apply FIRST100'}
                                    </Text>
                                    <Text style={[styles.couponSub, isDiscountApplied && styles.couponTextApplied]}>
                                        {isDiscountApplied
                                            ? `Saved ₹${discountAmount} on this order`
                                            : (isFirstOrder
                                                ? 'Get flat ₹100 OFF on your 1st order'
                                                : `Get ₹${STANDARD_DISCOUNT} off over ₹${MIN_CART_VALUE}`)
                                        }
                                    </Text>
                                </View>
                                <View style={[styles.applyBadge, isDiscountApplied && styles.applyBadgeApplied]}>
                                    <Text style={[styles.applyText, isDiscountApplied && styles.applyTextApplied]}>
                                        {isDiscountApplied ? 'REMOVE' : 'APPLY'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Premium Bill Details with GlassCard */}
                    <GlassCard intensity="medium" style={styles.billGlassCard}>
                        <Text style={styles.sectionTitle}>Order Summary</Text>
                        {renderBillDetails()}
                        <View style={styles.guaranteeContainer}>
                            <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                            <Text style={styles.guaranteeText}>100% Satisfaction Guarantee</Text>
                        </View>
                    </GlassCard>

                    {/* Pickup Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pickup Details</Text>

                        {/* Toggle */}
                        <View style={styles.pickupToggle}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleOption,
                                    pickupType === 'instant' && styles.toggleOptionActive,
                                    !isInstantAvailable && styles.toggleOptionDisabled
                                ]}
                                disabled={!isInstantAvailable}
                                onPress={() => setPickupType('instant')}
                            >
                                <Ionicons
                                    name="flash"
                                    size={16}
                                    color={!isInstantAvailable ? COLORS.textLight : (pickupType === 'instant' ? '#FFF' : COLORS.text)}
                                />
                                <View>
                                    <Text style={[
                                        styles.toggleText,
                                        pickupType === 'instant' && styles.toggleTextActive,
                                        !isInstantAvailable && styles.toggleTextDisabled
                                    ]}>
                                        Instant (20-30 min)
                                    </Text>
                                    {!isInstantAvailable && (
                                        <Text style={styles.disabledHint}>Ops Ends at 7:30 PM</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleOption, pickupType === 'scheduled' && styles.toggleOptionActive]}
                                onPress={() => setPickupType('scheduled')}
                            >
                                <Ionicons name="calendar" size={16} color={pickupType === 'scheduled' ? '#FFF' : COLORS.text} />
                                <Text style={[styles.toggleText, pickupType === 'scheduled' && styles.toggleTextActive]}>
                                    Schedule Later
                                </Text>
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
                                            <Text style={[styles.dateDay, selectedDate === date.id && styles.dateTextSelected]}>{date.day}</Text>
                                            <Text style={[styles.dateNum, selectedDate === date.id && styles.dateTextSelected]}>{date.date}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.pickerLabel}>Select Time {slotsLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 10 }} />}</Text>
                                <View style={[styles.timeGrid, slotsLoading && { opacity: 0.5 }]}>
                                    {(() => {
                                        const now = new Date();
                                        const isToday = selectedDate === format(now, 'yyyy-MM-dd');
                                        const bufferTime = addMinutes(now, MIN_BUFFER_MINS);

                                        return timeSlots.map((slot) => {
                                            const isOccupied = occupiedSlots.includes(slot);

                                            let isPast = false;
                                            if (isToday) {
                                                const [startStr] = slot.split(' - ');
                                                const [h, m] = startStr.split(':').map(Number);
                                                const slotStartTime = new Date();
                                                slotStartTime.setHours(h, m, 0, 0);
                                                isPast = isAfter(bufferTime, slotStartTime);
                                            }

                                            const isDisabled = isOccupied || isPast;

                                            return (
                                                <TouchableOpacity
                                                    key={slot}
                                                    disabled={isDisabled}
                                                    style={[
                                                        styles.timeSlot,
                                                        selectedTimeSlot === slot && styles.timeSlotSelected,
                                                        isDisabled && styles.timeSlotDisabled
                                                    ]}
                                                    onPress={() => setSelectedTimeSlot(slot)}
                                                >
                                                    <Text style={[
                                                        styles.timeText,
                                                        selectedTimeSlot === slot && styles.timeTextSelected,
                                                        isDisabled && styles.timeTextDisabled
                                                    ]}>
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

                    {/* Address Preview (Clean) */}
                    <View style={styles.cleanAddressContainer}>
                        <View style={styles.addressRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addressLabel}>Delivery Address</Text>
                                <Text style={styles.cleanAddressText} numberOfLines={2}>
                                    {currentAddress || 'Select Delivery Address'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('AddressList' as never)}
                            >
                                <Text style={styles.cleanChangeText}>CHANGE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Trust Signals */}
                    <CartTrust />

                </ScrollView>
            </View >

            {/* Floating Premium Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 4 }]}>
                <GlassCard intensity="high" style={styles.footerGlass}>
                    <View style={styles.footerAmountContainer}>
                        <Text style={styles.footerLabel}>Total to Pay</Text>
                        <Text style={styles.footerTotal}>₹{totalAmount}</Text>
                        <Text style={styles.payOnDeliveryText}>Pay on delivery</Text>
                    </View>
                    <AnimatedButton
                        style={styles.placeOrderBtn}
                        onPress={handlePlaceOrder}
                        disabled={loading}
                    >
                        <Text style={styles.placeOrderText}>Cash On Delivery</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </AnimatedButton>
                </GlassCard>
            </View>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        ...(Platform.OS === 'web' ? {
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
        } : {}) as any,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        backgroundColor: '#FFFFFF',
        ...(Platform.OS === 'web' ? {
            flexShrink: 0,
        } : {}),
    },
    headerTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
    },
    backButton: {
        padding: 4,
    },
    scrollContainer: {
        flex: 1,
        ...(Platform.OS === 'web' ? {
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 1,
        } : {}),
    },
    scrollView: {
        flex: 1,
        ...(Platform.OS === 'web' ? {
            minHeight: 0,
            overflowY: 'auto' as any,
            overflowX: 'hidden' as any,
            WebkitOverflowScrolling: 'touch' as any,
            flexShrink: 1,
        } : {}),
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
        ...(Platform.OS === 'web' ? {
            minHeight: 'auto',
        } : {}),
    },
    section: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    sectionTitle: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: SPACING.sm,
        color: COLORS.text,
    },
    cartItem: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    serviceIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    itemInfo: {
        flex: 1,
    },
    serviceName: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 14,
    },
    serviceType: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    itemPrice: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.primary,
    },
    itemDetails: {
        marginLeft: 40,
        marginBottom: 8,
    },
    cleanAddressContainer: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: '#FFFFFF',
        marginBottom: SPACING.sm,
    },
    addressLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
        fontFamily: 'Outfit_600SemiBold',
    },
    cleanAddressText: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 22,
        fontFamily: 'Outfit_500Medium',
    },
    cleanChangeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.5,
    },
    detailText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    instructionText: {
        fontSize: 12,
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
    removeButton: {
        alignSelf: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    removeButtonText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: '600',
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    billLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    billValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    totalLabel: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 16,
    },
    totalValue: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 16,
        color: COLORS.primary,
    },
    couponCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.backgroundLight,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
        borderStyle: 'dashed',
    },
    couponCardApplied: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        borderStyle: 'solid',
    },
    couponIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    couponInfo: {
        flex: 1,
    },
    couponTitle: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 14,
        color: COLORS.primary,
    },
    couponSub: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    couponTextApplied: {
        color: '#FFF',
    },
    applyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.primary + '15',
    },
    applyBadgeApplied: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    applyText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primary,
    },
    applyTextApplied: {
        color: '#FFF',
    },
    pickupToggle: {
        flexDirection: 'row',
        backgroundColor: COLORS.backgroundLight,
        padding: 4,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.md,
    },
    toggleOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        gap: 6,
    },
    toggleOptionActive: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.sm,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    toggleTextActive: {
        color: '#FFF',
    },
    toggleOptionDisabled: {
        backgroundColor: '#F3F4F6',
        opacity: 0.7,
    },
    toggleTextDisabled: {
        color: '#9CA3AF',
    },
    disabledHint: {
        fontSize: 8,
        color: '#9CA3AF',
        marginTop: 2,
    },
    scheduleContainer: {
        marginTop: SPACING.sm,
    },
    pickerLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8,
        textTransform: 'uppercase',
    },
    dateScroll: {
        marginBottom: SPACING.md,
    },
    dateCard: {
        width: 60,
        height: 70,
        backgroundColor: COLORS.backgroundLight,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    dateCardSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dateDay: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    dateNum: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    dateTextSelected: {
        color: '#FFF',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeSlot: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.backgroundLight,
    },
    timeSlotSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    timeSlotDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        opacity: 0.6,
    },
    timeText: {
        fontSize: 12,
        color: COLORS.text,
    },
    timeTextSelected: {
        color: '#FFF',
    },
    timeTextDisabled: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    addressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addressText: {
        color: COLORS.text,
        fontWeight: '500',
        maxWidth: 250,
        marginTop: 4,
    },
    changeAddressBtn: {
        padding: 8,
    },
    changeAddressText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    /* Redesigned Footer */
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        // paddingBottom set dynamically via insets.bottom inline
    },
    footerGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    footerLabel: {
        ...TYPOGRAPHY.tiny,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    footerTotal: {
        ...TYPOGRAPHY.heading,
        fontSize: 24,
        color: COLORS.text,
    },
    payOnDeliveryText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 2,
        fontWeight: '500',
    },
    placeOrderBtn: {
        flex: 1,
        marginLeft: 20,
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...SHADOWS.primary,
    },
    placeOrderText: {
        ...TYPOGRAPHY.button,
        color: '#FFF',
        fontSize: 15,
    },
    footerAmountContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    billGlassCard: {
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        padding: SPACING.xl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.backgroundLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    emptyText: {
        ...TYPOGRAPHY.heading,
        fontSize: 24,
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: SPACING.xl * 2,
    },
    browseButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: RADIUS.xl,
    },
    browseButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    creditBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary + '10',
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        marginTop: SPACING.md,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    creditBadgeText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.primary,
        fontWeight: '700',
    },
    guaranteeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 6,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    guaranteeText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: '600',
        fontFamily: 'Outfit_600SemiBold',
    },
});
