import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Clock,
  Bike,
  Sparkles,
  Package,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS, SHADOWS } from '../utils/constants';
import { ActiveOrder } from '../store/activeOrderStore';

interface ActiveOrderBannerProps {
  order: ActiveOrder;
  activeOrdersCount?: number;
  onPress: (orderId: string) => void;
  style?: StyleProp<ViewStyle>;
}

// Live pulsing indicator dot
const PulsingDot: React.FC<{ color?: string }> = ({ color = '#7C3AED' }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        {
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

// Format short date helper
const formatShortDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'Tomorrow';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const ActiveOrderBanner: React.FC<ActiveOrderBannerProps> = ({
  order,
  activeOrdersCount = 1,
  onPress,
  style,
}) => {
  const status = (order.status || 'placed').toLowerCase();

  // Extract timing and items summary
  const pickupDateText = formatShortDate(order.pickupDetails?.scheduledDate);
  const pickupTime = order.pickupDetails?.scheduledTime;
  const deliveryDateText = formatShortDate(order.deliveryDate);
  const deliveryTime = order.deliveryTime;

  const firstItem = order.items?.[0];
  const itemsCount = order.items?.length || 1;
  const serviceSummary = firstItem?.serviceName
    ? `${firstItem.serviceName}${itemsCount > 1 ? ` +${itemsCount - 1} more` : ''}`
    : 'Laundry Service';

  // Determine stage visual configuration
  let title = 'Order Confirmed';
  let subtext = 'Your order is confirmed and scheduled';
  let progress = 0.2;
  let iconBg = '#F5F3FF';
  let iconBorder = '#DDD6FE';
  let accentColor = '#7C3AED';
  let IconComponent = Clock;

  if (status === 'placed' || status === 'confirmed') {
    title = 'Order Confirmed';
    subtext = pickupTime
      ? `Pickup: ${pickupDateText ? `${pickupDateText}, ` : ''}${pickupTime}`
      : `Pickup being assigned • ${serviceSummary}`;
    progress = 0.25;
    iconBg = '#F5F3FF';
    iconBorder = '#DDD6FE';
    accentColor = '#7C3AED';
    IconComponent = Clock;
  } else if (status === 'pickup_assigned' || status === 'assigned') {
    title = 'Rider Assigned';
    subtext = pickupTime
      ? `Doorstep pickup: ${pickupDateText ? `${pickupDateText}, ` : ''}${pickupTime}`
      : 'Rider is on the way for doorstep pickup';
    progress = 0.42;
    iconBg = '#EFF6FF';
    iconBorder = '#BFDBFE';
    accentColor = '#2563EB';
    IconComponent = Bike;
  } else if (status === 'pickup_completed' || status === 'picked_up') {
    title = 'Clothes Picked Up';
    subtext = `In transit to care hub • ${serviceSummary}`;
    progress = 0.58;
    iconBg = '#EEF2FF';
    iconBorder = '#C7D2FE';
    accentColor = '#4F46E5';
    IconComponent = ShoppingBag;
  } else if (status === 'processing' || status === 'in_process') {
    title = 'Washing & Care in Progress';
    subtext = deliveryTime
      ? `Delivery: ${deliveryDateText ? `${deliveryDateText}, ` : ''}${deliveryTime}`
      : 'Your clothes are being washed & sanitized';
    progress = 0.75;
    iconBg = '#FFFBEB';
    iconBorder = '#FDE68A';
    accentColor = '#D97706';
    IconComponent = Sparkles;
  } else if (status === 'ready' || status === 'ready_for_delivery') {
    title = 'Packed & Ready';
    subtext = deliveryTime
      ? `Delivery: ${deliveryDateText ? `${deliveryDateText}, ` : ''}${deliveryTime}`
      : 'Clothes are freshly packed and ready';
    progress = 0.88;
    iconBg = '#ECFDF5';
    iconBorder = '#A7F3D0';
    accentColor = '#059669';
    IconComponent = Package;
  } else if (status === 'out_for_delivery') {
    title = 'Out for Delivery';
    subtext = 'Rider is heading to your doorstep now';
    progress = 0.96;
    iconBg = '#F0FDF4';
    iconBorder = '#86EFAC';
    accentColor = '#16A34A';
    IconComponent = Bike;
  }

  const progressPercent = Math.min(Math.max(Math.round(progress * 100), 10), 100);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(order.id)}
      activeOpacity={0.92}
    >
      {/* Top Micro Progress Bar */}
      <View style={styles.progressBarTrack}>
        <LinearGradient
          colors={['#7C3AED', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
        />
      </View>

      <View style={styles.cardContent}>
        {/* Status Icon Box */}
        <View style={[styles.iconBox, { backgroundColor: iconBg, borderColor: iconBorder }]}>
          <IconComponent size={20} color={accentColor} strokeWidth={2.2} />
        </View>

        {/* Text Section */}
        <View style={styles.infoCol}>
          <View style={styles.statusRow}>
            <PulsingDot color={accentColor} />
            <Text style={styles.statusTitle} numberOfLines={1}>
              {title}
            </Text>
            {activeOrdersCount > 1 && (
              <View style={styles.multiBadge}>
                <Text style={styles.multiBadgeText}>+{activeOrdersCount - 1} more</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtext} numberOfLines={1}>
            {subtext}
          </Text>
        </View>

        {/* CTA Track Pill */}
        <View style={styles.trackPill}>
          <Text style={styles.trackText}>Track</Text>
          <ChevronRight size={13} color="#7C3AED" strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    overflow: 'hidden',
    ...SHADOWS.lg,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#1E1B4B',
    letterSpacing: -0.2,
  },
  multiBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 0.8,
    borderColor: '#DDD6FE',
  },
  multiBadgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: '#7C3AED',
  },
  subtext: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  trackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  trackText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    color: '#7C3AED',
    marginRight: 2,
  },
});
