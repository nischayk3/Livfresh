import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore } from '../../store';
import { getOrder } from '../../services/firestore';
import { BrandLoader } from '../../components/BrandLoader';

// Order Status Steps
const ORDER_STEPS = [
    { key: 'placed', label: 'Order Info Received', icon: 'clipboard-outline' },
    { key: 'pickup_assigned', label: 'Pickup Partner Assigned', icon: 'bicycle-outline' },
    { key: 'reached_store', label: 'Reached Store', icon: 'storefront-outline' },
    { key: 'in_progress', label: 'Washing / Ironing', icon: 'water-outline' },
    { key: 'out_for_delivery', label: 'Scheduled for Delivery', icon: 'rocket-outline' },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-circle-outline' },
];

export const OrderDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { orderId } = route.params as { orderId: string };

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!user?.uid || !orderId) return;
            try {
                const data = await getOrder(user.uid, orderId);
                setOrder(data);
            } catch (error) {
                console.error('Failed to fetch order details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [orderId]);

    if (loading) {
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
                                {item.serviceName} ({item.serviceType === 'wash_fold' ? `${item.weight}kg` : `${item.shoeQuantity} pairs`})
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
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Platform Fee</Text>
                        <Text style={styles.billValue}>₹{order.billDetails?.platformFee}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>GST</Text>
                        <Text style={styles.billValue}>₹{order.billDetails?.gst}</Text>
                    </View>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        ...(Platform.OS === 'web' ? {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        } : {}),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
});
