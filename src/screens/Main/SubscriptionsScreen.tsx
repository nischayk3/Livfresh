import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSubscriptionStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { FaqAccordion } from '../../components/FaqAccordion';
import { UseCreditModal } from '../../components/UseCreditModal';
import { BrandHeader } from '../../components/BrandHeader';

const SUBSCRIPTION_FAQS = [
  { question: "How do credits work?", answer: "Each credit can be used to place one laundry order. Simply select a service and use your credits during checkout." },
  { question: "When do credits expire?", answer: "Credits are valid for 30 days from the date of purchase. Use them anytime within this period." },
  { question: "Can I buy more credits later?", answer: "Yes, you can purchase additional credits anytime after your current subscription is used up or expired." },
  { question: "Is ironing included?", answer: "No, ironing is not included in the credit-based service. Credits cover Wash & Fold only." },
];

export const SubscriptionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    activeSubscription,
    pastSubscriptions,
    creditUsage,
    loading,
    isCreditUnlocked,
    isCreditUsed,
    fetchSubscriptions,
  } = useSubscriptionStore();

  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchSubscriptions(user.uid);
    }
  }, [user?.uid, fetchSubscriptions]);

  // Refresh subscriptions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        fetchSubscriptions(user.uid);
      }
    }, [user?.uid, fetchSubscriptions])
  );

  const getCreditStatus = (index: number): 'used' | 'current' | 'locked' => {
    if (isCreditUsed(index)) return 'used';
    if (isCreditUnlocked(index)) return 'current';
    return 'locked';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysLeft = (expiresAt: any) => {
    if (!expiresAt) return 0;
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const renderCreditProgress = () => {
    if (!activeSubscription) return null;

    return (
      <View style={styles.creditProgressContainer}>
        {Array.from({ length: activeSubscription.totalCredits }).map((_, index) => {
          const status = getCreditStatus(index);
          return (
            <View
              key={index}
              style={[
                styles.creditCircle,
                status === 'used' && styles.creditCircleUsed,
                status === 'current' && styles.creditCircleCurrent,
                status === 'locked' && styles.creditCircleLocked,
              ]}
            >
              {status === 'used' ? (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              ) : status === 'current' ? (
                <Text style={styles.creditNumber}>{index + 1}</Text>
              ) : (
                <Ionicons name="lock-closed" size={16} color={COLORS.textSecondary} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderActiveSubscription = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (!activeSubscription) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="card-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Active Subscription</Text>
          <Text style={styles.emptySubtitle}>
            Buy credits to enjoy convenient laundry service with savings
          </Text>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => (navigation as any).navigate('BuyCredits')}
          >
            <Text style={styles.buyButtonText}>Buy Credits</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const daysLeft = getDaysLeft(activeSubscription.expiresAt);

    return (
      <View style={styles.content}>
        {/* Plan Card */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>
                  {activeSubscription.planType.toUpperCase()} PLAN
                </Text>
              </View>
              <Text style={styles.planTitle}>
                {activeSubscription.totalCredits} Credits Pack
              </Text>
              <Text style={styles.planSubtitle}>
                {activeSubscription.kgPerCredit} kg per credit
              </Text>
            </View>
            <View style={styles.planMeta}>
              <View style={styles.daysLeftContainer}>
                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.daysLeftText}>{daysLeft} days left</Text>
              </View>
              <Text style={styles.expiryText}>
                Expires {formatDate(activeSubscription.expiresAt)}
              </Text>
            </View>
          </View>

          {/* Credit Progress */}
          {renderCreditProgress()}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeSubscription.totalCredits}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {activeSubscription.creditsUsed}
              </Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeSubscription.creditsRemaining}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        {/* Use Credit Button */}
        {activeSubscription.creditsRemaining > 0 && (
          <TouchableOpacity
            style={styles.useCreditButton}
            onPress={() => setShowCreditModal(true)}
          >
            <Ionicons name="bag-outline" size={20} color="#FFFFFF" />
            <Text style={styles.useCreditButtonText}>Use Credit</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Buy More Credits Button */}
        {/* <TouchableOpacity
          style={styles.buyMoreButton}
          onPress={() => (navigation as any).navigate('BuyCredits')}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.buyMoreButtonText}>Buy More Credits</Text>
        </TouchableOpacity> */}

        {/* Included / Not Included */}
        <View style={styles.includedGrid}>
          <View style={styles.includedCard}>
            <View style={styles.includedHeader}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
              <Text style={styles.includedTitle}>Included</Text>
            </View>
            <View style={styles.includedList}>
              <Text style={styles.includedItem}>
                • Wash & Fold up to {activeSubscription.kgPerCredit} kg
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

        {/* FAQs */}
        <View style={{ marginTop: SPACING.lg }}>
          <Text style={[styles.headerTitle, { fontSize: 16, marginBottom: SPACING.md }]}>FAQs</Text>
          <FaqAccordion items={SUBSCRIPTION_FAQS} />
        </View>
      </View>
    );
  };

  const renderPastSubscriptions = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (pastSubscriptions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="time-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Past Subscriptions</Text>
          <Text style={styles.emptySubtitle}>
            Your completed subscriptions will appear here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {pastSubscriptions.map((sub) => (
          <View key={sub.id} style={styles.pastCard}>
            <View style={styles.pastHeader}>
              <View style={styles.pastBadge}>
                <Text style={styles.pastBadgeText}>{sub.planType.toUpperCase()}</Text>
              </View>
              <Text style={[
                styles.pastStatus,
                sub.status === 'completed' ? styles.pastStatusCompleted : styles.pastStatusExpired
              ]}>
                {sub.status === 'completed' ? 'Completed' : 'Expired'}
              </Text>
            </View>
            <View style={styles.pastBody}>
              <View>
                <Text style={styles.pastTitle}>{sub.totalCredits} Credits Pack</Text>
                <Text style={styles.pastSubtitle}>
                  {sub.creditsUsed}/{sub.totalCredits} used • {formatDate(sub.purchasedAt)}
                </Text>
              </View>
              <Text style={styles.pastAmount}>₹{sub.totalAmount}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BrandHeader title="Subscriptions" />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active Subscription
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'active' ? renderActiveSubscription() : renderPastSubscriptions()}
      </ScrollView>

      {activeSubscription && (
        <UseCreditModal
          visible={showCreditModal}
          onClose={() => setShowCreditModal(false)}
          subscription={activeSubscription}
        />
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  buyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  buyButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
  },
  content: {
    gap: SPACING.md,
  },
  planCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  planInfo: {
    flex: 1,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  planBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  planTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  planSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  planMeta: {
    alignItems: 'flex-end',
  },
  daysLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  daysLeftText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  expiryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  creditProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.lg,
  },
  creditCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  creditCircleUsed: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  creditCircleCurrent: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  creditCircleLocked: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.borderLight,
  },
  creditNumber: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.display,
    color: COLORS.text,
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  useCreditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  useCreditButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  includedGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
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
  pastCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  pastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  pastBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  pastBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 10,
  },
  pastStatus: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  pastStatusCompleted: {
    color: COLORS.primary,
  },
  pastStatusExpired: {
    color: COLORS.error,
  },
  pastBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  pastSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  pastAmount: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  buyMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  buyMoreButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    fontSize: 15,
  },
});

