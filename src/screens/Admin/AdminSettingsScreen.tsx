import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useAdminPermissions } from '../../store/useAdminPermissions';
import { useServiceAvailabilityStore, SERVICE_LABELS, ALL_SERVICES } from '../../store/serviceAvailabilityStore';
import { useSlotSettingsStore, MIN_ORDERS_PER_SLOT, MAX_ORDERS_PER_SLOT_LIMIT } from '../../store/slotSettingsStore';
import {
  Coupon,
  getAllCouponsAdmin,
  saveCouponAdmin,
  toggleCouponStatusAdmin,
  deleteCouponAdmin,
  seedDefaultCoupons,
} from '../../services/couponService';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../utils/constants';

export const AdminSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { adminPhone, adminName, adminRole, logout } = useAdminAuthStore();
  const { canManageServiceAvailability } = useAdminPermissions();
  const { availability, isLoading, fetchAvailability, toggleService } = useServiceAvailabilityStore();
  const { maxOrdersPerSlot, updateMaxOrdersPerSlot } = useSlotSettingsStore();
  const [toggling, setToggling] = useState<string | null>(null);
  const [updatingSlotLimit, setUpdatingSlotLimit] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponTitle, setNewCouponTitle] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponType, setNewCouponType] = useState<'flat' | 'percentage'>('flat');
  const [newCouponAmount, setNewCouponAmount] = useState('200');
  const [newCouponMinOrder, setNewCouponMinOrder] = useState('700');
  const [newCouponFirstOrderOnly, setNewCouponFirstOrderOnly] = useState(false);
  const [newCouponIsPublic, setNewCouponIsPublic] = useState(true);

  const loadCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const list = await getAllCouponsAdmin();
      setCoupons(list);
    } catch (e) {
      console.error('Failed to load coupons:', e);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    loadCoupons();
  }, []);

  const handleToggleCoupon = async (code: string, currentActive: boolean) => {
    try {
      await toggleCouponStatusAdmin(code, !currentActive);
      setCoupons((prev) =>
        prev.map((c) => (c.code === code ? { ...c, isActive: !currentActive } : c))
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update coupon status');
    }
  };

  const handleDeleteCoupon = (code: string) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete coupon ${code}? Customers will no longer be able to use it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCouponAdmin(code);
              setCoupons((prev) => prev.filter((c) => c.code !== code));
              Alert.alert('Deleted', `Coupon ${code} has been deleted.`);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete coupon.');
            }
          },
        },
      ]
    );
  };

  const handleSaveNewCoupon = async () => {
    const cleanCode = newCouponCode.trim().toUpperCase();
    if (!cleanCode) {
      Alert.alert('Validation Error', 'Please enter a coupon code.');
      return;
    }
    const amountNum = parseFloat(newCouponAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount amount.');
      return;
    }
    const minOrderNum = parseFloat(newCouponMinOrder) || 0;

    setIsSavingCoupon(true);
    try {
      await saveCouponAdmin({
        code: cleanCode,
        title: newCouponTitle.trim() || `${newCouponType === 'flat' ? `Flat ₹${amountNum} OFF` : `${amountNum}% OFF`}`,
        description: newCouponDesc.trim() || `Valid on orders above ₹${minOrderNum}`,
        discountType: newCouponType,
        discountAmount: newCouponType === 'flat' ? amountNum : 0,
        discountPercent: newCouponType === 'percentage' ? amountNum : undefined,
        minOrderValue: minOrderNum,
        isFirstOrderOnly: newCouponFirstOrderOnly,
        isPublic: newCouponIsPublic,
        isActive: true,
        perUserLimit: 1,
        usedCount: 0,
      });

      setShowCreateModal(false);
      setNewCouponCode('');
      setNewCouponTitle('');
      setNewCouponDesc('');
      setNewCouponAmount('200');
      setNewCouponMinOrder('700');
      await loadCoupons();
      Alert.alert('Success', `Coupon ${cleanCode} created successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create coupon.');
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleUpdateSlotLimit = async (newLimit: number) => {
    if (newLimit === maxOrdersPerSlot || updatingSlotLimit) return;
    setUpdatingSlotLimit(true);
    try {
      await updateMaxOrdersPerSlot(newLimit);
      Alert.alert(
        'Slot Capacity Updated',
        `Max orders per 1-hour slot is now set to ${newLimit}.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update slot capacity.');
    } finally {
      setUpdatingSlotLimit(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    (navigation as any).navigate('AdminLogin');
  };

  const handleToggleService = async (serviceId: string) => {
    const currentValue = availability[serviceId as keyof typeof availability];
    setToggling(serviceId);
    try {
      await toggleService(serviceId as any, !currentValue);
      Alert.alert(
        'Service Updated',
        `${SERVICE_LABELS[serviceId as keyof typeof SERVICE_LABELS]} is now ${!currentValue ? 'OPEN' : 'PAUSED'} for orders`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update service availability');
    } finally {
      setToggling(null);
    }
  };

  const displayRole = adminRole === 'super_admin' ? 'Super Administrator' : 'Restricted Admin';

  const isAllEnabled = ALL_SERVICES.every(s => availability[s]);
  const isAllDisabled = ALL_SERVICES.every(s => !availability[s]);

  const handleToggleAll = async (enable: boolean) => {
    setToggling('all');
    try {
      for (const service of ALL_SERVICES) {
        await toggleService(service, enable);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update services');
    } finally {
      setToggling(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
          <Text style={styles.profileTitle}>{adminName || 'Administrator'}</Text>
          <Text style={styles.profilePhone}>{displayRole}</Text>
          <Text style={styles.profilePhone}>{adminPhone}</Text>
        </View>

        {/* Service Availability Section - Only for Super Admins */}
        {canManageServiceAvailability && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Service Availability</Text>
              <Text style={styles.sectionSubtitle}>Control which services accept orders</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <View style={styles.servicesContainer}>
                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, isAllEnabled && styles.quickActionActive]}
                    onPress={() => handleToggleAll(true)}
                    disabled={toggling !== null}
                  >
                    <Text style={[styles.quickActionText, isAllEnabled && styles.quickActionTextActive]}>
                      Enable All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickActionButton, isAllDisabled && styles.quickActionActive]}
                    onPress={() => handleToggleAll(false)}
                    disabled={toggling !== null}
                  >
                    <Text style={[styles.quickActionText, isAllDisabled && styles.quickActionTextActive]}>
                      Disable All
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Individual Service Toggles */}
                {ALL_SERVICES.map((serviceId) => {
                  const isEnabled = availability[serviceId];

                  return (
                    <View key={serviceId} style={styles.serviceRow}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{SERVICE_LABELS[serviceId]}</Text>
                        <View style={[styles.statusBadge, isEnabled ? styles.statusOpen : styles.statusPaused]}>
                          <Text style={[styles.statusText, isEnabled ? styles.statusTextOpen : styles.statusTextPaused]}>
                            {isEnabled ? 'Accepting Orders' : 'Paused'}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => handleToggleService(serviceId)}
                        disabled={toggling !== null}
                        trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
                        thumbColor={isEnabled ? COLORS.primary : '#F1F5F9'}
                        ios_backgroundColor="#E2E8F0"
                      />
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>
                When a service is paused, users can see the prices but cannot place orders. They'll see a "high demand" message.
              </Text>
            </View>
          </View>
        )}

        {/* Hourly Slot Capacity Section - Only for Super Admins */}
        {canManageServiceAvailability && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hourly Slot Capacity</Text>
              <Text style={styles.sectionSubtitle}>Manage max orders accepted per 1-hour slot</Text>
            </View>

            <View style={styles.capacityCard}>
              {/* Stepper Control */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    (maxOrdersPerSlot <= MIN_ORDERS_PER_SLOT || updatingSlotLimit) && styles.stepperButtonDisabled,
                  ]}
                  onPress={() => handleUpdateSlotLimit(maxOrdersPerSlot - 1)}
                  disabled={maxOrdersPerSlot <= MIN_ORDERS_PER_SLOT || updatingSlotLimit}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="remove"
                    size={22}
                    color={maxOrdersPerSlot <= MIN_ORDERS_PER_SLOT ? COLORS.borderLight : COLORS.primary}
                  />
                </TouchableOpacity>

                <View style={styles.capacityValueContainer}>
                  {updatingSlotLimit ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Text style={styles.capacityNumber}>{maxOrdersPerSlot}</Text>
                      <Text style={styles.capacityUnit}>orders / slot</Text>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    (maxOrdersPerSlot >= MAX_ORDERS_PER_SLOT_LIMIT || updatingSlotLimit) && styles.stepperButtonDisabled,
                  ]}
                  onPress={() => handleUpdateSlotLimit(maxOrdersPerSlot + 1)}
                  disabled={maxOrdersPerSlot >= MAX_ORDERS_PER_SLOT_LIMIT || updatingSlotLimit}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color={maxOrdersPerSlot >= MAX_ORDERS_PER_SLOT_LIMIT ? COLORS.borderLight : COLORS.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <Text style={styles.presetLabel}>Quick Presets</Text>
              <View style={styles.presetsRow}>
                {[1, 2, 3, 4, 5].map((val) => {
                  const isSelected = maxOrdersPerSlot === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => handleUpdateSlotLimit(val)}
                      disabled={updatingSlotLimit}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {val}{val === 3 ? ' (Def)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Controls combined pickup & delivery orders accepted per 1-hour slot. If set to 2, any slot with 2 or more orders immediately closes for new customer bookings.
              </Text>
            </View>
          </View>
        )}

        {/* Promotions & Coupons Section - Only for Super Admins */}
        {canManageServiceAvailability && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderBetween}>
              <View>
                <Text style={styles.sectionTitle}>Promotions & Coupons</Text>
                <Text style={styles.sectionSubtitle}>Manage discount vouchers & promo codes</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.addCouponButton, { backgroundColor: '#F1F5F9' }]}
                  onPress={async () => {
                    setIsLoadingCoupons(true);
                    await seedDefaultCoupons();
                    await loadCoupons();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sync-outline" size={16} color="#334155" />
                  <Text style={[styles.addCouponButtonText, { color: '#334155' }]}>Sync</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addCouponButton}
                  onPress={() => setShowCreateModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addCouponButtonText}>New</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoadingCoupons ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
            ) : coupons.length === 0 ? (
              <View style={styles.emptyCouponsCard}>
                <Ionicons name="pricetags-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyCouponsTitle}>No coupons in database yet</Text>
                <Text style={styles.emptyCouponsSub}>
                  Tap "+ New" above to create custom promo codes or tap below to seed standard offers (FLAT200 & FIRST100).
                </Text>
                <TouchableOpacity
                  style={styles.seedCouponsBtn}
                  onPress={async () => {
                    setIsLoadingCoupons(true);
                    await seedDefaultCoupons();
                    await loadCoupons();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.seedCouponsBtnText}>Sync Default Offers (FLAT200 & FIRST100)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponsList}>
                {coupons.map((coupon) => (
                  <View key={coupon.code} style={styles.couponAdminCard}>
                    <View style={styles.couponAdminHeader}>
                      <View style={styles.couponAdminBadge}>
                        <Text style={styles.couponAdminCodeText}>{coupon.code}</Text>
                      </View>
                      <View style={styles.couponAdminActions}>
                        <View style={[styles.statusBadge, coupon.isActive ? styles.statusOpen : styles.statusPaused]}>
                          <Text style={[styles.statusText, coupon.isActive ? styles.statusTextOpen : styles.statusTextPaused]}>
                            {coupon.isActive ? 'Active' : 'Paused'}
                          </Text>
                        </View>
                        <Switch
                          value={coupon.isActive}
                          onValueChange={() => handleToggleCoupon(coupon.code, coupon.isActive)}
                          trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
                          thumbColor={coupon.isActive ? COLORS.primary : '#F1F5F9'}
                          ios_backgroundColor="#E2E8F0"
                        />
                        <TouchableOpacity
                          onPress={() => handleDeleteCoupon(coupon.code)}
                          style={styles.deleteCouponIcon}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.couponAdminTitle}>{coupon.title}</Text>
                    <Text style={styles.couponAdminDesc}>{coupon.description}</Text>

                    <View style={styles.couponAdminMetaRow}>
                      <View style={styles.couponMetaTag}>
                        <Ionicons name="pricetag-outline" size={12} color="#64748B" />
                        <Text style={styles.couponMetaText}>
                          {coupon.discountType === 'flat' ? `₹${coupon.discountAmount} Flat` : `${coupon.discountPercent}% Off`}
                        </Text>
                      </View>
                      <View style={styles.couponMetaTag}>
                        <Ionicons name="cart-outline" size={12} color="#64748B" />
                        <Text style={styles.couponMetaText}>Min: ₹{coupon.minOrderValue}</Text>
                      </View>
                      <View style={styles.couponMetaTag}>
                        <Ionicons name="people-outline" size={12} color="#64748B" />
                        <Text style={styles.couponMetaText}>{coupon.usedCount || 0} used</Text>
                      </View>
                      {coupon.isFirstOrderOnly && (
                        <View style={[styles.couponMetaTag, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.couponMetaText, { color: '#B45309' }]}>1st order only</Text>
                        </View>
                      )}
                      {coupon.maxOrderCount && (
                        <View style={[styles.couponMetaTag, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={[styles.couponMetaText, { color: '#047857' }]}>
                            First {coupon.maxOrderCount} orders ({coupon.perUserLimit || coupon.maxOrderCount}x/user)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create Coupon Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: insets.top ? '85%' : '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Coupon</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Coupon Code *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. DIWALI200"
                value={newCouponCode}
                onChangeText={(t) => setNewCouponCode(t.toUpperCase())}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Headline Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Flat ₹200 OFF"
                value={newCouponTitle}
                onChangeText={setNewCouponTitle}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Special festive discount on orders above ₹700"
                value={newCouponDesc}
                onChangeText={setNewCouponDesc}
              />

              <Text style={styles.inputLabel}>Discount Type</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[styles.typeButton, newCouponType === 'flat' && styles.typeButtonActive]}
                  onPress={() => setNewCouponType('flat')}
                >
                  <Text style={[styles.typeButtonText, newCouponType === 'flat' && styles.typeButtonTextActive]}>
                    Flat (₹)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, newCouponType === 'percentage' && styles.typeButtonActive]}
                  onPress={() => setNewCouponType('percentage')}
                >
                  <Text style={[styles.typeButtonText, newCouponType === 'percentage' && styles.typeButtonTextActive]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                {newCouponType === 'flat' ? 'Discount Amount (₹) *' : 'Discount Percentage (%) *'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={newCouponType === 'flat' ? '200' : '20'}
                keyboardType="numeric"
                value={newCouponAmount}
                onChangeText={setNewCouponAmount}
              />

              <Text style={styles.inputLabel}>Minimum Order Value (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="700"
                keyboardType="numeric"
                value={newCouponMinOrder}
                onChangeText={setNewCouponMinOrder}
              />

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>First Order Only</Text>
                  <Text style={styles.toggleDesc}>Only applicable if customer has 0 prior orders</Text>
                </View>
                <Switch
                  value={newCouponFirstOrderOnly}
                  onValueChange={setNewCouponFirstOrderOnly}
                  trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
                  thumbColor={newCouponFirstOrderOnly ? COLORS.primary : '#F1F5F9'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Show in Cart Offers</Text>
                  <Text style={styles.toggleDesc}>Make visible to all users in Cart offers list</Text>
                </View>
                <Switch
                  value={newCouponIsPublic}
                  onValueChange={setNewCouponIsPublic}
                  trackColor={{ false: '#E2E8F0', true: COLORS.primary + '80' }}
                  thumbColor={newCouponIsPublic ? COLORS.primary : '#F1F5F9'}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, isSavingCoupon && styles.submitButtonDisabled]}
              onPress={handleSaveNewCoupon}
              disabled={isSavingCoupon}
              activeOpacity={0.7}
            >
              {isSavingCoupon ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Coupon</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
  },
  profileCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  profileTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  profilePhone: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  servicesContainer: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  quickActionActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  quickActionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickActionTextActive: {
    color: COLORS.primary,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusPaused: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    ...TYPOGRAPHY.tiny,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: '#16A34A',
  },
  statusTextPaused: {
    color: '#DC2626',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  capacityCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.borderLight + '30',
  },
  capacityValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  capacityNumber: {
    ...TYPOGRAPHY.display,
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    lineHeight: 38,
  },
  capacityUnit: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  presetChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  logoutButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
  // ═══ PROMOTIONS & COUPONS ADMIN STYLES ═══
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addCouponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  addCouponButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  couponsList: {
    gap: 12,
  },
  couponAdminCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  couponAdminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponAdminBadge: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  couponAdminCodeText: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  couponAdminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteCouponIcon: {
    padding: 4,
  },
  couponAdminTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  couponAdminDesc: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  couponAdminMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  couponMetaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  couponMetaText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: '#475569',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: '#0F172A',
  },
  modalBody: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: '#0F172A',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#64748B',
  },
  typeButtonTextActive: {
    color: COLORS.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 4,
  },
  toggleTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#0F172A',
  },
  toggleDesc: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
    marginTop: 1,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
  emptyCouponsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyCouponsTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyCouponsSub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  seedCouponsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  seedCouponsBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
});