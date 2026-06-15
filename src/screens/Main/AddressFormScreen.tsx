import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Home, Briefcase, CheckCircle, ArrowRight, Navigation2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { addAddress, updateUserAddress } from '../../services/firestore';
import { useAuthStore, useAddressStore, useUIStore } from '../../store';
import AnalyticsService from '../../services/analytics';
import { reverseGeocode } from '../../utils/geocoding';

const ADDRESS_TYPES = [
  { key: 'Home', icon: Home },
  { key: 'Work', icon: Briefcase },
  { key: 'Other', icon: MapPin },
] as const;

export const AddressFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { setCurrentAddress, addAddress: addToStore, updateAddress: updateInStore } = useAddressStore();
  const { showAlert } = useUIStore();

  const params = route.params as {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city?: string;
    pincode?: string;
    state?: string;
    street?: string;
    suburb?: string;
    editingAddress?: any;
  };

  const [form, setForm] = useState({
    houseNo: params?.editingAddress?.houseNo || '',
    building: params?.editingAddress?.building || '',
    street: params?.editingAddress?.street || params?.street || params?.suburb || (params?.formattedAddress?.split(',')[0]?.trim() || ''),
    city: params?.editingAddress?.city || params?.city || '',
    pincode: params?.editingAddress?.pincode || params?.pincode || '',
    landmark: params?.editingAddress?.landmark || '',
    tag: params?.editingAddress?.label || 'Home',
    isDefault: params?.editingAddress ? params.editingAddress.isPrimary : true,
  });
  const [loading, setLoading] = useState(false);

  // Fallback geocoding on mount if no structured data was passed
  useEffect(() => {
    const hasStructuredData = params?.city || params?.pincode;
    const isEditing = !!params?.editingAddress;
    if (hasStructuredData || isEditing) return;

    const fillFromGeocode = async () => {
      try {
        const result = await reverseGeocode(params.latitude, params.longitude);
        setForm(prev => ({
          ...prev,
          street: prev.street || result.street || result.suburb || '',
          city: prev.city || result.city || '',
          pincode: prev.pincode || result.pincode || '',
        }));
      } catch {
        // User can fill manually
      }
    };
    fillFromGeocode();
  }, []);

  const isEditing = !!params?.editingAddress;

  const handleSave = async () => {
    if (!form.houseNo.trim()) {
      showAlert({ title: 'Details Missing', message: 'Please enter your Flat / House Number', type: 'warning' });
      return;
    }
    if (!user?.uid) {
      showAlert({ title: 'Error', message: 'User not logged in', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const fullAddress = [
        form.houseNo.trim(),
        form.building.trim(),
        form.street.trim(),
        form.city.trim(),
        form.pincode.trim(),
      ].filter(Boolean).join(', ');

      const addressData = {
        id: params?.editingAddress?.id || Date.now().toString(),
        label: form.tag,
        address: fullAddress,
        houseNo: form.houseNo.trim(),
        building: form.building.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        landmark: form.landmark.trim(),
        latitude: params.latitude,
        longitude: params.longitude,
        formattedAddress: params.formattedAddress,
        isPrimary: form.isDefault,
      };

      AnalyticsService.logEvent('search', {
        search_term: fullAddress,
        location_type: 'address_form_save',
      });

      if (isEditing) {
        await updateUserAddress(user.uid, addressData);
        updateInStore(addressData as any);
        setCurrentAddress(fullAddress, params.latitude, params.longitude);
      } else {
        const newAddress = await addAddress(user.uid, form.tag, fullAddress, params.latitude, params.longitude, form.isDefault);
        addToStore({ ...newAddress, ...addressData } as any);
        setCurrentAddress(fullAddress, params.latitude, params.longitude);
      }

      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message || 'Failed to save address', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof typeof form>(field: K, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={20} color="#09090B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Address Details</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={styles.headerSave}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Confirmed Location Card */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.locationCard}
          >
            <View style={styles.mapThumb}>
              <LinearGradient
                colors={['rgba(124,58,237,0.12)', 'rgba(168,85,247,0.06)']}
                style={StyleSheet.absoluteFill}
              />
              <Navigation2 size={26} color="#7C3AED" strokeWidth={1.5} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>{form.tag} • {form.houseNo || 'Location'}</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {params.formattedAddress}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.repinBtn}>
              <MapPin size={14} color="#7C3AED" />
              <Text style={styles.repinText}>Re-pin</Text>
            </TouchableOpacity>
          </MotiView>

          {/* Form Card */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100, type: 'timing', duration: 300 }}
            style={styles.formCard}
          >
            {/* Flat / House No */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Flat / House No.</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat 4B"
                placeholderTextColor="#A1A1AA"
                value={form.houseNo}
                onChangeText={v => updateField('houseNo', v)}
              />
            </View>

            {/* Building / Society */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Building / Society</Text>
              <TextInput
                style={styles.input}
                placeholder="Lake View Apartments"
                placeholderTextColor="#A1A1AA"
                value={form.building}
                onChangeText={v => updateField('building', v)}
              />
            </View>

            {/* Street / Area */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Street / Area</Text>
              <TextInput
                style={[styles.input, styles.inputPrefilled]}
                placeholder="Street / Area"
                placeholderTextColor="#A1A1AA"
                value={form.street}
                onChangeText={v => updateField('street', v)}
              />
            </View>

            {/* City + Pincode row */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput
                  style={[styles.input, styles.inputPrefilled]}
                  placeholder="City"
                  placeholderTextColor="#A1A1AA"
                  value={form.city}
                  onChangeText={v => updateField('city', v)}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>Pincode</Text>
                <TextInput
                  style={[styles.input, styles.inputPrefilled]}
                  placeholder="Pincode"
                  placeholderTextColor="#A1A1AA"
                  value={form.pincode}
                  onChangeText={v => updateField('pincode', v)}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Landmark (optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Landmark (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Opposite Metro Pillar 123"
                placeholderTextColor="#A1A1AA"
                value={form.landmark}
                onChangeText={v => updateField('landmark', v)}
              />
            </View>
          </MotiView>

          {/* Address Type + Default Toggle Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200, type: 'timing', duration: 300 }}
            style={styles.typeCard}
          >
            <Text style={styles.typeCardLabel}>Address Type</Text>

            <View style={styles.chipRow}>
              {ADDRESS_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = form.tag === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() => updateField('tag', type.key)}
                    style={[styles.chip, isActive && styles.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Icon size={16} color={isActive ? '#FFFFFF' : '#09090B'} />
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {type.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Default Toggle */}
            <View style={styles.defaultRow}>
              <View style={styles.defaultInfo}>
                <Text style={styles.defaultLabel}>Set as Default Address</Text>
                <Text style={styles.defaultSubtext}>Use this address for faster checkout</Text>
              </View>
              <Switch
                value={form.isDefault}
                onValueChange={v => updateField('isDefault', v ? true : false)}
                trackColor={{ false: '#E2E8F0', true: '#7C3AED' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Save Button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 300, type: 'timing', duration: 300 }}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={styles.saveBtn}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Address</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </MotiView>
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
    letterSpacing: -0.4,
  },
  headerSave: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Location Card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mapThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
    marginRight: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    lineHeight: 18,
  },
  repinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
  },
  repinText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
    marginLeft: 4,
  },
  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#09090B',
  },
  inputPrefilled: {
    backgroundColor: '#F8FAFC',
    color: '#52525B',
  },
  fieldRow: {
    flexDirection: 'row',
  },
  // Type Card
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  typeCardLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  defaultInfo: {
    flex: 1,
    marginRight: 8,
  },
  defaultLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
  },
  defaultSubtext: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    marginTop: 2,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245,243,255,0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
    elevation: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
});
