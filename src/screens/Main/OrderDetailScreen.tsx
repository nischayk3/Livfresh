import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, isAfter, addMinutes, parse, addDays, startOfToday } from 'date-fns';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';
import { getOrder, getBusySlots, scheduleOrderDelivery, subscribeToOrder, checkSlotAvailability } from '../../services/firestore';
import { BrandLoader } from '../../components/BrandLoader';

// Order Status Steps
// Order Status Steps - Aligned with Admin Flow
const ORDER_STEPS = [
    { key: 'placed', label: 'Order Placed', icon: 'clipboard-outline' },
    { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
    { key: 'pickup_completed', label: 'Pickup Completed', icon: 'bicycle-outline' },
    { key: 'processing', label: 'Processing', icon: 'water-outline' },
    { key: 'ready', label: 'Ready for Delivery', icon: 'cube-outline' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'rocket-outline' },
    { key: 'delivered', label: 'Delivered', icon: 'home-outline' },
];

export const OrderDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { orderId } = route.params as { orderId: string };

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showScheduler, setShowScheduler] = useState(false);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [busySlots, setBusySlots] = useState<string[]>([]);
    const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamic next 5 days
    const DATES = Array.from({ length: 5 }, (_, i) => {
        const d = startOfToday();
        return addDays(d, i);
    });

    // Generate time slots (9 AM to 9 PM)
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

    const fetchOrder = async () => {
        // Handled by real-time listener now
    };

    useEffect(() => {
        if (!user?.uid || !orderId) return;

        setIsLoading(true);
        const unsubscribe = subscribeToOrder(user.uid, orderId, (data) => {
            setOrder(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [orderId, user?.uid]);

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
            // Refresh order - Handled by listener
            Alert.alert("Success", `Delivery scheduled for ${selectedSlot} on ${format(DATES[selectedDateIndex], 'MMM d')}`);
        } catch (error) {
            Alert.alert("Error", "Failed to schedule delivery. Please try again.");
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

    // Determine current step index
    // Note: This logic assumes linear progression. If statuses can skip, this might need refinement.
    const currentStepIndex = ORDER_STEPS.findIndex(step => step.key === order.status);
    const activeStepIndex = currentStepIndex === -1 ? 0 : currentStepIndex; // Default to 0 if unknown

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            (navigation as any).navigate('MainTabs', { screen: 'MyOrders' });
                        }
                    }}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) + 80 }]}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
            >

                {/* Order Information Card (SpinZo Style) */}
                <View style={styles.infoCard}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Order ID</Text>
                        <Text style={styles.infoValue}>#{order.id.slice(-6).toUpperCase()}</Text>
                        {order.tokenNumber && (
                            <View style={styles.tokenRow}>
                                <Ionicons name="pricetag" size={14} color={COLORS.primary} />
                                <Text style={styles.tokenLabel}>Token: {order.tokenNumber}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.infoColRight}>
                        <Text style={styles.infoLabel}>Total Amount</Text>
                        <Text style={styles.totalValueLarge}>₹{order.billDetails?.total || 0}</Text>
                    </View>
                </View>

                {/* Delivery Scheduling CTA */}
                {order.status === 'ready' && !order.deliveryDate && (
                    <View style={styles.scheduleCard}>
                        <View style={styles.scheduleIconContainer}>
                            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.scheduleContent}>
                            <Text style={styles.scheduleTitle}>Schedule Your Delivery</Text>
                            <Text style={styles.scheduleSub}>Pick a 30-min slot that works for you</Text>
                            <TouchableOpacity
                                style={styles.scheduleButton}
                                onPress={() => setShowScheduler(true)}
                            >
                                <Text style={styles.scheduleButtonText}>Schedule Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Scheduled Information Display */}
                {order.deliveryDate && (
                    <View style={styles.scheduledInfoCard}>
                        <Ionicons name="time-outline" size={18} color={COLORS.success} />
                        <Text style={styles.scheduledInfoText}>
                            Scheduled for: <Text style={{ fontWeight: '700' }}>
                                {(() => {
                                    try {
                                        return format(parse(order.deliveryDate, 'yyyy-MM-dd', new Date()), 'MMM d');
                                    } catch (e) {
                                        return order.deliveryDate;
                                    }
                                })()}, {order.deliveryTime}
                            </Text>
                        </Text>
                    </View>
                )}

                {/* OTP Banner - Critical for End-to-End Flow */}
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

                {/* Delivery OTP - Only show when delivery is scheduled */}
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

                {/* Stepper Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>
                    <View style={styles.stepperContainer}>
                        {ORDER_STEPS.map((step, index) => {
                            const isActive = index <= activeStepIndex;
                            const isLast = index === ORDER_STEPS.length - 1;

                            return (
                                <View key={step.key} style={styles.stepRow}>
                                    <View style={styles.stepIndicator}>
                                        <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                                            <Ionicons
                                                name={step.icon as any}
                                                size={16}
                                                color={isActive ? '#FFF' : COLORS.textLight}
                                            />
                                        </View>
                                        {!isLast && (
                                            <View style={[styles.stepLine, isActive && index < activeStepIndex && styles.stepLineActive]} />
                                        )}
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                                            {step.label}
                                        </Text>
                                        {/* Show timestamp if available/relevant for completed steps */}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {order.items?.map((item: any, idx: number) => (
                        <View key={idx} style={styles.itemRow}>
                            <Text style={styles.itemName}>
                                {item.serviceName} ({
                                    item.serviceId === 'ironing_addon' ? `${item.clothesCount || item.ironingCount || 0} Clothes` :
                                        (item.serviceType === 'wash_fold' || item.serviceType === 'wash_iron' || item.serviceType === 'premium_laundry')
                                            ? `${item.weight ? `${item.weight}kg` : ''}${(item.ironingCount || item.ironingEnabled) ? ` + ${item.ironingCount || 0} Ironing` : ''}`
                                            : item.serviceType === 'blanket_wash' ? (item.description || 'Blankets') :
                                                item.serviceType === 'shoe_clean' ? `${item.shoeQuantity} pairs` :
                                                    item.serviceType === 'dry_clean' ? (item.weight ? `${item.weight}kg` : `${item.items?.length || 0} items`) :
                                                        'Service'
                                })
                            </Text>
                            <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
                        </View>
                    ))}
                </View>

                {/* Bill Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bill Details</Text>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billValue}>₹{order.billDetails?.itemTotal}</Text>
                    </View>
                    {(order.billDetails?.platformFee > 0) && (
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Platform Fee</Text>
                            <Text style={styles.billValue}>₹{order.billDetails?.platformFee}</Text>
                        </View>
                    )}
                    {(order.billDetails?.deliveryFee > 0) && (
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Pick up and Delivery Fee</Text>
                            <Text style={styles.billValue}>₹{order.billDetails?.deliveryFee}</Text>
                        </View>
                    )}
                    {(order.billDetails?.gst > 0) && (
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>GST</Text>
                            <Text style={styles.billValue}>₹{order.billDetails?.gst}</Text>
                        </View>
                    )}
                    {(order.billDetails?.discount > 0) && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: COLORS.success }]}>Discount</Text>
                            <Text style={[styles.billValue, { color: COLORS.success }]}>-₹{order.billDetails?.discount}</Text>
                        </View>
                    )}
                    <View style={[styles.billRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalValue}>₹{order.billDetails?.total}</Text>
                    </View>
                </View>

                {/* Address Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <Text style={styles.addressText}>
                        {typeof order.address === 'string' ? order.address : order.address?.formattedAddress || order.address?.address}
                    </Text>
                </View>

            </ScrollView>

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
                                <Ionicons name="close" size={24} color={COLORS.text} />
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

                        <Text style={styles.modalSubtitle}>Select 30-min Slot</Text>
                        {isLoadingBusySlots ? (
                            <View style={styles.slotLoader}>
                                <ActivityIndicator color={COLORS.primary} />
                                <Text style={styles.loaderText}>Checking availability...</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.slotList} contentContainerStyle={styles.slotListContent}>
                                <View style={styles.timeGrid}>
                                    {generateTimeSlots().map((slot) => {
                                        const isBusy = busySlots.includes(slot);
                                        const isSelected = selectedSlot === slot;

                                        // Parse start time "09:00", "09:30" etc.
                                        const [startStr] = slot.split(' - ');
                                        const [hoursStr, minsStr] = startStr.split(':');
                                        const slotHour = parseInt(hoursStr, 10);
                                        const slotMin = parseInt(minsStr, 10);

                                        let isPast = false;
                                        // Logic for today: hide past slots
                                        if (isSameDay(DATES[selectedDateIndex], new Date())) {
                                            const now = new Date();
                                            // Add 30 min buffer for delivery prep
                                            const slotTime = new Date();
                                            slotTime.setHours(slotHour, slotMin, 0, 0);
                                            const cutoff = addMinutes(now, 30);
                                            isPast = !isAfter(slotTime, cutoff);
                                        }

                                        const isDisabled = isBusy || isPast;

                                        return (
                                            <TouchableOpacity
                                                key={slot}
                                                style={[
                                                    styles.timeSlot,
                                                    isSelected && styles.timeSlotSelected,
                                                    isDisabled && { opacity: 0.5, backgroundColor: '#F3F4F6' }
                                                ]}
                                                disabled={isDisabled}
                                                onPress={() => setSelectedSlot(slot)}
                                            >
                                                <Text style={[
                                                    styles.timeText,
                                                    isSelected && styles.timeTextSelected,
                                                    isDisabled && { color: COLORS.textLight, textDecorationLine: isBusy ? 'line-through' : 'none' }
                                                ]}>
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
        backgroundColor: COLORS.background,
        ...(Platform.OS === 'web' ? {
            height: '100%' as any,
            display: 'flex' as any,
            flexDirection: 'column' as any,
        } : {}),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpContainer: {
        backgroundColor: COLORS.primary,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.md,
    },
    otpLabel: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: SPACING.md,
        opacity: 0.9,
    },
    otpBoxContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    otpDigitBox: {
        width: 50,
        height: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    otpDigitText: {
        color: '#FFF',
        fontSize: 28,
        fontFamily: 'Outfit_700Bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backButton: {
        marginRight: SPACING.md,
    },
    headerTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
        ...(Platform.OS === 'web' ? {
            height: '100%',
            minHeight: 0,
            overflowY: 'auto' as any,
            overflowX: 'hidden' as any,
            WebkitOverflowScrolling: 'touch' as any,
        } : {}),
    },
    scrollContent: {
        padding: SPACING.md,
        flexGrow: 1,
        ...(Platform.OS === 'web' ? {
            minHeight: '100%',
        } : {}),
    },
    section: {
        marginBottom: SPACING.xl,
        backgroundColor: COLORS.cardBg,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        ...SHADOWS.sm,
    },
    sectionTitle: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: SPACING.md,
        color: COLORS.text,
    },
    stepperContainer: {
        marginTop: SPACING.sm,
    },
    stepRow: {
        flexDirection: 'row',
        minHeight: 60,
    },
    stepIndicator: {
        alignItems: 'center',
        marginRight: SPACING.md,
        width: 30,
    },
    stepCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.backgroundLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.borderLight,
        zIndex: 1,
    },
    stepCircleActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    stepLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.borderLight,
        marginVertical: -2, // pull up to connect
    },
    stepLineActive: {
        backgroundColor: COLORS.primary,
    },
    stepContent: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 4,
    },
    stepLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    stepLabelActive: {
        color: COLORS.text,
        fontWeight: '700',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 14,
        color: COLORS.text,
    },
    itemPrice: {
        fontSize: 14,
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
        fontWeight: '700',
    },
    totalValue: {
        fontWeight: '700',
        color: COLORS.primary,
    },
    addressText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    infoCard: {
        backgroundColor: COLORS.primary + '08',
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    infoCol: {
        flex: 1,
    },
    infoColRight: {
        alignItems: 'flex-end',
    },
    infoLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 18,
        color: COLORS.text,
    },
    tokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    tokenLabel: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.primary,
        fontWeight: '700',
    },
    totalValueLarge: {
        ...TYPOGRAPHY.heading,
        color: COLORS.primary,
        fontSize: 24,
    },
    scheduleCard: {
        backgroundColor: '#FFF',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        flexDirection: 'row',
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
        ...SHADOWS.sm,
    },
    scheduleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    scheduleContent: {
        flex: 1,
    },
    scheduleTitle: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
        marginBottom: 4,
    },
    scheduleSub: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    scheduleButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
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
        backgroundColor: COLORS.success + '10',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.success + '20',
    },
    scheduledInfoText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.success,
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.lg,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
    },
    modalSubtitle: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
    },
    dateList: {
        marginBottom: SPACING.lg,
    },
    dateItem: {
        width: 60,
        height: 70,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
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
    slotList: {
        maxHeight: 300,
    },
    slotListContent: {
        paddingBottom: SPACING.xl,
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
    slotLoader: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 10,
        color: COLORS.textSecondary,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        marginTop: SPACING.lg,
        ...SHADOWS.md,
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.textLight,
        opacity: 0.7,
    },
    confirmButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
});
