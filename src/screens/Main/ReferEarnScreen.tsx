import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Wallet,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useAuthStore, useUIStore } from '../../store';
import {
  getUserReferralStats,
  claimReferralCode,
  ReferralStats,
  REFERRAL_CONSTANTS,
} from '../../services/referralService';
import { COLORS, TYPOGRAPHY, SHADOWS, SPACING, RADIUS } from '../../utils/constants';

export const ReferEarnScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { showAlert } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    friendsInvited: 0,
    ordersCompleted: 0,
    totalEarned: 0,
    myReferralCode: user?.referralCode || '',
    referrals: [],
  });

  // Claim section state (if user hasn't claimed a referral yet)
  const [claimInput, setClaimInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const isReferred = Boolean(user?.referredBy || user?.referredByCode);

  useEffect(() => {
    if (!user?.uid) return;
    loadStats();
  }, [user?.uid]);

  const loadStats = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getUserReferralStats(user.uid);
      setStats(data);
    } catch (err) {
      console.error('Failed to load referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const referralCode = stats.myReferralCode || user?.referralCode || 'SPINZO';

  const shareMessage = `Hey! Get ₹${REFERRAL_CONSTANTS.DISCOUNT_AMOUNT} OFF on your first laundry & dry cleaning with SpinZo. Fast pickup, fabric care & free doorstep delivery! Use my code: *${referralCode}* or download the app: https://spinzo.in 🧺✨`;

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      showAlert({
        title: 'Code Copied!',
        message: `Referral code "${referralCode}" copied to clipboard. Share it with your friends!`,
        type: 'success',
      });
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await handleSystemShare();
      }
    } catch {
      await handleSystemShare();
    }
  };

  const handleSystemShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: 'SpinZo Referral Code',
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleClaimCode = async () => {
    const code = claimInput.trim().toUpperCase();
    if (!code) {
      showAlert({ title: 'Enter Code', message: 'Please enter a valid referral code.', type: 'warning' });
      return;
    }
    if (!user?.uid) {
      showAlert({ title: 'Sign In Required', message: 'Please sign in to claim a referral code.', type: 'info' });
      return;
    }

    setClaiming(true);
    try {
      const result = await claimReferralCode(code, user.uid, user.name, user.phone);
      if (result.success) {
        // Update local auth store
        useAuthStore.getState().setUser({
          ...user,
          referredBy: result.referrerUid,
          referredByCode: code,
        } as any);
        setClaimInput('');
        showAlert({
          title: 'Referral Claimed! 🎉',
          message: `You've unlocked ₹${result.discount} OFF on your first order (min cart ₹${result.minOrderValue}).`,
          type: 'success',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Cannot Claim Code',
        message: err.message || 'Failed to claim referral code.',
        type: 'error',
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Banner ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350 }}
          style={styles.heroBannerContainer}
        >
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Ambient Background Circles */}
            <View style={[styles.glowCircle, styles.glow1]} />
            <View style={[styles.glowCircle, styles.glow2]} />

            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Sparkles size={12} color="#FDE047" />
                <Text style={styles.heroBadgeText}>SPINZO REWARDS</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Give ₹200, Get ₹200</Text>
            <Text style={styles.heroSubtitle}>
              Invite friends & neighbors to SpinZo. They get ₹{REFERRAL_CONSTANTS.DISCOUNT_AMOUNT} OFF on their first order, and you get ₹{REFERRAL_CONSTANTS.REFERRER_REWARD} when their order is delivered!
            </Text>
          </LinearGradient>
        </MotiView>

        {/* ─── Referral Code Card ─── */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 100, type: 'timing', duration: 350 }}
          style={styles.codeCard}
        >
          <Text style={styles.codeCardLabel}>YOUR UNIQUE REFERRAL CODE</Text>

          <TouchableOpacity
            style={styles.codeBox}
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <Text style={styles.codeText}>{referralCode}</Text>
            <View style={styles.copyPill}>
              {copied ? (
                <>
                  <Check size={14} color="#059669" strokeWidth={2.5} />
                  <Text style={styles.copiedText}>COPIED</Text>
                </>
              ) : (
                <>
                  <Copy size={14} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.copyText}>TAP TO COPY</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Action Buttons: WhatsApp & System Share */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.whatsAppButton}
              onPress={handleShareWhatsApp}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsAppIconText}>💬</Text>
              <Text style={styles.whatsAppButtonText}>Share on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareIconButton}
              onPress={handleSystemShare}
              activeOpacity={0.8}
            >
              <Share2 size={20} color="#7C3AED" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* ─── Claim Section (If new user & hasn't claimed yet) ─── */}
        {!isReferred && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 150, type: 'timing', duration: 300 }}
            style={styles.claimCard}
          >
            <View style={styles.claimHeaderRow}>
              <Gift size={18} color="#7C3AED" strokeWidth={2} />
              <Text style={styles.claimTitle}>Have a friend's referral code?</Text>
            </View>
            <Text style={styles.claimSub}>
              Enter it below before placing your first order to claim flat ₹200 OFF!
            </Text>

            <View style={styles.claimInputRow}>
              <TextInput
                style={styles.claimInput}
                placeholder="ENTER REFERRAL CODE"
                placeholderTextColor="#94A3B8"
                value={claimInput}
                onChangeText={(t) => setClaimInput(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                editable={!claiming}
              />
              <TouchableOpacity
                style={[
                  styles.claimButton,
                  (!claimInput.trim() || claiming) && styles.claimButtonDisabled,
                ]}
                onPress={handleClaimCode}
                disabled={!claimInput.trim() || claiming}
                activeOpacity={0.8}
              >
                {claiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.claimButtonText}>CLAIM</Text>
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        )}

        {/* ─── How It Works (3 Steps) ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, type: 'timing', duration: 350 }}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionHeaderTitle}>How It Works</Text>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Share your referral code</Text>
              <Text style={styles.stepDesc}>
                Send your link or code to friends, family, and society groups.
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Friend gets ₹200 OFF</Text>
              <Text style={styles.stepDesc}>
                They apply your code and instantly save ₹200 on orders above ₹700.
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>You get ₹200 voucher</Text>
              <Text style={styles.stepDesc}>
                Once their first order is delivered, a ₹200 reward coupon is sent to you!
              </Text>
            </View>
          </View>
        </MotiView>

        {/* ─── Live Referral Stats ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 250, type: 'timing', duration: 350 }}
          style={styles.statsCard}
        >
          <Text style={styles.sectionHeaderTitle}>Your Referral Dashboard</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Users size={18} color="#7C3AED" />
              </View>
              <Text style={styles.metricValue}>{stats.friendsInvited}</Text>
              <Text style={styles.metricLabel}>Friends Invited</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle2 size={18} color="#059669" />
              </View>
              <Text style={styles.metricValue}>{stats.ordersCompleted}</Text>
              <Text style={styles.metricLabel}>Orders Done</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Wallet size={18} color="#D97706" />
              </View>
              <Text style={styles.metricValue}>₹{stats.totalEarned}</Text>
              <Text style={styles.metricLabel}>Total Earned</Text>
            </View>
          </View>

          {/* Invited Friends List */}
          {stats.referrals.length > 0 ? (
            <View style={styles.referralsList}>
              <Text style={styles.referralListHeader}>Recent Invites</Text>
              {stats.referrals.map((item, idx) => (
                <View key={idx} style={styles.referralListItem}>
                  <View style={styles.referralListInfo}>
                    <Text style={styles.referralListName}>{item.name}</Text>
                    <Text style={styles.referralListDate}>{item.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === 'completed'
                        ? styles.statusPillSuccess
                        : styles.statusPillPending,
                    ]}
                  >
                    {item.status === 'completed' ? (
                      <Text style={styles.statusPillTextSuccess}>+₹{item.rewardAmount} EARNED</Text>
                    ) : (
                      <Text style={styles.statusPillTextPending}>AWAITING DELIVERY</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyInvitesContainer}>
              <Text style={styles.emptyInvitesText}>
                No invites yet. Share your code above to start earning rewards!
              </Text>
            </View>
          )}
        </MotiView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  heroBannerContainer: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  heroBanner: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  glow1: {
    top: -40,
    right: -20,
  },
  glow2: {
    bottom: -50,
    left: -30,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  heroBadgeText: {
    ...TYPOGRAPHY.caption,
    color: '#FDE047',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    ...TYPOGRAPHY.display,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 13,
    lineHeight: 19,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  codeCardLabel: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  codeText: {
    ...TYPOGRAPHY.heading,
    color: '#6D28D9',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  copyText: {
    ...TYPOGRAPHY.caption,
    color: '#7C3AED',
    fontWeight: '700',
  },
  copiedText: {
    ...TYPOGRAPHY.caption,
    color: '#059669',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  whatsAppButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  whatsAppIconText: {
    fontSize: 18,
  },
  whatsAppButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  shareIconButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  claimHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  claimTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  claimSub: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    marginBottom: SPACING.sm,
    lineHeight: 17,
  },
  claimInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  claimInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.text,
  },
  claimButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  claimButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  claimButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#7C3AED',
    fontSize: 13,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 2,
  },
  stepDesc: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    lineHeight: 18,
  },
  stepConnector: {
    width: 1.5,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginLeft: 13,
    marginVertical: 2,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    ...TYPOGRAPHY.heading,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  referralsList: {
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: SPACING.sm,
  },
  referralListHeader: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  referralListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  referralListInfo: {
    flex: 1,
  },
  referralListName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 13,
  },
  referralListDate: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillTextSuccess: {
    ...TYPOGRAPHY.caption,
    color: '#15803D',
    fontWeight: '700',
    fontSize: 10,
  },
  statusPillTextPending: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    fontWeight: '700',
    fontSize: 10,
  },
  emptyInvitesContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  emptyInvitesText: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
