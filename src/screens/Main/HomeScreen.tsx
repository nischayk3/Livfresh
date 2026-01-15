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
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSubscriptionStore } from '../../store';
import { useAddressStore } from '../../store';
import { useCartStore } from '../../store';
import { ServiceDetailScreen } from './ServiceDetailScreen';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { BrandLoader } from '../../components/BrandLoader';
import { FaqAccordion } from '../../components/FaqAccordion';
import { TestimonialsSection } from '../../components/TestimonialsSection';
import { HowItWorks } from '../../components/HowItWorks';

const HOME_FAQS = [
  { question: "How does SpinZo's service work?", answer: "We pick up your clothes within 30 minutes, wash and fold them, and deliver them back within 6 hours. Simple, fast, and hassle-free." },
  { question: "Do you offer pickup and delivery?", answer: "Yes, doorstep pickup and delivery are completely free in all supported areas." },
  { question: "What happens if my clothes are damaged?", answer: "We have a 100% safety guarantee. In the rare event of any damage, we provide compensation up to 10x the service value." },
  { question: "How do you ensure hygiene?", answer: "We wash each customer's clothes separately. Your clothes never mix with others, ensuring 100% hygiene." },
  { question: "How will my clothes be weighed?", answer: "Our delivery partner weighs your clothes on the spot using a digital weighing scale for accurate billing." },
  { question: "How long does the laundry process take?", answer: "Most orders are completed and delivered within 6 hours." },
  { question: "What payment methods do you accept?", answer: "We accept UPI, GPay, Paytm, and cash on delivery." },
  { question: "Where is SpinZo's store located?", answer: "SpinZo operates through trusted partner laundry units instead of walk-in stores to ensure faster doorstep service." },
];

// Import assets
const promoPickup = require('../../../assets/onboarding_screen_1.png');
const promoDelivery = require('../../../assets/onboarding_screen_2.png');
const promoRelax = require('../../../assets/onboarding_pickup_v2.png');
const promoOffer = require('../../../assets/banner_promo.png');

const PROMOS = [
  {
    id: '4',
    title: 'Save ₹300 Total!',
    subtitle: '₹100 OFF on first 3 orders',
    image: promoOffer,
    gradient: ['#FFF7ED', '#FFEDD5'], // Soft Orange
    badge: 'LIMITED OFFER',
  },
  {
    id: '2',
    title: 'Same Day Delivery',
    subtitle: 'Fresh clothes, fast',
    image: promoDelivery,
    gradient: ['#F3E8FF', '#E9D5FF'], // Soft Purple
    badge: 'WHY SPINZO?',
  },
  {
    id: '1',
    title: 'Quick Pickup',
    subtitle: 'We come to your doorstep',
    image: promoPickup,
    gradient: ['#EEF2FF', '#E0E7FF'], // Soft Blue
    badge: 'WHY SPINZO?',
  },
  {
    id: '3',
    title: 'Relax & Unwind',
    subtitle: 'We handle the rest',
    image: promoRelax,
    gradient: ['#F0FDFA', '#CCFBF1'], // Soft Teal
    badge: 'WHY SPINZO?', // or "HASSLE FREE"
  },

];

