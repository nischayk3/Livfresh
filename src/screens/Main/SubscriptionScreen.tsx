import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { createSubscription, cancelSubscription } from '../../services/firestore';
import { useAuthStore, useUIStore } from '../../store';
import { BrandLoader } from '../../components/BrandLoader';

const subscriptionIllustration = require('../../../assets/subscription_illustration.png');

type SubscriptionType = 'schedule' | 'credits';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const generateTimeSlots = () => {
    const slots = [];
    let startHour = 10; // 10 AM
    const endHour = 20; // 8 PM

    for (let hour = startHour; hour <= endHour; hour++) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;

        slots.push(`${displayHour}:00 ${period}`);
        if (hour !== endHour) {
            slots.push(`${displayHour}:30 ${period}`);
        }
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

export const SubscriptionScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { user, updateSubscription, cancelLocalSubscription } = useAuthStore();
    const { showAlert } = useUIStore();
    const [selectedType, setSelectedType] = useState<SubscriptionType>('schedule');
    const [credits, setCredits] = useState(1);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
    const [cancelling, setCancelling] = useState(false);

    // Form states for schedule
    const [pickupDay, setPickupDay] = useState('Monday');
    const [pickupTime, setPickupTime] = useState('10:00 AM');
    const [deliveryDay, setDeliveryDay] = useState('Tuesday');
    const [deliveryTime, setDeliveryTime] = useState('6:00 PM');

    const CREDIT_PRICE = 399;
    const MONTHLY_PRICE = 1599;

    const handleIncrementCredits = () => {
        if (credits < 4) setCredits(credits + 1);
    };

    const handleDecrementCredits = () => {
        if (credits > 1) setCredits(credits - 1);
    };

    const [modalVisible, setModalVisible] = useState(false);
    const [selectionType, setSelectionType] = useState<'pickupDay' | 'pickupTime' | 'deliveryDay' | 'deliveryTime' | null>(null);

    const openSelection = (type: 'pickupDay' | 'pickupTime' | 'deliveryDay' | 'deliveryTime') => {
        setSelectionType(type);
        setModalVisible(true);
    };

    const handleSelectOption = (value: string) => {
        switch (selectionType) {
            case 'pickupDay': setPickupDay(value); break;
            case 'pickupTime': setPickupTime(value); break;
            case 'deliveryDay': setDeliveryDay(value); break;
            case 'deliveryTime': setDeliveryTime(value); break;
        }
        setModalVisible(false);
    };

    const getValidDeliveryDays = (currentPickupDay: string) => {
        const pickupIndex = DAYS.indexOf(currentPickupDay);
        if (pickupIndex === -1) return DAYS;

        // Allow delivery 2-4 days after pickup
        // e.g. Mon(0) -> Wed(2), Thu(3), Fri(4)
        // e.g. Fri(4) -> Sun(6), Tue(1) -- wait, 4+3=7 (Sun index 6?), 4+2=6 (Sun)
        // Calculation: (index + offset) % 7
        const validDays = [];
        for (let i = 2; i <= 4; i++) {
            const nextIndex = (pickupIndex + i) % 7;
            validDays.push(DAYS[nextIndex]);
        }
        return validDays;
    };

    // Auto-update delivery day when pickup day changes
    React.useEffect(() => {
        const validDays = getValidDeliveryDays(pickupDay);
        if (!validDays.includes(deliveryDay)) {
            setDeliveryDay(validDays[0]);
        }
    }, [pickupDay]);

    const renderModal = () => {
        let options = TIME_SLOTS;
        if (selectionType === 'pickupDay') {
            options = DAYS;
        } else if (selectionType === 'deliveryDay') {
            options = getValidDeliveryDays(pickupDay);
        }

        const title = selectionType === 'pickupDay' ? 'Select Pickup Day' :
            selectionType === 'pickupTime' ? 'Select Pickup Time' :
                selectionType === 'deliveryDay' ? 'Select Delivery Day' : 'Select Delivery Time';

        return (
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{title}</Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                                        <Ionicons name="close" size={24} color={COLORS.text} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={options}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.optionItem}
                                            onPress={() => handleSelectOption(item)}
                                        >
                                            <Text style={styles.optionText}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    };

    const handleSubscribe = async () => {
        if (!user) {
            console.error('User not logged in');
            return;
        }

        setPaymentStatus('processing');

        try {
            const subscriptionData = {
                type: selectedType,
                amount: selectedType === 'schedule' ? MONTHLY_PRICE : credits * CREDIT_PRICE,
                ...(selectedType === 'schedule' ? {
                    schedule: {
                        pickupDay,
                        pickupTime,
                        deliveryDay,
                        deliveryTime,
                    }
                } : {
                    creditAmount: credits
                })
            };

            await createSubscription(user.uid, subscriptionData);

            // Update local store - Fetch fresh profile to ensure sync or update optimistically carefully
            // The previous logic was adding credits optimistically.
            // If we move to a 'fetch on load' model, we might not need this, but for smooth UI:
            updateSubscription(
                'active',
                selectedType === 'credits' ? credits : 0,
                selectedType,
                selectedType === 'schedule' ? { pickupDay, pickupTime, deliveryDay, deliveryTime } : undefined
            );

            setPaymentStatus('success');

            // Navigate to success screen after a small delay to show processing
            setTimeout(() => {
                (navigation as any).navigate('SubscriptionSuccess', {
                    type: selectedType,
                    amount: subscriptionData.amount,
                    details: selectedType === 'schedule' ? `Monthly Subscription` : `${credits} Credits`
                });
            }, 1000);

        } catch (error) {
            console.error('Subscription failed:', error);
            setPaymentStatus('idle');
            // TODO: Show error alert
        }
    };

    const handleCloseSuccess = () => {
        setPaymentStatus('idle');
        navigation.goBack();
    };

    const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);

    const executeCancellation = async () => {
        try {
            setCancelling(true);
            setConfirmCancelVisible(false); // Close modal immediately or keep open? Better to keeping open? No, close and show loading maybe? 
            // Better UX: Keep modal closed, show cancelling state on the main screen or global loader. 
            // Re-using existing 'cancelling' state for button, but here we are in a modal workflow.
            // Let's set cancelling true, close modal.

            if (user?.uid) {
                await cancelSubscription(user.uid);
                cancelLocalSubscription();
                // Show success feedback - reusing the success modal styles or just a simple alert for now, 
                // but since we want to avoid alerts, maybe just navigate/update UI?
                // The requirements changed to avoiding browser alerts.
                // For success, a simple Toast or just the UI change is enough.
                // But let's stick to a clean UI update. 
            }
        } catch (error) {
            console.error('Cancellation failed', error);
            showAlert({
                title: 'Error',
                message: 'Failed to cancel subscription. Please try again.',
                type: 'error'
            });
        } finally {
            setCancelling(false);
        }
    };

    const handleCancel = () => {
        setConfirmCancelVisible(true);
    };

    const renderConfirmCancelModal = () => (
        <Modal
            visible={confirmCancelVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setConfirmCancelVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: undefined }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Cancel Subscription?</Text>
                        <TouchableOpacity onPress={() => setConfirmCancelVisible(false)}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.optionText, { marginBottom: SPACING.xl, lineHeight: 24 }]}>
                        Are you sure you want to cancel? You will lose access to your premium benefits immediately.
                    </Text>

                    <View style={{ gap: SPACING.md }}>
                        <TouchableOpacity
                            style={[styles.payButton, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border }]}
                            onPress={() => setConfirmCancelVisible(false)}
                        >
                            <Text style={[styles.payButtonText, { color: COLORS.text }]}>Keep Subscription</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.payButton, { backgroundColor: COLORS.error }]}
                            onPress={executeCancellation}
                        >
                            <Text style={styles.payButtonText}>Yes, Cancel It</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderActiveSubscription = () => {
        const isSchedule = user?.subscriptionType === 'schedule';
        const schedule = user?.subscriptionSchedule;

        return (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.illustrationContainer}>
                    <Image
                        source={subscriptionIllustration}
                        style={styles.illustration}
                        contentFit="contain"
                        transition={500}
                    />
                </View>

                <View style={styles.promoBanner}>
                    <Text style={styles.promoTitle}>Your Active Plan</Text>
                    <Text style={{ textAlign: 'center', color: COLORS.primary, marginTop: 4, ...TYPOGRAPHY.body }}>
                        {isSchedule ? 'Monthly Schedule Plan' : 'Credit Balance Plan'}
                    </Text>
                </View>

                {isSchedule && schedule ? (
                    <View style={styles.activePlanCard}>
                        <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Next Pickup</Text>
                        <View style={styles.scheduleRow}>
                            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.scheduleText}>{schedule.pickupDay}</Text>
                            <Ionicons name="time-outline" size={20} color={COLORS.primary} style={{ marginLeft: 16 }} />
                            <Text style={styles.scheduleText}>{schedule.pickupTime}</Text>
                        </View>
                        <View style={styles.divider} />
                        <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Next Delivery</Text>
                        <View style={styles.scheduleRow}>
                            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.scheduleText}>{schedule.deliveryDay}</Text>
                            <Ionicons name="time-outline" size={20} color={COLORS.primary} style={{ marginLeft: 16 }} />
                            <Text style={styles.scheduleText}>{schedule.deliveryTime}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.activePlanCard}>
                        <Text style={[styles.sectionLabel, { textAlign: 'center' }]}>Current Credits</Text>
                        <Text style={styles.creditBigText}>{user?.credits || 0}</Text>
                        <Text style={styles.creditSubText}>credits remaining</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.cancelButton, cancelling && { opacity: 0.7 }]}
                    onPress={handleCancel}
                    disabled={cancelling}
                >
                    <Text style={styles.cancelButtonText}>
                        {cancelling ? 'Processing...' : 'Cancel Subscription'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    const renderRadioButton = (active: boolean) => (
        <View style={[styles.radioButton, active && styles.radioButtonActive]}>
            {active && <View style={styles.radioButtonInner} />}
        </View>
    );

    if (user?.subscriptionStatus === 'active') {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Subscription</Text>
                    <View style={{ width: 40 }} />
                </View>
                {renderActiveSubscription()}
                {renderConfirmCancelModal()}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Laundry Subscription</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.illustrationContainer}>
                    <Image
                        source={subscriptionIllustration}
                        style={styles.illustration}
                        contentFit="contain"
                        transition={500}
                    />
                </View>

                <View style={styles.promoBanner}>
                    <Text style={styles.promoTitle}>Save time with flexible options</Text>
                </View>

                <Text style={styles.sectionLabel}>Choose your subscription plan</Text>

                {/* Option 1: Schedule Pickup/Delivery */}
                <TouchableOpacity
                    style={[
                        styles.planCard,
                        selectedType === 'schedule' && styles.planCardActive
                    ]}
                    onPress={() => setSelectedType('schedule')}
                    activeOpacity={0.9}
                >
                    <View style={styles.planHeader}>
                        <View style={styles.planInfo}>
                            {renderRadioButton(selectedType === 'schedule')}
                            <View style={styles.planTextContent}>
                                <Text style={styles.planTitle}>Schedule Pickup/Delivery</Text>
                                <Text style={styles.planSubtitle}>Set recurring pickup and delivery times</Text>
                            </View>
                        </View>
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceBadgeText}>₹{MONTHLY_PRICE}/month</Text>
                        </View>
                    </View>
                    {selectedType === 'schedule' && (
                        <View style={styles.scheduleForm}>
                            <View style={styles.formSection}>
                                <Text style={styles.formTitle}>Pickup Schedule</Text>
                                <Text style={styles.formLabel}>Pickup Day</Text>
                                <TouchableOpacity style={styles.selectBox} onPress={() => openSelection('pickupDay')}>
                                    <Text style={styles.selectText}>{pickupDay}</Text>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <Text style={styles.formLabel}>Pickup Time</Text>
                                <TouchableOpacity style={styles.selectBox} onPress={() => openSelection('pickupTime')}>
                                    <Text style={styles.selectText}>{pickupTime}</Text>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formTitle}>Delivery Schedule</Text>
                                <Text style={styles.formLabel}>Delivery Day</Text>
                                <TouchableOpacity style={styles.selectBox} onPress={() => openSelection('deliveryDay')}>
                                    <Text style={styles.selectText}>{deliveryDay}</Text>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                                <Text style={styles.formLabel}>Delivery Time</Text>
                                <TouchableOpacity style={styles.selectBox} onPress={() => openSelection('deliveryTime')}>
                                    <Text style={styles.selectText}>{deliveryTime}</Text>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.billSection}>
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Monthly subscription</Text>
                                    <Text style={styles.billValue}>₹{MONTHLY_PRICE}</Text>
                                </View>
                                <View style={[styles.billRow, styles.billTotal]}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>₹{MONTHLY_PRICE}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>


                {/* Option 2: Buy Credits */}
                <TouchableOpacity
                    style={[
                        styles.planCard,
                        selectedType === 'credits' && styles.planCardActive
                    ]}
                    onPress={() => setSelectedType('credits')}
                    activeOpacity={0.9}
                >
                    <View style={styles.planHeader}>
                        <View style={styles.planInfo}>
                            {renderRadioButton(selectedType === 'credits')}
                            <View style={styles.planTextContent}>
                                <Text style={styles.planTitle}>Buy Credits</Text>
                                <Text style={styles.planSubtitle}>Use whenever you need, no expiry within month</Text>
                            </View>
                        </View>
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceBadgeText}>₹{CREDIT_PRICE}/credit</Text>
                        </View>
                    </View>

                    {selectedType === 'credits' && (
                        <View style={styles.creditsForm}>
                            <Text style={styles.creditsLabel}>Select number of credits (1-4 credits)</Text>
                            <View style={styles.counterContainer}>
                                <TouchableOpacity
                                    style={[styles.counterBtn, credits <= 1 && styles.counterBtnDisabled]}
                                    onPress={handleDecrementCredits}
                                    disabled={credits <= 1}
                                >
                                    <Ionicons name="remove" size={24} color={credits <= 1 ? COLORS.textLight : COLORS.text} />
                                </TouchableOpacity>
                                <View style={styles.countInfo}>
                                    <Text style={styles.countText}>{credits}</Text>
                                    <Text style={styles.countSubtext}>Credits</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.counterBtn, styles.counterBtnActive, credits >= 4 && styles.counterBtnDisabled]}
                                    onPress={handleIncrementCredits}
                                    disabled={credits >= 4}
                                >
                                    <Ionicons name="add" size={24} color={credits >= 4 ? COLORS.textLight : COLORS.white} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.totalBox}>
                                <Text style={styles.totalBoxLabel}>Total Amount</Text>
                                <Text style={styles.totalBoxValue}>₹{credits * CREDIT_PRICE}</Text>
                            </View>

                            <Text style={styles.creditsDisclaimer}>
                                Credits expire in 30 days from purchase date and can be used anytime.
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Footer Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
                <TouchableOpacity
                    style={[styles.payButton, paymentStatus === 'processing' && styles.payButtonDisabled]}
                    onPress={handleSubscribe}
                    disabled={paymentStatus !== 'idle'}
                >
                    <Text style={styles.payButtonText}>
                        {paymentStatus === 'processing' ? 'Subscribing...' : 'Subscribe'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Processing Loader Overlay */}
            {paymentStatus === 'processing' && (
                <BrandLoader fullscreen message="Processing subscription..." />
            )}

            {/* Success Modal/Overlay */}
            {paymentStatus === 'success' && (
                <View style={styles.overlay}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconContainer}>
                            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                        </View>
                        <Text style={styles.successTitle}>Subscription Active!</Text>
                        <Text style={styles.successSubtitle}>
                            Your {selectedType === 'schedule' ? 'monthly laundry' : `${credits} laundry credits`} subscription is now active.
                        </Text>
                        <TouchableOpacity style={styles.successDoneBtn} onPress={handleCloseSuccess}>
                            <Text style={styles.successDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Selection Modal */}
            {renderModal()}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.white,
        ...SHADOWS.sm,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 18,
        color: COLORS.text,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 120,
    },
    illustrationContainer: {
        alignItems: 'center',
        marginTop: SPACING.md,
        height: 180, // Reduced height for horizontal look
        width: '100%',
        justifyContent: 'center',
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    promoBanner: {
        backgroundColor: '#FFF0F7',
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    promoTitle: {
        ...TYPOGRAPHY.body,
        fontSize: 18,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    sectionLabel: {
        ...TYPOGRAPHY.body,
        marginBottom: SPACING.md,
        fontWeight: '600',
    },
    planCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    planCardActive: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    planInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    radioButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    radioButtonActive: {
        borderColor: COLORS.primary,
    },
    radioButtonInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },
    planTextContent: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    planTitle: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 16,
        color: COLORS.text,
    },
    planSubtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    priceBadge: {
        backgroundColor: '#FCE7F3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
    },
    priceBadgeText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.primary,
        fontWeight: '700',
    },
    scheduleForm: {
        marginTop: SPACING.xl,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    formSection: {
        marginBottom: SPACING.lg,
    },
    formTitle: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: SPACING.sm,
    },
    formLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        marginTop: SPACING.sm,
    },
    selectBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        backgroundColor: COLORS.backgroundLight,
    },
    selectText: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
    },
    billSection: {
        backgroundColor: COLORS.backgroundLight,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginTop: SPACING.md,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    billLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    billValue: {
        ...TYPOGRAPHY.bodyBold,
    },
    billTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: SPACING.xs,
        marginBottom: 0,
    },
    totalLabel: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 18,
    },
    totalValue: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 18,
        color: COLORS.text,
    },
    creditsForm: {
        marginTop: SPACING.xl,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        alignItems: 'center',
    },
    creditsLabel: {
        ...TYPOGRAPHY.body,
        marginBottom: SPACING.lg,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    counterBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
    },
    counterBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    counterBtnDisabled: {
        opacity: 0.5,
        backgroundColor: COLORS.backgroundLight,
    },
    countInfo: {
        alignItems: 'center',
        marginHorizontal: SPACING.xl,
    },
    countText: {
        ...TYPOGRAPHY.heading,
        color: COLORS.text,
        lineHeight: 32,
    },
    countSubtext: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    totalBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    totalBoxLabel: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 18,
    },
    totalBoxValue: {
        ...TYPOGRAPHY.bodyBold,
        fontSize: 20,
    },
    creditsDisclaimer: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        ...SHADOWS.lg,
    },
    payButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
    },
    payButtonText: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.white,
        fontSize: 18,
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    successCard: {
        backgroundColor: COLORS.white,
        width: '85%',
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    successIconContainer: {
        marginBottom: SPACING.lg,
    },
    successTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: 24,
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    successSubtitle: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginBottom: SPACING.xl,
    },
    successDoneBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        width: '100%',
        alignItems: 'center',
    },
    successDoneText: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.xl,
        maxHeight: '50%',
        ...SHADOWS.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    modalTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: 20,
        color: COLORS.text,
    },
    optionItem: {
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    optionText: {
        ...TYPOGRAPHY.body,
        fontSize: 16,
        color: COLORS.text,
    },
    activePlanCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.primary,
        marginBottom: SPACING.xl,
        ...SHADOWS.md,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    scheduleText: {
        ...TYPOGRAPHY.body,
        marginLeft: SPACING.sm,
        color: COLORS.text,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderLight,
        marginVertical: SPACING.md,
    },
    creditBigText: {
        ...TYPOGRAPHY.heading,
        color: COLORS.primary,
        textAlign: 'center',
        fontSize: 48,
        marginVertical: SPACING.md,
    },
    creditSubText: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        color: COLORS.textSecondary,
    },
    cancelButton: {
        backgroundColor: COLORS.error + '15',
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
    },
    cancelButtonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.error,
    },
});
