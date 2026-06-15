import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Home, Briefcase, MapPin, ChevronRight, Trash2, PencilLine, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { deleteAddress, getUserAddresses, updateUserAddress } from '../../services/firestore';
import { useAddressStore, useAuthStore, useUIStore } from '../../store';

const ADDRESS_ICONS: Record<string, any> = {
  Home,
  Work: Briefcase,
  Other: MapPin,
};

interface AddressItem {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  formattedAddress?: string;
  [key: string]: any;
}

const formatAddr = (item: AddressItem): string => {
  if (typeof item.address === 'string') return item.address;
  if (item.formattedAddress) return item.formattedAddress;
  return '';
};

export const AddressListScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { savedAddresses, setAddresses, setCurrentAddress, removeAddress, setPrimaryAddress } = useAddressStore();
  const { showAlert } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const addresses = await getUserAddresses(user.uid);
      setAddresses(addresses as any);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses])
  );

  const handleSelectAddress = (item: AddressItem) => {
    const formattedAddress = formatAddr(item);
    setCurrentAddress(formattedAddress, item.latitude, item.longitude);
    navigation.goBack();
  };

  const handleSetDefault = async (item: AddressItem) => {
    if (!user?.uid || item.isPrimary) return;
    setActionLoading(`default-${item.id}`);
    try {
      await updateUserAddress(user.uid, { ...item, isPrimary: true } as any);
      setPrimaryAddress(item.id);
      const formattedAddress = formatAddr(item);
      setCurrentAddress(formattedAddress, item.latitude, item.longitude);
    } catch {
      showAlert({ title: 'Error', message: 'Failed to update address', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (item: AddressItem) => {
    Alert.alert('Delete Address', `Remove "${item.label}" address?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (!user?.uid) return;
          setActionLoading(`delete-${item.id}`);
          try {
            await deleteAddress(user.uid, item.id);
            removeAddress(item.id);
          } catch {
            showAlert({ title: 'Error', message: 'Failed to delete address', type: 'error' });
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleEdit = (item: AddressItem) => {
    (navigation as any).navigate('AddressMap', { editingAddress: item });
  };

  const renderItem = ({ item, index }: { item: AddressItem; index: number }) => {
    const IconComponent = ADDRESS_ICONS[item.label] || MapPin;
    const formattedAddress = formatAddr(item);
    const shortAddress = formattedAddress.split(',').slice(0, 2).join(',');
    const restAddress = formattedAddress.split(',').slice(2).join(',');

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20, scale: 0.97 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ delay: index * 80, type: 'spring', damping: 18 }}
      >
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => handleSelectAddress(item)}
          activeOpacity={0.7}
        >
          {/* Top section: icon + info + chevron */}
          <View style={styles.cardTop}>
            <View style={styles.iconCircle}>
              <View style={[styles.iconInnerBg, item.isPrimary && styles.iconInnerBgPrimary]}>
                <IconComponent size={20} color={item.isPrimary ? '#FFFFFF' : '#7C3AED'} />
              </View>
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>{item.label}</Text>
                {item.isPrimary ? (
                  <View style={styles.defaultBadge}>
                    <Star size={10} color="#059669" fill="#059669" />
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSetDefault(item)}
                    disabled={actionLoading === `default-${item.id}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {actionLoading === `default-${item.id}` ? (
                      <ActivityIndicator size="small" color="#7C3AED" />
                    ) : (
                      <Text style={styles.setDefaultInline}>Set as Default</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.addressLine1} numberOfLines={1}>{shortAddress}</Text>
              {restAddress ? (
                <Text style={styles.addressLine2} numberOfLines={1}>{restAddress}</Text>
              ) : null}
            </View>
            <ChevronRight size={18} color="#D4D4D8" style={{ marginTop: 12 }} />
          </View>

          {/* Bottom actions bar */}
          <View style={styles.actionsBar}>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
              <PencilLine size={14} color="#7C3AED" />
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.actionBtn}
              disabled={actionLoading === `delete-${item.id}`}
            >
              {actionLoading === `delete-${item.id}` ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Trash2 size={14} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                </>
              )}
            </TouchableOpacity>

            {!item.isPrimary && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  onPress={() => handleSetDefault(item)}
                  style={styles.actionBtn}
                  disabled={actionLoading === `default-${item.id}`}
                >
                  <Star size={14} color="#7C3AED" />
                  <Text style={styles.actionBtnText}>Set as Default</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ArrowLeft size={20} color="#09090B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Add New Address */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        style={styles.addSection}
      >
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('AddressMap')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addGradient}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addText}>Add New Address</Text>
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>

      {/* Section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Saved Addresses</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{savedAddresses.length}</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={savedAddresses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 40) + 80 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MapPin size={48} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>No addresses saved yet</Text>
              <Text style={styles.emptySub}>Tap "Add New Address" to get started</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
    letterSpacing: -0.4,
  },
  // Add section
  addSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  addGradient: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  addText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
  },
  countPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  // List
  listContent: {
    paddingHorizontal: 16,
  },
  // Premium card
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    paddingBottom: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconInnerBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  iconInnerBgPrimary: {
    backgroundColor: '#7C3AED',
  },
  cardInfo: {
    flex: 1,
    marginRight: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  labelText: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: '#09090B',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#059669',
  },
  setDefaultInline: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#7C3AED',
  },
  addressLine1: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
    lineHeight: 19,
  },
  addressLine2: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    lineHeight: 17,
    marginTop: 1,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#7C3AED',
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#F1F5F9',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    marginTop: 4,
  },
});
