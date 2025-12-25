import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, SHADOWS, RADIUS, TYPOGRAPHY } from '../../utils/constants';
import { useCartStore, useUIStore } from '../../store';
import { CartItem } from '../../store/cartStore';

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
  const insets = useSafeAreaInsets();
  const { addItem } = useCartStore();
  const { showAlert } = useUIStore();

  const [vendor, setVendor] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Media Attachment State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Wash & Fold / Wash & Iron state
  const [selectedWeight, setSelectedWeight] = useState<'small' | 'large' | null>(null);
  const [ironingEnabled, setIroningEnabled] = useState(false);
  const [ironingCount, setIroningCount] = useState(0);
  const [clothesCount, setClothesCount] = useState(0); // New state for Wash & Fold clothes count
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Blanket Wash state - Separated
  const [singleBlanketCount, setSingleBlanketCount] = useState(0);
  const [doubleBlanketCount, setDoubleBlanketCount] = useState(0);

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

  // Premium Laundry state
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

  // Service Illustrations Mapping
  const SERVICE_IMAGES: Record<string, any> = {
    'wash_fold': require('../../../assets/services/wash_fold.png'),
    'wash_iron': require('../../../assets/services/wash_iron.png'),
    'blanket_wash': require('../../../assets/services/blanket_wash.png'),
    // Fallbacks or future services can use existing assets or default
    'default': require('../../../assets/laundry_illustration.png'),
  };

  const getServiceImage = () => {
    if (serviceId && SERVICE_IMAGES[serviceId]) {
      return SERVICE_IMAGES[serviceId];
    }
    // Fallback for unmapped services or if vendor has specific image
    return vendor?.imageUrl ? { uri: vendor.imageUrl } : SERVICE_IMAGES['default'];
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showAlert({
        title: 'Permission Required',
        message: 'Permission to access camera roll is required!',
        type: 'warning'
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setSelectedImage(pickerResult.assets[0].uri);
    }
  };

  const handleCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      showAlert({
        title: 'Permission Required',
        message: 'Permission to access camera is required!',
        type: 'warning'
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      } else {
        showAlert({
          title: 'Permission Required',
          message: 'Permission to record audio is required!',
          type: 'warning'
        });
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setRecording(null);
    setIsRecording(false);
    await recording?.stopAndUnloadAsync();
    // const uri = recording?.getURI();
    // Logic to store/attach voice note would go here
    showAlert({
      title: 'Success',
      message: 'Voice note recorded!',
      type: 'success'
    });
  };

  const renderMediaButtons = () => (
    <View style={styles.mediaButtonsContainer}>
      <TouchableOpacity style={styles.mediaButton} onPress={handleCamera}>
        <View style={[styles.mediaIconCircle, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="camera" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.mediaButtonText}>Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.mediaButton} onPress={handlePickImage}>
        <View style={[styles.mediaIconCircle, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="images" size={20} color="#16A34A" />
        </View>
        <Text style={styles.mediaButtonText}>Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mediaButton}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <View style={[
          styles.mediaIconCircle,
          { backgroundColor: isRecording ? '#FEE2E2' : '#F3F4F6' }
        ]}>
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={20}
            color={isRecording ? "#DC2626" : COLORS.textSecondary}
          />
        </View>
        <Text style={styles.mediaButtonText}>
          {isRecording ? 'Stop' : 'Voice Note'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderImagePreview = () => {
    if (!selectedImage) return null;

    return (
      <View style={styles.imagePreviewContainer}>
        <Image source={{ uri: selectedImage }} style={styles.imagePreview} contentFit="cover" transition={300} />
        <TouchableOpacity
          style={styles.removeImageButton}
          onPress={() => setSelectedImage(null)}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
        <Text style={[styles.sectionSubtitle, { marginLeft: SPACING.sm }]}>
          Image attached
        </Text>
      </View>
    );
  };

  const calculateTotal = (): number => {
    if (!service) return 0;

    let basePrice = 0;

    if (serviceId === 'wash_fold' || serviceId === 'wash_iron') {
      if (selectedWeight === 'small') {
        basePrice = 299; // ~7kg
      } else if (selectedWeight === 'large') {
        basePrice = 549; // ~14kg
      }
      const ironingPrice = ironingEnabled ? ironingCount * 15 : 0;
      return basePrice + ironingPrice;
    }

    if (serviceId === 'blanket_wash') {
      const singlePrice = 199 * singleBlanketCount;
      const doublePrice = 299 * doubleBlanketCount;
      return singlePrice + doublePrice;
    }

    // ... (Shoe/Dry Clean Logic remains same)

    return basePrice;
  };

  const handleAddToCart = () => {
    if (!service) return;

    const totalPrice = calculateTotal();

    // Validation
    if (serviceId === 'wash_fold' || serviceId === 'wash_iron' || serviceId === 'premium_laundry') {
      const weight = (serviceId === 'premium_laundry') ? premiumWeight : selectedWeight;

      if (!weight) {
        showAlert({
          title: 'Required',
          message: 'Please select weight first',
          type: 'warning'
        });
        return;
      }

      // Check limits
      const maxPieces = weight === 'small' ? 25 : 50;
      const currentIroningCount = (serviceId === 'premium_laundry') ? premiumIroningCount : ironingCount;
      const isIroningEnabled = (serviceId === 'premium_laundry') ? premiumIroningEnabled : ironingEnabled;

      if (isIroningEnabled && currentIroningCount > maxPieces) {
        showAlert({
          title: 'Limit Exceeded',
          message: `Maximum ${maxPieces} ironing pieces allowed for this weight.`,
          type: 'warning'
        });
        return;
      }
    }

    if (serviceId === 'blanket_wash') {
      if (singleBlanketCount === 0 && doubleBlanketCount === 0) {
        showAlert({
          title: 'Selection Empty',
          message: 'Please add at least one blanket',
          type: 'warning'
        });
        return;
      }
    }

    // ... (Cart Item Creation)

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

    if (serviceId === 'wash_fold' || serviceId === 'wash_iron') {
      cartItem.weight = selectedWeight === 'small' ? 7 : 14;
      cartItem.clothesCount = 0; // Default to 0 since we don't ask
      cartItem.ironingEnabled = ironingEnabled;
      cartItem.ironingCount = ironingCount;
      cartItem.ironingPrice = ironingEnabled ? ironingCount * 15 : 0;
    }

    if (serviceId === 'blanket_wash') {
      // Store description of mix
      const parts = [];
      if (singleBlanketCount > 0) parts.push(`${singleBlanketCount} Single`);
      if (doubleBlanketCount > 0) parts.push(`${doubleBlanketCount} Double`);

      cartItem.blanketQuantity = singleBlanketCount + doubleBlanketCount;
      cartItem.description = parts.join(', '); // Helper for display
      cartItem.singleBlanketCount = singleBlanketCount;
      cartItem.doubleBlanketCount = doubleBlanketCount;
    }

    if (serviceId === 'premium_laundry') {
      cartItem.weight = premiumWeight === 'small' ? 7 : 14;
      cartItem.ironingEnabled = premiumIroningEnabled;
      cartItem.ironingCount = premiumIroningCount;
      cartItem.ironingPrice = premiumIroningEnabled ? premiumIroningCount * 20 : 0;
    }

    addItem(cartItem);
    onClose();
    showAlert({
      title: 'Cart Updated',
      message: 'Added to cart!',
      type: 'success'
    });
  };

  // ... (Media Logic)

  const renderWashService = () => {
    const maxPieces = selectedWeight === 'small' ? 25 : (selectedWeight === 'large' ? 50 : 0);

    return (
      <View>
        {/* Weight Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Estimated Weight</Text>
          <TouchableOpacity
            style={[styles.weightOption, selectedWeight === 'small' && styles.weightOptionSelected]}
            onPress={() => {
              setSelectedWeight('small');
              setClothesCount(0);
              setIroningCount(0); // Reset ironing count too
            }}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {selectedWeight === 'small' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~7kg • Max 25 clothes</Text>
              <Text style={styles.weightPrice}>₹299</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.weightOption, selectedWeight === 'large' && styles.weightOptionSelected]}
            onPress={() => {
              setSelectedWeight('large');
              setClothesCount(0);
              setIroningCount(0); // Reset ironing count
            }}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {selectedWeight === 'large' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~14kg • Max 50 clothes</Text>
              <Text style={styles.weightPrice}>₹549</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Number of Clothes Section REMOVED */}

        {/* Ironing Add-on - Only for Wash & Fold */}
        {serviceId === 'wash_fold' && (
          <View style={[styles.section, !selectedWeight && { opacity: 0.5 }]}>
            <View style={styles.addonHeader}>
              <Text style={styles.sectionTitle}>Need Ironing?</Text>
              <Text style={styles.addonPrice}>₹15 per piece</Text>
            </View>
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Ironing</Text>
              <TouchableOpacity
                style={[styles.toggle, ironingEnabled && styles.toggleActive]}
                onPress={() => {
                  if (selectedWeight) setIroningEnabled(!ironingEnabled);
                  else showAlert({
                    title: 'Weight Required',
                    message: 'Select weight first',
                    type: 'info'
                  });
                }}
                disabled={!selectedWeight}
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
                    style={[styles.quantityButton, ironingCount >= maxPieces && styles.quantityButtonDisabled]}
                    onPress={() => setIroningCount(Math.min(maxPieces, ironingCount + 1))}
                    disabled={ironingCount >= maxPieces}
                  >
                    <Text style={[styles.quantityButtonText, ironingCount >= maxPieces && styles.quantityButtonTextDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions (optional)</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Add any notes..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
          />
          {renderMediaButtons()}
          {renderImagePreview()}
        </View>
      </View>
    );
  }

  const renderBlanketWash = () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Blanket Type & Quantity</Text>

        {/* Single Blanket Row */}
        <View style={styles.blanketRow}>
          <View style={styles.blanketInfo}>
            <Text style={styles.blanketOptionText}>Single Blanket</Text>
            <Text style={styles.blanketPrice}>₹199 / pc</Text>
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setSingleBlanketCount(Math.max(0, singleBlanketCount - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{singleBlanketCount}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, singleBlanketCount >= 5 && styles.quantityButtonDisabled]}
              onPress={() => setSingleBlanketCount(Math.min(5, singleBlanketCount + 1))}
              disabled={singleBlanketCount >= 5}
            >
              <Text style={[styles.quantityButtonText, singleBlanketCount >= 5 && styles.quantityButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Double Blanket Row */}
        <View style={styles.blanketRow}>
          <View style={styles.blanketInfo}>
            <Text style={styles.blanketOptionText}>Double Blanket</Text>
            <Text style={styles.blanketPrice}>₹299 / pc</Text>
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setDoubleBlanketCount(Math.max(0, doubleBlanketCount - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{doubleBlanketCount}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, doubleBlanketCount >= 5 && styles.quantityButtonDisabled]}
              onPress={() => setDoubleBlanketCount(Math.min(5, doubleBlanketCount + 1))}
              disabled={doubleBlanketCount >= 5}
            >
              <Text style={[styles.quantityButtonText, doubleBlanketCount >= 5 && styles.quantityButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        {renderMediaButtons()}
        {renderImagePreview()}
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
        {renderMediaButtons()}
        {renderImagePreview()}
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

            {/* Scrollable Content Area - Image and Title now scrollable */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.serviceImageContainer}>
                <Image
                  source={getServiceImage()}
                  style={styles.serviceImage}
                  contentFit="cover"
                  transition={500}
                />
              </View>

              <View style={styles.serviceTitleContainer}>
                <Text style={styles.serviceTitle}>{service?.name || 'Service'}</Text>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                renderServiceContent()
              )}
            </ScrollView>

            {/* Footer with Total and Add to Cart */}
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : SPACING.lg }]}>
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
    height: '100%',
    justifyContent: 'flex-end',
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
    height: '90%', // Fixed height 90%
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
    flex: 1, // Allow it to flex
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 200,
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
    fontSize: 16,
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
    height: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    ...TYPOGRAPHY.body,
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Center and space evenly
    marginTop: SPACING.sm,
  },
  mediaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  mediaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mediaButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
  },
  removeImageButton: {
    marginLeft: SPACING.sm,
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
  },
  dryCleanHeader: {
    marginBottom: SPACING.md,
  },
  weightCategoryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: RADIUS.md,
    padding: 2,
  },
  weightCategoryButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  weightCategoryButtonActive: {
    backgroundColor: COLORS.background,
    ...SHADOWS.sm,
  },
  weightCategoryText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  weightCategoryTextActive: {
    color: COLORS.primary,
  },
  dryCleanGrid: {
    gap: SPACING.md,
  },
  dryCleanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dryCleanItemName: {
    ...TYPOGRAPHY.body,
    flex: 1,
    marginLeft: SPACING.md,
    color: COLORS.text,
  },
  dryCleanItemSubtext: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textSecondary,
    position: 'absolute',
    left: 60,
    top: 36,
  },
  dryCleanItemPrice: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginRight: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
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
  },
  addToCartButton: {
    flex: 1.5,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  addToCartButtonDisabled: {
    opacity: 0.6,
  },
  addToCartGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  addToCartText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  quantityButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  quantityButtonTextDisabled: {
    color: '#9CA3AF',
  },
  blanketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  blanketInfo: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
});
