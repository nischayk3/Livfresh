import React, { useState, useRef, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../utils/constants';

// Import images directly or use require
const IMAGES = {
  slide1: require('../../../assets/onboarding_lifecycle.png'),
  slide2: require('../../../assets/onboarding_fast.png'),
  slide3: require('../../../assets/onboarding_eco.png'),
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
    subtitle: 'Quick service at your doorstep with premium quality',
    image: IMAGES.slide2,
  },
  {
    id: '3',
    title: 'Eco-Friendly Service',
    subtitle: 'Sustainable cleaning that cares for your clothes and planet',
    image: IMAGES.slide3,
  },
];

export const OnboardingCarousel: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Constrain width on web/tablets for consistent UI
  const slideWidth = Math.min(width, 500);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentIndex < slides.length - 1) {
        const nextIndex = currentIndex + 1;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      } else {
        // Stop auto-scroll at the end or loop? User said "auto shift... currently user have click next next"
        // Let's loop back to start for continuous engagement or stop?
        // Usually onboarding stops or loops. Let's Loop for now as it's a "carousel".
        // Actually, typical onboarding flows stop at the "Get Started" button.
        // But "Carousel" implies looping. Let's make it go to 0 if at end,
        // BUT the last slide has "Get Started", so auto-moving away from it might be annoying.
        // Let's stop at the end.
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / slideWidth);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate('PhoneLogin' as never);
    }
  };

  const handleSkip = () => {
    navigation.navigate('PhoneLogin' as never);
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: slideWidth }]}>
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.image}
          contentFit="contain"
          transition={500}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderPaginationDots = () => (
    <View style={styles.paginationContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Centered Wrapper for Web */}
      <View style={[styles.contentWrapper, { width: slideWidth }]}>

        {/* Background decoration */}
        <View style={styles.circleDecoration} />

        <TouchableOpacity onPress={handleSkip} style={[styles.skipButton, { top: insets.top + 16 }]}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

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
          getItemLayout={(data, index) => (
            { length: slideWidth, offset: slideWidth * index, index }
          )}
        />

        <View style={[styles.bottomContainer, { bottom: insets.bottom + SPACING.xl }]}>
          {renderPaginationDots()}

          <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    alignItems: 'center', // Center content on web
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500, // Constrain width on wide screens
    width: '100%',
    position: 'relative',
    overflow: 'hidden', // Contain absolute positioned elements?
  },
  circleDecoration: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#F9A8D4' + '33', // Hex opacity
    zIndex: -1,
  },
  slide: {
    height: '100%',
    alignItems: 'center',
    paddingTop: 60,
  },
  imageContainer: {
    width: '100%',
    height: 350, // Fixed height for consistency
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
  },
  image: {
    width: '80%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...TYPOGRAPHY.heading,
    textAlign: 'center',
    marginBottom: SPACING.md,
    color: COLORS.text,
    fontSize: 28,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 24,
    maxWidth: '90%',
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.xl,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: COLORS.border,
  },
  skipButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    padding: SPACING.xs,
  },
  skipText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(236, 72, 153, 0.3)' }, // Manual shadow if SHADOWS.primary isn't working as expected
      default: SHADOWS.primary,
    }),
  },
  nextButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontSize: 18,
  },
});
