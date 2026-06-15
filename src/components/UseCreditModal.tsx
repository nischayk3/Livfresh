import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    Switch,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../utils/constants';
import { useCartStore, useSubscriptionStore, useUIStore } from '../store';
import { Subscription } from '../store/subscriptionStore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { FaqAccordion } from './FaqAccordion';
import { ASSET_URLS } from '../utils/assetUrls';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_IRONING_COUNT = 4;
const IRONING_PRICE_PER_CLOTH = 15;

const WASH_FOLD_FAQS = [
    { question: "How is the weight calculated?", answer: "We weigh your clothes on the spot using a digital weighing scale for 100% accuracy." },
    { question: "What's included in Wash & Fold?", answer: "Daily wear clothes including shirts, pants, t-shirts, and tops. Blankets are not included." },
    { question: "How long does it take?", answer: "Most Wash & Fold orders are delivered within 48 hours." },
    { question: "Do I need to separate colour-leaking clothes?", answer: "Yes, our team is not responsible for any damage, though we take all necessary precautions." },
];

interface UseCreditModalProps {
    visible: boolean;
    onClose: () => void;
    subscription: Subscription;
}

// Helper for Cross-Platform Image Compression & Resizing
const processImage = async (uri: string): Promise<string> => {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            {
                compress: 0.5,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true
            }
        );
        return `data:image/jpeg;base64,${result.base64}`;
    } catch (error) {
        console.error("Image processing error:", error);
        throw error;
    }
};

