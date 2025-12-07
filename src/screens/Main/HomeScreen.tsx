import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';
import { useAddressStore } from '../../store';
import { getAllVendors } from '../../services/firestore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

interface Vendor {
  id: string;
  name: string;
  area: string;
  rating: number;
  totalRatings: number;
  imageUrl: string;
  deliveryTime: string;
  minOrder: number;
}

const PROMOS = [
  { 
    id: '1', 
    title: '50% OFF', 
    subtitle: 'First Time Users', 
    icon: 'gift',
    gradient: [COLORS.primary, COLORS.primaryDark],
  },
  { 
    id: '2', 
    title: 'Free Pickup', 
    subtitle: 'On orders above ₹500', 
    icon: 'car',
    gradient: [COLORS.info, '#2563EB'],
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const vendorsData = await getAllVendors();
      setVendors(vendorsData as Vendor[]);
    } catch (err: any) {
      console.error('Error loading vendors:', err);
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Good Morning!';
    if (hour >= 12 && hour < 18) return 'Good Afternoon!';
    if (hour >= 18 && hour < 22) return 'Good Evening!';
    return 'Good Night!';
  };

  const handleVendorPress = (vendorId: string) => {
    (navigation as any).navigate('VendorDetail', { vendorId });
  };

  const handleAddressPress = () => {
    navigation.navigate('AddressList' as never);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#FBBF24" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FBBF24" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#D1D5DB" />
      );
    }

    return stars;
  };

  const renderPromoItem = ({ item }: { item: typeof PROMOS[0] }) => (
    <LinearGradient
      colors={item.gradient as [string, string]}
      style={styles.promoCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.promoIconContainer}>
        <Ionicons name={item.icon as any} size={40} color="#FFFFFF" />
      </View>
      <Text style={styles.promoTitle}>{item.title}</Text>
      <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
    </LinearGradient>
  );

  const renderVendorItem = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      style={styles.vendorCard}
      onPress={() => handleVendorPress(item.id)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/300x200' }} 
        style={styles.vendorImage}
        resizeMode="cover"
      />
      <View style={styles.vendorInfo}>
        <View style={styles.vendorHeader}>
          <Text style={styles.vendorName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'}</Text>
          </View>
        </View>
        
        <View style={styles.vendorMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.area}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.deliveryTime || '2-3 hours'}</Text>
          </View>
        </View>

        <View style={styles.vendorFooter}>
          <View style={styles.starsContainer}>
            {renderStars(item.rating || 0)}
            <Text style={styles.ratingCount}>({item.totalRatings || 0})</Text>
          </View>
          <Text style={styles.minOrderText}>Min ₹{item.minOrder || 100}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVendors}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Address Dropdown */}
        <View style={styles.addressSection}>
          <Text style={styles.addressLabel}>DELIVER TO</Text>
          <TouchableOpacity 
            style={styles.addressDropdown} 
            onPress={handleAddressPress}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={20} color={COLORS.primary} style={styles.addressIcon} />
            <Text style={styles.addressText} numberOfLines={1}>
              {currentAddress || 'Select address'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>
            Hey <Text style={styles.greetingName}>{user?.name || 'User'}</Text>,{'\n'}
            {getGreeting()}
          </Text>
        </View>

        {/* Promo Carousel */}
        <View style={styles.promoSection}>
          <FlatList
            data={PROMOS}
            renderItem={renderPromoItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoList}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        </View>

        {/* Vendors List */}
        <View style={styles.vendorsSection}>
          <Text style={styles.sectionTitle}>Nearby Laundry Services</Text>
          {vendors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No vendors available</Text>
              <Text style={styles.emptySubtext}>Check back later or try a different area</Text>
              <TouchableOpacity 
                style={styles.seedButton} 
                onPress={async () => {
                  try {
                    const { seedVendors } = await import('../../services/vendorSeed');
                    const result = await seedVendors();
                    Alert.alert('Success', `Seeded ${result.count} vendors! Please refresh.`);
                    loadVendors();
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to seed vendors');
                  }
                }}
              >
                <Text style={styles.seedButtonText}>Seed Vendors (Dev Only)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {vendors.map((vendor) => (
                <View key={vendor.id}>
                  {renderVendorItem({ item: vendor })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xl * 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  retryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  addressSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  addressLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  addressDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md + 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  addressIcon: {
    marginRight: SPACING.sm,
  },
  addressText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    color: COLORS.text,
    fontWeight: '500',
  },
  greetingSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  greeting: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    lineHeight: 40,
  },
  greetingName: {
    color: COLORS.primary,
  },
  promoSection: {
    marginVertical: SPACING.md,
  },
  promoList: {
    paddingHorizontal: SPACING.lg,
  },
  promoCard: {
    width: 300,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginRight: SPACING.md,
    ...SHADOWS.lg,
  },
  promoIconContainer: {
    marginBottom: SPACING.md,
  },
  promoTitle: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  promoSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: '#FFFFFF',
    opacity: 0.95,
  },
  vendorsSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    fontWeight: '700',
  },
  vendorCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  vendorImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.backgroundLight,
  },
  vendorInfo: {
    padding: SPACING.md,
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  vendorName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    flex: 1,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  ratingText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
  vendorMeta: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  metaText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  vendorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  minOrderText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  seedButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  seedButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
});
