import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

// Import images directly or use require
const IMAGES = {
  slide1: require('../../../assets/onboarding_lifecycle.png'),
  slide2: require('../../../assets/onboarding_fast.png'), // Using placeholder for now (wash_fold)
  slide3: require('../../../assets/onboarding_eco.png'), // Using placeholder for now (premium)
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
    image: IMAGES.slide1, // Weekend/Lifestyle illustration
  },
  {
    id: '2',
    title: 'Fast, Affordable, Hygienic',
    subtitle: 'Quick service at your doorstep with premium quality',
    image: IMAGES.slide2, // Fast Delivery illustration
  },
  {
    id: '3',
    title: 'Eco-Friendly Service',
    subtitle: 'Sustainable cleaning that cares for your clothes and planet',
    image: IMAGES.slide3, // Eco-friendly illustration
  },
];

export const OnboardingCarousel: React.FC = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
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
    <View style={[styles.slide, { width }]}>
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
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
      {/* Background decoration */}
      <View style={styles.circleDecoration} />

      <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
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
      />

      <View style={styles.bottomContainer}>
        {renderPaginationDots()}

        <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  circleDecoration: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: COLORS.primaryLight + '20', // 20% opacity using hex
    zIndex: -1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingTop: height * 0.15,
  },
  imageContainer: {
    width: width * 0.9,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
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
    bottom: SPACING.xl * 1.5,
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
    top: 60,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nextButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontSize: 18,
  },
});
