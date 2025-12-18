import React from 'react';
// Address List Screen
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/constants'; // Adjust path if needed
import { useAddressStore } from '../../store';

export const AddressListScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { savedAddresses, currentAddress, setCurrentAddress } = useAddressStore();

    const renderItem = ({ item }: { item: any }) => {
        const formattedAddress = typeof item.address === 'string' ? item.address :
            (item.address.formattedAddress || item.address.name || 'Unknown Address');

        return (
            <TouchableOpacity
                style={[styles.addressItem, currentAddress === formattedAddress && styles.addressItemSelected]}
                onPress={() => {
                    // Ensure latitude/longitude exist, default to 0 if not (should be there in real app)
                    const lat = item.latitude || 0;
                    const lng = item.longitude || 0;
                    setCurrentAddress(formattedAddress, lat, lng);
                    navigation.goBack();
                }}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name={item.label === 'Home' ? 'home' : 'location'} size={24} color={COLORS.primary} />
                </View>
                <View style={styles.addressDetails}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>{formattedAddress}</Text>
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                        e.stopPropagation(); // Don't select the address, just edit
                        navigation.navigate('AddressMap' as never, {
                            editingAddress: item,
                            initialLat: item.latitude,
                            initialLng: item.longitude
                        } as never);
                    }}
                >
                    <Ionicons name="pencil" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {currentAddress === formattedAddress && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Addresses</Text>
            </View>

            <FlatList
                style={styles.flatList}
                data={savedAddresses}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No addresses saved yet.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={[styles.addButton, { marginBottom: Math.max(insets.bottom, 20) }]}
                onPress={() => navigation.navigate('AddressMap' as never)}
            >
                <Text style={styles.addButtonText}>+ Add New Address</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backButton: {
        marginRight: SPACING.md,
    },
    headerTitle: {
        ...TYPOGRAPHY.subheading,
        fontSize: 20,
    },
    flatList: {
        flex: 1,
        // @ts-ignore - web-specific
        overflow: Platform.OS === 'web' ? 'auto' : undefined,
    },
    listContent: {
        padding: SPACING.md,
        flexGrow: 1,
    },
    addressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    addressItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '10',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    addressDetails: {
        flex: 1,
    },
    addressLabel: {
        ...TYPOGRAPHY.bodyBold,
        marginBottom: 2,
    },
    addressText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    addButton: {
        marginHorizontal: SPACING.lg,
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    addButtonText: {
        ...TYPOGRAPHY.button,
        color: '#FFF',
    },
    editButton: {
        padding: 8,
        marginRight: 8,
    },
    emptyContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
});
