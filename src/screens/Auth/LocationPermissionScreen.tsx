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
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Navigation2, ShieldCheck, ArrowRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAddressStore, useAuthStore, useUIStore } from '../../store';
import { addAddress } from '../../services/firestore';
import { BrandLoader } from '../../components/BrandLoader';
import { ASSET_URLS } from '../../utils/assetUrls';

const { width } = Dimensions.get('window');

export const LocationPermissionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const params = route.params;
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
        { headers: { 'User-Agent': 'SpinZoApp/1.0' } }
      );
      const data = await response.json();
      if (data?.display_name) return data.display_name;
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const a = geocode[0];
        return [a.name, a.street, a.district, a.city, a.region, a.postalCode].filter(Boolean).join(', ');
      }
    } catch {
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const a = geocode[0];
          return [a.street, a.city, a.region].filter(Boolean).join(', ');
        }
      } catch { /* silent */ }
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
          type: 'warning',
        });
        setLoading(false);
        return;
      }

      setStatusText('Finding your location...');
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'web' ? Location.Accuracy.Balanced : Location.Accuracy.High,
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000));
      const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;

      setStatusText('Pinpointing address...');
      const formattedAddress = await getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      if (user) {
        await addAddress(user.uid, 'Home', formattedAddress || 'My Location', location.coords.latitude, location.coords.longitude, true).catch(() => {});
      }
      setCurrentAddress(formattedAddress || 'My Location', location.coords.latitude, location.coords.longitude);
      setLoading(false);

      (navigation as any).navigate('AddressMap', {
        initialLat: location.coords.latitude,
        initialLng: location.coords.longitude,
        returnTo: params?.returnTo,
      });
    } catch (error: any) {
      setLoading(false);
      const isTimeout = error?.message === 'TIMEOUT';
      showAlert({
        title: isTimeout ? 'Request Timed Out' : 'Location Error',
        message: isTimeout
          ? 'Taking longer than expected. Try again or Skip for now.'
          : 'Could not get your location. Check GPS/Internet or Skip for now.',
        type: 'error',
      });
    }
  };

  const handleSkip = () => {
    const { setHasSkippedLocation } = useAddressStore.getState();
    setHasSkippedLocation(true);
    const returnTo = params?.returnTo;
    if (returnTo) {
      (navigation as any).navigate('Main', { screen: 'MainTabs', params: { screen: returnTo } });
    } else {
      (navigation as any).navigate('Main', { screen: 'MainTabs' });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF', '#EEF2FF']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bgOrb1]} />
      <View style={[styles.bgOrb2]} />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}>
        {/* Premium Illustration */}
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 16 }}
          style={styles.illustrationWrap}
        >
          <View style={styles.illustrationGlow} />
          <Image
            source={{ uri: ASSET_URLS.location_illustration }}
            style={styles.illustration}
            contentFit="contain"
            transition={500}
          />
        </MotiView>

        {/* Text Content */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, type: 'spring', damping: 18 }}
          style={styles.textSection}
        >
          <Text style={styles.title}>Find Services Near You</Text>
          <Text style={styles.subtitle}>
            We need your location to show available{'\n'}laundry services in your area
          </Text>
        </MotiView>

        {/* Buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 350, type: 'spring', damping: 18 }}
          style={styles.btnSection}
        >
          <TouchableOpacity
            onPress={handleUseCurrentLocation}
            disabled={loading}
            style={styles.primaryBtn}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Navigation2 size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.primaryBtnText}>Use Current Location</Text>
            <ArrowRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} disabled={loading} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Trust Badge */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 500, type: 'timing', duration: 400 }}
          style={styles.trustBadge}
        >
          <ShieldCheck size={12} color="#7C3AED" strokeWidth={2.5} />
          <Text style={styles.trustText}>Your location data is secure and private</Text>
        </MotiView>
      </View>

      {loading && <BrandLoader fullscreen message={statusText || 'Getting location...'} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bgOrb1: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: -60,
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(99,102,241,0.05)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  illustrationWrap: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationGlow: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(124,58,237,0.08)',
    top: 10,
  },
  illustration: {
    width: width * 0.5,
    height: width * 0.5,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    color: '#09090B',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
  },
  btnSection: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
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
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  skipBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: '#71717A',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
  },
});
