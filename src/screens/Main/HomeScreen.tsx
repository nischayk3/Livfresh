import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';
import { useAddressStore } from '../../store';
import { useCartStore } from '../../store';
import { ServiceDetailScreen } from './ServiceDetailScreen';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

// Import assets
const promoPickup = require('../../../assets/promo_pickup.png');
const promoDelivery = require('../../../assets/promo_delivery.png');
const promoRelax = require('../../../assets/promo_relax.png');

const PROMOS = [
  {
    id: '1',
    title: 'Quick Pickup',
    subtitle: 'We Come to You',
    image: promoPickup,
    color: '#FFF0F7', // Very light pink
  },
  {
    id: '2',
    title: 'Fast Delivery',
    subtitle: 'Same Day Service',
    image: promoDelivery,
    color: '#FCE7F3', // Light pink
  },
  {
    id: '3',
    title: 'Why Wait?',
    subtitle: 'Book Now, Relax',
    image: promoRelax,
    color: '#FBCFE8', // Medium light pink
  },
];

const SERVICES = [
  {
    id: 'wash_fold',
    name: 'Wash & Fold',
    icon: 'water-outline',
    color: COLORS.primary,
    description: 'Regular wash',
  },
  {
    id: 'wash_iron',
    name: 'Wash & Iron',
    icon: 'shirt-outline',
    color: COLORS.primary,
    description: 'Wash, dry & iron',
  },
  {
    id: 'blanket_wash',
    name: 'Blanket Wash',
    icon: 'home-outline',
    color: COLORS.success,
    description: 'Comforters',
  },
  {
    id: 'premium_laundry',
    name: 'Premium',
    icon: 'diamond-outline',
    color: '#FFD700',
    description: 'Coming Soon',
    disabled: true,
  },
  {
    id: 'dry_clean',
    name: 'Dry Clean',
    icon: 'sparkles-outline',
    color: '#9333EA',
    description: 'Coming Soon',
    disabled: true,
  },
  {
    id: 'shoe_clean',
    name: 'Shoe Clean',
    icon: 'footsteps-outline',
    color: COLORS.info,
    description: 'Coming Soon',
    disabled: true,
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();
  const { items, getTotalAmount } = useCartStore();
  const flatListRef = useRef<FlatList>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);

  const cartItemCount = items.length;
  const cartTotal = getTotalAmount();

  // Redirect to Location Permission if no address is set (e.g. fresh login)
  useEffect(() => {
    // Check if we need to force location setup
    if (!currentAddress && user) {
      // Small delay to allow hydration to finish if it's racing
      const timer = setTimeout(() => {
        if (!useAddressStore.getState().currentAddress) {
          navigation.navigate('LocationPermission' as never);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentAddress, user]);

  // Auto-scroll effect
  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % PROMOS.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 3000); // Scroll every 3 seconds

    return () => clearInterval(timer);
  }, [currentIndex]);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Good Morning!';
    if (hour >= 12 && hour < 18) return 'Good Afternoon!';
    if (hour >= 18 && hour < 22) return 'Good Evening!';
    return 'Good Night!';
  };

  const handleServicePress = (serviceId: string) => {
    setSelectedService(serviceId);
    setServiceModalVisible(true);
  };

  const handleCloseServiceModal = () => {
    setServiceModalVisible(false);
    setSelectedService(null);
  };

  const handleAddressPress = () => {
    navigation.navigate('AddressList' as never);
  };

  const handleViewCart = () => {
    navigation.navigate('Cart' as never);
  };

  const renderPromoItem = ({ item }: { item: typeof PROMOS[0] }) => (
    <View style={[styles.promoCard, { backgroundColor: item.color }]}>
      <View style={styles.promoContent}>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
      </View>
      <Image source={item.image} style={styles.promoImage} resizeMode="contain" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.locationContainer} onPress={handleAddressPress}>
            <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
            <View style={styles.addressButton}>
              <Text style={styles.locationLabel}>Location</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {currentAddress || 'Select Location'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Main' as never, { screen: 'Profile' } as never)}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.subGreeting}>Need some fresh clothes today?</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Promo Section */}
        <View style={styles.promoSection}>
          <FlatList
            ref={flatListRef}
            data={PROMOS}
            renderItem={renderPromoItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={316} // card width + margin
            decelerationRate="fast"
            contentContainerStyle={styles.promoList}
            onMomentumScrollEnd={(ev) => {
              const newIndex = Math.round(ev.nativeEvent.contentOffset.x / 316);
              setCurrentIndex(newIndex);
            }}
          />
        </View>

        {/* Services Grid */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <Text style={styles.sectionSubtitle}>Select a service to get started</Text>

          <View style={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  (service as any).disabled && styles.serviceCardDisabled
                ]}
                onPress={() => handleServicePress(service.id)}
                activeOpacity={(service as any).disabled ? 1 : 0.8}
                disabled={(service as any).disabled}
              >
                <View style={[
                  styles.serviceIconContainer,
                  { backgroundColor: (service as any).disabled ? '#F3F4F6' : service.color + '15' }
                ]}>
                  <Ionicons
                    name={service.icon as any}
                    size={32}
                    color={(service as any).disabled ? '#9CA3AF' : service.color}
                  />
                </View>
                <Text style={[
                  styles.serviceName,
                  (service as any).disabled && { color: '#9CA3AF' }
                ]}>{service.name}</Text>
                <Text style={[
                  styles.serviceDescription,
                  (service as any).disabled && { color: '#D1D5DB' }
                ]}>{service.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <View style={[styles.cartButtonContainer, { bottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.cartButton} onPress={handleViewCart} activeOpacity={0.9}>
            <View style={styles.cartInfo}>
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{cartItemCount}</Text>
              </View>
              <View>
                <Text style={styles.cartButtonText}>View Cart</Text>
                <Text style={styles.cartButtonSubtext}>{cartItemCount} items • ₹{cartTotal}</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Service Detail Modal */}
      {selectedService && (
        <ServiceDetailScreen
          visible={serviceModalVisible}
          onClose={handleCloseServiceModal}
          vendorId="default" // In future, handle multiple vendors
          serviceId={selectedService}
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
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight, // Light gray pill
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    flex: 1,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  addressButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  locationLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  locationText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text, // Dark text
    fontWeight: '600',
  },
  profileButton: {
    // padding: 4,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    fontSize: 16,
  },
  greetingContainer: {
    marginTop: SPACING.xs,
  },
  greetingText: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text, // Dark text
    fontSize: 24,
    marginBottom: 4,
  },
  subGreeting: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: SPACING.xl * 4, // Extra padding for cart button space
  },
  promoSection: {
    marginVertical: SPACING.md,
  },
  promoList: {
    paddingHorizontal: SPACING.lg,
  },
  promoCard: {
    width: 300,
    height: 160,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginRight: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  promoContent: {
    flex: 1,
    paddingRight: SPACING.sm,
    justifyContent: 'center',
  },
  promoTitle: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    fontSize: 20,
    lineHeight: 26,
  },
  promoSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  promoImage: {
    width: 130,
    height: 130,
    marginRight: -10, // Slight negative margin to pull image to edge
  },
  servicesSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
    marginBottom: SPACING.sm,
  },
  serviceCardDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.8,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  serviceName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 14,
  },
  serviceDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  cartButtonContainer: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
  },
  cartButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.lg,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: SPACING.md,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cartButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
});
