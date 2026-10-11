import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSET_URLS } from '../utils/assetUrls';

const MAX_SCALE = 6;
const FIT_SCALE = 2.6;
// The hosted price card is 1543×1019. Only a fallback — the real ratio is read on load.
const FALLBACK_ASPECT = 1543 / 1019;

interface PriceListModalProps {
  visible: boolean;
  onClose: () => void;
  source?: string;
}

/**
 * Full-screen pinch-to-zoom viewer for the Steam Ironing price card.
 *
 * The card is a dense landscape poster, so fit-to-width alone renders its text
 * unreadably small on a phone. Pinch or double-tap to zoom, drag to pan.
 */
export const PriceListModal: React.FC<PriceListModalProps> = ({
  visible,
  onClose,
  source = ASSET_URLS.services_ironing_price_list,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [aspect, setAspect] = useState(FALLBACK_ASPECT);

  // Fit the card inside the space left by the header and the hint line.
  const availableW = screenW - 24;
  const availableH = screenH - insets.top - insets.bottom - 140;
  let baseW = availableW;
  let baseH = baseW / aspect;
  if (baseH > availableH) {
    baseH = availableH;
    baseW = baseH * aspect;
  }

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, 1), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Snap the card back to centre once it is no longer zoomed.
      if (scale.value <= 1.01) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      const overflowX = (baseW * scale.value - baseW) / 2;
      const overflowY = (baseH * scale.value - baseH) / 2;
      translateX.value = Math.min(
        Math.max(savedTranslateX.value + e.translationX, -overflowX),
        overflowX
      );
      translateY.value = Math.min(
        Math.max(savedTranslateY.value + e.translationY, -overflowY),
        overflowY
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(FIT_SCALE);
        savedScale.value = FIT_SCALE;
      }
    });

  const gesture = Gesture.Exclusive(
    doubleTap,
    Gesture.Simultaneous(pinch, pan)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.headerTitle}>Steam Ironing Price List</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <GestureDetector gesture={gesture}>
            <Animated.View style={styles.stage}>
              <Animated.View style={animatedStyle}>
                <Image
                  source={{ uri: source }}
                  style={{ width: baseW, height: baseH }}
                  contentFit="contain"
                  transition={150}
                  onLoad={(e: any) => {
                    const w = e?.source?.width;
                    const h = e?.source?.height;
                    if (w && h) setAspect(w / h);
                  }}
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.hint}>Pinch or double-tap to zoom · drag to pan</Text>
            <TouchableOpacity onPress={reset} hitSlop={8} activeOpacity={0.7}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 18, 0.97)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  resetText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
