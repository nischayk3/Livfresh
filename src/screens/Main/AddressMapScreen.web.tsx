import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { GoogleMap, useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { addAddress, updateUserAddress } from '../../services/firestore';
import { useAuthStore, useAddressStore } from '../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Google Maps API Configuration
const GOOGLE_MAPS_API_KEY = 'AIzaSyADDmG-kNKYDNa0eBoamy6nin03XkkcvWs';
const LIBRARIES: ("places")[] = ['places'];

// Default coordinates (Bangalore)
const DEFAULT_CENTER = {
    lat: 12.9716,
    lng: 77.5946,
};

const { width } = Dimensions.get('window');

// Map container style
const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

// Map options for a clean look
const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    gestureHandling: 'greedy',
    styles: [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
        },
    ],
};

type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

export const AddressMapScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuthStore();
    const { setCurrentAddress, addAddress: addAddressToStore, updateAddress: updateAddressInStore } = useAddressStore();
    const insets = useSafeAreaInsets();

    // Load Google Maps API
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    });

    // Params
    const { initialLat, initialLng, editingAddress } = route.params as {
        initialLat?: number;
        initialLng?: number;
        editingAddress?: any;
    } || {};

    // Map reference
    const mapRef = useRef<google.maps.Map | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // Current center coordinates
    const [center, setCenter] = useState({
        lat: initialLat || (editingAddress ? editingAddress.latitude : DEFAULT_CENTER.lat),
        lng: initialLng || (editingAddress ? editingAddress.longitude : DEFAULT_CENTER.lng),
    });

    // Region ref for saving
    const currentRegionRef = useRef<Region>({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    });

    const [addressDetails, setAddressDetails] = useState({
        houseNo: editingAddress ? (editingAddress.address.split(',')[0] || '') : '',
        landmark: '',
        tag: editingAddress?.label || 'Home',
        formattedAddress: editingAddress
            ? (typeof editingAddress.address === 'string' ? editingAddress.address : editingAddress.address.formattedAddress)
            : 'Fetching location...',
    });

    const [searchValue, setSearchValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Reverse geocode using Google Geocoding API
    const fetchAddress = useCallback(async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
            );

            if (!response.ok) throw new Error('Geocoding failed');

            const data = await response.json();
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                // Get the best formatted address
                const result = data.results[0];
                setAddressDetails(prev => ({
                    ...prev,
                    formattedAddress: result.formatted_address,
                }));
            }
        } catch (error) {
            console.warn('Geocoding error:', error);
            // Fallback to Nominatim if Google fails
            try {
                const fallbackResponse = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                );
                const fallbackData = await fallbackResponse.json();
                if (fallbackData?.display_name) {
                    setAddressDetails(prev => ({
                        ...prev,
                        formattedAddress: fallbackData.display_name,
                    }));
                }
            } catch (fallbackError) {
                console.warn('Fallback geocoding error:', fallbackError);
            }
        }
    }, []);

    // Initialize location on mount
    useEffect(() => {
        const initLocation = async () => {
            let lat = center.lat;
            let lng = center.lng;

            // Only fetch current location if NO params provided and NOT editing
            if (!initialLat && !initialLng && !editingAddress) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({});
                        lat = loc.coords.latitude;
                        lng = loc.coords.longitude;

                        setCenter({ lat, lng });
                        currentRegionRef.current = {
                            latitude: lat,
                            longitude: lng,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        };
                    }
                } catch (e) {
                    console.error('Location permission error:', e);
                }
            }

            // Fetch address for initial location
            if (!editingAddress) {
                fetchAddress(lat, lng);
            }
        };

        if (isLoaded) {
            initLocation();
        }
    }, [isLoaded]);

    // Handle map drag end
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);

        if (mapRef.current) {
            const newCenter = mapRef.current.getCenter();
            if (newCenter) {
                const lat = newCenter.lat();
                const lng = newCenter.lng();

                currentRegionRef.current = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };

                fetchAddress(lat, lng);
            }
        }
    }, [fetchAddress]);

    // Handle map drag start
    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    // Handle map load
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    // Handle autocomplete load
    const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    }, []);

    // Handle place selection from autocomplete
    const onPlaceChanged = useCallback(() => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();

            if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                // Update center and move map
                setCenter({ lat, lng });
                currentRegionRef.current = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };

                // Update address
                setAddressDetails(prev => ({
                    ...prev,
                    formattedAddress: place.formatted_address || place.name || 'Selected Location',
                }));

                // Clear search input
                setSearchValue('');

                // Pan map to new location
                if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(17);
                }
            }
        }
    }, []);

    // Use current location button handler
    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                const lat = loc.coords.latitude;
                const lng = loc.coords.longitude;

                setCenter({ lat, lng });
                currentRegionRef.current = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };

                if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(17);
                }

                fetchAddress(lat, lng);
            } else {
                alert('Location permission denied. Please enable it in your browser settings.');
            }
        } catch (error) {
            console.error('Error getting current location:', error);
            alert('Could not get your current location. Please try again.');
        } finally {
            setIsLocating(false);
        }
    };

    // Save address handler
    const handleSaveAddress = async () => {
        if (!addressDetails.houseNo.trim()) {
            alert('Please enter House/Flat Number');
            return;
        }

        if (!user?.uid) {
            alert('User not logged in');
            return;
        }

        setLoading(true);
        try {
            const fullAddress = `${addressDetails.houseNo}, ${addressDetails.landmark ? addressDetails.landmark + ', ' : ''}${addressDetails.formattedAddress}`;
            const regionToSave = currentRegionRef.current;
            const isPrimary = editingAddress ? editingAddress.isPrimary : true;

            const addressData = {
                id: editingAddress?.id,
                label: addressDetails.tag,
                address: fullAddress,
                latitude: regionToSave.latitude,
                longitude: regionToSave.longitude,
                isPrimary: isPrimary
            };

            if (editingAddress) {
                await updateUserAddress(user.uid, addressData as any);
                updateAddressInStore(addressData as any);
                setCurrentAddress(fullAddress, regionToSave.latitude, regionToSave.longitude);
                alert('Address updated!');
                navigation.goBack();
            } else {
                const newAddress = await addAddress(
                    user.uid,
                    addressDetails.tag,
                    fullAddress,
                    regionToSave.latitude,
                    regionToSave.longitude,
                    true
                );
                addAddressToStore(newAddress as any);
                setCurrentAddress(fullAddress, regionToSave.latitude, regionToSave.longitude);
                alert('Address saved!');
                navigation.navigate('MainTabs' as never);
            }

        } catch (error: any) {
            console.error('Save address error:', error);
            alert('Failed to save address: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loadError) {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color={COLORS.error} />
                    <Text style={styles.errorText}>Failed to load Google Maps</Text>
                    <Text style={styles.errorSubtext}>Please check your internet connection</Text>
                </View>
            </View>
        );
    }

    if (!isLoaded) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading map...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map Section */}
            <View style={styles.mapContainer}>
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={17}
                    options={mapOptions}
                    onLoad={onMapLoad}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                />

                {/* Fixed Center Marker */}
                <View style={styles.markerFixed}>
                    <View style={[styles.markerShadow, isDragging && styles.markerDragging]} />
                    <Ionicons
                        name="location"
                        size={48}
                        color={COLORS.primary}
                        style={isDragging ? styles.markerIconDragging : undefined}
                    />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={onPlaceChanged}
                        options={{
                            componentRestrictions: { country: 'in' },
                            types: ['geocode', 'establishment'],
                        }}
                    >
                        <View style={styles.searchInputWrapper}>
                            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search for area, street name..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: 44,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 16,
                                    fontFamily: 'inherit',
                                    backgroundColor: 'transparent',
                                    paddingLeft: 8,
                                }}
                            />
                        </View>
                    </Autocomplete>
                </View>

                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>

                {/* Current Location Button */}
                <TouchableOpacity
                    style={styles.currentLocationButton}
                    onPress={handleUseCurrentLocation}
                    disabled={isLocating}
                >
                    {isLocating ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Ionicons name="locate" size={24} color={COLORS.primary} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Form Section */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.formContainer}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) + 60 }]}
                >
                    <Text style={styles.heading}>Select Location</Text>

                    <View style={styles.currentLocationContainer}>
                        <Ionicons name="navigate-circle" size={24} color={COLORS.primary} style={styles.icon} />
                        <View style={styles.textContainer}>
                            <Text style={styles.locationTitle}>
                                {isDragging ? 'Locating...' : 'Selected Location'}
                            </Text>
                            <Text style={styles.locationText} numberOfLines={2}>
                                {isDragging ? 'Release to select' : addressDetails.formattedAddress}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.inputLabel}>House / Flat / Block No.</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Flat 302, Sushant Apt"
                        value={addressDetails.houseNo}
                        onChangeText={(text) => setAddressDetails(prev => ({ ...prev, houseNo: text }))}
                    />

                    <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Near City Center Mall"
                        value={addressDetails.landmark}
                        onChangeText={(text) => setAddressDetails(prev => ({ ...prev, landmark: text }))}
                    />

                    <Text style={styles.inputLabel}>Save As</Text>
                    <View style={styles.tagsContainer}>
                        {['Home', 'Work', 'Other'].map((tag) => (
                            <TouchableOpacity
                                key={tag}
                                style={[styles.tag, addressDetails.tag === tag && styles.tagSelected]}
                                onPress={() => setAddressDetails(prev => ({ ...prev, tag }))}
                            >
                                <Ionicons
                                    name={tag === 'Home' ? 'home' : tag === 'Work' ? 'briefcase' : 'location'}
                                    size={18}
                                    color={addressDetails.tag === tag ? '#FFF' : COLORS.textSecondary}
                                />
                                <Text style={[styles.tagText, addressDetails.tag === tag && styles.tagTextSelected]}>{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSaveAddress}
                        disabled={loading || isDragging}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Confirm & Save Address</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    mapContainer: {
        flex: 0.5,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    markerFixed: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -24,
        marginTop: -48,
        zIndex: 10,
        pointerEvents: 'none',
        alignItems: 'center',
    },
    markerShadow: {
        position: 'absolute',
        bottom: -8,
        width: 20,
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 10,
    },
    markerDragging: {
        width: 30,
        height: 12,
        bottom: -4,
    },
    markerIconDragging: {
        transform: [{ translateY: -10 }, { scale: 1.1 }],
    },
    searchContainer: {
        position: 'absolute',
        top: 12,
        left: 60,
        right: 20,
        zIndex: 30,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        ...SHADOWS.md,
    },
    searchIcon: {
        marginRight: 4,
    },
    backButton: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: COLORS.background,
        padding: 10,
        borderRadius: 50,
        ...SHADOWS.md,
        zIndex: 20,
    },
    currentLocationButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 50,
        ...SHADOWS.md,
        zIndex: 20,
    },
    formContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: SPACING.md,
        marginTop: -20,
        ...SHADOWS.lg,
    },
    scrollView: {
        flex: 1,
        // @ts-ignore - web-specific
        overflow: 'auto',
    },
    scrollContent: {
        flexGrow: 1,
    },
    heading: {
        ...TYPOGRAPHY.subheading,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    currentLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.backgroundLight,
        borderRadius: RADIUS.md,
    },
    icon: {
        marginRight: SPACING.sm,
    },
    textContainer: {
        flex: 1,
    },
    locationTitle: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.primary,
    },
    locationText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderLight,
        marginVertical: SPACING.md,
    },
    inputLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        color: COLORS.text,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...TYPOGRAPHY.body,
        backgroundColor: '#FFF',
    },
    tagsContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xl,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.sm,
        backgroundColor: '#FFF',
    },
    tagSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tagText: {
        marginLeft: 6,
        ...TYPOGRAPHY.bodySmall,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    tagTextSelected: {
        color: '#FFF',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...SHADOWS.primary,
    },
    saveButtonText: {
        ...TYPOGRAPHY.button,
        color: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    errorText: {
        ...TYPOGRAPHY.subheading,
        marginTop: SPACING.md,
        color: COLORS.error,
    },
    errorSubtext: {
        ...TYPOGRAPHY.body,
        marginTop: SPACING.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
