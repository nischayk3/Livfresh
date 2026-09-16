import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/functions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSubscriptionStore, useUIStore } from '../../store';
import { trackPixelEvent } from '../../utils/pixel';
import { openRazorpay } from '../../utils/payment_helper';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { BrandHeader } from '../../components/BrandHeader';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedButton } from '../../components/AnimatedButton';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import AnalyticsService from '../../services/analytics';
import {
  ServiceType,
  CreditWeight,
  computePrice,
  RATE_TABLE,
  NORMAL_RATE,
  CREDIT_OPTIONS,
  serviceTypeLabel,
} from '../../utils/creditPricing';

const faqs = [
  {
    question: 'How do credits work?',
    answer: 'Each credit covers one laundry order up to the pack weight (7kg or 14kg). Buy a pack of 2, 3, or 4 credits and enjoy a lower rate per kilogram on every order.',
  },
  {
    question: 'When do credits expire?',
    answer: 'Credits are valid for 30 days from the date of purchase. Use them anytime within this period.',
  },
  {
    question: 'Can I choose between Wash & Fold and Wash & Iron?',
    answer: 'Yes. Pick the service when you buy your pack. A pack is tied to one service so you always get its best rate.',
  },
  {
    question: 'How am I saving money?',
    answer: 'The more credits you buy, the lower the rate per kg. Plus credits are always cheaper than paying per order at the cash counter.',
  },
];

// Service cards show which rate applies and what each covers.
const SERVICE_CARDS: {
  id: ServiceType;
  icon: 'shirt' | 'basket';
  tagline: string;
}[] = [
  { id: 'wash_fold', icon: 'basket', tagline: 'Wash, dry & neatly fold. Pickup + delivery included.' },
  { id: 'wash_iron', icon: 'shirt', tagline: 'Wash, dry & perfectly ironed. Pickup + delivery included.' },
];

