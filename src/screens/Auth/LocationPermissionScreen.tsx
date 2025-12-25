import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAddressStore, useAuthStore, useUIStore } from '../../store';
import { addAddress } from '../../services/firestore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/constants';
import { BrandLoader } from '../../components/BrandLoader';

export const LocationPermissionScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { setCurrentAddress } = useAddressStore();
  const { showAlert } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      // Use OpenStreetMap Nominatim API
      // Note: Usage Policy requires a User-Agent: https://operations.osmfoundation.org/policies/nominatim/
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'SpinitApp/1.0', // Replace with your app name
          },
        }
      );

      const data = await response.json();

      if (data && data.display_name) {
        // Nominatim returns a 'display_name' which is the full formatted address
        // It also returns 'address' object with components if needed
        return data.display_name;
      } else {
        console.warn('Nominatim reverse geocoding failed/empty');
        // Fallback to Expo Location (System Geocoding)
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const address = geocode[0];
          return [
            address.name,
            address.street,
            address.district,
            address.city,
            address.region,
            address.postalCode
          ].filter(Boolean).join(', ');
        }
      }
    } catch (error) {
      console.error("Geocoding error", error);
      // Fallback on error
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const address = geocode[0];
        return [
          address.street,
          address.city,
          address.region
        ].filter(Boolean).join(', ');
      }
    }
    return null;
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setStatusText('Requesting Permission...');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        showAlert({
          title: 'Permission Denied',
          message: 'Location permission is required. Please enter manually.',
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      setStatusText('Fetching Location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setStatusText('Finding Address...');
      const formattedAddress = await getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      if (formattedAddress) {
        if (user) {
          await addAddress(
            user.uid,
            'Current Location',
            formattedAddress,
            location.coords.latitude,
            location.coords.longitude,
            true
          );
        }

        setCurrentAddress(
          formattedAddress,
          location.coords.latitude,
          location.coords.longitude
        );

        // Navigate to AddressMap with coordinates for refinement
        (navigation as any).navigate('AddressMap', {
          initialLat: location.coords.latitude,
          initialLng: location.coords.longitude
        });
      } else {
        showAlert({
          title: 'Error',
          message: 'Could not fetch address details. Please try again.',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Location error:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to get location. Please check your internet/GPS.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const handleManualEntry = () => {
    // For now, navigating to Home, but ideally should go to an address search screen
    // navigation.navigate('AddAddress' as never);
    (navigation as any).navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.lg }]}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.heading}>Enable Location</Text>
      <Text style={styles.subtitle}>We need your location to provide doorstep service</Text>

      <TouchableOpacity
        onPress={handleUseCurrentLocation}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>Use Current Location</Text>
      </TouchableOpacity>

      {/* Brand Loader overlay */}
      {loading && <BrandLoader fullscreen message={statusText || "Getting location..."} />}

      <TouchableOpacity
        onPress={handleManualEntry}
        disabled={loading}
        style={styles.buttonSecondary}
      >
        <Text style={styles.buttonSecondaryText}>Enter Location Manually</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.xl,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.md,
    textAlign: 'center',
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xl * 3,
    textAlign: 'center',
    color: COLORS.textSecondary,
    maxWidth: '80%',
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.background,
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.background,
    marginLeft: SPACING.sm,
  },
  buttonSecondary: {
    width: '100%',
    paddingVertical: SPACING.md + 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  buttonSecondaryText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary,
    fontSize: 16,
  },
});
