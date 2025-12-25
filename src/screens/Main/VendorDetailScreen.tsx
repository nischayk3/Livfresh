import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getVendor, getVendorServices } from '../../services/firestore';
import { ServiceDetailScreen } from './ServiceDetailScreen';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { useUIStore } from '../../store';
import { BrandLoader } from '../../components/BrandLoader';

interface Service {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unit: string;
  available: boolean;
}

export const VendorDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const { showAlert } = useUIStore();
  const route = useRoute();
  const { vendorId } = route.params as { vendorId: string };

  const [vendor, setVendor] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);

  useEffect(() => {
    loadVendorData();
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      const vendorData = await getVendor(vendorId);
      const vendorServices = await getVendorServices(vendorId);

      setVendor(vendorData);
      setServices(vendorServices as Service[]);
    } catch (error: any) {
      console.error('Error loading vendor:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load vendor details. Please try again.',
        type: 'error',
        onClose: () => navigation.goBack()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setCurrentServiceId(serviceId);
    setServiceModalVisible(true);
  };

  const handleCloseServiceModal = () => {
    setServiceModalVisible(false);
    setCurrentServiceId(null);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#FBBF24" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FBBF24" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#D1D5DB" />
      );
    }

    return stars;
  };

  if (loading) {
    return <BrandLoader message="Loading vendor details..." />;
  }

  if (!vendor) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: vendor.imageUrl || 'https://via.placeholder.com/400x200' }}
            style={styles.vendorImage}
            contentFit="cover"
            transition={500}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButtonOverlay}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Vendor Info Overlay */}
          <View style={styles.vendorInfoOverlay}>
            <Text style={styles.vendorNameOverlay}>{vendor.name}</Text>
            <View style={styles.ratingContainerOverlay}>
              {renderStars(vendor.rating || 0)}
              <Text style={styles.ratingTextOverlay}>
                {vendor.rating?.toFixed(1)} ({vendor.totalRatings || 0})
              </Text>
            </View>
          </View>
        </View>

        {/* Vendor Details */}
        <View style={styles.detailsSection}>
          {/* Rating & Reviews */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingRow}>
              <View style={styles.ratingBox}>
                <Text style={styles.ratingNumber}>{vendor.rating?.toFixed(1) || '0.0'}</Text>
                <View style={styles.starsContainer}>
                  {renderStars(vendor.rating || 0)}
                </View>
                <Text style={styles.ratingCount}>
                  {vendor.totalRatings || 0} ratings
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoText}>{vendor.deliveryTime || '2-3 hours'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                <Text style={styles.infoText}>Min ₹{vendor.minOrder || 100}</Text>
              </View>
            </View>
          </View>

          {/* Address */}
          <View style={styles.addressSection}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <Text style={styles.addressText}>{vendor.address}</Text>
          </View>

          {/* Timings */}
          <View style={styles.timingsSection}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <Text style={styles.timingsText}>
              {vendor.timings?.open || '08:00'} - {vendor.timings?.close || '20:00'}
            </Text>
          </View>

          {/* Services Section */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>Services at {vendor.name}</Text>
            <Text style={styles.servicesSubtitle}>
              Pick the service you need. All orders delivered within {vendor.deliveryTime || '6 hours'}.
            </Text>
            <View style={styles.servicesGrid}>
              {services.map((service) => {
                const serviceIcons: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
                  'wash_fold': { name: 'water-outline', color: COLORS.primary },
                  'wash_iron': { name: 'shirt-outline', color: COLORS.primary },
                  'blanket_wash': { name: 'home-outline', color: COLORS.success },
                  'shoe_clean': { name: 'footsteps-outline', color: COLORS.info },
                  'dry_clean': { name: 'sparkles-outline', color: '#9333EA' },
                  'premium_laundry': { name: 'diamond-outline', color: '#FFD700' },
                };
                const icon = serviceIcons[service.id] || { name: 'shirt-outline', color: COLORS.primary };

                return (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceTile}
                    onPress={() => handleServiceSelect(service.id)}
                    disabled={!service.available}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.serviceIconContainer, { backgroundColor: icon.color + '20' }]}>
                      <Ionicons name={icon.name} size={32} color={icon.color} />
                    </View>
                    <Text style={styles.serviceTileName}>{service.name}</Text>
                    {!service.available && (
                      <Text style={styles.unavailableText}>Unavailable</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Service Detail Modal */}
      {currentServiceId && (
        <ServiceDetailScreen
          visible={serviceModalVisible}
          onClose={handleCloseServiceModal}
          vendorId={vendorId}
          serviceId={currentServiceId}
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
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  backButtonOverlay: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  vendorInfoOverlay: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  vendorNameOverlay: {
    ...TYPOGRAPHY.heading,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  ratingContainerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingTextOverlay: {
    ...TYPOGRAPHY.bodySmall,
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  detailsSection: {
    padding: SPACING.lg,
  },
  ratingSection: {
    marginBottom: SPACING.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBox: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.sm,
  },
  ratingNumber: {
    ...TYPOGRAPHY.heading,
    fontSize: 32,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  ratingCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.md,
  },
  addressText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  timingsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.md,
  },
  timingsText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  servicesSection: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  servicesSubtitle: {
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
  serviceTile: {
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  serviceTileName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  unavailableText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  backButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
});

