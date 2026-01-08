import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { BrandHeader } from '../../components/BrandHeader';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

interface DemandRequest {
    id: string;
    userId: string;
    address: string;
    location: { latitude: number; longitude: number };
    timestamp: any;
    status: string;
}

export const AdminDemandScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState<DemandRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch Logic
    const fetchRequests = async () => {
        try {
            const q = query(
                collection(db, 'unserviceable_requests'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as DemandRequest));

            setRequests(data);
        } catch (error) {
            console.error("Error fetching demand requests:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const openMaps = (lat: number, lng: number) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url);
    };

    const renderItem = ({ item }: { item: DemandRequest }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="location-outline" size={24} color={COLORS.error} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
                    <Text style={styles.date}>
                        {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Just now'}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openMaps(item.location.latitude, item.location.longitude)}
                >
                    <Ionicons name="map" size={16} color={COLORS.primary} />
                    <Text style={styles.actionText}>View on Map</Text>
                </TouchableOpacity>

                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Unserviceable</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <BrandHeader title="Demand Analysis" showBack />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.lg }]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="earth" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No unserviceable requests yet.</Text>
                            <Text style={styles.emptySubtext}>Requests from outside service zones will appear here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    headerText: {
        flex: 1,
    },
    address: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    date: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.xs,
    },
    actionText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.primary,
        marginLeft: SPACING.xs,
        fontWeight: '600',
    },
    statusBadge: {
        backgroundColor: COLORS.error + '20',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    statusText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.error,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: SPACING.xl * 2,
    },
    emptyText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    emptySubtext: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
