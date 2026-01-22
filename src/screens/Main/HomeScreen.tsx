import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useAuthStore, useSubscriptionStore } from '../../store';
import { useAddressStore } from '../../store';
import { useCartStore } from '../../store';
import { ServiceDetailScreen } from './ServiceDetailScreen';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { BrandLoader } from '../../components/BrandLoader';
import { FaqAccordion } from '../../components/FaqAccordion';
import { TestimonialsSection } from '../../components/TestimonialsSection';
import { HowItWorks } from '../../components/HowItWorks';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedButton } from '../../components/AnimatedButton';
import { ProcessVideoSection } from '../../components/ProcessVideoSection';

const HOME_FAQS = [
  { question: "How does SpinZo's service work?", answer: "We pick up your clothes within 30 minutes, wash and fold them, and deliver them back within 6 hours. Simple, fast, and hassle-free." },
  { question: "Do you offer pickup and delivery?", answer: "Yes, doorstep pickup and delivery are completely free in all supported areas." },
  { question: "What happens if my clothes are damaged?", answer: "We have a 100% safety guarantee. In the rare event of any damage, we provide compensation up to 2x the service value." },
  { question: "How do you ensure hygiene?", answer: "We wash each customer's clothes separately. Your clothes never mix with others, ensuring 100% hygiene." },
  { question: "How will my clothes be weighed?", answer: "Our delivery partner weighs your clothes on the spot using a digital weighing scale for accurate billing." },
  { question: "How long does the laundry process take?", answer: "Most orders are completed and delivered within 6 hours." },
  { question: "What payment methods do you accept?", answer: "We accept UPI, GPay, Paytm, and cash on delivery." },
  { question: "Where is SpinZo's store located?", answer: "SpinZo operates through trusted partner laundry units instead of walk-in stores to ensure faster doorstep service." },
];