const SERVICES = [
  {
    id: 'wash_fold',
    name: 'Wash & Fold',
    icon: 'layers-sharp',
    color: '#8B5CF6',
    gradient: ['#F5F3FF', '#EDE9FE'],
  },
  {
    id: 'wash_iron',
    name: 'Wash & Iron',
    icon: 'shirt-sharp',
    color: '#7C3AED',
    gradient: ['#EDE9FE', '#DDD6FE'],
  },
  {
    id: 'blanket_wash',
    name: 'Blanket Wash',
    icon: 'bed-sharp',
    color: '#6366F1',
    gradient: ['#EEF2FF', '#E0E7FF'],
  },
  {
    id: 'subscription',
    name: 'Subscribe',
    icon: 'sparkles-sharp',
    color: COLORS.primary,
    gradient: ['#F5F3FF', '#EDE9FE'],
    disabled: false,
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();
  const { items, getTotalAmount } = useCartStore();
  const { activeSubscription, fetchSubscriptions, getTotalCredits } = useSubscriptionStore();
  const flatListRef = useRef<FlatList>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);

  const cartItemCount = items.length;
  const cartTotal = getTotalAmount();

  // Fetch subscriptions when user is available
  useEffect(() => {
    if (user?.uid) {
      fetchSubscriptions(user.uid);
    }
  }, [user?.uid, fetchSubscriptions]);

  // Refresh subscriptions when screen comes into focus (e.g., after purchase)
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        fetchSubscriptions(user.uid);
      }
    }, [user?.uid, fetchSubscriptions])
  );

  // Redirect to Location Permission if no address is set (e.g. fresh login)
  useEffect(() => {
    const { hasSkippedLocation } = useAddressStore.getState();

    // Only redirect if they have NO address AND haven't explicitly skipped in this session
    if (!currentAddress && user && !hasSkippedLocation) {
      // Small delay to allow hydration to finish if it's racing
      const timer = setTimeout(() => {
        if (!useAddressStore.getState().currentAddress && !useAddressStore.getState().hasSkippedLocation) {
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
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleServicePress = (serviceId: string) => {
    if (serviceId === 'subscription') {
      (navigation as any).navigate('BuyCredits');
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
            <Text style={styles.promoBadgeText}>{item.badge || 'Why SpinZo?'}</Text>
          </View>
          <Text style={styles.promoTitle}>{item.title}</Text>
          <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
        </View>
        <Image
          source={item.image}
          style={styles.promoImage}
          contentFit="contain"
          transition={500}
        />
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
      <LinearGradient
        colors={[COLORS.pageBg, '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      {/* Header Area */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + SPACING.headerTop }]}>
        <View style={styles.headerTopArea}>
          <TouchableOpacity style={styles.addressPill} onPress={handleAddressPress}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>DELIVER TO</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {currentAddress || 'Set address'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.walletBadge}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Credits' })}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletGradient}
            >
              <Ionicons name="wallet-outline" size={14} color="#FFF" />
              <Text style={styles.walletAmount}>{getTotalCredits()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.greetingSection}>
          <View>
            <Text style={styles.welcomeText}>
              {getGreeting()}, <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Guest'}</Text> 👋
            </Text>
            <Text style={styles.brandTagline}>Ready for fresh clothes?</Text>
          </View>
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
            snapToInterval={Dimensions.get('window').width - 40 + 12} // Card width + margin
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.promoList}
            getItemLayout={(data, index) => ({
              length: Dimensions.get('window').width - 40 + 12, // width + marginRight
              offset: (Dimensions.get('window').width - 40 + 12) * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
              });
            }}
            onMomentumScrollEnd={(ev) => {
              const cardWidth = Dimensions.get('window').width - 40 + 12; // snapInterval
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
            {SERVICES.map((service, index) => (
              <MotiView
                key={service.id}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'timing',
                  duration: 400,
                  delay: index * 100,
                }}
                style={{ width: '48%' }}
              >
                <TouchableOpacity
                  style={[
                    styles.serviceCard,
                    (service as any).disabled && styles.serviceCardDisabled
                  ]}
                  onPress={() => handleServicePress(service.id)}
                  activeOpacity={(service as any).disabled ? 1 : 0.8}
                  disabled={(service as any).disabled}
                >
                  <LinearGradient
                    colors={service.gradient as [string, string]}
                    style={styles.serviceOverlay}
                  />
                  <View style={[
                    styles.serviceIconContainer,
                    { backgroundColor: (service as any).disabled ? '#F3F4F6' : 'rgba(139, 92, 246, 0.1)' }
                  ]}>
                    <Ionicons
                      name={service.icon as any}
                      size={28}
                      color={(service as any).disabled ? '#9CA3AF' : service.color}
                    />
                  </View>
                  <Text style={[
                    styles.serviceName,
                    (service as any).disabled && { color: '#9CA3AF' }
                  ]}>{service.name}</Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <HowItWorks />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Home FAQs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginHorizontal: SPACING.md, marginTop: SPACING.lg }]}>FAQs</Text>
          <View style={{ paddingHorizontal: SPACING.md }}>
            <FaqAccordion items={HOME_FAQS} />
          </View>
        </View>
        <View style={{ height: 100 }} />
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
    backgroundColor: COLORS.pageBg,
  },
  premiumHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.headerTop + 4,
    paddingBottom: SPACING.lg, // Reduced from XL for compactness
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    ...SHADOWS.md,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTopArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20, // Reduced from 24
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    flex: 1,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  addressInfo: {
    marginLeft: 12,
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1.2,
  },
  addressText: {
    ...TYPOGRAPHY.addressText,
    color: '#1A1A1A',
    marginTop: -1,
  },
  walletBadge: {
    borderRadius: 22,
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  walletGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  walletAmount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  userName: {
    color: COLORS.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  brandTagline: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  promoSection: {
    marginTop: -20,
    zIndex: 10,
  },
  promoList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  promoCard: {
    width: Dimensions.get('window').width - 40, // Increased width slightly
    height: 170, // Increased height for better spacing
    borderRadius: RADIUS.xl, // rounded-2xl
    marginRight: 12,
    overflow: 'hidden',
    ...SHADOWS.md,
    backgroundColor: '#FFFFFF',
  },
  promoGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingRight: 16,
  },
  promoContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10,
  },
  promoBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED', // Consistent purple across banners for "Why Spinzo"
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Outfit_800ExtraBold',
  },
  promoTitle: {
    fontSize: 26, // Larger
    color: '#1E293B',
    fontFamily: 'Outfit_700Bold', // Bold
    lineHeight: 30,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 15, // Slightly larger
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  promoImage: {
    width: 110, // Larger image
    height: 110,
    marginRight: -10, // Slight negative margin to push to edge if needed
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 18,
  },
  servicesSection: {
    paddingHorizontal: SPACING.md,
    marginTop: 16, // Reduced from 24
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xs,
  },
  serviceCard: {
    width: '100%',
    height: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
  },
  serviceCardDisabled: {
    opacity: 0.5,
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  section: {
    marginTop: 32,
  },
  cartButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    ...SHADOWS.xl,
  },
  cartButton: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCountBadge: {
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    fontFamily: 'Outfit_800ExtraBold',
  },
  cartButtonSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
});
