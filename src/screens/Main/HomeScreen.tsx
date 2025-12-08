import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';
import { useAddressStore } from '../../store';
import { ServiceDetailScreen } from './ServiceDetailScreen';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

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

const SERVICES = [
  {
    id: 'wash_fold',
    name: 'Wash & Fold',
    icon: 'water-outline',
    color: COLORS.primary,
    description: 'Regular wash and fold service',
  },
  {
    id: 'wash_iron',
    name: 'Wash & Iron',
    icon: 'shirt-outline',
    color: COLORS.primary,
    description: 'Wash, dry, and iron service',
  },
  {
    id: 'blanket_wash',
    name: 'Blanket Wash',
    icon: 'home-outline',
    color: COLORS.success,
    description: 'Professional blanket cleaning',
  },
  {
    id: 'premium_laundry',
    name: 'Premium Laundry',
    icon: 'diamond-outline',
    color: '#FFD700',
    description: 'Premium care for delicate garments',
  },
  {
    id: 'dry_clean',
    name: 'Dry Cleaning',
    icon: 'sparkles-outline',
    color: '#9333EA',
    description: 'Premium dry cleaning service',
  },
  {
    id: 'shoe_clean',
    name: 'Shoe Cleaning',
    icon: 'footsteps-outline',
    color: COLORS.info,
    description: 'Professional shoe cleaning',
  },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);

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

  const renderServiceCard = (service: typeof SERVICES[0]) => (
    <TouchableOpacity
      key={service.id}
      style={styles.serviceCard}
      onPress={() => handleServicePress(service.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.serviceIconContainer, { backgroundColor: service.color + '20' }]}>
        <Ionicons name={service.icon as any} size={40} color={service.color} />
      </View>
      <Text style={styles.serviceName}>{service.name}</Text>
      <Text style={styles.serviceDescription}>{service.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <TouchableOpacity style={styles.addressButton}>
              <Text style={styles.locationLabel}>Home</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {currentAddress || 'Select Location'}
              </Text>
            </TouchableOpacity>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${user?.name || 'Guest'}&background=EC4899&color=fff&size=128` }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Hello, {user?.name || 'User'}! 👋</Text>
          <Text style={styles.subGreeting}>What needs cleaning today?</Text>
        </View>

        {/* Search Bar - Placeholder for now */}
        {/* <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <Text style={styles.searchText}>Search for services...</Text>
        </View> */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <Text style={styles.sectionSubtitle}>
            Pick the service you need. All orders delivered within 6 hours.
          </Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map(renderServiceCard)}
          </View>
        </View>
      </ScrollView>

      {/* Service Detail Modal */}
      {selectedService && (
        <ServiceDetailScreen
          visible={serviceModalVisible}
          onClose={handleCloseServiceModal}
          vendorId="default" // Using default vendor since we're not using vendor model
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
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background, // White/Clean header
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
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
    paddingBottom: SPACING.xl * 2,
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
  servicesSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
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
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  serviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  serviceName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  serviceDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
