import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Location from 'expo-location';
import { useAddressStore, useAuthStore, useUIStore } from '../../store';
import { addAddress } from '../../services/firestore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { BrandLoader } from '../../components/BrandLoader';
import { AnimatedButton } from '../../components/AnimatedButton';

const { width } = Dimensions.get('window');

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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'SpinZoApp/1.0',
          },
        }
      );

      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
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
          message: 'Location permission is required to find services near you. You can skip for now and set it later.',
          type: 'warning'
        });
        setLoading(false);
        return;
      }

      setStatusText('Fetching Location...');

      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'web' ? Location.Accuracy.Balanced : Location.Accuracy.High,
      }).catch((err) => {
        // Swallow errors if this promise loses the race (timeout)
        // If it wins, the error will be caught by the main try/catch block via Promise.race re-throwing
        if (loading) throw err; // propagate if we are still loading (race hasn't finished/timeout hasn't fired logic yet?) 
        // Actually simplest is just to return null and let validation handle it, or stick to standard race pattern.
        // Better: just silence it. The await Promise.race will assume rejection if it wins.
        throw err;
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 10000)
      );

      const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;

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

        (navigation as any).navigate('AddressMap', {
          initialLat: location.coords.latitude,
          initialLng: location.coords.longitude,
          returnTo: params?.returnTo
        });
      } else {
        showAlert({
          title: 'Location Found',
          message: 'We found your location but couldn\'t resolve the address. Please use the map to refine it.',
          type: 'info'
        });
        (navigation as any).navigate('AddressMap', {
          initialLat: location.coords.latitude,
          initialLng: location.coords.longitude,
          returnTo: params?.returnTo
        });
      }
    } catch (error: any) {
      console.error('Location error:', error);
      const isTimeout = error.message === 'TIMEOUT';
      showAlert({
        title: isTimeout ? 'Request Timed Out' : 'Location Error',
        message: isTimeout
          ? 'It\'s taking longer than expected. Please try again or Skip for now.'
          : 'Failed to get location. Please check your GPS/Internet settings or Skip for now.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const handleSkip = () => {
    const { setHasSkippedLocation } = useAddressStore.getState();
    setHasSkippedLocation(true);

    const returnTo = params?.returnTo;

    if (returnTo) {
      (navigation as any).reset({
        index: 0,
        routes: [{
          name: 'Main',
          state: {
            routes: [{ name: 'MainTabs' }, { name: returnTo }]
          }
        }]
      });
      return;
    }

    if (user) {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF', '#EEF2FF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blur circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + SPACING.lg }]}>
        {/* Premium 3D Illustration */}
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 200 }}
          style={styles.illustrationContainer}
        >
          <Image
            source={require('../../../assets/location_illustration.png')}
            style={styles.illustration}
            contentFit="contain"
            transition={500}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400 }}
        >
          <Text style={styles.heading}>Enable Location</Text>
          <Text style={styles.subtitle}>
            We need your location to provide{'\n'}doorstep laundry service
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 600 }}
          style={styles.buttonsContainer}
        >
          <AnimatedButton
            onPress={handleUseCurrentLocation}
            disabled={loading}
            style={styles.primaryButton}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.primaryButtonText}>Use Current Location</Text>
          </AnimatedButton>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={loading}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Trust indicator */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 800 }}
          style={styles.trustBadge}
        >
          <Text style={styles.trustText}>🔒 Your location data is secure and private</Text>
        </MotiView>
      </View>

      {loading && <BrandLoader fullscreen message={statusText || "Getting location..."} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  illustrationContainer: {
    marginBottom: SPACING.xl,
    ...SHADOWS.lg,
  },
  illustration: {
    width: width * 0.55,
    height: width * 0.55,
  },
  heading: {
    ...TYPOGRAPHY.display,
    fontSize: 28,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    marginBottom: SPACING.xl * 2,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  trustBadge: {
    marginTop: SPACING.xl * 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...SHADOWS.sm,
  },
  trustText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
