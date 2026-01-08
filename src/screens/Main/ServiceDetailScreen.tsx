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
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, SHADOWS, RADIUS, TYPOGRAPHY } from '../../utils/constants';
import { useCartStore, useUIStore } from '../../store';
import { uploadServicePhotos } from '../../services/firestore';
import { CartItem } from '../../store/cartStore';
import { trackPixelEvent } from '../../utils/pixel';
import { FaqAccordion } from '../../components/FaqAccordion';

// -------------- FAQ DATA --------------
const WASH_FOLD_FAQS = [
  { question: "How is the weight calculated?", answer: "We weigh your clothes on the spot using a digital weighing scale for 100% accuracy." },
  { question: "What's included in Wash & Fold?", answer: "Daily wear clothes including shirts, pants, t-shirts, and tops. Blankets are not included." },
  { question: "How long does it take?", answer: "Most Wash & Fold orders are delivered within 48 hours." }, // Adapted from Wash&Iron
  { question: "Do I need to separate colour-leaking clothes?", answer: "Yes, our team is not responsible for any damage, though we take all necessary precautions." },
];

const WASH_IRON_FAQS = [
  { question: "How is the weight calculated?", answer: "We weigh your clothes on the spot using a digital weighing scale for 100% accuracy." },
  { question: "What's included in Wash & Iron?", answer: "Daily wear clothes including shirts, pants, t-shirts, and tops. Blankets are not included." },
  { question: "How long does it take?", answer: "Most Wash & Iron orders are delivered within 48 hours." },
  { question: "Do I need to separate colour-leaking clothes?", answer: "Yes, our team is not responsible for any damage, though we take all necessary precautions." },
];

const BLANKET_WASH_FAQS = [
  { question: "How is blanket cleaning done?", answer: "Blankets are washed in specialized heavy-duty machines for deep cleaning." },
  { question: "What types of blankets do you accept?", answer: "We accept single and double blankets of all materials." },
  { question: "How long does Blanket Wash take?", answer: "Most blanket wash orders are delivered within 12 hours." },
  { question: "Do you clean heavy duvets / quilts?", answer: "Yes, but pricing may vary depending on thickness." },
];

