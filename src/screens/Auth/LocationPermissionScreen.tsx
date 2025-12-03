import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAddressStore } from '../../store';
import { addAddress } from '../../services/firestore';
import { useAuthStore } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/constants';

export const LocationPermissionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { setCurrentAddress } = useAddressStore();
  const [loading, setLoading] = useState(false);

  const handleUseCurrentLocation = async () => {
    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required. Please enter manually.', [{ text: 'OK' }]);
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        const formattedAddress = [
          address.street,
          address.city,
          address.region,
          address.postalCode,
          address.country,
        ].filter(Boolean).join(', ');

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

        navigation.navigate('Home' as never);
      } else {
        Alert.alert('Error', 'Could not get address. Please enter manually.');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get location. Please enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    navigation.navigate('AddAddress' as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.heading}>Enable Location</Text>
      <Text style={styles.subtitle}>We need your location to provide doorstep service</Text>

      <TouchableOpacity
        onPress={handleUseCurrentLocation}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Use Current Location</Text>
        )}
      </TouchableOpacity>

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
    paddingHorizontal: SPACING.md,
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
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.background,
  },
  buttonSecondary: {
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonSecondaryText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
