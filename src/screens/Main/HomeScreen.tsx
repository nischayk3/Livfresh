import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Bell, MapPin, Wallet, ChevronDown, ChevronRight, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useAuthStore, useAddressStore, useNotificationStore } from '../../store';
import { useCartStore } from '../../store';
import { useSubscriptionStore } from '../../store';
import AnalyticsService from '../../services/analytics';
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

// Remote CDN asset URLs (Firebase Storage with 1-year cache)
import { ASSET_URLS } from '../../utils/assetUrls';

const PROMOS = [
  {
    id: '1',
    title: '₹300 OFF',
    subtitle: 'on your first 3 orders',
    image: { uri: ASSET_URLS.banner_offer_3d },
    gradient: ['#FFF7ED', '#FFEDD5'],
    badge: 'WELCOME OFFER',
  },
  {
    id: '4',
    title: '30-min Pickup',
    subtitle: 'Free doorstep collection',
    image: { uri: ASSET_URLS.onboarding_pickup_v2 },
    gradient: ['#EEF2FF', '#E0E7FF'],
    badge: 'SPINZO PRO',
  },
  {
    id: '2',
    title: 'Same-day Delivery',
    subtitle: 'Back by 9 PM, every time',
    image: { uri: ASSET_URLS.banner_delivery_3d },
    gradient: ['#F5F3FF', '#EDE9FE'],
    badge: 'FAST SERVICE',
  },
  {
    id: '3',
    title: 'Premium Care',
    subtitle: 'Certified cleaning experts',
    image: { uri: ASSET_URLS.banner_relax_3d },
    gradient: ['#F3E8FF', '#E9D5FF'],
    badge: '100% SAFE',
  },
];

