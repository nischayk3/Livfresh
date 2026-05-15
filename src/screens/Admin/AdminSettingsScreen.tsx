import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useAdminPermissions } from '../../store/useAdminPermissions';
import { useServiceAvailabilityStore, SERVICE_LABELS, ALL_SERVICES } from '../../store/serviceAvailabilityStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../utils/constants';

export const AdminSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { adminPhone, adminName, adminRole, logout } = useAdminAuthStore();
  const { canManageServiceAvailability } = useAdminPermissions();
  const { availability, isLoading, fetchAvailability, toggleService } = useServiceAvailabilityStore();
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
});