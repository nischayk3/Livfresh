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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';
import { useAddressStore } from '../../store';
import { getVendor, getVendorServices } from '../../services/firestore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

interface Service {
  id: string;
  name: string;
  icon?: string | any;
  iconLibrary?: 'Ionicons' | 'MaterialIcons';
  color?: string;
  gradient?: [string, string];
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

// Service icons mapping
const SERVICE_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; library: 'Ionicons' | 'MaterialIcons' }> = {
  'wash_fold': { name: 'shirt-outline', library: 'Ionicons' },
  'wash_iron': { name: 'shirt', library: 'Ionicons' },
  'shoe_clean': { name: 'footsteps', library: 'Ionicons' },
  'bag_clean': { name: 'bag-outline', library: 'Ionicons' },
  'dry_clean': { name: 'sparkles', library: 'Ionicons' },
};

const SERVICE_GRADIENTS: [string, string][] = [
  [COLORS.service1, COLORS.service1Dark],
  [COLORS.service2, COLORS.service2Dark],
  [COLORS.service3, COLORS.service3Dark],
  [COLORS.service4, COLORS.service4Dark],
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { currentAddress } = useAddressStore();
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const vendor = await getVendor('vendor_1');
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      const vendorServices = await getVendorServices('vendor_1');
      
      const mappedServices = vendorServices.map((service: any, index: number) => {
        const serviceIcon = SERVICE_ICONS[service.id] || { name: 'shirt-outline', library: 'Ionicons' };
        return {
          id: service.id,
          name: service.name || 'Service',
          icon: serviceIcon.name as string,
          iconLibrary: serviceIcon.library,
          gradient: SERVICE_GRADIENTS[index % SERVICE_GRADIENTS.length],
        };
      });
      
      setServices(mappedServices);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load services');
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

  const handleServicePress = (serviceId: string) => {
    navigation.navigate('ServiceDetail' as never, { serviceId } as never);
  };

  const handleAddressPress = () => {
    navigation.navigate('AddressList' as never);
  };

  const renderPromoItem = ({ item }: { item: typeof PROMOS[0] }) => (
    <LinearGradient
      colors={item.gradient}
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

  const renderServiceItem = ({ item }: { item: Service }) => {
    const IconComponent = item.iconLibrary === 'MaterialIcons' ? MaterialIcons : Ionicons;
    const gradientColors: [string, string] = item.gradient || [COLORS.service1, COLORS.service1Dark];
    return (
      <TouchableOpacity
        style={styles.serviceTileContainer}
        onPress={() => handleServicePress(item.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.serviceTile}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.serviceIconContainer}>
            <IconComponent 
              name={item.icon as any} 
              size={48} 
              color={COLORS.primary} 
            />
          </View>
          <Text style={styles.serviceName}>{item.name}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
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
        />
      </View>

      {/* Services Grid */}
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.servicesGrid}
        />
      </View>
    </ScrollView>
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
  servicesSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    fontWeight: '700',
  },
  servicesGrid: {
    gap: SPACING.md,
  },
  serviceTileContainer: {
    flex: 1,
    margin: SPACING.xs,
    ...SHADOWS.md,
  },
  serviceTile: {
    aspectRatio: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  serviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  serviceName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: 'center',
  },
});
