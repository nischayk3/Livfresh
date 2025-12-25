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
import { BrandLoader } from '../../components/BrandLoader';

// Import assets
const promoPickup = require('../../../assets/promo_pickup.png');
const promoDelivery = require('../../../assets/promo_delivery.png');
const promoRelax = require('../../../assets/promo_relax.png');

const PROMOS = [
  {
    id: '1',
    title: 'Quick Pickup',
    subtitle: 'We come to your doorstep',
    image: promoPickup,
    gradient: ['#FFF0F7', '#FCE7F3'],
  },
  {
    id: '2',
    title: 'Same Day Delivery',
    subtitle: 'Fresh clothes, fast',
    image: promoDelivery,
    gradient: ['#FCE7F3', '#FDF2F8'],
  },
  {
    id: '3',
    title: 'Relax & Unwind',
    subtitle: 'We handle the rest',
    image: promoRelax,
    gradient: ['#FDF2F8', '#FFF0F7'],
  },
];

const SERVICES = [
  {
    id: 'wash_fold',
    name: 'Wash & Fold',
    icon: 'layers-outline',
    color: COLORS.primary,
    description: 'Regular laundry',
  },
  {
    id: 'wash_iron',
    name: 'Wash & Iron',
    icon: 'shirt-outline',
    color: COLORS.primary,
    description: 'Pressed & crisp',
  },
  {
    id: 'blanket_wash',
    name: 'Blanket Wash',
    icon: 'bed-outline',
    color: '#8B5CF6',
    description: 'Comforters & quilts',
  },
  {
    id: 'subscription',
    name: 'Subscribe',
    icon: 'sparkles-outline',
    color: '#F59E0B',
    description: 'Save more',
    disabled: false,
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
    }, 4000); // Scroll every 4 seconds

    return () => clearInterval(timer);
  }, [currentIndex]);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    if (hour >= 18 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const handleServicePress = (serviceId: string) => {
    if (serviceId === 'subscription') {
      navigation.navigate('Subscription' as never);
      return;
    }
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
    <View style={styles.promoCard}>
      <LinearGradient
        colors={item.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoGradient}
      >
        <View style={styles.promoContent}>
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>Why Spinit?</Text>
          </View>
          <Text style={styles.promoTitle}>{item.title}</Text>
          <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
        </View>
        <Image source={item.image} style={styles.promoImage} resizeMode="contain" />
      </LinearGradient>
    </View>
  );

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Simulate/Wait for initial data load
    if (user) setInitialLoading(false);
    else setTimeout(() => setInitialLoading(false), 2000); // Fallback
  }, [user]);

  if (initialLoading) {
    return <BrandLoader message="Loading your experience..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.locationContainer} onPress={handleAddressPress}>
            <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
            <View style={styles.addressButton}>
              <Text style={styles.locationLabel}>Deliver to</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {currentAddress || 'Select Location'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => (navigation as any).navigate('Main', { screen: 'Profile' })}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!</Text>
          <Text style={styles.subGreeting}>Fresh laundry, delivered to you</Text>
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
            snapToInterval={Dimensions.get('window').width - 48}
            decelerationRate="fast"
            contentContainerStyle={styles.promoList}
            onMomentumScrollEnd={(ev) => {
              const cardWidth = Dimensions.get('window').width - 48;
              const newIndex = Math.round(ev.nativeEvent.contentOffset.x / cardWidth);
              setCurrentIndex(newIndex);
            }}
          />
          {/* Pagination dots */}
          <View style={styles.paginationDots}>
            {PROMOS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.dotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Services Grid */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Our Services</Text>

          <View style={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  (service as any).disabled && styles.serviceCardDisabled
                ]}
                onPress={() => handleServicePress(service.id)}
                activeOpacity={(service as any).disabled ? 1 : 0.7}
                disabled={(service as any).disabled}
              >
                <View style={[
                  styles.serviceIconContainer,
                  { backgroundColor: (service as any).disabled ? '#F3F4F6' : service.color + '15' }
                ]}>
                  <Ionicons
                    name={service.icon as any}
                    size={24}
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
        <View style={[styles.cartButtonContainer, { bottom: insets.bottom + 16 }]}>
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
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
    flex: 1,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  addressButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  locationLabel: {
    fontSize: 9,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  profileButton: {},
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  greetingContainer: {
    marginTop: 2,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  subGreeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingBottom: SPACING.xl * 4,
  },
  promoSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  promoList: {
    paddingHorizontal: SPACING.md,
  },
  promoCard: {
    width: Dimensions.get('window').width - 64,
    height: 110,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  promoGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  promoContent: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  promoBadge: {
    backgroundColor: 'rgba(219, 39, 119, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  promoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  promoSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  promoImage: {
    width: 90,
    height: 90,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 16,
  },
  servicesSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  serviceCardDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.8,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cartButtonContainer: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
  },
  cartButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
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
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cartButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },
});