// Import assets
// Premium 3D Assets
const promoOffer = require('../../../assets/banner_offer_3d.png');
const promoDelivery = require('../../../assets/banner_delivery_3d.png');
const promoRelax = require('../../../assets/banner_relax_3d.png');
const promoPickup = require('../../../assets/onboarding_pickup_v2.png');
const PROMOS = [
  {
    id: '1',
    title: 'Save ₹300 Total!',
    subtitle: '₹100 OFF on first 3 orders',
    image: promoOffer,
    gradient: ['#FFF7ED', '#FFEDD5'],
    badge: 'LIMITED OFFER',
  },
  {
    id: '4',
    title: 'Quick Pickup',
    subtitle: 'We come to your doorstep',
    image: promoPickup,
    gradient: ['#EEF2FF', '#E0E7FF'], // Soft Blue
    badge: 'WHY SPINZO?',
  },
  {
    id: '2',
    title: 'Same Day Delivery',
    subtitle: 'Fresh clothes, fast',
    image: promoDelivery,
    gradient: ['#F5F3FF', '#EDE9FE'],
    badge: 'FAST SERVICE',
  },
  {
    id: '3',
    title: 'Relax & Unwind',
    subtitle: 'We handle everything',
    image: promoRelax,
    gradient: ['#F3E8FF', '#E9D5FF'],
    badge: 'HASSLE FREE',
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
  const [headerHeight, setHeaderHeight] = useState(380); // Default estimate

  const cartItemCount = items.length;
  const cartTotal = getTotalAmount();

  // Scroll Animation Logic
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, headerHeight],
      [0, -headerHeight * 0.6], // Moves up slower than scroll (parallax)
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight * 0.6], // Fade out faster
      [1, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [-100, 0], // Scale up on pull down
      [1.1, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

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

  const handleHeaderLayout = (event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  };

  const STICKY_HEADER_HEIGHT = insets.top + 80; // Increased height for address pill

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.pageBg, '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Sticky Header (Address & Wallet) - Always on Top */}
      <View style={[
        styles.stickyHeader,
        {
          paddingTop: insets.top + 10,
          height: STICKY_HEADER_HEIGHT
        }
      ]}>
        <View style={styles.headerTopArea}>
          <AnimatedButton style={styles.addressPill} onPress={handleAddressPress}>
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
          </AnimatedButton>

          <AnimatedButton
            style={styles.walletBadge}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Credits' })}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletGradient}
            >
              <Ionicons name="wallet" size={14} color="#FFF" />
              <Text style={styles.walletAmount}>{getTotalCredits()}</Text>
            </LinearGradient>
          </AnimatedButton>
        </View>
      </View>

      {/* Parallax Header Container (Greeting & Banners) */}
      <Animated.View
        style={[
          styles.parallaxHeaderContainer,
          { zIndex: 1 }, // Below sticky header
          headerAnimatedStyle
        ]}
        onLayout={handleHeaderLayout}
      >
        {/* Greeting Section */}
        <View style={[
          styles.premiumHeader,
          {
            paddingTop: STICKY_HEADER_HEIGHT + 10, // Push down below sticky header
            marginTop: 0,
            paddingBottom: 20 // Reduced spacing above banners
          }
        ]}>
          <View style={styles.greetingSection}>
            <View>
              <MotiView
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 600 }}
              >
                <Text style={styles.welcomeText}>
                  {getGreeting()}, <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Guest'}</Text> 👋
                </Text>
              </MotiView>
              <Text style={styles.brandTagline}>Ready for fresh clothes?</Text>
            </View>
          </View>
        </View>

        {/* Promo Section */}
        <View style={styles.promoSection}>
          <FlatList
            ref={flatListRef}
            data={PROMOS}
            renderItem={renderPromoItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={Dimensions.get('window').width - 32 + 12} // New card width + margin
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.promoList}
            getItemLayout={(data, index) => ({
              length: Dimensions.get('window').width - 32 + 12, // width + marginRight
              offset: (Dimensions.get('window').width - 32 + 12) * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
              });
            }}
            onMomentumScrollEnd={(ev) => {
              const cardWidth = Dimensions.get('window').width - 32 + 12; // snapInterval
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
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 20 } // Push content below fixed header
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <View style={styles.trustBadgeCompact}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
              <Text style={styles.trustBadgeText}>Trusted in Bangalore</Text>
            </View>

          </View>

          <View style={styles.bentoGrid}>
            {/* Row 1: 50/50 split */}
            <View style={styles.bentoRow}>
              {[SERVICES[0], SERVICES[1]].map((service, index) => (
                <MotiView
                  key={service.id}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: 200 + index * 100 }}
                  style={{ width: '48.5%' }}
                >
                  <AnimatedButton
                    onPress={() => handleServicePress(service.id)}
                    style={styles.bentoCardSquare}
                  >
                    <LinearGradient
                      colors={service.gradient as [string, string]}
                      style={styles.serviceOverlay}
                    />
                    <View style={styles.serviceIconContainer}>
                      <Ionicons name={service.icon as any} size={28} color={service.color} />
                    </View>
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </AnimatedButton>
                </MotiView>
              ))}
            </View>

            {/* Row 2: Full Width Immersive */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400 }}
              style={styles.bentoRowFull}
            >
              <AnimatedButton
                onPress={() => handleServicePress(SERVICES[2].id)}
                style={styles.bentoCardRectangle}
              >
                <LinearGradient
                  colors={SERVICES[2].gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.serviceOverlay}
                />
                <View style={styles.bentoContentRow}>
                  <View style={styles.serviceIconContainer}>
                    <Ionicons name={SERVICES[2].icon as any} size={32} color={SERVICES[2].color} />
                  </View>
                  <View style={styles.bentoTextContent}>
                    <Text style={styles.bentoTitle}>{SERVICES[2].name}</Text>
                    <Text style={styles.bentoSubtitle}>Professional care for large loads</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>
              </AnimatedButton>
            </MotiView>

            {/* Row 3: Subscribe Feature Card */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 500 }}
              style={styles.bentoRowFull}
            >
              <GlassCard cornerRadius="xl" style={styles.subscribeBentoCard}>
                <LinearGradient
                  colors={['rgba(124, 94, 237, 0.9)', 'rgba(76, 29, 149, 0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <AnimatedButton
                  onPress={() => handleServicePress('subscription')}
                  style={styles.subscribeContent}
                >
                  <View>
                    <View style={styles.exclusiveBadge}>
                      <Text style={styles.exclusiveBadgeText}>EXCLUSIVE</Text>
                    </View>
                    <Text style={styles.subscribeTitle}>Smart Care Subscription</Text>
                    <Text style={styles.subscribeSubtitle}>Save 20% on every wash ✨</Text>
                  </View>
                  <Ionicons name="sparkles" size={32} color="#FDE047" />
                </AnimatedButton>
              </GlassCard>
            </MotiView>
          </View>
        </View>

        {/* How It Works */}
        <HowItWorks />

        {/* Brand Video Process */}
        <ProcessVideoSection />

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
      </Animated.ScrollView>

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
    // marginBottom: 20, // Removed to let fixed height handle spacing
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
    fontSize: 18,
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
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  promoSection: {
    marginTop: -20,
    zIndex: 10,
  },
  promoList: {
    paddingHorizontal: SPACING.sm, // Reduced to show peek of next card
    paddingVertical: SPACING.sm,
  },
  promoCard: {
    width: Dimensions.get('window').width - 32, // Slightly narrower to show peek
    height: 180, // Taller for more impact
    borderRadius: RADIUS.xl,
    marginRight: 12,
    overflow: 'hidden',
    ...SHADOWS.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  promoGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingRight: 16,
  },
  promoContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  promoBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Outfit_800ExtraBold',
  },
  promoTitle: {
    fontSize: 24,
    color: '#1E293B',
    fontFamily: 'Outfit_700Bold',
    lineHeight: 28,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  promoImage: {
    width: 130,
    height: 130,
    marginRight: -8,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
  },
  seeAllText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  bentoGrid: {
    gap: 12,
  },
  bentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bentoRowFull: {
    width: '100%',
  },
  bentoCardSquare: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  bentoCardRectangle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    height: 100,
    ...SHADOWS.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  bentoContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bentoTextContent: {
    flex: 1,
  },
  bentoTitle: {
    ...TYPOGRAPHY.subheading,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 2,
  },
  bentoSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  trustBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscribeBentoCard: {
    height: 120,
    ...SHADOWS.primary,
  },
  subscribeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  exclusiveBadge: {
    backgroundColor: 'rgba(255, 224, 71, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 71, 0.3)',
  },
  exclusiveBadgeText: {
    ...TYPOGRAPHY.tiny,
    color: '#FEF08A',
    letterSpacing: 1,
  },
  subscribeTitle: {
    ...TYPOGRAPHY.subheading,
    color: '#FFFFFF',
    fontSize: 18,
  },
  subscribeSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  serviceOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  serviceName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
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
    zIndex: 100,
  },
  cartButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    ...SHADOWS.primary,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCountBadge: {
    backgroundColor: COLORS.white,
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartCountText: {
    color: COLORS.primary,
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 13,
  },
  cartButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontSize: 16,
  },
  cartButtonSubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    marginTop: -2,
  },
  parallaxHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly translucent
    zIndex: 100, // Above everything
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
});
