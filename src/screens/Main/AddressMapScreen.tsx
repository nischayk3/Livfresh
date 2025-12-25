import React, { useState, useEffect, useRef } from 'react';
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
    Alert,
    Keyboard,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { addAddress, updateUserAddress } from '../../services/firestore';
import { useAuthStore, useAddressStore, useUIStore } from '../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLoader } from '../../components/BrandLoader';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005; // Close zoom level
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export const AddressMapScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuthStore();
    const { setCurrentAddress, addAddress: addAddressToStore, updateAddress: updateAddressInStore } = useAddressStore();
    const { showAlert } = useUIStore();
    const insets = useSafeAreaInsets();

    // Params: 'editingAddress' is passed when editing an existing address
    const { initialLat, initialLng, editingAddress } = route.params as {
        initialLat?: number;
        initialLng?: number;
        editingAddress?: any;
    } || {};

    const mapRef = useRef<MapView>(null);

    // We maintain 'currentRegion' in a ref for saving, to avoid re-renders
    const currentRegionRef = useRef<Region>({
        latitude: initialLat || (editingAddress ? editingAddress.latitude : 12.9716),
        longitude: initialLng || (editingAddress ? editingAddress.longitude : 77.5946),
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });

    const [addressDetails, setAddressDetails] = useState({
        houseNo: editingAddress ? (editingAddress.address.split(',')[0] || '') : '', // Simple heuristic, can be improved if structed differently
        landmark: '',
        tag: editingAddress?.label || 'Home',
        formattedAddress: editingAddress
            ? (typeof editingAddress.address === 'string' ? editingAddress.address : editingAddress.address.formattedAddress)
            : 'Fetching location...',
    });

    // If editing, extract houseNo more smartly if possible or rely on user re-entry if needed.
    // Ideally we stored structured data. For now, we assume the user might need to re-enter house no if simple split fails,
    // or we just pre-fill what we have.

    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial Region
    const [initialRegion, setInitialRegion] = useState<Region | null>(null);

    // Reverse Geocode Logic
    const fetchAddress = async (lat: number, lng: number) => {
        try {
            // Keep "Loading..." text or similar
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                {
                    headers: {
                        'User-Agent': 'SpinitApp/1.0 (android-app)',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                }
            );

            if (!response.ok) throw new Error('Geocoding failed');

            const data = await response.json();
            if (data && data.display_name) {
                setAddressDetails(prev => ({
                    ...prev,
                    formattedAddress: data.display_name,
                }));
            }
        } catch (error) {
            console.warn('Geocoding error:', error);
        }
    };

    // Initialize Location
    useEffect(() => {
        const initLocation = async () => {
            // If editing, we already have the region from params (handled in ref init)
            // If new, we might check permissions
            let lat = currentRegionRef.current.latitude;
            let lng = currentRegionRef.current.longitude;

            // Only fetch current location if NO params provided and NOT editing
            if (!initialLat && !initialLng && !editingAddress) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({});
                        lat = loc.coords.latitude;
                        lng = loc.coords.longitude;
                    }
                } catch (e) {
                    console.error('Location permission error:', e);
                }
            }

            const region = {
                latitude: lat,
                longitude: lng,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            };

            setInitialRegion(region);
            currentRegionRef.current = region;

            // If NOT editing, or if we want to confirm the address string for the coords
            // For editing, we might want to keep the saved string unless they move the map.
            // Let's fetch to be safe/fresh, unless user strictly wants to keep old text.
            // Usually, opening map implies re-confirming location.
            if (!editingAddress) {
                fetchAddress(lat, lng);
            }
        };

        // If editing, parse specific details if available in previous full address string?
        // Since we stored full string, we can't easily extract houseNo back perfectly without structured storage.
        // We'll leave houseNo as is or empty.

        initLocation();
    }, []);

    const handleRegionChange = () => {
        if (!isDragging) setIsDragging(true);
    };

    const handleRegionChangeComplete = (region: Region) => {
        setIsDragging(false);
        currentRegionRef.current = region;
        fetchAddress(region.latitude, region.longitude);
    };

    const handleSaveAddress = async () => {
        // Validation: If editing, maybe HouseNo is implied? Can check length.
        if (!addressDetails.houseNo.trim()) {
            showAlert({
                title: 'Details Missing',
                message: 'Please enter House/Flat Number',
                type: 'warning'
            });
            return;
        }

        if (!user?.uid) {
            showAlert({
                title: 'Error',
                message: 'User not logged in',
                type: 'error'
            });
            return;
        }

        setLoading(true);
        try {
            const fullAddress = `${addressDetails.houseNo}, ${addressDetails.landmark ? addressDetails.landmark + ', ' : ''}${addressDetails.formattedAddress}`;
            const regionToSave = currentRegionRef.current;
            const isPrimary = editingAddress ? editingAddress.isPrimary : true; // Default true for new? Or logic driven.

            if (editingAddress) {
                // UPDATE Existing
                const updatedData = {
                    id: editingAddress.id,
                    label: addressDetails.tag,
                    address: fullAddress,
                    latitude: regionToSave.latitude,
                    longitude: regionToSave.longitude,
                    isPrimary: isPrimary
                };

                await updateUserAddress(user.uid, updatedData);
                // Sync Store
                updateAddressInStore(updatedData as any);
                setCurrentAddress(fullAddress, regionToSave.latitude, regionToSave.longitude); // If current was edited

                showAlert({
                    title: 'Success',
                    message: 'Address updated!',
                    type: 'success',
                    onClose: () => navigation.goBack()
                });

            } else {
                // CREATE New
                const newAddress = await addAddress(
                    user.uid,
                    addressDetails.tag,
                    fullAddress,
                    regionToSave.latitude,
                    regionToSave.longitude,
                    true // Set as primary
                );

                // Sync Store (Fixing the missing list update)
                addAddressToStore(newAddress as any);
                setCurrentAddress(fullAddress, regionToSave.latitude, regionToSave.longitude);

                showAlert({
                    title: 'Success',
                    message: 'Address saved!',
                    type: 'success',
                    onClose: () => (navigation as any).navigate('MainTabs', { screen: 'Home' })
                });
            }

        } catch (error: any) {
            console.error('Save address error:', error);
            showAlert({
                title: 'Error',
                message: 'Failed to save address: ' + (error.message || 'Unknown error'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!initialRegion) {
        return <BrandLoader message="Initializing map..." />;
    }

    return (
        <View style={styles.container}>
            {/* Map Section */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    onRegionChange={handleRegionChange}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                />

                {/* Fixed Center Marker */}
                <View style={styles.markerFixed}>
                    <Ionicons name="location" size={48} color={COLORS.primary} />
                </View>

                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
                        <Text style={styles.saveButtonText}>Confirm & Save Address</Text>
                    </TouchableOpacity>

                    {loading && <BrandLoader fullscreen message="Saving address..." />}
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
        overflow: 'hidden', // Ensure no leak
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerFixed: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -24,
        marginTop: -48,
        zIndex: 10,
        pointerEvents: 'none', // Pass touches through
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        backgroundColor: COLORS.background,
        padding: 10,
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
        overflow: Platform.OS === 'web' ? 'auto' : undefined,
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
});
