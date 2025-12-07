import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore, CartItem } from '../../store/cartStore';
import { getVendor, getVendorServices } from '../../services/firestore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';

interface ServiceDetailScreenProps {
  visible: boolean;
  onClose: () => void;
  vendorId: string;
  serviceId: string;
}

export const ServiceDetailScreen: React.FC<ServiceDetailScreenProps> = ({
  visible,
  onClose,
  vendorId,
  serviceId,
}) => {
  const navigation = useNavigation();
  const { addItem } = useCartStore();
  
  const [vendor, setVendor] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Wash & Fold / Wash & Iron state
  const [selectedWeight, setSelectedWeight] = useState<'small' | 'large' | null>(null);
  const [ironingEnabled, setIroningEnabled] = useState(false);
  const [ironingCount, setIroningCount] = useState(0);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Blanket Wash state
  const [blanketType, setBlanketType] = useState<'single' | 'double' | null>(null);
  const [blanketQuantity, setBlanketQuantity] = useState(0);

  // Shoe Cleaning state
  const [shoeSelections, setShoeSelections] = useState<Record<string, number>>({
    'canvas_sports': 0,
    'crocs_sandals': 0,
    'leather_shoes': 0,
    'slippers': 0,
  });

  // Dry Cleaning state
  const [dryCleanWeight, setDryCleanWeight] = useState<'light' | 'medium' | 'heavy'>('light');
  const [dryCleanItems, setDryCleanItems] = useState<Record<string, number>>({
    'blouse': 0,
    'dress': 0,
    'dupatta': 0,
    'jeans': 0,
  });

  // Premium Laundry state (similar to wash services but with premium care)
  const [premiumWeight, setPremiumWeight] = useState<'small' | 'large' | null>(null);
  const [premiumIroningEnabled, setPremiumIroningEnabled] = useState(false);
  const [premiumIroningCount, setPremiumIroningCount] = useState(0);
  const [premiumSpecialInstructions, setPremiumSpecialInstructions] = useState('');

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, vendorId, serviceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Default service data (no vendor dependency)
      const defaultServices: Record<string, any> = {
        'wash_fold': { id: 'wash_fold', name: 'Wash & Fold', description: 'Regular wash and fold service' },
        'wash_iron': { id: 'wash_iron', name: 'Wash & Iron', description: 'Wash, dry, and iron service' },
        'blanket_wash': { id: 'blanket_wash', name: 'Blanket Wash', description: 'Professional blanket cleaning' },
        'shoe_clean': { id: 'shoe_clean', name: 'Shoe Cleaning', description: 'Professional shoe cleaning service' },
        'dry_clean': { id: 'dry_clean', name: 'Dry Cleaning', description: 'Premium dry cleaning service' },
        'premium_laundry': { id: 'premium_laundry', name: 'Premium Laundry', description: 'Premium care for delicate and high-end garments' },
      };
      
      const serviceData = defaultServices[serviceId] || { id: serviceId, name: 'Service', description: '' };
      const defaultVendor = { 
        id: 'default', 
        name: 'Spinit Laundry', 
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' 
      };
      
      setVendor(defaultVendor);
      setService(serviceData);
    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (): number => {
    if (!service) return 0;

    let basePrice = 0;

    if (serviceId === 'wash_fold' || serviceId === 'wash_iron') {
      if (selectedWeight === 'small') {
        basePrice = 299; // ~7kg, ~25 clothes
      } else if (selectedWeight === 'large') {
        basePrice = 549; // ~14kg, ~50 clothes
      }
      const ironingPrice = ironingEnabled ? ironingCount * 15 : 0;
      return basePrice + ironingPrice;
    }

    if (serviceId === 'blanket_wash') {
      if (blanketType === 'single') {
        basePrice = 199 * blanketQuantity;
      } else if (blanketType === 'double') {
        basePrice = 299 * blanketQuantity;
      }
      return basePrice;
    }

    if (serviceId === 'shoe_clean') {
      const shoePrices: Record<string, number> = {
        'canvas_sports': 150,
        'crocs_sandals': 100,
        'leather_shoes': 200,
        'slippers': 80,
      };
      return Object.entries(shoeSelections).reduce((total, [type, qty]) => {
        return total + (shoePrices[type] || 0) * qty;
      }, 0);
    }

    if (serviceId === 'dry_clean') {
      const itemPrices: Record<string, number> = {
        'blouse': 79,
        'dress': 79,
        'dupatta': 79,
        'jeans': 79,
      };
      return Object.entries(dryCleanItems).reduce((total, [type, qty]) => {
        return total + (itemPrices[type] || 0) * qty;
      }, 0);
    }

    if (serviceId === 'premium_laundry') {
      if (premiumWeight === 'small') {
        basePrice = 399; // ~7kg, ~25 clothes (premium pricing)
      } else if (premiumWeight === 'large') {
        basePrice = 699; // ~14kg, ~50 clothes (premium pricing)
      }
      const ironingPrice = premiumIroningEnabled ? premiumIroningCount * 20 : 0; // Premium ironing at ₹20 per piece
      return basePrice + ironingPrice;
    }

    return basePrice;
  };

  const handleAddToCart = () => {
    if (!service) return;

    const totalPrice = calculateTotal();

    // Validation
    if (serviceId === 'wash_fold' || serviceId === 'wash_iron') {
      if (!selectedWeight) {
        alert('Please select weight');
        return;
      }
    }

    if (serviceId === 'blanket_wash') {
      if (!blanketType || blanketQuantity === 0) {
        alert('Please select blanket type and quantity');
        return;
      }
    }

    if (serviceId === 'shoe_clean') {
      const totalShoes = Object.values(shoeSelections).reduce((a, b) => a + b, 0);
      if (totalShoes === 0) {
        alert('Please select at least one shoe');
        return;
      }
    }

    if (serviceId === 'dry_clean') {
      const totalItems = Object.values(dryCleanItems).reduce((a, b) => a + b, 0);
      if (totalItems === 0) {
        alert('Please select at least one item');
        return;
      }
    }

    if (serviceId === 'premium_laundry') {
      if (!premiumWeight) {
        alert('Please select weight');
        return;
      }
    }

    const cartItem: CartItem = {
      id: '',
      vendorId: vendorId || 'default',
      vendorName: vendor?.name || 'Spinit Laundry',
      serviceId: serviceId,
      serviceName: service?.name || 'Service',
      serviceType: serviceId as any,
      basePrice: totalPrice,
      totalPrice: totalPrice,
      specialInstructions: specialInstructions || undefined,
    };

    // Add service-specific data
    if (serviceId === 'wash_fold' || serviceId === 'wash_iron') {
      cartItem.weight = selectedWeight === 'small' ? 7 : 14;
      cartItem.clothesCount = selectedWeight === 'small' ? 25 : 50;
      cartItem.ironingEnabled = ironingEnabled;
      cartItem.ironingCount = ironingCount;
      cartItem.ironingPrice = ironingEnabled ? ironingCount * 15 : 0;
    }

    if (serviceId === 'blanket_wash') {
      cartItem.blanketType = blanketType || undefined;
      cartItem.blanketQuantity = blanketQuantity;
    }

    if (serviceId === 'shoe_clean') {
      cartItem.shoeType = Object.entries(shoeSelections)
        .filter(([_, qty]) => qty > 0)
        .map(([type, qty]) => `${type}:${qty}`)
        .join(',');
      cartItem.shoeQuantity = Object.values(shoeSelections).reduce((a, b) => a + b, 0);
    }

    if (serviceId === 'dry_clean') {
      cartItem.dryCleanWeight = dryCleanWeight;
      cartItem.dryCleanItems = Object.entries(dryCleanItems)
        .filter(([_, qty]) => qty > 0)
        .map(([type, qty]) => ({
          type,
          quantity: qty,
          price: 79,
        }));
    }

    if (serviceId === 'premium_laundry') {
      cartItem.weight = premiumWeight === 'small' ? 7 : 14;
      cartItem.clothesCount = premiumWeight === 'small' ? 25 : 50;
      cartItem.ironingEnabled = premiumIroningEnabled;
      cartItem.ironingCount = premiumIroningCount;
      cartItem.ironingPrice = premiumIroningEnabled ? premiumIroningCount * 20 : 0;
      cartItem.specialInstructions = premiumSpecialInstructions || undefined;
    }

    addItem(cartItem);
    alert('Added to cart!');
    onClose();
  };

  const renderWashService = () => (
    <View>
      {/* Weight Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Estimated Weight</Text>
        <TouchableOpacity
          style={[styles.weightOption, selectedWeight === 'small' && styles.weightOptionSelected]}
          onPress={() => setSelectedWeight('small')}
        >
          <View style={styles.weightOptionContent}>
            <View style={styles.radioButton}>
              {selectedWeight === 'small' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.weightOptionText}>~7kg • ~25 clothes</Text>
            <Text style={styles.weightPrice}>₹299</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.weightOption, selectedWeight === 'large' && styles.weightOptionSelected]}
          onPress={() => setSelectedWeight('large')}
        >
          <View style={styles.weightOptionContent}>
            <View style={styles.radioButton}>
              {selectedWeight === 'large' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.weightOptionText}>~14kg • ~50 clothes</Text>
            <Text style={styles.weightPrice}>₹549</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Ironing Add-on */}
      <View style={styles.section}>
        <View style={styles.addonHeader}>
          <Text style={styles.sectionTitle}>Need Ironing?</Text>
          <Text style={styles.addonPrice}>₹15 per piece</Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Ironing</Text>
          <TouchableOpacity
            style={[styles.toggle, ironingEnabled && styles.toggleActive]}
            onPress={() => setIroningEnabled(!ironingEnabled)}
          >
            <View style={[styles.toggleThumb, ironingEnabled && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>
        {ironingEnabled && (
          <View style={styles.quantitySelector}>
            <Text style={styles.quantityLabel}>Number of pieces</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setIroningCount(Math.max(0, ironingCount - 1))}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{ironingCount}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonActive]}
                onPress={() => setIroningCount(ironingCount + 1)}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Add any notes for stains, fabric care, perfume, etc..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
        />
        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderBlanketWash = () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Blanket Type & Quantity</Text>
        <TouchableOpacity
          style={[styles.blanketOption, blanketType === 'single' && styles.blanketOptionSelected]}
          onPress={() => setBlanketType('single')}
        >
          <View style={styles.blanketOptionContent}>
            <View style={styles.radioButton}>
              {blanketType === 'single' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.blanketOptionText}>Single</Text>
            <Text style={styles.blanketPrice}>₹199</Text>
          </View>
          <View style={styles.quantitySelector}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setBlanketQuantity(Math.max(0, blanketQuantity - 1))}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{blanketQuantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonActive]}
                onPress={() => setBlanketQuantity(blanketQuantity + 1)}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.blanketOption, blanketType === 'double' && styles.blanketOptionSelected]}
          onPress={() => setBlanketType('double')}
        >
          <View style={styles.blanketOptionContent}>
            <View style={styles.radioButton}>
              {blanketType === 'double' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.blanketOptionText}>Double</Text>
            <Text style={styles.blanketPrice}>₹299</Text>
          </View>
          <View style={styles.quantitySelector}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setBlanketQuantity(Math.max(0, blanketQuantity - 1))}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{blanketQuantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonActive]}
                onPress={() => setBlanketQuantity(blanketQuantity + 1)}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Add any notes..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={3}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
        />
      </View>
    </View>
  );

  const renderShoeCleaning = () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Shoe Type</Text>
        {[
          { id: 'canvas_sports', name: 'Canvas / Sports', icon: 'footsteps', price: 150 },
          { id: 'crocs_sandals', name: 'Crocs / Sandals', icon: 'footsteps', price: 100 },
          { id: 'leather_shoes', name: 'Leather Shoes', icon: 'footsteps', price: 200 },
          { id: 'slippers', name: 'Slippers', icon: 'footsteps', price: 80 },
        ].map((shoe) => (
          <View key={shoe.id} style={styles.shoeCard}>
            <View style={styles.shoeCardContent}>
              <Ionicons name={shoe.icon as any} size={32} color={COLORS.primary} />
              <View style={styles.shoeInfo}>
                <Text style={styles.shoeName}>{shoe.name}</Text>
                <Text style={styles.shoePrice}>₹{shoe.price}</Text>
              </View>
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setShoeSelections({
                  ...shoeSelections,
                  [shoe.id]: Math.max(0, shoeSelections[shoe.id] - 1),
                })}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{shoeSelections[shoe.id]}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonActive]}
                onPress={() => setShoeSelections({
                  ...shoeSelections,
                  [shoe.id]: shoeSelections[shoe.id] + 1,
                })}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderDryCleaning = () => (
    <View>
      <View style={styles.section}>
        <View style={styles.dryCleanHeader}>
          <View style={styles.weightCategoryContainer}>
            {(['light', 'medium', 'heavy'] as const).map((weight) => (
              <TouchableOpacity
                key={weight}
                style={[
                  styles.weightCategoryButton,
                  dryCleanWeight === weight && styles.weightCategoryButtonActive,
                ]}
                onPress={() => setDryCleanWeight(weight)}
              >
                <Text
                  style={[
                    styles.weightCategoryText,
                    dryCleanWeight === weight && styles.weightCategoryTextActive,
                  ]}
                >
                  {weight.charAt(0).toUpperCase() + weight.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.dryCleanGrid}>
          {[
            { id: 'blouse', name: 'Blouse', icon: 'shirt-outline', price: 79 },
            { id: 'dress', name: 'Dress', subtext: '(Mini/Maxi)', icon: 'shirt-outline', price: 79 },
            { id: 'dupatta', name: 'Dupatta', icon: 'shirt-outline', price: 79 },
            { id: 'jeans', name: 'Jeans', icon: 'shirt-outline', price: 79 },
          ].map((item) => (
            <View key={item.id} style={styles.dryCleanItem}>
              <Ionicons name={item.icon as any} size={32} color={COLORS.primary} />
              <Text style={styles.dryCleanItemName}>{item.name}</Text>
              {item.subtext && <Text style={styles.dryCleanItemSubtext}>{item.subtext}</Text>}
              <Text style={styles.dryCleanItemPrice}>₹{item.price}</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setDryCleanItems({
                    ...dryCleanItems,
                    [item.id]: Math.max(0, dryCleanItems[item.id] - 1),
                  })}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{dryCleanItems[item.id]}</Text>
                <TouchableOpacity
                  style={[styles.quantityButton, styles.quantityButtonActive]}
                  onPress={() => setDryCleanItems({
                    ...dryCleanItems,
                    [item.id]: dryCleanItems[item.id] + 1,
                  })}
                >
                  <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPremiumLaundry = () => (
    <View>
      {/* Weight Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Estimated Weight</Text>
        <Text style={[styles.sectionSubtitle, { marginBottom: SPACING.md, color: COLORS.primary }]}>
          Premium care for delicate and high-end garments
        </Text>
        <TouchableOpacity
          style={[styles.weightOption, premiumWeight === 'small' && styles.weightOptionSelected]}
          onPress={() => setPremiumWeight('small')}
        >
          <View style={styles.weightOptionContent}>
            <View style={styles.radioButton}>
              {premiumWeight === 'small' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.weightOptionText}>~7kg • ~25 clothes</Text>
            <Text style={styles.weightPrice}>₹399</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.weightOption, premiumWeight === 'large' && styles.weightOptionSelected]}
          onPress={() => setPremiumWeight('large')}
        >
          <View style={styles.weightOptionContent}>
            <View style={styles.radioButton}>
              {premiumWeight === 'large' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.weightOptionText}>~14kg • ~50 clothes</Text>
            <Text style={styles.weightPrice}>₹699</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Ironing Add-on */}
      <View style={styles.section}>
        <View style={styles.addonHeader}>
          <Text style={styles.sectionTitle}>Need Ironing?</Text>
          <Text style={styles.addonPrice}>₹20 per piece</Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Premium Ironing</Text>
          <TouchableOpacity
            style={[styles.toggle, premiumIroningEnabled && styles.toggleActive]}
            onPress={() => setPremiumIroningEnabled(!premiumIroningEnabled)}
          >
            <View style={[styles.toggleThumb, premiumIroningEnabled && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>
        {premiumIroningEnabled && (
          <View style={styles.quantitySelector}>
            <Text style={styles.quantityLabel}>Number of pieces</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setPremiumIroningCount(Math.max(0, premiumIroningCount - 1))}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{premiumIroningCount}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonActive]}
                onPress={() => setPremiumIroningCount(premiumIroningCount + 1)}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextActive]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
        <Text style={[styles.sectionSubtitle, { marginBottom: SPACING.sm }]}>
          Add any notes for delicate fabrics, special care requirements, etc.
        </Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Add any notes for stains, fabric care, perfume, etc..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={4}
          value={premiumSpecialInstructions}
          onChangeText={setPremiumSpecialInstructions}
        />
        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton}>
            <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderServiceContent = () => {
    if (serviceId === 'wash_fold' || serviceId === 'wash_iron') {
      return renderWashService();
    }
    if (serviceId === 'blanket_wash') {
      return renderBlanketWash();
    }
    if (serviceId === 'shoe_clean') {
      return renderShoeCleaning();
    }
    if (serviceId === 'dry_clean') {
      return renderDryCleaning();
    }
    if (serviceId === 'premium_laundry') {
      return renderPremiumLaundry();
    }
    return null;
  };

  const totalPrice = calculateTotal();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.dragHandle} />
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Service Image */}
            <View style={styles.serviceImageContainer}>
              <Image
                source={{ uri: vendor?.imageUrl || 'https://via.placeholder.com/400x200' }}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            </View>

            {/* Service Title */}
            <View style={styles.serviceTitleContainer}>
              <Text style={styles.serviceTitle}>{service?.name || 'Service'}</Text>
            </View>

            {/* Scrollable Content Area */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                renderServiceContent()
              )}
            </ScrollView>

            {/* Footer with Total and Add to Cart */}
            <View style={styles.footer}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>₹{totalPrice}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addToCartButton, totalPrice === 0 && styles.addToCartButtonDisabled]}
                onPress={handleAddToCart}
                disabled={totalPrice === 0}
              >
                <LinearGradient
                  colors={totalPrice === 0 ? [COLORS.disabled, COLORS.disabled] : [COLORS.primary, COLORS.primaryDark]}
                  style={styles.addToCartGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: '100%',
    maxHeight: Dimensions.get('window').height * 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: Dimensions.get('window').height * 0.9,
    width: '100%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    position: 'relative',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.sm,
    padding: SPACING.xs,
  },
  serviceImageContainer: {
    height: 200,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceTitleContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  serviceTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: Dimensions.get('window').height * 0.4,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  weightOption: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  weightOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  weightOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  weightOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  weightPrice: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    fontWeight: '700',
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addonPrice: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  toggleLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  quantitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  quantityLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonActive: {
    backgroundColor: COLORS.primary,
  },
  quantityButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 18,
  },
  quantityButtonTextActive: {
    color: COLORS.background,
  },
  quantityValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginHorizontal: SPACING.md,
    minWidth: 30,
    textAlign: 'center',
  },
  instructionsInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundLight,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  mediaButtons: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  mediaButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blanketOption: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  blanketOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  blanketOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  blanketOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    marginLeft: SPACING.md,
  },
  blanketPrice: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
    fontWeight: '700',
  },
  shoeCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
  },
  shoeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  shoeInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  shoeName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  shoePrice: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  dryCleanHeader: {
    marginBottom: SPACING.md,
  },
  weightCategoryContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  weightCategoryButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  weightCategoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weightCategoryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  weightCategoryTextActive: {
    color: COLORS.background,
    fontWeight: '700',
  },
  dryCleanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  dryCleanItem: {
    width: '47%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
  },
  dryCleanItemName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  dryCleanItemSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  dryCleanItemPrice: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  totalAmount: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    fontSize: 24,
  },
  addToCartButton: {
    flex: 1,
    marginLeft: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  addToCartButtonDisabled: {
    opacity: 0.5,
  },
  addToCartGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    fontWeight: '700',
  },
});


