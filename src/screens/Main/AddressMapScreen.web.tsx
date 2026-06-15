import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { GoogleMap, useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Navigation2, CheckCircle, ArrowRight, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { reverseGeocode, GeocodedAddress } from '../../utils/geocoding';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.52;

const GOOGLE_MAPS_API_KEY = 'AIzaSyADDmG-kNKYDNa0eBoamy6nin03XkkcvWs';
const LIBRARIES: ("places")[] = ['places'];

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
};

export const AddressMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const params = route.params as { initialLat?: number; initialLng?: number; editingAddress?: any } || {};

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [center, setCenter] = useState({
    lat: params.initialLat || (params.editingAddress?.latitude || DEFAULT_CENTER.lat),
    lng: params.initialLng || (params.editingAddress?.longitude || DEFAULT_CENTER.lng),
  });
  const [selectedAddress, setSelectedAddress] = useState<GeocodedAddress | null>(
    params.editingAddress
      ? { formattedAddress: params.editingAddress.address || params.editingAddress.formattedAddress || '' }
      : null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const geocodeSeqRef = useRef(0);

  const doGeocode = useCallback(async (lat: number, lng: number) => {
    const seq = ++geocodeSeqRef.current;
    setGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (seq === geocodeSeqRef.current) {
        setSelectedAddress(result);
      }
    } finally {
      if (seq === geocodeSeqRef.current) {
        setGeocoding(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const init = async () => {
      let lat = center.lat;
      let lng = center.lng;
      if (!params.initialLat && !params.initialLng && !params.editingAddress) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
            setCenter({ lat, lng });
          }
        } catch { /* defaults */ }
      }
      if (!params.editingAddress) doGeocode(lat, lng);
    };
    init();
  }, [isLoaded]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (mapRef.current) {
      const c = mapRef.current.getCenter();
      if (c) {
        const lat = c.lat();
        const lng = c.lng();
        setCenter({ lat, lng });
        doGeocode(lat, lng);
      }
    }
  }, [doGeocode]);

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude: lat, longitude: lng } = loc.coords;
        setCenter({ lat, lng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(17);
        }
        doGeocode(lat, lng);
      }
    } catch { /* silent */ }
    setIsLocating(false);
  };

  const handleConfirm = () => {
    (navigation as any).navigate('AddressForm', {
      latitude: center.lat,
      longitude: center.lng,
      formattedAddress: selectedAddress?.formattedAddress || '',
      city: selectedAddress?.city || '',
      pincode: selectedAddress?.pincode || '',
      state: selectedAddress?.state || '',
      street: selectedAddress?.street || '',
      suburb: selectedAddress?.suburb || '',
      editingAddress: params.editingAddress || null,
    });
  };

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCenter({ lat, lng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(17);
        }
        doGeocode(lat, lng);
        setSearchValue('');
      }
    }
  }, [doGeocode]);

  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#EF4444' }}>Failed to load map</Text>
        </View>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </View>
    );
  }

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
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={17}
          options={mapOptions}
          onLoad={onMapLoad}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
            options={{ componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment'] }}
          >
            <View style={styles.searchInputWrap}>
              <Search size={18} color="#71717A" />
              <input
                type="text"
                placeholder="Search for area, street name..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  flex: 1,
                  height: 44,
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'Outfit_400Regular, sans-serif',
                  backgroundColor: 'transparent',
                  paddingLeft: 8,
                }}
              />
            </View>
          </Autocomplete>
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
        <TouchableOpacity onPress={handleUseMyLocation} disabled={isLocating} style={styles.myLocationBtn}>
          {isLocating ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <Navigation2 size={20} color="#7C3AED" />
          )}
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
          <View style={styles.locationRow}>
            <View style={styles.locationTextWrap}>
              <Text style={styles.sectionLabel}>SELECTED LOCATION</Text>
              {geocoding ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={{ fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#71717A' }}>Resolving address...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.addressMain} numberOfLines={2}>
                    {selectedAddress?.street || selectedAddress?.city || selectedAddress?.formattedAddress?.split(',').slice(0, 3).join(',') || 'Move the pin'}
                  </Text>
                  <Text style={styles.addressFull} numberOfLines={2}>
                    {selectedAddress?.formattedAddress || ''}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={handleUseMyLocation}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={geocoding || !selectedAddress?.formattedAddress}
            style={styles.confirmBtn}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={geocoding || !selectedAddress?.formattedAddress ? ['#A1A1AA', '#D4D4D8'] : ['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>{geocoding ? 'Resolving...' : 'Confirm Location'}</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 20,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit_600SemiBold', color: '#09090B', letterSpacing: -0.4 },
  mapWrapper: { height: MAP_HEIGHT, position: 'relative', overflow: 'hidden' },
  searchContainer: { position: 'absolute', top: 12, left: 56, right: 16, zIndex: 30 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
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
    position: 'absolute', top: 16, left: 12, width: 44, height: 44, borderRadius: 14,
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
  confirmBtnText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' },
});
