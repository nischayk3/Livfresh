import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../../utils/constants';
import { useAdminStore } from '../../store/adminStore';
import { useUIStore } from '../../store/uiStore';
import { BrandLoader } from '../../components/BrandLoader';
import { Timestamp } from '../../services/firebase';

export const AdminSubscriptionDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, subscriptionId } = route.params || {};
  const { showAlert } = useUIStore();
  const { addCredits } = useAdminStore();

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [addCreditsCount, setAddCreditsCount] = useState('2');
  const [addCreditsSubmitting, setAddCreditsSubmitting] = useState(false);
  const [showExtendExpiry, setShowExtendExpiry] = useState(false);
  const [extendDays, setExtendDays] = useState('30');
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    if (!userId || !subscriptionId) return;
    setLoading(true);
    try {
      const { getSubscriptionDetail } = await import('../../services/adminFirestore');
      const result = await getSubscriptionDetail(userId, subscriptionId);
      setDetail(result);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to load subscription', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Credit Pack',
      `Delete this pack and its ${detail?.subscription?.creditsRemaining ?? 0} remaining credits? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              const { revokeSubscriptionAdmin } = await import('../../services/adminFirestore');
              const result = await revokeSubscriptionAdmin(userId, subscriptionId);
              if (result.success) {
                showAlert({ title: 'Done', message: `Pack revoked (${result.creditsRevoked} credits removed).`, type: 'success' });
                navigation.goBack();
              } else {
                showAlert({ title: 'Error', message: result.error || 'Failed to revoke', type: 'error' });
              }
            } catch (e: any) {
              showAlert({ title: 'Error', message: e.message, type: 'error' });
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  const handleAddCredits = async () => {
    const count = parseInt(addCreditsCount);
    if (isNaN(count) || count < 1) {
      showAlert({ title: 'Error', message: 'Credits must be at least 1', type: 'error' });
      return;
    }
    setAddCreditsSubmitting(true);
    try {
      // Get user phone from the subscription data
      const { getDoc, doc } = await import('../../services/firebase');
      const userSnap = await getDoc(doc(await (await import('../../services/firebase')).db, 'users', userId));
      const phone = userSnap.exists() ? (userSnap.data().phone || '') : '';
      const name = userSnap.exists() ? (userSnap.data().name || '') : '';

      const result = await addCredits(
        name, phone,
        detail.subscription.planType || 'single',
        count,
        detail.subscription.serviceType || 'wash_fold'
      );
      if (result.success) {
        showAlert({ title: 'Success', message: `Added ${count} credits`, type: 'success' });
        setShowAddCredits(false);
        loadDetail();
      } else {
        showAlert({ title: 'Failed', message: result.error || 'Failed to add credits', type: 'error' });
      }
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setAddCreditsSubmitting(false);
    }
  };

  const handleExtendExpiry = async () => {
    const days = parseInt(extendDays);
    if (isNaN(days) || days < 1) {
      showAlert({ title: 'Error', message: 'Days must be at least 1', type: 'error' });
      return;
    }
    setExtendSubmitting(true);
    try {
      const { extendSubscriptionExpiryAdmin } = await import('../../services/adminFirestore');
      const currentExp = detail.subscription.expiresAt?.toDate?.() ?? new Date();
      const newExpiry = new Date(Math.max(currentExp.getTime(), Date.now()) + days * 86400000);
      const result = await extendSubscriptionExpiryAdmin(userId, subscriptionId, newExpiry);
      if (result.success) {
        showAlert({ title: 'Success', message: `Expiry extended to ${format(newExpiry, 'dd MMM yyyy')}`, type: 'success' });
        setShowExtendExpiry(false);
        loadDetail();
      } else {
        showAlert({ title: 'Error', message: result.error || 'Failed to extend', type: 'error' });
      }
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setExtendSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Detail</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <BrandLoader />
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Detail</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Subscription not found</Text>
        </View>
      </View>
    );
  }

  const sub = detail.subscription;
  const usage = detail.creditUsage || [];
  const subCreated = sub.createdAt?.toDate ? sub.createdAt.toDate() : new Date(sub.createdAt || sub.purchasedAt?.toDate?.());
  const subExpires = sub.expiresAt?.toDate ? sub.expiresAt.toDate() : null;
  const remaining = sub.creditsRemaining ?? sub.credits_remaining ?? 0;
  const used = sub.creditsUsed ?? sub.credits_used ?? 0;
  const total = sub.totalCredits ?? sub.total_credits ?? 0;
  const serviceType = sub.serviceType === 'wash_iron' ? 'Wash & Iron' : 'Wash & Fold';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Detail</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Pack Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.statusDot, { backgroundColor: sub.status === 'active' ? '#22C55E' : '#9CA3AF' }]} />
            <Text style={styles.cardTitle}>Credit Pack</Text>
            <View style={[styles.badge, { backgroundColor: sub.status === 'active' ? '#DCFCE7' : '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: sub.status === 'active' ? '#15803D' : '#6B7280' }]}>
                {sub.status?.toUpperCase() || 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Service</Text>
              <Text style={styles.infoValue}>{serviceType}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Weight per credit</Text>
              <Text style={styles.infoValue}>{sub.kgPerCredit || 7}kg</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Purchased</Text>
              <Text style={styles.infoValue}>{format(subCreated, 'dd MMM yyyy')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Expires</Text>
              <Text style={[styles.infoValue, subExpires && subExpires < new Date() ? { color: '#DC2626' } : undefined]}>
                {subExpires ? format(subExpires, 'dd MMM yyyy') : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Credits Gauge */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <View style={styles.gaugeRow}>
            <View style={styles.gauge}>
              <View style={[styles.gaugeFill, { width: `${total > 0 ? (used / total) * 100 : 0}%` }]} />
            </View>
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>
              <Text style={styles.gaugeBold}>{used}</Text> used
            </Text>
            <Text style={styles.gaugeLabel}>
              <Text style={styles.gaugeBold}>{remaining}</Text> remaining
            </Text>
            <Text style={styles.gaugeLabel}>
              <Text style={styles.gaugeBold}>{total}</Text> total
            </Text>
          </View>
        </View>

        {/* Usage History */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Usage History</Text>
          {usage.length === 0 ? (
            <Text style={styles.emptySmall}>No credits used yet</Text>
          ) : (
            usage.map((u: any, i: number) => (
              <View key={u.id || i} style={styles.usageRow}>
                <View style={styles.usageIndex}>
                  <Text style={styles.usageIndexText}>#{u.creditIndex != null ? u.creditIndex + 1 : '-'}</Text>
                </View>
                <View style={styles.usageDetails}>
                  <Text style={styles.usageDate}>
                    {u.usedAt ? format(new Date(u.usedAt), 'dd MMM yyyy, h:mm a') : 'Unknown'}
                  </Text>
                  <Text style={styles.usageOrder}>
                    {u.order ? `Order: ${u.orderId?.slice(0, 10)}… (${u.order.status})` : `Order: ${(u.orderId || '-').slice(0, 10)}…`}
                  </Text>
                </View>
                {u.order && (
                  <TouchableOpacity
                    style={styles.usageLink}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: u.orderId, userId })}
                  >
                    <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Admin Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowAddCredits(true)}>
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="add-circle" size={22} color="#15803D" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Add Credits</Text>
              <Text style={styles.actionDesc}>Top up this pack with more credits</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowExtendExpiry(true)}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calendar" size={22} color="#D97706" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Extend Expiry</Text>
              <Text style={styles.actionDesc}>Push expiry date further</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomWidth: 0 }]}
            onPress={handleRevoke}
            disabled={revoking}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
              {revoking ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="trash" size={22} color="#DC2626" />
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionLabel, { color: '#DC2626' }]}>Revoke Pack</Text>
              <Text style={styles.actionDesc}>Delete this pack and its remaining credits</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Credits Modal */}
      <Modal visible={showAddCredits} transparent animationType="slide" onRequestClose={() => setShowAddCredits(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Credits</Text>
              <TouchableOpacity onPress={() => setShowAddCredits(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Number of credits</Text>
              <TextInput
                style={styles.input}
                placeholder="2"
                keyboardType="number-pad"
                value={addCreditsCount}
                onChangeText={setAddCreditsCount}
              />
              <TouchableOpacity
                style={[styles.submitBtn, addCreditsSubmitting && { opacity: 0.7 }]}
                onPress={handleAddCredits}
                disabled={addCreditsSubmitting}
              >
                {addCreditsSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Credits</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extend Expiry Modal */}
      <Modal visible={showExtendExpiry} transparent animationType="slide" onRequestClose={() => setShowExtendExpiry(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Extend Expiry</Text>
              <TouchableOpacity onPress={() => setShowExtendExpiry(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Extend by (days)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="number-pad"
                value={extendDays}
                onChangeText={setExtendDays}
              />
              <TouchableOpacity
                style={[styles.submitBtn, extendSubmitting && { opacity: 0.7 }]}
                onPress={handleExtendExpiry}
                disabled={extendSubmitting}
              >
                {extendSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Extend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TYPOGRAPHY.subheading, fontWeight: '700', color: COLORS.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textLight },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFF', borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { ...TYPOGRAPHY.subheading, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.md },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  infoItem: { width: '45%' },
  infoLabel: { ...TYPOGRAPHY.tiny, color: COLORS.textLight, marginBottom: 2 },
  infoValue: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  sectionTitle: { ...TYPOGRAPHY.bodyBold, fontSize: 16, color: COLORS.text, marginBottom: SPACING.md },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  gauge: { flex: 1, height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  gaugeLabel: { ...TYPOGRAPHY.tiny, color: COLORS.textSecondary },
  gaugeBold: { fontWeight: '700', color: COLORS.text },
  emptySmall: { ...TYPOGRAPHY.body, color: COLORS.textLight, textAlign: 'center', paddingVertical: 20 },
  usageRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  usageIndex: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primaryLight + '20', justifyContent: 'center', alignItems: 'center',
  },
  usageIndexText: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.primary },
  usageDetails: { flex: 1 },
  usageDate: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  usageOrder: { ...TYPOGRAPHY.tiny, color: COLORS.textLight, marginTop: 2 },
  usageLink: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionContent: { flex: 1 },
  actionLabel: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.text },
  actionDesc: { ...TYPOGRAPHY.tiny, color: COLORS.textLight, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { ...TYPOGRAPHY.subheading, fontWeight: '700' },
  modalBody: { padding: SPACING.lg, gap: SPACING.md },
  label: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 48, ...TYPOGRAPHY.body,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, height: 52, borderRadius: RADIUS.lg,
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.primary,
  },
  submitBtnText: { ...TYPOGRAPHY.button, color: '#FFF' },
});