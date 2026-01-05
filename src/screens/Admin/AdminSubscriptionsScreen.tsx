import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../../utils/constants';
import { useAdminStore } from '../../store/adminStore';
import { useUIStore } from '../../store/uiStore';
import { format } from 'date-fns';
import { BrandLoader } from '../../components/BrandLoader';
import { BrandAlert } from '../../components/BrandAlert';

export const AdminSubscriptionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    subscriptionStats,
    subscriptionsLoading: isLoading,
    fetchSubscriptionStats,
    addCredits,
    bulkAddCredits
  } = useAdminStore();
  const { showAlert } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Add Credits Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<'manual' | 'csv'>('manual');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPlanType, setFormPlanType] = useState<'single' | 'couple'>('single');
  const [formCredits, setFormCredits] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubscriptionStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionStats(true);
    setRefreshing(false);
  };

  const filteredSubscribers = useMemo(() => {
    const subs = subscriptionStats.subscribers || [];
    if (!searchQuery) return subs;

    const lowerQuery = searchQuery.toLowerCase();
    return subs.filter(sub =>
      (sub.name || '').toLowerCase().includes(lowerQuery) ||
      (sub.phone || '').includes(lowerQuery)
    );
  }, [subscriptionStats.subscribers, searchQuery]);

  const handleManualAdd = async () => {
    if (!formPhone.trim()) {
      showAlert({ title: 'Error', message: 'Phone number is required', type: 'error' });
      return;
    }

    const creditsNum = parseInt(formCredits);
    if (isNaN(creditsNum) || creditsNum < 1) {
      showAlert({ title: 'Error', message: 'Credits must be at least 1', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await addCredits(formName, formPhone, formPlanType, creditsNum);
      if (result.success) {
        showAlert({ title: 'Success', message: `Successfully added ${creditsNum} credits to ${formPhone}`, type: 'success' });
        setModalVisible(false);
        setFormName('');
        setFormPhone('');
        setFormCredits('2');
      } else {
        showAlert({ title: 'Failed', message: result.error || 'Failed to add credits', type: 'error' });
      }
    } catch (error) {
      showAlert({ title: 'Error', message: 'An unexpected error occurred', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderSubscriberItem = ({ item }: { item: any }) => (
    <View style={styles.subscriberCard}>
      <View style={styles.subscriberHeader}>
        <View>
          <Text style={styles.subscriberName}>{item.name || 'No Name'}</Text>
          <Text style={styles.subscriberPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? COLORS.success + '15' : COLORS.borderLight }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? COLORS.success : COLORS.textSecondary }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.subscriberDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Plan Type</Text>
          <Text style={styles.detailValue}>{item.plan_type === 'single' ? '7kg Plan' : '14kg Plan'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Credits Used</Text>
          <Text style={styles.detailValue}>{item.credits_used} / {item.total_credits}</Text>
        </View>
      </View>

      <View style={styles.subscriberFooter}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} />
        <Text style={styles.expiryText}>
          Expires: {item.expires_at ? format(new Date(item.expires_at), 'dd MMM yyyy') : 'N/A'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Subscribers</Text>
          <Text style={styles.headerSub}>Manage customer credits</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={[styles.statsCard, { backgroundColor: '#E0F2FE' }]}>
          <View style={[styles.statsIcon, { backgroundColor: '#BAE6FD' }]}>
            <Ionicons name="people" size={20} color="#0369A1" />
          </View>
          <Text style={styles.statsValue}>{subscriptionStats.totalSubscribers}</Text>
          <Text style={styles.statsLabel}>Total Subs</Text>
        </View>
        <View style={[styles.statsCard, { backgroundColor: '#DCFCE7' }]}>
          <View style={[styles.statsIcon, { backgroundColor: '#BBF7D0' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#15803D" />
          </View>
          <Text style={styles.statsValue}>{subscriptionStats.activeSubscribers}</Text>
          <Text style={styles.statsLabel}>Active Now</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Subscriber List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <BrandLoader />
        </View>
      ) : (
        <FlatList
          data={filteredSubscribers}
          renderItem={renderSubscriberItem}
          keyExtractor={(item) => `${item.user_id}-${item.created_at}`}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No subscribers found</Text>
            </View>
          }
        />
      )}

      {/* Add Credits Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Credits</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, modalTab === 'manual' && styles.activeTab]}
                onPress={() => setModalTab('manual')}
              >
                <Text style={[styles.tabText, modalTab === 'manual' && styles.activeTabText]}>Manual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, modalTab === 'csv' && styles.activeTab]}
                onPress={() => setModalTab('csv')}
              >
                <Text style={[styles.tabText, modalTab === 'csv' && styles.activeTabText]}>CSV Upload</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {modalTab === 'manual' ? (
                <View style={styles.form}>
                  <Text style={styles.label}>Customer Name (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Doe"
                    value={formName}
                    onChangeText={setFormName}
                  />

                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9108558715"
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                    maxLength={10}
                  />

                  <Text style={styles.label}>Plan Type *</Text>
                  <View style={styles.planSelector}>
                    <TouchableOpacity
                      style={[styles.planOption, formPlanType === 'single' && styles.activePlan]}
                      onPress={() => setFormPlanType('single')}
                    >
                      <Text style={[styles.planText, formPlanType === 'single' && styles.activePlanText]}>Single (7kg)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.planOption, formPlanType === 'couple' && styles.activePlan]}
                      onPress={() => setFormPlanType('couple')}
                    >
                      <Text style={[styles.planText, formPlanType === 'couple' && styles.activePlanText]}>Couple (14kg)</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Number of Credits *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2"
                    keyboardType="number-pad"
                    value={formCredits}
                    onChangeText={setFormCredits}
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleManualAdd}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Add Credits</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.csvContainer}>
                  <View style={styles.csvInstructions}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.csvInfoText}>
                      CSV format: name, phone, plan_type, credits{"\n"}
                      • plan_type: single / couple{"\n"}
                      • phone: 10 digits
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={() => showAlert({ title: 'Web Only', message: 'CSV Upload is currently only supported on Web version as per Sipzo logic.', type: 'info' })}
                  >
                    <Ionicons name="cloud-upload" size={40} color={COLORS.primary} />
                    <Text style={styles.uploadText}>Select CSV File</Text>
                    <Text style={styles.uploadSub}>Tap to upload subscriber list</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading,
    fontSize: 24,
    color: COLORS.text,
  },
  headerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  statsCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    ...TYPOGRAPHY.heading,
    fontSize: 20,
    color: COLORS.text,
  },
  statsLabel: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: SPACING.md,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    paddingLeft: SPACING.sm,
    ...TYPOGRAPHY.body,
    height: '100%',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  subscriberCard: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  subscriberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  subscriberName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    color: COLORS.text,
  },
  subscriberPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },
  subscriberDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  subscriberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    minHeight: '60%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  form: {
    gap: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: -8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    ...TYPOGRAPHY.body,
  },
  planSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  activePlan: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  planText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activePlanText: {
    color: COLORS.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFF',
  },
  csvContainer: {
    alignItems: 'center',
    gap: SPACING.xl,
  },
  csvInstructions: {
    backgroundColor: '#F0F9FF',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  csvInfoText: {
    ...TYPOGRAPHY.caption,
    color: '#0369A1',
    lineHeight: 18,
  },
  uploadBox: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '05',
  },
  uploadText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    marginTop: 12,
  },
  uploadSub: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