export const UseCreditModal: React.FC<UseCreditModalProps> = ({ visible, onClose, subscription }) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { addItem, clearCart } = useCartStore();
    const { showAlert } = useUIStore();
    const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
    const [ironingEnabled, setIroningEnabled] = useState(false);
    const [ironingCount, setIroningCount] = useState(MIN_IRONING_COUNT);
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const washFoldPrice = 0; // Covered by credit
    const ironingPrice = ironingEnabled ? ironingCount * IRONING_PRICE_PER_CLOTH : 0;
    const totalPrice = washFoldPrice + ironingPrice;

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            showAlert({ title: 'Permission Required', message: 'Permission to access camera roll is required!', type: 'warning' });
            return;
        }

        if (selectedImages.length >= 5) {
            showAlert({ title: 'Limit Reached', message: 'Maximum 5 photos allowed', type: 'warning' });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5 - selectedImages.length,
            quality: 1,
        });

        if (!result.canceled) {
            setIsLoading(true);
            try {
                const newImages = await Promise.all(result.assets.map(async (asset) => {
                    return await processImage(asset.uri);
                }));
                setSelectedImages([...selectedImages, ...newImages].slice(0, 5));
            } catch (e) {
                showAlert({ title: 'Error', message: 'Failed to process image', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleTakePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            showAlert({ title: 'Permission Required', message: 'Permission to access camera is required!', type: 'warning' });
            return;
        }

        if (selectedImages.length >= 5) {
            showAlert({ title: 'Limit Reached', message: 'Maximum 5 photos allowed', type: 'warning' });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled && result.assets[0]) {
            setIsLoading(true);
            try {
                const processed = await processImage(result.assets[0].uri);
                setSelectedImages(prev => [...prev, processed]);
            } catch (e) {
                showAlert({ title: 'Error', message: 'Failed to process image', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const startListening = async () => {
        try {
            setIsListening(true);
            if (Platform.OS === 'web') {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    showAlert({ title: 'Not Supported', message: 'Speech recognition is not supported in this browser.', type: 'warning' });
                    setIsListening(false);
                    return;
                }
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setSpecialInstructions(prev => prev ? `${prev} ${transcript}` : transcript);
                    setIsListening(false);
                };
                recognition.onerror = () => setIsListening(false);
                recognition.onend = () => setIsListening(false);
                recognition.start();
            } else {
                showAlert({ title: 'Coming Soon', message: 'Voice input is currently optimized for web.', type: 'info' });
                setIsListening(false);
            }
        } catch (err) {
            setIsListening(false);
        }
    };

    const handleAddToCart = () => {
        clearCart();

        // Add Wash & Fold item (Credit based)
        addItem({
            vendorId: 'vendor_1',
            vendorName: 'SpinZo Cloud Laundry',
            serviceId: 'wash_fold',
            serviceName: 'Wash & Fold (Subscription)',
            serviceType: 'wash_fold',
            weight: subscription.kgPerCredit,
            basePrice: 0,
            totalPrice: 0,
            isCreditItem: true,
            creditSubscriptionId: subscription.id,
            creditIndex: subscription.currentCreditIndex,
            ironingEnabled: false,
            specialInstructions,
            photoUrls: selectedImages,
        });

        // Add Ironing as a separate line item if enabled
        if (ironingEnabled) {
            addItem({
                vendorId: 'vendor_1',
                vendorName: 'SpinZo Cloud Laundry',
                serviceId: 'ironing_addon',
                serviceName: 'Ironing Add-on',
                serviceType: 'wash_iron',
                clothesCount: ironingCount,
                basePrice: IRONING_PRICE_PER_CLOTH,
                totalPrice: ironingPrice,
                ironingEnabled: true,
                ironingCount: ironingCount,
                ironingPrice: ironingPrice,
                specialInstructions: 'Ironing add-on for credit order',
            });
        }

        onClose();

        // Reset state
        setIroningEnabled(false);
        setIroningCount(MIN_IRONING_COUNT);
        setSpecialInstructions('');
        setSelectedImages([]);

        showAlert({
            title: 'Cart Updated',
            message: 'Subscription credit added to cart!',
            type: 'success'
        });

        // Use CommonActions to reset and navigate to Home properly
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [
                    {
                        name: 'Main',
                        state: {
                            routes: [{ name: 'Home' }],
                        },
                    },
                ],
            })
        );
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        {/* Header Handle & Close */}
                        <View style={styles.modalHeader}>
                            <View style={styles.dragHandle} />
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Service Image */}
                            <View style={styles.serviceImageContainer}>
                                <Image
                                    source={{ uri: ASSET_URLS.services_wash_fold }}
                                    style={styles.serviceImage}
                                    contentFit="cover"
                                    transition={500}
                                />
                            </View>

                            <View style={styles.serviceTitleContainer}>
                                <Text style={styles.serviceTitle}>Wash & Fold (Subscription)</Text>
                                <Text style={styles.serviceSubtitle}>Up to {subscription.kgPerCredit}kg included in your credit</Text>
                            </View>

                            {/* Ironing Add-on Section */}
                            <View style={styles.section}>
                                <View style={styles.addonHeader}>
                                    <Text style={styles.sectionTitle}>Need Ironing?</Text>
                                    <Text style={styles.addonPrice}>₹{IRONING_PRICE_PER_CLOTH} per piece</Text>
                                </View>
                                <View style={styles.toggleContainer}>
                                    <Text style={styles.toggleLabel}>Ironing Service</Text>
                                    <TouchableOpacity
                                        style={[styles.toggle, ironingEnabled && styles.toggleActive]}
                                        onPress={() => setIroningEnabled(!ironingEnabled)}
                                    >
                                        <View style={[styles.toggleThumb, ironingEnabled && styles.toggleThumbActive]} />
                                    </TouchableOpacity>
                                </View>

                                {ironingEnabled && (
                                    <View style={styles.quantitySelector}>
                                        <Text style={styles.quantityLabel}>Number of pieces (Min {MIN_IRONING_COUNT})</Text>
                                        <View style={styles.quantityControls}>
                                            <TouchableOpacity
                                                style={[styles.quantityButton, ironingCount <= MIN_IRONING_COUNT && styles.quantityButtonDisabled]}
                                                onPress={() => setIroningCount(Math.max(MIN_IRONING_COUNT, ironingCount - 1))}
                                                disabled={ironingCount <= MIN_IRONING_COUNT}
                                            >
                                                <Text style={[styles.quantityButtonText, ironingCount <= MIN_IRONING_COUNT && styles.quantityButtonTextDisabled]}>-</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.quantityValue}>{ironingCount}</Text>
                                            <TouchableOpacity
                                                style={styles.quantityButton}
                                                onPress={() => setIroningCount(ironingCount + 1)}
                                            >
                                                <Text style={styles.quantityButtonText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Instructions Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Special Instructions</Text>
                                <TextInput
                                    style={styles.instructionsInput}
                                    placeholder="Any specific stains or handling requirements?"
                                    placeholderTextColor={COLORS.textLight}
                                    multiline
                                    numberOfLines={4}
                                    value={specialInstructions}
                                    onChangeText={setSpecialInstructions}
                                />

                                {/* Media Buttons */}
                                <View style={styles.mediaButtonsContainer}>
                                    <TouchableOpacity style={styles.mediaButton} onPress={handleTakePhoto}>
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

                                    <TouchableOpacity style={styles.mediaButton} onPress={startListening}>
                                        <View style={[styles.mediaIconCircle, { backgroundColor: isListening ? '#FEE2E2' : '#F3F4F6' }]}>
                                            <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? "#DC2626" : COLORS.textSecondary} />
                                        </View>
                                        <Text style={styles.mediaButtonText}>{isListening ? 'Listening...' : 'Voice Input'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Photo Gallery */}
                                {selectedImages.length > 0 && (
                                    <View style={styles.photoGalleryContainer}>
                                        <View style={styles.photoGalleryHeader}>
                                            <Text style={styles.photoCount}>{selectedImages.length}/5 photos</Text>
                                            <TouchableOpacity onPress={() => setSelectedImages([])}>
                                                <Text style={styles.clearAllText}>Clear All</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                            {selectedImages.map((uri, index) => (
                                                <View key={index} style={styles.photoCard}>
                                                    <Image source={{ uri }} style={styles.photoThumbnail} contentFit="cover" />
                                                    <TouchableOpacity style={styles.removePhotoButton} onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}>
                                                        <Ionicons name="close" size={12} color="#fff" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* FAQ Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>FAQs</Text>
                                <FaqAccordion items={WASH_FOLD_FAQS} />
                            </View>

                            <View style={{ height: 40 }} />
                        </ScrollView>

                        {/* Footer */}
                        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
                            <View style={styles.totalContainer}>
                                <Text style={styles.totalLabel}>Total Charge</Text>
                                <Text style={styles.totalAmount}>₹{totalPrice}</Text>
                            </View>
                            <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.primaryDark]}
                                    style={styles.addToCartGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.addToCartText}>Add to Cart</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '100%',
        height: '90%',
    },
    modalContent: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
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
        marginBottom: SPACING.lg,
    },
    serviceTitle: {
        ...TYPOGRAPHY.heading,
        color: COLORS.text,
        fontSize: 22,
        textAlign: 'center',
    },
    serviceSubtitle: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.text,
        marginBottom: SPACING.md,
        fontWeight: '700',
    },
    addonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    addonPrice: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
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
        backgroundColor: COLORS.white,
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
        backgroundColor: COLORS.backgroundLight,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
    },
    quantityLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        flex: 1,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonDisabled: {
        backgroundColor: COLORS.border,
    },
    quantityButtonText: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.white,
        fontSize: 18,
    },
    quantityButtonTextDisabled: {
        color: COLORS.textLight,
    },
    quantityValue: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
        marginHorizontal: SPACING.md,
        minWidth: 20,
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
        justifyContent: 'space-around',
        marginBottom: SPACING.md,
    },
    mediaButton: {
        alignItems: 'center',
        justifyContent: 'center',
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
    photoGalleryContainer: {
        marginTop: SPACING.md,
    },
    photoGalleryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    photoCount: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    clearAllText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.error,
        fontWeight: '600',
    },
    photoScroll: {
        marginHorizontal: -SPACING.sm,
    },
    photoCard: {
        position: 'relative',
        marginHorizontal: SPACING.sm / 2,
        width: 80,
        height: 80,
    },
    photoThumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.backgroundLight,
    },
    removePhotoButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.white,
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
    addToCartGradient: {
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    addToCartText: {
        ...TYPOGRAPHY.button,
        color: COLORS.white,
    },
});
