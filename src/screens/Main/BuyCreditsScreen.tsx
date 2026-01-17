import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSubscriptionStore, useUIStore } from '../../store';
import { trackPixelEvent } from '../../utils/pixel';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { BrandHeader } from '../../components/BrandHeader';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedButton } from '../../components/AnimatedButton';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

type PlanType = 'single' | 'couple';

const faqs = [
  {
    question: 'How do credits work?',
    answer: 'Each credit can be used to place one laundry order. Simply select a service and use your credits during checkout.',
  },
  {
    question: 'When do credits expire?',
    answer: 'Credits are valid for 30 days from the date of purchase. Use them anytime within this period.',
  },
  {
    question: 'Can I buy more credits later?',
    answer: 'Yes, you can purchase additional credits anytime after your current subscription is used up or expired.',
  },
  {
    question: 'Is ironing included?',
    answer: 'No, ironing is not included in the credit-based service. Credits cover Wash & Fold only.',
  },
];

export const BuyCreditsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { activeSubscription, createSubscription, loading, fetchSubscriptions } = useSubscriptionStore();
  const { showAlert } = useUIStore();

  const [planType, setPlanType] = useState<PlanType>('single');
  const [creditCount, setCreditCount] = useState(2);
  const [purchasing, setPurchasing] = useState(false);

  const pricePerCredit = planType === 'single' ? 399 : 798;
  const kgPerCredit = planType === 'single' ? 7 : 14;
  const totalAmount = creditCount * pricePerCredit;

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

    // Construct WhatsApp Message
    const planName = planType.charAt(0).toUpperCase() + planType.slice(1);
    const message = `Hi Spinzo 👋\nI want to subscribe to the ${planName} plan.\nNumber of credits: ${creditCount}\nTotal amount: ₹${totalAmount}\nPlease share payment details.`;

    // WhatsApp URL (using the provided number 9661802634)
    const phoneNumber = '917676878832';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    const webWhatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    try {
      if (Platform.OS === 'web') {
        window.open(webWhatsappUrl, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          // Fallback for mobile if app not installed (rare but possible) or simulator
          await Linking.openURL(webWhatsappUrl);
        }
      }

      // Optional: Track 'Lead' or 'Contact' event instead of 'Subscribe' since purchase isn't complete?
      // Keeping 'Subscribe' might be misleading if they don't pay. 
      // User said "We want to see if the user is genuinely interested". 
      // Let's track it as 'InitiateCheckout' or keep existing 'Subscribe' but maybe rename? 
      // I'll stick to not tracking 'Subscribe' here because it's not a confirmed purchase yet. 
      // Maybe track 'Lead'?
      trackPixelEvent('Lead', {
        value: totalAmount,
        currency: 'INR',
        content_name: `${planName} Plan Subscription Request`
      });

    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      showAlert({
        title: 'Error',
        message: 'Could not open WhatsApp. Please contact support manually.',
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
        {/* Plan Type Selection */}
        <GlassCard intensity="low" style={styles.planTypeCard}>
          <Text style={styles.sectionLabel}>Select Plan Type</Text>
          <View style={styles.tabsContainer}>
            <AnimatedButton
              style={[
                styles.tab,
                planType === 'single' ? styles.tabActive : {}
              ]}
              onPress={() => setPlanType('single')}
            >
              <Text
                style={[
                  styles.tabText,
                  planType === 'single' ? styles.tabTextActive : {}
                ]}
              >
                Single
              </Text>
            </AnimatedButton>
            <AnimatedButton
              style={[
                styles.tab,
                planType === 'couple' ? styles.tabActive : {}
              ]}
              onPress={() => setPlanType('couple')}
            >
              <Text
                style={[
                  styles.tabText,
                  planType === 'couple' ? styles.tabTextActive : {}
                ]}
              >
                Couple
              </Text>
            </AnimatedButton>
          </View>
        </GlassCard>

        {/* Plan Display Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 400 }}
        >
          <LinearGradient
            colors={['#F5F3FF', '#FFFFFF']}
            style={styles.planDisplayCard}
          >
            <View style={styles.planIconContainer}>
              <Ionicons name="card" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>
                {planType.charAt(0).toUpperCase() + planType.slice(1)} Plan
              </Text>
              <Text style={styles.planSubtitle}>
                {kgPerCredit} kg per credit • Valid 30 days
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Credit Counter Card */}
        <GlassCard intensity="medium" style={styles.creditCounterCard}>
          <Text style={styles.sectionLabel}>
            Select number of credits (2-4 credits)
          </Text>
          <View style={styles.counterContainer}>
            <AnimatedButton
              style={[
                styles.counterButton,
                creditCount <= 2 ? styles.counterButtonDisabled : {},
              ]}
              onPress={() => setCreditCount(Math.max(2, creditCount - 1))}
              disabled={creditCount <= 2}
            >
              <Ionicons
                name="remove"
                size={20}
                color={creditCount <= 2 ? COLORS.textSecondary : COLORS.primary}
              />
            </AnimatedButton>
            <View style={styles.counterDisplay}>
              <Text style={styles.counterValue}>{creditCount}</Text>
              <Text style={styles.counterLabel}>Credits</Text>
            </View>
            <AnimatedButton
              style={[
                styles.counterButton,
                styles.counterButtonPrimary,
                creditCount >= 4 ? styles.counterButtonDisabled : {},
              ]}
              onPress={() => setCreditCount(Math.min(4, creditCount + 1))}
              disabled={creditCount >= 4}
            >
              <Ionicons
                name="add"
                size={20}
                color={creditCount >= 4 ? COLORS.textSecondary : '#FFFFFF'}
              />
            </AnimatedButton>
          </View>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price per credit</Text>
              <Text style={styles.priceValue}>₹{pricePerCredit}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceRowTotal]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount}</Text>
            </View>
          </View>

          <Text style={styles.expiryNote}>
            Credits expire in 30 days from purchase date.
          </Text>
        </GlassCard>

        {/* Included / Not Included */}
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
                  • Wash & Fold up to {kgPerCredit} kg
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
                <Text style={styles.includedItem}>• Ironing</Text>
                <Text style={styles.includedItem}>• Dry cleaning</Text>
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
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.purchaseButtonText}>
                {activeSubscription
                  ? 'Active Subscription Exists'
                  : `Request via WhatsApp • ₹${totalAmount}`}
              </Text>
            </>
          )}
        </AnimatedButton>
      </View>
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
    paddingBottom: SPACING.xl * 3,
  },
  planTypeCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginVertical: SPACING.md,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  counterButtonDisabled: {
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.backgroundLight,
    opacity: 0.5,
  },
  counterDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  counterValue: {
    ...TYPOGRAPHY.display,
    color: COLORS.text,
    fontSize: 28,
  },
  counterLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
});

