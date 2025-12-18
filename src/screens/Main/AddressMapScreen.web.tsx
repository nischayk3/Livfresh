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
    Alert, // Notes: Alert on web is browser alert or custom modal (native Alert works often but basic)
    ActivityIndicator,
} from 'react-native';
// MapView not supported natively on web in this setup without config
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { addAddress, updateUserAddress } from '../../services/firestore';
import { useAuthStore, useAddressStore } from '../../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock types
type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

// Default coordinates (Bangalore)
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export const AddressMapScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuthStore();
    const { setCurrentAddress, addAddress: addAddressToStore, updateAddress: updateAddressInStore } = useAddressStore();
    const insets = useSafeAreaInsets();

    // Params
    const { initialLat, initialLng, editingAddress } = route.params as {
        initialLat?: number;
        initialLng?: number;
        editingAddress?: any;
    } || {};

    const currentRegionRef = useRef<Region>({
        latitude: initialLat || (editingAddress ? editingAddress.latitude : DEFAULT_LAT),
        longitude: initialLng || (editingAddress ? editingAddress.longitude : DEFAULT_LNG),
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

    const [loading, setLoading] = useState(false);

    // Initial Region setup
    useEffect(() => {
        const initLocation = async () => {
            let lat = currentRegionRef.current.latitude;
            let lng = currentRegionRef.current.longitude;

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

            currentRegionRef.current = {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };

            if (!editingAddress) {
                // Mock reverse geocode or simpler fetch
                fetchAddress(lat, lng);
            }
        };
        initLocation();
    }, []);

    const fetchAddress = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
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
                id: editingAddress?.id, // undefined for new
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
                navigation.navigate('MainTabs' as never, { screen: 'Home' } as never);
            }

        } catch (error: any) {
            console.error('Save address error:', error);
            alert('Failed to save address: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.webMapPlaceholder}>
                <Ionicons name="map" size={48} color={COLORS.textSecondary} />
                <Text style={styles.webMapText}>Interactive Map not available on Web</Text>
                <Text style={styles.webMapSubtext}>Please enter your address details below.</Text>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.formContainer}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) + 60 }]}
                >
                    <Text style={styles.heading}>Address Details</Text>

                    <View style={styles.currentLocationContainer}>
                        <Ionicons name="navigate-circle" size={24} color={COLORS.primary} style={styles.icon} />
                        <View style={styles.textContainer}>
                            <Text style={styles.locationTitle}>
                                Selected Location
                            </Text>
                            <Text style={styles.locationText} numberOfLines={2}>
                                {addressDetails.formattedAddress}
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
                        disabled={loading}
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
    webMapPlaceholder: {
        height: 180,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    webMapText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
        textAlign: 'center',
    },
    webMapSubtext: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textLight,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 20,
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
});