const SERVICES = [
  {
    id: 'wash_fold',
    name: 'Wash & Fold',
    image: { uri: ASSET_URLS.services_wash_fold },
    gradient: ['#F5F3FF', '#EDE9FE'] as [string, string],
  },
  {
    id: 'wash_iron',
    name: 'Wash & Iron',
    image: { uri: ASSET_URLS.services_wash_iron },
    gradient: ['#EEF2FF', '#E0E7FF'] as [string, string],
  },
  {
    id: 'ironing',
    name: 'Steam Iron',
    image: { uri: ASSET_URLS.services_ironing },
    gradient: ['#ECFDF5', '#D1FAE5'] as [string, string],
  },
  {
    id: 'blanket_wash',
    name: 'Blanket Wash',
    image: { uri: ASSET_URLS.services_blanket_wash },
    gradient: ['#FFF7ED', '#FFEDD5'] as [string, string],
  },
  {
    id: 'subscription',
    name: 'Subscribe',
    gradient: ['#F5F3FF', '#EDE9FE'] as [string, string],
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();
  const { items, getTotalAmount } = useCartStore();
  const { fetchSubscriptions, getTotalCredits } = useSubscriptionStore();
  const { unreadCount } = useNotificationStore();
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
    // Only redirect if they have NO address AND haven't explicitly skipped
    if (!currentAddress && user) {
      // Small delay to allow hydration to finish if it's racing
      const timer = setTimeout(() => {
        const { hasSkippedLocation } = useAddressStore.getState();
        if (!useAddressStore.getState().currentAddress && !hasSkippedLocation) {
          // Check if we're already on LocationPermission to avoid double navigation
          const state = navigation.getState();
          const currentRouteName = state?.routes[state.index]?.name;
          if (currentRouteName !== 'LocationPermission') {
            navigation.navigate('LocationPermission' as never);
          }
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

  const handleServicePress = (serviceId: string) => {
    if (serviceId === 'subscription') {
      AnalyticsService.logEvent('select_item', {
        item_id: 'subscription',
        item_name: 'Smart Care Subscription',
        item_category: 'Service'
      });
      (navigation as any).navigate('BuyCredits');
      return;
    }
    const service = SERVICES.find(s => s.id === serviceId);
    AnalyticsService.logEvent('select_item', {
      item_id: serviceId,
      item_name: service?.name || serviceId,
      item_category: 'Service'
    });
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

  const renderPromoItem = ({ item, index }: { item: (typeof PROMOS)[0], index: number }) => (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 100, type: 'timing', duration: 400 }}
      style={styles.promoCard}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          AnalyticsService.logEvent('select_promotion', {
            promotion_id: item.id,
            promotion_name: item.title,
            creative_name: item.badge
          });
        }}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={item.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promoGradient}
        >
          <View style={styles.promoContent}>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>{item.badge}</Text>
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
      </TouchableOpacity>
    </MotiView>
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

      {/* Sticky Header (Address & Wallet) - Glass Effect */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10, height: STICKY_HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.stickyHeaderBorder} />
        <View style={styles.headerTopArea}>
          <AnimatedButton style={styles.addressPill} onPress={handleAddressPress}>
            <MapPin size={16} color={COLORS.primary} strokeWidth={2.5} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>DELIVER TO</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {currentAddress || 'Set address'}
              </Text>
            </View>
            <ChevronDown size={14} color={COLORS.textSecondary} strokeWidth={2.5} />
          </AnimatedButton>

          <View style={styles.headerRight}>
            <AnimatedButton
              style={styles.notificationBtn}
              onPress={() => (navigation as any).navigate('Notifications')}
            >
              <Bell size={18} color={COLORS.text} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <View style={styles.notificationDot}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
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
                <Wallet size={13} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.walletAmount}>{getTotalCredits()}</Text>
              </LinearGradient>
            </AnimatedButton>
          </View>
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
        {/* Greeting Section - Premium Compact */}
        <View style={[styles.greetingContainer, { paddingTop: STICKY_HEADER_HEIGHT + 16 }]}>
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
            style={styles.greetingRow}
          >
            <View style={styles.greetingTextWrap}>
              <Text style={styles.welcomeText}>
                Hey <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'there'}</Text>
              </Text>
              <Text style={styles.brandTagline}>Premium laundry, delivered fresh</Text>
            </View>
            <View style={styles.availabilityBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.availabilityText}>9 AM - 9 PM</Text>
            </View>
          </MotiView>
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
            getItemLayout={(_data, index) => ({
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
          {/* Animated Pagination Dots */}
          <View style={styles.paginationDots}>
            {PROMOS.map((_, index) => (
              <MotiView
                key={index}
                style={styles.dot}
                animate={{
                  width: currentIndex === index ? 22 : 6,
                  backgroundColor: currentIndex === index ? COLORS.primary : '#E2E8F0',
                }}
                transition={{ type: 'timing', duration: 300 }}
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
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Our Services</Text>
              <Text style={styles.sectionSubtitle}>Premium laundry care</Text>
            </View>
            <View style={styles.trustBadgeCompact}>
              <ShieldCheck size={12} color={COLORS.primary} strokeWidth={2.5} />
              <Text style={styles.trustBadgeText}>Trusted</Text>
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
                  transition={{ delay: 200 + index * 100, type: 'spring', damping: 18 }}
                  style={{ width: '48.5%' }}
                >
                  <AnimatedButton
                    onPress={() => handleServicePress(service.id)}
                    style={styles.serviceCard}
                  >
                    <LinearGradient colors={service.gradient} style={styles.serviceCardGradient}>
                      <Image
                        source={service.image}
                        style={styles.serviceCardImage}
                        contentFit="cover"
                        transition={300}
                      />
                      <View style={styles.serviceCardOverlay} />
                    </LinearGradient>
                    <View style={styles.serviceCardFooter}>
                      <Text style={styles.serviceCardName}>{service.name}</Text>
                      <ChevronRight size={14} color={COLORS.primaryLight} strokeWidth={2} />
                    </View>
                  </AnimatedButton>
                </MotiView>
              ))}
            </View>

            {/* Row 2: 50/50 split for Ironing and Blanket Wash */}
            <View style={styles.bentoRow}>
              {[SERVICES[2], SERVICES[3]].map((service, index) => (
                <MotiView
                  key={service.id}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: 400 + index * 100, type: 'spring', damping: 18 }}
                  style={{ width: '48.5%' }}
                >
                  <AnimatedButton
                    onPress={() => handleServicePress(service.id)}
                    style={styles.serviceCard}
                  >
                    <LinearGradient colors={service.gradient} style={styles.serviceCardGradient}>
                      <Image
                        source={service.image}
                        style={styles.serviceCardImage}
                        contentFit="cover"
                        transition={300}
                      />
                      <View style={styles.serviceCardOverlay} />
                    </LinearGradient>
                    <View style={styles.serviceCardFooter}>
                      <Text style={styles.serviceCardName}>{service.name}</Text>
                      <ChevronRight size={14} color={COLORS.primaryLight} strokeWidth={2} />
                    </View>
                  </AnimatedButton>
                </MotiView>
              ))}
            </View>

            {/* Row 3: Subscribe Feature Card */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 500, type: 'spring', damping: 18 }}
              style={styles.bentoRowFull}
            >
              <GlassCard cornerRadius="xl" style={styles.subscribeCard}>
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
                  <View style={styles.subscribeLeft}>
                    <View style={styles.exclusiveBadge}>
                      <Text style={styles.exclusiveBadgeText}>EXCLUSIVE</Text>
                    </View>
                    <Text style={styles.subscribeTitle}>Smart Care Subscription</Text>
                    <Text style={styles.subscribeSubtitle}>Save 20% on every wash</Text>
                  </View>
                  <View style={styles.subscribeIconGroup}>
                    <Sparkles size={24} color="#FDE047" strokeWidth={1.5} />
                    <ChevronRight size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                  </View>
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

      {/* Floating Cart Button - Animated Entrance */}
      {cartItemCount > 0 && (
        <MotiView
          from={{ translateY: 100, opacity: 0, scale: 0.9 }}
          animate={{ translateY: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          style={[styles.cartButtonContainer, { bottom: insets.bottom + 16 }]}
        >
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
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </MotiView>
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
  greetingContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 22,
    color: '#1E1B4B',
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  userName: {
    color: COLORS.primary,
    fontFamily: 'Outfit_700Bold',
  },
  brandTagline: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  availabilityText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#475569',
  },
  headerTopArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    lineHeight: 12,
    textAlign: 'center',
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    flex: 1,
    marginRight: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressInfo: {
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
  scrollContent: {
    paddingBottom: 140,
  },
  promoSection: {
    marginTop: -10,
    zIndex: 10,
  },
  promoList: {
    paddingHorizontal: SPACING.sm, // Reduced to show peek of next card
    paddingVertical: SPACING.sm,
  },
  promoCard: {
    width: Dimensions.get('window').width - 32,
    height: 148,
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
    paddingLeft: 18,
    paddingRight: 12,
  },
  promoContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  promoBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
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
    fontSize: 22,
    color: '#1E293B',
    fontFamily: 'Outfit_700Bold',
    lineHeight: 26,
    marginBottom: 3,
  },
  promoSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Outfit_500Medium',
  },
  promoImage: {
    width: 120,
    height: 120,
    marginRight: -4,
  },
  promoCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  promoCTAText: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.primary,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 3,
  },
  servicesSection: {
    paddingHorizontal: SPACING.md,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'column',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
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
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
    ...Platform.OS === 'web'
      ? { boxShadow: '0px 8px 24px rgba(124, 58, 237, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.02)' }
      : {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      },
  },
  serviceCardGradient: {
    height: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  serviceCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  serviceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  serviceCardName: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
    flex: 1,
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
  subscribeCard: {
    height: 120,
    ...SHADOWS.primary,
  },
  subscribeLeft: {
    flex: 1,
    marginRight: 12,
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
  subscribeIconGroup: {
    alignItems: 'center',
    gap: 6,
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
    zIndex: 100,
    paddingHorizontal: SPACING.md,
    overflow: 'hidden',
  },
  stickyHeaderBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
