import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';

import { useCartStore, useAuthStore, useAddressStore } from '../../store';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { createOrder, saveCart, clearCartInFirestore } from '../../services/firestore';
import { BrandLoader } from '../../components/BrandLoader';

export const CartScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { items, removeItem, getTotalAmount, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const { currentAddress } = useAddressStore();

    const [loading, setLoading] = useState(false);
    const [pickupType, setPickupType] = useState<'instant' | 'scheduled'>('instant');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

    // Constants
    const PLATFORM_FEE = 19;
    const GST_PERCENTAGE = 0.18;

    const subtotal = getTotalAmount();
    const gstAmount = Math.round(subtotal * GST_PERCENTAGE);
    const totalAmount = subtotal + PLATFORM_FEE + gstAmount;

    // Generate next 7 days dates
    const generateDates = () => {
        const dates = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push({
                id: d.toISOString().split('T')[0],
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.getDate(),
                fullDate: d,
            });
        }
        return dates;
    };

    const dates = generateDates();

    // Generate time slots (10 AM to 10 PM)
    const generateTimeSlots = () => {
        const slots = [];
        for (let i = 10; i < 22; i++) {
            slots.push(`${i}:00 - ${i + 1}:00`);
        }
        return slots;
    };
    const timeSlots = generateTimeSlots();

    useEffect(() => {
        // Select tomorrow by default if scheduled
        if (pickupType === 'scheduled' && !selectedDate) {
            setSelectedDate(dates[1].id);
        }
    }, [pickupType]);

    const handlePlaceOrder = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to place an order');
            return;
        }

        if (!currentAddress) {
            Alert.alert('Address Required', 'Please select a delivery address');
            return;
        }

        if (pickupType === 'scheduled' && (!selectedDate || !selectedTimeSlot)) {
            Alert.alert('Incomplete Details', 'Please select a date and time for pickup');
            return;
        }

        setLoading(true);

        try {
            const orderData = {
                vendorId: items[0]?.vendorId || 'default', // Assuming single vendor for MVP
                items,
                billDetails: {
                    itemTotal: subtotal,
                    platformFee: PLATFORM_FEE,
                    gst: gstAmount,
                    total: totalAmount,
                },
                pickupDetails: {
                    type: pickupType,
                    scheduledDate: pickupType === 'scheduled' ? selectedDate : null,
                    scheduledTime: pickupType === 'scheduled' ? selectedTimeSlot : null,
                    isInstant: pickupType === 'instant',
                },
                address: currentAddress, // Ideally full address object, but store only has label string currently? checking... store has full obj?
                // AddressStore seems to expose `currentAddress` which is a string label? 
                // We'll trust it for now or assume backend/profile fixes it. 
                // Better: If AddressStore has full object, use it. Code analysis showed `currentAddress` is likely string? 
                // Let's assume it's the address string for now.
                status: 'placed',
                paymentMode: 'cod', // Default to COD for MVP, maybe add card option later?
            };

            const orderId = await createOrder(user.uid, orderData);

            // Clear cart
            // Clear cart
            clearCart();
            await clearCartInFirestore(user.uid);

            (navigation as any).navigate('Main', { screen: 'OrderSuccess' });

        } catch (error) {
            console.error("Order placement failed", error);
            Alert.alert('Error', 'Failed to place order. Please try again.');
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
                {/* Wash & Fold Details */}
                {(item.serviceType === 'wash_fold' || item.serviceType === 'wash_iron') && (
                    <Text style={styles.detailText}>
                        {item.weight}kg ({item.clothesCount} clothes)
                        {item.ironingEnabled ? ` + ${item.ironingCount} Ironing` : ''}
                    </Text>
                )}

                {/* Shoe Details */}
                {item.serviceType === 'shoe_clean' && (
                    <Text style={styles.detailText}>
                        {item.shoeQuantity} pairs ({item.shoeType})
                    </Text>
                )}

                {/* General catch-all */}
                {item.specialInstructions && (
                    <Text style={styles.instructionText}>Note: {item.specialInstructions}</Text>
                )}
            </View>

            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItem(item.id)}
            >
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

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
                    onPress={() => navigation.goBack()}
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
            {loading && <BrandLoader fullscreen message="Placing your order..." />}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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

                    {/* Bill Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Bill Details</Text>
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Item Total</Text>
                            <Text style={styles.billValue}>₹{subtotal}</Text>
                        </View>
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Platform Fee</Text>
                            <Text style={styles.billValue}>₹{PLATFORM_FEE}</Text>
                        </View>
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>GST (18%)</Text>
                            <Text style={styles.billValue}>₹{gstAmount}</Text>
                        </View>
                        <View style={[styles.billRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalValue}>₹{totalAmount}</Text>
                        </View>
                    </View>

                    {/* Pickup Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pickup Details</Text>

                        {/* Toggle */}
                        <View style={styles.pickupToggle}>
                            <TouchableOpacity
                                style={[styles.toggleOption, pickupType === 'instant' && styles.toggleOptionActive]}
                                onPress={() => setPickupType('instant')}
                            >
                                <Ionicons name="flash" size={16} color={pickupType === 'instant' ? '#FFF' : COLORS.text} />
                                <Text style={[styles.toggleText, pickupType === 'instant' && styles.toggleTextActive]}>
                                    Instant (20-30 min)
                                </Text>
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

                                <Text style={styles.pickerLabel}>Select Time</Text>
                                <View style={styles.timeGrid}>
                                    {timeSlots.map((slot) => (
                                        <TouchableOpacity
                                            key={slot}
                                            style={[styles.timeSlot, selectedTimeSlot === slot && styles.timeSlotSelected]}
                                            onPress={() => setSelectedTimeSlot(slot)}
                                        >
                                            <Text style={[styles.timeText, selectedTimeSlot === slot && styles.timeTextSelected]}>
                                                {slot}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Address Preview (Static for now) */}
                    <View style={styles.section}>
                        <View style={styles.addressRow}>
                            <View>
                                <Text style={styles.sectionTitle}>Delivery Address</Text>
                                <Text style={styles.addressText} numberOfLines={1}>
                                    {currentAddress || 'No Address Selected'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.changeAddressBtn}
                                onPress={() => navigation.navigate('AddressList' as never)}
                            >
                                <Text style={styles.changeAddressText}>CHANGE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
                <View>
                    <Text style={styles.footerLabel}>Total to Pay</Text>
                    <Text style={styles.footerTotal}>₹{totalAmount}</Text>
                </View>
                <TouchableOpacity
                    style={styles.placeOrderBtn}
                    onPress={handlePlaceOrder}
                    disabled={loading}
                >
                    <Text style={styles.placeOrderText}>Place Order</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        backgroundColor: COLORS.background,
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
        paddingBottom: 120,
        ...(Platform.OS === 'web' ? {
            minHeight: 'auto',
        } : {}),
    },
    section: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
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
        borderTopColor: COLORS.borderLight,
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
    timeText: {
        fontSize: 12,
        color: COLORS.text,
    },
    timeTextSelected: {
        color: '#FFF',
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
    footer: {
        backgroundColor: COLORS.background,
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        ...(Platform.OS === 'web' ? {
            position: 'relative' as any,
            zIndex: 1000,
            flexShrink: 0,
            flexGrow: 0,
            width: '100%',
        } : {}),
    },
    footerLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    footerTotal: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    placeOrderBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...SHADOWS.md,
        ...(Platform.OS === 'web' ? {
            cursor: 'pointer',
            userSelect: 'none' as any,
        } : {}),
    },
    placeOrderText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
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
});
