import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { COLORS } from '../../utils/constants';
import { PWAInstallBanner } from '../../components/PWAInstallBanner';
import { useUIStore } from '../../store';
import { ASSET_URLS } from '../../utils/assetUrls';

const IMAGES = {
  slide1: { uri: ASSET_URLS.onboarding_screen_1 },
  slide2: { uri: ASSET_URLS.onboarding_screen_2 },
  slide3: { uri: ASSET_URLS.onboarding_pickup_v2 },
};

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  image: any;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Your Weekend is to Live',
    subtitle: 'Let us handle your laundry while you enjoy your free time',
    image: IMAGES.slide1,
  },
  {
    id: '2',
    title: 'Fast, Affordable, Hygienic',
    subtitle: 'Quick doorstep service with premium quality care',
    image: IMAGES.slide2,
  },
  {
    id: '3',
    title: 'Eco-Friendly Service',
    subtitle: 'Sustainable cleaning that cares for your clothes and planet',
    image: IMAGES.slide3,
  },
];

const CARD_ORBS = [
  { top: 8, left: 6, size: 20, color: '#FFFFFF', opacity: 0.8, shadow: 'rgba(255,255,255,0.9)' },
  { top: 16, right: 8, size: 16, color: '#8E51FF', opacity: 0.7, shadow: 'rgba(168,85,247,0.55)' },
  { bottom: 14, left: 10, size: 24, color: '#8E51FF', opacity: 0.35, shadow: 'rgba(168,85,247,0.45)' },
  { bottom: 20, right: 12, size: 12, color: '#FFFFFF', opacity: 0.7, shadow: 'transparent' },
];

export const OnboardingCarousel: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width, 500);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentIndex < slides.length - 1) {
        const nextIndex = currentIndex + 1;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / slideWidth);
    setCurrentIndex(index);
  };

  const { setHasCompletedOnboarding } = useUIStore();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      setHasCompletedOnboarding(true);
    }
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
  };

  const renderSlide = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => (
      <View style={[styles.slide, { width: slideWidth }]}>
        {/* Ambient Violet Glow */}
        {currentIndex === index && (
          <View style={styles.ambientGlow} />
        )}

        {/* Hero Visual Card with Orbs */}
        <MotiView
          from={{ opacity: 0, translateY: 20, scale: 0.95 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 120 }}
          style={styles.heroCard}
        >
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.18)', 'rgba(255, 255, 255, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Floating ambient orbs */}
          {CARD_ORBS.map((orb, i) => (
            <View
              key={i}
              style={[
                styles.orb,
                {
                  width: orb.size,
                  height: orb.size,
                  borderRadius: orb.size / 2,
                  backgroundColor: orb.color,
                  opacity: orb.opacity,
                  top: orb.top as any,
                  left: orb.left as any,
                  right: orb.right as any,
                  bottom: orb.bottom as any,
                },
                orb.shadow !== 'transparent' && {
                  shadowColor: orb.shadow,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 12,
                  elevation: 6,
                },
              ]}
            />
          ))}
          {/* Lavender Glow Blob */}
          <View style={styles.glowBlob} />
          {/* Image */}
          <View style={styles.imageFrame}>
            <Image
              source={item.image}
              style={styles.image}
              contentFit="contain"
              transition={600}
            />
          </View>
        </MotiView>

        {/* Text Content */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, type: 'spring', damping: 20 }}
          style={styles.contentContainer}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={[styles.subtitle, index === 2 && styles.subtitleViolet]}>
            {item.subtitle}
          </Text>
        </MotiView>
      </View>
    ),
    [slideWidth, currentIndex]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrapper, { width: slideWidth }]}>

        {/* SpinZo Pill Badge + Skip — only on slides 1 & 2, last slide has same layout */}
        {currentIndex < 2 ? (
          <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
            <View style={{ width: 60 }} />
            <View style={styles.logoPill}>
              <Text style={styles.logoText}>SpinZo</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.headerBarLast, { paddingTop: insets.top + 10 }]}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SpinZo Brand Pill (on last slide, bigger) */}
        {currentIndex === 2 && (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 14 }}
            style={styles.logoPillLarge}
          >
            <Text style={styles.logoTextLarge}>SpinZo</Text>
          </MotiView>
        )}

        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={(item) => item.id}
          bounces={false}
          snapToInterval={slideWidth}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: slideWidth,
            offset: slideWidth * index,
            index,
          })}
        />

        {/* Bottom Section */}
        <View style={[styles.bottomContainer, { bottom: insets.bottom + 24 }]}>
          {/* Animated Pagination */}
          <View style={styles.paginationRow}>
            {slides.map((_, index) => (
              <MotiView
                key={index}
                style={styles.dot}
                animate={{
                  width: index === currentIndex ? 36 : 8,
                  backgroundColor:
                    index === currentIndex ? COLORS.primary : '#E2E8F0',
                }}
                transition={{ type: 'timing', duration: 250 }}
              />
            ))}
          </View>

          {/* CTA Button */}
          <MotiView
            key={`cta-${currentIndex}`}
            from={{ opacity: 0, scale: 0.95, translateY: 8 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 16 }}
          >
            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* Browse as Guest — last slide only */}
          {currentIndex === slides.length - 1 && (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 200, type: 'timing', duration: 300 }}
            >
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.guestButton}
                activeOpacity={0.7}
              >
                <Text style={styles.guestButtonText}>Browse as Guest</Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500,
    width: '100%',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    top: 80,
    left: '10%',
    width: '80%',
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  headerBarLast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  logoPill: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoText: {
    fontSize: 18,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#F5F3FF',
    letterSpacing: -0.4,
  },
  logoPillLarge: {
    position: 'absolute',
    top: undefined,
    alignSelf: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 100,
    zIndex: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  logoTextLarge: {
    fontSize: 26,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#F5F3FF',
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 140,
  },
  heroCard: {
    width: '85%',
    aspectRatio: 0.78,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.1)',
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 24px 70px rgba(168, 85, 247, 0.16), 0 8px 20px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 35,
        elevation: 10,
      },
    }),
  },
  glowBlob: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(168, 85, 247, 0.10)',
    transform: [{ translateX: -90 }, { translateY: -90 }],
  },
  orb: {
    position: 'absolute',
  },
  imageFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  image: {
    width: '90%',
    height: '90%',
  },
  contentContainer: {
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#020617',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '85%',
  },
  subtitleViolet: {
    color: '#7C3AED',
    fontFamily: 'Outfit_500Medium',
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 18px 40px rgba(124, 58, 237, 0.28)',
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
  },
  guestButton: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
    textDecorationLine: 'underline',
    textDecorationColor: '#7C3AED',
  },
});