export const BuyCreditsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { activeSubscription, createSubscription, loading, fetchSubscriptions } = useSubscriptionStore();
  const { showAlert } = useUIStore();

  const [serviceType, setServiceType] = useState<ServiceType>('wash_fold');
  const [kgPerCredit, setKgPerCredit] = useState<CreditWeight>(7);
  const [creditCount, setCreditCount] = useState(3);
  const [purchasing, setPurchasing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Derived pricing from the shared helper.
  const pricing = computePrice(serviceType, kgPerCredit, creditCount);
  const { ratePerKg, pricePerCredit, totalAmount, savingsVsNormal, savingsPercent } = pricing;
  // Legacy planType still feeds the subscription doc ('single' = 7kg, 'couple' = 14kg).
  const planType = kgPerCredit === 7 ? 'single' as const : 'couple' as const;

  // Helper to load Razorpay script for Web
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
    });
  };

  React.useEffect(() => {
    AnalyticsService.logEvent('view_item', {
      item_id: 'credits_screen',
      item_name: 'Buy Credits Screen',
      item_category: 'Subscription'
    });
  }, []);


  const handlePurchase = async () => {
    if (!user?.uid) {
      showAlert({
        title: 'Error',
        message: 'Please login to purchase credits',
        type: 'error',
      });
      return;
    }

    if (activeSubscription) {
      showAlert({
        title: 'Active Subscription',
        message: 'You already have an active subscription. Please use your existing credits first.',
        type: 'warning',
      });
      return;
    }

    try {
      setPurchasing(true);

      AnalyticsService.logEvent('begin_checkout_credits', {
        value: totalAmount,
        currency: 'INR',
        items: [{
          item_id: `subscription_${serviceType}_${kgPerCredit}_${creditCount}`,
          item_name: `${serviceTypeLabel(serviceType)} ${kgPerCredit}kg - ${creditCount} Credits`,
          price: totalAmount
        }]
      });

      // 1. Create Order on Backend
      const order = await createRazorpayOrder(totalAmount * 100); // Amount in paise

      const options: any = {
        description: `${serviceTypeLabel(serviceType)} ${kgPerCredit}kg - ${creditCount} Credits`,
        image: 'https://i.imgur.com/3g7nmJC.png', // Or your app logo URL
        currency: order.currency,
        key: order.keyId,
        amount: order.amount,
        name: 'SpinZo',
        order_id: order.orderId,
        prefill: {
          email: user.email || '',
          contact: user.phone || '',
          name: user.name || ''
        },
        theme: { color: COLORS.primary }
      };

      const handleSuccess = async (data: any) => {
        try {
          setPurchasing(false); // Close Razorpay loading
          setVerifying(true);   // Start App verification loading

          await verifyRazorpayPayment({
            orderId: data.razorpay_order_id,
            paymentId: data.razorpay_payment_id,
            signature: data.razorpay_signature,
            planDetails: {
              type: 'credits',
              credits: creditCount,
              serviceType: serviceType,
              kgPerCredit: kgPerCredit,
            }
          });

          // Track Purchase Event
          await trackPixelEvent('Purchase', {
            value: totalAmount,
            currency: 'INR',
            content_ids: [`subscription_${serviceType}_${kgPerCredit}_${creditCount}`],
            content_type: 'product',
            service_type: serviceType,
            kg_per_credit: kgPerCredit,
            credits: creditCount
          });

          AnalyticsService.logEvent('purchase', {
            transaction_id: data.razorpay_payment_id,
            value: totalAmount,
            currency: 'INR',
            items: [{
              item_id: `subscription_${serviceType}_${kgPerCredit}_${creditCount}`,
              item_name: `${serviceTypeLabel(serviceType)} ${kgPerCredit}kg - ${creditCount} Credits`,
              price: totalAmount,
              quantity: 1
            }],
            service_type: serviceType,
            kg_per_credit: kgPerCredit,
            credits: creditCount
          });

          // Poll for subscription update to ensure consistency
          // Sometimes Firestore takes a split second to propagate even after write confirmation
          let retries = 3;
          while (retries > 0) {
            await fetchSubscriptions(user.uid);
            const { activeSubscription } = useSubscriptionStore.getState();
            if (activeSubscription && activeSubscription.status === 'active') {
              break;
            }
            await new Promise(r => setTimeout(r, 1000));
            retries--;
          }

          setVerifying(false);

          showAlert({
            title: 'Payment Successful!',
            message: `${creditCount} Credits have been added to your wallet.`,
            type: 'success'
          });

          navigation.goBack();

        } catch (verifyError) {
          console.error("Verification Error: ", verifyError);
          setVerifying(false);
          showAlert({
            title: 'Verification Failed',
            message: 'Payment successful but verification failed locally. Please contact support with Order ID: ' + order.orderId,
            type: 'error'
          });
        }
      };

      const handleFailure = (error: any) => {
        console.log("Payment Error: ", error);
        setPurchasing(false);
        showAlert({
          title: 'Payment Failed',
          message: error.description || 'Payment was cancelled or failed.',
          type: 'error'
        });
      };

      const { openRazorpay } = await import('../../utils/payment_helper');

      if (Platform.OS === 'web') {
        const res = await loadRazorpayScript();
        if (!res) {
          showAlert({ title: 'Error', message: 'Razorpay SDK failed to load', type: 'error' });
          setPurchasing(false);
          return;
        }
      }

      openRazorpay(options)
        .then((data: any) => handleSuccess(data))
        .catch((error: any) => handleFailure(error));

    } catch (error) {
      console.error("Error initiating purchase:", error);
      setPurchasing(false);
      showAlert({
        title: 'Error',
        message: 'Could not initiate purchase. Please try again.',
        type: 'error'
      });
    }
  };

  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

  const toggleFaq = (index: number) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFaqs(newExpanded);
  };

  const renderFaqItem = (item: typeof faqs[0], index: number) => {
    const isExpanded = expandedFaqs.has(index);

    return (
      <View key={index} style={styles.faqItem}>
        <TouchableOpacity
          style={styles.faqHeader}
          onPress={() => toggleFaq(index)}
          activeOpacity={0.7}
        >
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.faqContent}>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BrandHeader title="Buy Credits" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── SERVICE SELECTOR ── */}
        <Text style={styles.sectionLabel}>Select Service</Text>
        <View style={styles.serviceSelectorRow}>
          {SERVICE_CARDS.map((svc) => {
            const isSelected = serviceType === svc.id;
            const perKg = `${RATE_TABLE[svc.id][3]}/kg`;
            return (
              <TouchableOpacity
                key={svc.id}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                onPress={() => { setServiceType(svc.id); setCreditCount(3); }}
                activeOpacity={0.85}
              >
                <View style={[styles.serviceCardIcon, isSelected && styles.serviceCardIconSelected]}>
                  <Ionicons
                    name={svc.icon === 'basket' ? 'basket-outline' : 'shirt-outline'}
                    size={26}
                    color={isSelected ? '#FFF' : COLORS.primary}
                  />
                </View>
                <Text style={[styles.serviceCardTitle, isSelected && styles.serviceCardTitleSelected]}>
                  {svc.id === 'wash_fold' ? 'Wash & Fold' : 'Wash & Iron'}
                </Text>
                <Text style={[styles.serviceCardTagline, isSelected && { color: '#FFFFFFCC' }]}>
                  {svc.tagline}
                </Text>
                <View style={[styles.serviceCardRateBadge, isSelected && { backgroundColor: '#FFFFFF22' }]}>
                  <Text style={[styles.serviceCardRateText, isSelected && { color: '#FFF' }]}>
                    From {perKg}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── WEIGHT SELECTOR ── */}
        <Text style={styles.sectionLabel}>Weight per Credit</Text>
        <View style={styles.weightRow}>
          <TouchableOpacity
            style={[styles.weightOption, kgPerCredit === 7 && styles.weightOptionActive]}
            onPress={() => setKgPerCredit(7)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="barbell-outline"
              size={18}
              color={kgPerCredit === 7 ? '#FFF' : COLORS.textSecondary}
            />
            <Text style={[styles.weightText, kgPerCredit === 7 && styles.weightTextActive]}>
              7 kg
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.weightOption, kgPerCredit === 14 && styles.weightOptionActive]}
            onPress={() => setKgPerCredit(14)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="barbell-outline"
              size={18}
              color={kgPerCredit === 14 ? '#FFF' : COLORS.textSecondary}
            />
            <Text style={[styles.weightText, kgPerCredit === 14 && styles.weightTextActive]}>
              14 kg
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── CREDIT COUNT + SAVINGS ── */}
        <Text style={styles.sectionLabel}>How Many Credits?</Text>
        <GlassCard intensity="medium" style={styles.creditCounterCard}>
          <View style={styles.counterContainer}>
            {CREDIT_OPTIONS.map((num) => {
              const p = computePrice(serviceType, kgPerCredit, num);
              const isSelected = creditCount === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[styles.creditPill, isSelected && styles.creditPillSelected]}
                  onPress={() => setCreditCount(num)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.creditPillCount, isSelected && styles.creditPillCountSelected]}>
                    {num}
                  </Text>
                  <Text style={[styles.creditPillLabel, isSelected && { color: '#FFFFFFCC' }]}>
                    Credits
                  </Text>
                  <Text style={[styles.creditPillRate, isSelected && styles.creditPillRateSelected]}>
                    ₹{p.ratePerKg}/kg
                  </Text>
                  <Text style={[styles.creditPillPrice, isSelected && styles.creditPillPriceSelected]}>
                    ₹{p.totalAmount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Savings callout */}
          {savingsVsNormal > 0 && (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.savingsCallout}
            >
              <View style={styles.savingsIconWrap}>
                <Ionicons name="leaf" size={18} color="#059669" />
              </View>
              <View style={styles.savingsTextWrap}>
                <Text style={styles.savingsTitle}>
                  Save ₹{savingsVsNormal.toLocaleString()} ({savingsPercent}% vs pay-per-order)
                </Text>
                <Text style={styles.savingsSub}>
                  Normal rate ₹{NORMAL_RATE[serviceType]}/kg — you pay ₹{ratePerKg}/kg with this pack
                </Text>
              </View>
            </MotiView>
          )}

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Rate per kg</Text>
              <Text style={styles.priceValue}>₹{ratePerKg}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Per credit ({kgPerCredit} kg)</Text>
              <Text style={styles.priceValue}>₹{pricePerCredit.toLocaleString()}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceRowTotal]}>
              <Text style={styles.totalLabel}>Total for {creditCount} credits</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toLocaleString()}</Text>
            </View>
          </View>

          <Text style={styles.expiryNote}>
            Credits expire in 30 days from purchase date.
          </Text>
        </GlassCard>

        {/* ── INCLUDED / NOT INCLUDED ── */}
        <View style={styles.includedSection}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          <View style={styles.includedGrid}>
            <View style={styles.includedCard}>
              <View style={styles.includedHeader}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={styles.includedTitle}>Included</Text>
              </View>
              <View style={styles.includedList}>
                <Text style={styles.includedItem}>
                  • {serviceType === 'wash_fold' ? 'Wash & Fold' : 'Wash & Iron'} up to {kgPerCredit} kg
                </Text>
                <Text style={styles.includedItem}>• Pickup included</Text>
                <Text style={styles.includedItem}>• Delivery included</Text>
              </View>
            </View>
            <View style={styles.includedCard}>
              <View style={styles.includedHeader}>
                <Text style={styles.notIncludedIcon}>✕</Text>
                <Text style={styles.includedTitle}>Not Included</Text>
              </View>
              <View style={styles.includedList}>
                <Text style={styles.includedItem}>• Dry cleaning</Text>
                <Text style={styles.includedItem}>• Stain removal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>FAQs</Text>
          {faqs.map((item, index) => renderFaqItem(item, index))}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + SPACING.md }]}>
        <AnimatedButton
          style={[
            styles.purchaseButton,
            (loading || purchasing || !!activeSubscription) ? styles.purchaseButtonDisabled : {}
          ]}
          onPress={handlePurchase}
          disabled={loading || purchasing || !!activeSubscription}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="card-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.purchaseButtonText}>
                {activeSubscription
                  ? 'Active Subscription Exists'
                  : `Pay ₹${totalAmount.toLocaleString()}`}
              </Text>
            </>
          )}
        </AnimatedButton>
      </View>

      {/* Loading Overlay */}
      {verifying && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <GlassCard intensity="high" style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Verifying Payment...</Text>
            <Text style={styles.loadingSubText}>Please do not close the app</Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 140, // enough to clear fixed bottom CTA + safe area
  },
  serviceSelectorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  serviceCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  serviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  serviceCardIconSelected: {
    backgroundColor: '#FFFFFF22',
  },
  serviceCardTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 15,
  },
  serviceCardTitleSelected: {
    color: '#FFFFFF',
  },
  serviceCardTagline: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    minHeight: 30,
    marginTop: 2,
  },
  serviceCardRateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  serviceCardRateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  weightRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  weightOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  weightOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  weightText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  weightTextActive: {
    color: '#FFFFFF',
  },
  sectionLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.md,
    padding: 2,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  planDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  planIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textTransform: 'capitalize',
  },
  planSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  creditCounterCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  creditPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  creditPillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  creditPillCount: {
    ...TYPOGRAPHY.display,
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
  },
  creditPillCountSelected: {
    color: '#FFFFFF',
  },
  creditPillLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  creditPillRate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  creditPillRateSelected: {
    color: '#FFFFFF',
  },
  creditPillPrice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  creditPillPriceSelected: {
    color: '#FFFFFF',
  },
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  savingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsTextWrap: {
    flex: 1,
  },
  savingsTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: '#059669',
    fontSize: 14,
  },
  savingsSub: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    fontSize: 11,
    marginTop: 2,
  },
  priceBreakdown: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  priceRowTotal: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  priceLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  totalLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  totalValue: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.primary,
    fontWeight: '700',
  },
  expiryNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontSize: 11,
  },
  includedSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  includedGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  includedCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  includedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  includedTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 12,
  },
  notIncludedIcon: {
    fontSize: 16,
    color: COLORS.error,
  },
  includedList: {
    gap: SPACING.xs,
  },
  includedItem: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  faqSection: {
    marginBottom: SPACING.md,
  },
  faqItem: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  faqQuestion: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
    marginRight: SPACING.sm,
  },
  faqContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  faqAnswer: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomCTA: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    ...SHADOWS.lg,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  loadingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    padding: SPACING.xl,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.xl,
    minWidth: 200,
  },
  loadingText: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '600',
  },
  loadingSubText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});