// Helper for Cross-Platform Image Compression & Resizing
const processImage = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Resize to max 800px width (maintains aspect ratio)
      {
        compress: 0.5, // 50% quality
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );
    return `data:image/jpeg;base64,${result.base64}`;
  } catch (error) {
    console.error("Image processing error:", error);
    // Fallback? Best to throw so we catch it in the UI
    throw error;
  }
};

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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Track ViewContent on mount
  useEffect(() => {
    if (visible && serviceId) {
      // Find service name
      let serviceName = 'Service';
      if (serviceId === 'wash_fold') serviceName = 'Wash & Fold';
      else if (serviceId === 'wash_iron') serviceName = 'Wash & Iron';
      else if (serviceId === 'blanket_wash') serviceName = 'Blanket Wash';

      trackPixelEvent('ViewContent', {
        content_category: 'Laundry Service',
        content_name: serviceName
      });
    }
  }, [visible, serviceId]);

  // Wash & Fold / Wash & Iron state
  // Wash & Fold
  const [washFoldWeight, setWashFoldWeight] = useState<'small' | 'large' | null>(null);
  const [washFoldIroningEnabled, setWashFoldIroningEnabled] = useState(false);
  const [washFoldIroningCount, setWashFoldIroningCount] = useState(4); // Default to 4

  // Wash & Iron
  const [washIronWeight, setWashIronWeight] = useState<'small' | 'medium' | 'large' | null>(null);

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
        name: 'SpinZo Laundry',
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

    if (selectedImages.length >= 5) {
      showAlert({
        title: 'Limit Reached',
        message: 'Maximum 5 photos allowed',
        type: 'warning'
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedImages.length,
      quality: 1, // We resize/compress later
      base64: false, // Don't need it here
    });

    if (!pickerResult.canceled) {
      setIsLoading(true);
      try {
        const newImages = await Promise.all(pickerResult.assets.map(async (asset) => {
          return await processImage(asset.uri);
        }));
        setSelectedImages([...selectedImages, ...newImages].slice(0, 5));
      } catch (err) {
        console.error("Image processing error", err);
        showAlert({ title: "Error", message: "Failed to process images", type: "error" });
      } finally {
        setIsLoading(false);
      }
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

    if (selectedImages.length >= 5) {
      showAlert({
        title: 'Limit Reached',
        message: 'Maximum 5 photos allowed',
        type: 'warning'
      });
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setIsLoading(true);
      try {
        const finalUri = await processImage(pickerResult.assets[0].uri);
        setSelectedImages([...selectedImages, finalUri]);
      } catch (err) {
        console.error("Camera processing error", err);
        showAlert({ title: "Error", message: "Failed to process photo", type: "error" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const startSpeechToText = async () => {
    try {
      setIsListening(true);

      // Use Web Speech API on web, platform-specific on mobile
      if (Platform.OS === 'web') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          showAlert({
            title: 'Not Supported',
            message: 'Speech recognition is not supported in this browser. Try Chrome.',
            type: 'warning'
          });
          setIsListening(false);
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          const currentInstructions = serviceId === 'premium_laundry' ? premiumSpecialInstructions : specialInstructions;
          const updatedText = currentInstructions ? `${currentInstructions} ${transcript}` : transcript;

          if (serviceId === 'premium_laundry') {
            setPremiumSpecialInstructions(updatedText);
          } else {
            setSpecialInstructions(updatedText);
          }
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          console.log('Speech recognition status:', event.error);

          // Ignore benign errors
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }

          let errorMessage = 'Speech recognition failed. Please try again.';
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
          } else if (event.error === 'network') {
            errorMessage = 'Network error. Please check your internet connection.';
          }

          showAlert({
            title: 'Speech Recognition Error',
            message: errorMessage,
            type: 'error'
          });
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } else {
        // For mobile, we'll use a simpler approach with Speech API
        showAlert({
          title: 'Coming Soon',
          message: 'Speech-to-text is currently optimized for web. Please type your notes.',
          type: 'info'
        });
        setIsListening(false);
      }
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
      showAlert({
        title: 'Error',
        message: 'Failed to start speech recognition',
        type: 'error'
      });
    }
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
        onPress={startSpeechToText}
      >
        <View style={[
          styles.mediaIconCircle,
          { backgroundColor: isListening ? '#FEE2E2' : '#F3F4F6' }
        ]}>
          <Ionicons
            name={isListening ? "mic" : "mic-outline"}
            size={20}
            color={isListening ? "#DC2626" : COLORS.textSecondary}
          />
        </View>
        <Text style={styles.mediaButtonText}>
          {isListening ? 'Listening...' : 'Voice Input'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhotoGallery = () => {
    if (selectedImages.length === 0) return null;

    return (
      <View style={styles.photoGalleryContainer}>
        <View style={styles.photoGalleryHeader}>
          <Text style={styles.photoCount}>{selectedImages.length}/5 photos</Text>
          {selectedImages.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedImages([])}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll} contentContainerStyle={{ paddingRight: 20 }}>
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.photoCard}>
              <Image source={{ uri }} style={styles.photoThumbnail} contentFit="cover" />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const calculateTotal = (): number => {
    if (!service) return 0;

    if (serviceId === 'wash_fold') {
      let basePrice = 0;
      if (washFoldWeight === 'small') basePrice = 479; // ~7kg
      if (washFoldWeight === 'large') basePrice = 958; // ~14kg

      const ironingPrice = washFoldIroningEnabled ? washFoldIroningCount * 15 : 0;
      return basePrice + ironingPrice;
    }

    if (serviceId === 'wash_iron') {
      if (washIronWeight === 'small') return 360; // 3kg
      if (washIronWeight === 'medium') return 600; // 5kg
      if (washIronWeight === 'large') return 840; // 7kg
      return 0;
    }

    if (serviceId === 'blanket_wash') {
      const singlePrice = 199 * singleBlanketCount;
      const doublePrice = 299 * doubleBlanketCount;
      return singlePrice + doublePrice;
    }

    // ... (Shoe/Dry Clean Logic remains same)

    return 0;
  };

  const handleAddToCart = async () => {
    if (!service) return;

    const totalPrice = calculateTotal();

    // -- VALIDATION --

    // Wash & Fold
    if (serviceId === 'wash_fold') {
      if (!washFoldWeight) {
        showAlert({ title: 'Required', message: 'Please select weight first', type: 'warning' });
        return;
      }

      const maxPieces = washFoldWeight === 'small' ? 25 : 50;

      if (washFoldIroningEnabled) {
        if (washFoldIroningCount < 4) {
          showAlert({ title: 'Minimum Required', message: 'Minimum 4 clothes required for ironing', type: 'warning' });
          return;
        }
        if (washFoldIroningCount > maxPieces) {
          showAlert({ title: 'Limit Exceeded', message: `Maximum ${maxPieces} ironing pieces allowed for this weight.`, type: 'warning' });
          return;
        }
      }
    }

    // Wash & Iron
    if (serviceId === 'wash_iron') {
      if (!washIronWeight) {
        showAlert({ title: 'Required', message: 'Please select weight first', type: 'warning' });
        return;
      }
    }

    // Premium
    if (serviceId === 'premium_laundry') {
      const weight = premiumWeight;

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
      if (premiumIroningEnabled && premiumIroningCount > maxPieces) {
        showAlert({
          title: 'Limit Exceeded',
          message: `Maximum ${maxPieces} ironing pieces allowed for this weight.`,
          type: 'warning'
        });
        return;
      }
    }

    if (serviceId === 'blanket_wash') {
      // ... existing blanket validation
      if (singleBlanketCount === 0 && doubleBlanketCount === 0) {
        showAlert({
          title: 'Selection Empty',
          message: 'Please add at least one blanket',
          type: 'warning'
        });
        return;
      }
    }

    const cartItem: CartItem = {
      id: '',
      vendorId: vendorId || 'default',
      vendorName: vendor?.name || 'SpinZo Laundry',
      serviceId: serviceId,
      serviceName: service?.name || 'Service',
      serviceType: serviceId as any,
      basePrice: totalPrice,
      totalPrice: totalPrice,
      specialInstructions: specialInstructions || undefined,
      photoUrls: selectedImages.length > 0 ? selectedImages : undefined,
    };

    if (serviceId === 'wash_fold') {
      cartItem.weight = washFoldWeight === 'small' ? 7 : 14;
      cartItem.clothesCount = 0;
      cartItem.ironingEnabled = washFoldIroningEnabled;
      cartItem.ironingCount = washFoldIroningEnabled ? washFoldIroningCount : 0;
      cartItem.ironingPrice = washFoldIroningEnabled ? washFoldIroningCount * 15 : 0;
    }

    if (serviceId === 'wash_iron') {
      // Map small/medium/large to weight
      cartItem.weight = washIronWeight === 'small' ? 3 : (washIronWeight === 'medium' ? 5 : 7);
      // Wash & Iron strictly implies ironing included, but Cart structure typically expects standard flags
      cartItem.ironingEnabled = true;
      // Approximation of clothes count based on weight for reference
      cartItem.clothesCount = washIronWeight === 'small' ? 10 : (washIronWeight === 'medium' ? 18 : 25);
    }

    if (serviceId === 'blanket_wash') {
      const parts = [];
      if (singleBlanketCount > 0) parts.push(`${singleBlanketCount} Single`);
      if (doubleBlanketCount > 0) parts.push(`${doubleBlanketCount} Double`);

      cartItem.blanketQuantity = singleBlanketCount + doubleBlanketCount;
      cartItem.description = parts.join(', ');
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

    // Track AddToCart
    trackPixelEvent('AddToCart', {
      value: cartItem.totalPrice,
      currency: 'INR'
    });

    onClose();
    showAlert({
      title: 'Cart Updated',
      message: 'Added to cart!',
      type: 'success'
    });
  };

  // ... (Media Logic)

  /* ----------- SEPARATE RENDER FUNCTIONS ----------- */

  const renderWashFold = () => {
    const maxPieces = washFoldWeight === 'small' ? 25 : (washFoldWeight === 'large' ? 50 : 0);

    return (
      <View>
        {/* Weight Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Estimated Weight</Text>
          <TouchableOpacity
            style={[styles.weightOption, washFoldWeight === 'small' && styles.weightOptionSelected]}
            onPress={() => {
              setWashFoldWeight('small');
              // Don't reset ironing to 0 if enabled, just clamp it maybe?
              // logic: if changing weight, max limit changes.
              if (washFoldIroningEnabled && washFoldIroningCount > 25) {
                setWashFoldIroningCount(25);
              }
            }}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {washFoldWeight === 'small' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~7kg • Max 25 clothes</Text>
              <Text style={styles.weightPrice}>₹479</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.weightOption, washFoldWeight === 'large' && styles.weightOptionSelected]}
            onPress={() => setWashFoldWeight('large')}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {washFoldWeight === 'large' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~14kg • Max 50 clothes</Text>
              <Text style={styles.weightPrice}>₹958</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Ironing Add-on */}
        <View style={[styles.section, !washFoldWeight && { opacity: 0.5 }]}>
          <View style={styles.addonHeader}>
            <Text style={styles.sectionTitle}>Need Ironing?</Text>
            <Text style={styles.addonPrice}>₹15 per piece</Text>
          </View>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Ironing</Text>
            <TouchableOpacity
              style={[styles.toggle, washFoldIroningEnabled && styles.toggleActive]}
              onPress={() => {
                if (washFoldWeight) {
                  const newState = !washFoldIroningEnabled;
                  setWashFoldIroningEnabled(newState);
                  // If enabling, set default to 4
                  if (newState && washFoldIroningCount < 4) {
                    setWashFoldIroningCount(4);
                  }
                } else {
                  showAlert({ title: 'Weight Required', message: 'Select weight first', type: 'info' });
                }
              }}
              disabled={!washFoldWeight}
            >
              <View style={[styles.toggleThumb, washFoldIroningEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
          {washFoldIroningEnabled && (
            <View style={styles.quantitySelector}>
              <Text style={styles.quantityLabel}>Number of pieces (Min 4)</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[styles.quantityButton, washFoldIroningCount <= 4 && styles.quantityButtonDisabled]}
                  onPress={() => setWashFoldIroningCount(Math.max(4, washFoldIroningCount - 1))}
                  disabled={washFoldIroningCount <= 4}
                >
                  <Text style={[styles.quantityButtonText, washFoldIroningCount <= 4 && styles.quantityButtonTextDisabled]}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{washFoldIroningCount}</Text>
                <TouchableOpacity
                  style={[styles.quantityButton, washFoldIroningCount >= maxPieces && styles.quantityButtonDisabled]}
                  onPress={() => setWashFoldIroningCount(Math.min(maxPieces, washFoldIroningCount + 1))}
                  disabled={washFoldIroningCount >= maxPieces}
                >
                  <Text style={[styles.quantityButtonText, washFoldIroningCount >= maxPieces && styles.quantityButtonTextDisabled]}>+</Text>
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
            placeholder="Add any notes..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
          />
          {renderMediaButtons()}
          {renderPhotoGallery()}
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQs</Text>
          <FaqAccordion items={WASH_FOLD_FAQS} />
        </View>
      </View>
    );
  };

  const renderWashIron = () => {
    return (
      <View>
        {/* Weight Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Estimated Weight</Text>

          {/* 3kg Slot */}
          <TouchableOpacity
            style={[styles.weightOption, washIronWeight === 'small' && styles.weightOptionSelected]}
            onPress={() => setWashIronWeight('small')}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {washIronWeight === 'small' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~3kg • ~10 clothes</Text>
              <Text style={styles.weightPrice}>₹360</Text>
            </View>
          </TouchableOpacity>

          {/* 5kg Slot */}
          <TouchableOpacity
            style={[styles.weightOption, washIronWeight === 'medium' && styles.weightOptionSelected]}
            onPress={() => setWashIronWeight('medium')}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {washIronWeight === 'medium' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~5kg • ~18 clothes</Text>
              <Text style={styles.weightPrice}>₹600</Text>
            </View>
          </TouchableOpacity>

          {/* 7kg Slot */}
          <TouchableOpacity
            style={[styles.weightOption, washIronWeight === 'large' && styles.weightOptionSelected]}
            onPress={() => setWashIronWeight('large')}
          >
            <View style={styles.weightOptionContent}>
              <View style={styles.radioButton}>
                {washIronWeight === 'large' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.weightOptionText}>~7kg • ~25 clothes</Text>
              <Text style={styles.weightPrice}>₹840</Text>
            </View>
          </TouchableOpacity>
        </View>

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
          {renderPhotoGallery()}
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQs</Text>
          <FaqAccordion items={WASH_IRON_FAQS} />
        </View>
      </View>
    );
  };

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

      {/* Special Instructions (Common) */}
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
        {renderPhotoGallery()}
      </View>

      {/* FAQs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAQs</Text>
        <FaqAccordion items={BLANKET_WASH_FAQS} />
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
                <Text style={[styles.quantityButtonText, styles.quantityButtonActiveText]}>+</Text>
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
                  <Text style={[styles.quantityButtonText, styles.quantityButtonActiveText]}>+</Text>
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
                <Text style={[styles.quantityButtonText, styles.quantityButtonActiveText]}>+</Text>
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
        {renderPhotoGallery()}
      </View>
    </View>
  );

  const renderServiceContent = () => {
    return (
      <>
        {serviceId === 'wash_fold' && renderWashFold()}
        {serviceId === 'wash_iron' && renderWashIron()}
        {serviceId === 'blanket_wash' && renderBlanketWash()}
        {serviceId === 'shoe_clean' && renderShoeCleaning()}
        {serviceId === 'dry_clean' && renderDryCleaning()}
        {serviceId === 'premium_laundry' && renderPremiumLaundry()}
      </>
    );
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            {/* Header with Image */}
            <View style={styles.imageHeader}>
              <Image
                source={getServiceImage()}
                style={styles.headerImage}
                contentFit="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent']}
                style={styles.imageOverlay}
              />
              <TouchableOpacity style={[styles.closeButton, { top: insets.top + (SPACING.sm || 10) }]} onPress={onClose}>
                <View style={styles.closeIconBg}>
                  <Ionicons name="close" size={24} color="#1A1A1A" />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.serviceHeader}>
                <View style={styles.titleRow}>
                  <Text style={styles.serviceName}>{service?.name}</Text>
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.timeBadgeText}>24-48h</Text>
                  </View>
                </View>
                <Text style={styles.serviceDescription}>
                  {service?.description || 'Quality cleaning for your garments'}
                </Text>
              </View>

              {serviceId === 'wash_fold' && renderWashFold()}
              {serviceId === 'wash_iron' && renderWashIron()}
              {serviceId === 'blanket_wash' && renderBlanketWash()}
              {serviceId === 'premium_laundry' && renderWashFold()}
              {serviceId === 'shoe_clean' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shoe Cleaning Options</Text>
                  {/* ... add shoe cleaning content if needed ... */}
                  <Text style={{ color: COLORS.textSecondary }}>Coming Soon</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : SPACING.md }]}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Estimated Total</Text>
                <Text style={styles.totalPrice}>₹{calculateTotal()}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.addToCartButton,
                  calculateTotal() === 0 && styles.addToCartButtonDisabled
                ]}
                onPress={handleAddToCart}
                disabled={calculateTotal() === 0}
              >
                <LinearGradient
                  colors={calculateTotal() === 0 ? ['#9CA3AF', '#6B7280'] : [COLORS.primary, COLORS.primaryDark]}
                  style={styles.addToCartGradient}
                >
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#F8F7FF',
    height: '92%',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  imageHeader: {
    width: '100%',
    height: 180,
    backgroundColor: '#EEE7FF',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 80,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 10,
  },
  closeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  serviceHeader: {
    marginBottom: SPACING.xl,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'Outfit_800ExtraBold',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Outfit_700Bold',
  },
  serviceDescription: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    fontFamily: 'Outfit_400Regular',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: SPACING.md,
    fontFamily: 'Outfit_700Bold',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: SPACING.sm,
    fontFamily: 'Outfit_500Medium',
  },
  weightOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  weightOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F3FF',
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
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  weightOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Outfit_600SemiBold',
  },
  weightPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit_800ExtraBold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Outfit_600SemiBold',
  },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  quantitySelector: {
    marginTop: SPACING.md,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Outfit_600SemiBold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  quantityButtonActive: {
    backgroundColor: COLORS.primary,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
  },
  quantityButtonActiveText: {
    color: '#FFFFFF',
  },
  quantityButtonTextDisabled: {
    color: '#9CA3AF',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginHorizontal: 16,
    fontFamily: 'Outfit_800ExtraBold',
  },
  instructionsInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'Outfit_400Regular',
    ...SHADOWS.sm,
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  mediaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mediaButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Outfit_700Bold',
  },
  photoGalleryContainer: {
    marginTop: SPACING.md,
  },
  photoGalleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  clearAllText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoCard: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.xl,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'Outfit_800ExtraBold',
  },
  addToCartButton: {
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  addToCartGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
  },
  addToCartButtonDisabled: {
    opacity: 0.7,
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  addonPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  blanketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  blanketInfo: {
    flex: 1,
  },
  blanketOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Outfit_600SemiBold',
  },
  blanketPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  shoeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'Outfit_700Bold',
  },
  shoePrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  dryCleanHeader: {
    marginBottom: SPACING.md,
  },
  weightCategoryContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 4,
  },
  weightCategoryButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  weightCategoryButtonActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  weightCategoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Outfit_600SemiBold',
  },
  weightCategoryTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
  },
  dryCleanGrid: {
    gap: SPACING.md,
  },
  dryCleanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  dryCleanItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: SPACING.md,
    fontFamily: 'Outfit_600SemiBold',
  },
  dryCleanItemSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
    fontFamily: 'Outfit_400Regular',
  },
  dryCleanItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginRight: SPACING.md,
    fontFamily: 'Outfit_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: SPACING.md,
  },
});
