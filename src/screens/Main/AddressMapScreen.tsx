import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Navigation2, CheckCircle, ArrowRight, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { reverseGeocode, GeocodedAddress } from '../../utils/geocoding';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const MAP_HEIGHT = height * 0.52;

export const AddressMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const params = route.params as {
    initialLat?: number;
    initialLng?: number;
    editingAddress?: any;
  } || {};

  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region>({
    latitude: params.initialLat || (params.editingAddress?.latitude || 12.9716),
    longitude: params.initialLng || (params.editingAddress?.longitude || 77.5946),
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [address, setAddress] = useState<GeocodedAddress | null>(
    params.editingAddress
      ? { formattedAddress: params.editingAddress.address || params.editingAddress.formattedAddress || '' }
      : null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Keep a ref to the latest geocode promise so stale results are ignored
  const geocodeSeqRef = useRef(0);

  const doGeocode = useCallback(async (lat: number, lng: number) => {
    const seq = ++geocodeSeqRef.current;
    setGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (seq === geocodeSeqRef.current) {
        setAddress(result);
      }
    } finally {
      if (seq === geocodeSeqRef.current) {
        setGeocoding(false);
        setIsDragging(false);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      let lat = currentRegionRef.current.latitude;
      let lng = currentRegionRef.current.longitude;

      if (!params.initialLat && !params.initialLng && !params.editingAddress) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          setHasPermission(status === 'granted');
          if (status === 'granted') {
            const loc = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
              new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
            ]) as Location.LocationObject;
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch {
          // use defaults
        }
      } else {
        const { status } = await Location.getForegroundPermissionsAsync();
        setHasPermission(status === 'granted');
      }

      const region: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      currentRegionRef.current = region;
      setInitialRegion(region);

      if (!params.editingAddress) {
        doGeocode(lat, lng);
      }
    };
    init();
  }, []);

  const handleRegionChange = () => {
    if (!isDragging) setIsDragging(true);
  };

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      currentRegionRef.current = region;
      doGeocode(region.latitude, region.longitude);
    },
    [doGeocode],
  );

  const handleUseMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location access in Settings to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      currentRegionRef.current = region;
      mapRef.current?.animateToRegion(region, 500);
      doGeocode(latitude, longitude);
    } catch {
      Alert.alert('Error', 'Could not fetch your location. Try again.');
    }
  };

  // Search for a place via forward geocoding
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const GOOGLE_KEY = 'AIzaSyADDmG-kNKYDNa0eBoamy6nin03XkkcvWs';
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_KEY}`,
      );
      const data = await resp.json();
      if (data.status === 'OK' && data.results?.[0]) {
        const loc = data.results[0].geometry.location;
        const region: Region = {
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };
        currentRegionRef.current = region;
        mapRef.current?.animateToRegion(region, 500);
        doGeocode(loc.lat, loc.lng);
      } else {
        Alert.alert('Not found', 'Could not find that location. Try a different search.');
      }
    } catch {
      Alert.alert('Error', 'Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, doGeocode]);

  const handleConfirm = () => {
    const region = currentRegionRef.current;
    const selectedAddress = address?.formattedAddress || '';

    (navigation as any).navigate('AddressForm', {
      latitude: region.latitude,
      longitude: region.longitude,
      formattedAddress: selectedAddress,
      city: address?.city || '',
      pincode: address?.pincode || '',
      state: address?.state || '',
      street: address?.street || '',
      suburb: address?.suburb || '',
      editingAddress: params.editingAddress || null,
    });
  };

  if (!initialRegion) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const isAppleMaps = Platform.OS === 'ios';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={20} color="#09090B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pin Your Location</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map Section */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={initialRegion}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={hasPermission === true}
          showsMyLocationButton={false}
        />

        {/* Search input (native replacement for Google Places search) */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Search size={18} color="#71717A" strokeWidth={2.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area, street, landmark..."
              placeholderTextColor="#A1A1AA"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={!searching}
            />
            {searching && <ActivityIndicator size="small" color="#7C3AED" />}
          </View>
        </View>

        {/* Center Pin */}
        <View style={styles.pinContainer}>
          <View style={styles.pinGlow} />
          <View style={styles.pinRing} />
          <View style={styles.dragTooltip}>
            <Text style={styles.dragTooltipText}>Drag to adjust</Text>
          </View>
          <MapPin size={40} color="#7C3AED" fill="#7C3AED" />
        </View>

        {/* My Location Button */}
        <TouchableOpacity onPress={handleUseMyLocation} style={styles.myLocationBtn}>
          <Navigation2 size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      {/* Sheet */}
      <MotiView
        from={{ translateY: 40, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        style={styles.sheet}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetContent}>
          {/* Location Info */}
          <View style={styles.locationRow}>
            <View style={styles.locationTextWrap}>
              <Text style={styles.sectionLabel}>SELECTED LOCATION</Text>
              {geocoding ? (
                <View style={styles.geocodingRow}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={styles.geocodingText}>Resolving address...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.addressMain} numberOfLines={2}>
                    {address?.street || address?.city || address?.formattedAddress?.split(',').slice(0, 3).join(',') || 'Move the pin'}
                  </Text>
                  <Text style={styles.addressFull} numberOfLines={2}>
                    {address?.formattedAddress || ''}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={handleUseMyLocation}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Button — disabled while geocoding */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={geocoding || !address?.formattedAddress}
            style={[styles.confirmBtn, (geocoding || !address?.formattedAddress) && styles.confirmBtnDisabled]}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={geocoding || !address?.formattedAddress ? ['#A1A1AA', '#D4D4D8'] : ['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>
              {geocoding ? 'Resolving...' : 'Confirm Location'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 20,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit_600SemiBold', color: '#09090B', letterSpacing: -0.4 },
  mapWrapper: { height: MAP_HEIGHT, position: 'relative', overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  searchContainer: {
    position: 'absolute', top: 12, left: 56, right: 16, zIndex: 30,
  },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, height: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: 'Outfit_400Regular', color: '#09090B',
    marginLeft: 8, paddingVertical: 0,
  },
  pinContainer: {
    position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40,
    alignItems: 'center', zIndex: 10, pointerEvents: 'none',
  },
  pinGlow: {
    position: 'absolute', bottom: -20, width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  pinRing: {
    position: 'absolute', bottom: -10, width: 64, height: 64, borderRadius: 32,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  dragTooltip: {
    position: 'absolute', top: -32, backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  dragTooltipText: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: '#71717A' },
  myLocationBtn: {
    position: 'absolute', top: 64, left: 12, width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 6,
    zIndex: 20,
  },
  sheet: {
    flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -5,
    shadowColor: '#5B21B6', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 8,
  },
  sheetHandle: { width: 48, height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', alignSelf: 'center', marginTop: 14, marginBottom: 8 },
  sheetContent: { flex: 1, paddingHorizontal: 24, paddingTop: 8, justifyContent: 'space-between', paddingBottom: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  locationTextWrap: { flex: 1, marginRight: 12 },
  sectionLabel: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: '#71717A', letterSpacing: 2.88, marginBottom: 6 },
  geocodingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  geocodingText: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#71717A' },
  addressMain: { fontSize: 17, fontFamily: 'Outfit_600SemiBold', color: '#09090B', lineHeight: 22, marginBottom: 4 },
  addressFull: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#71717A', lineHeight: 20 },
  changeBtn: {
    backgroundColor: 'rgba(124,58,237,0.08)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)',
  },
  changeBtnText: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: '#7C3AED' },
  confirmBtn: {
    height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', gap: 8,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.28, shadowRadius: 40, elevation: 10,
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' },
});
