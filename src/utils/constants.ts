// Colors - Pink Primary Theme with Gradients
export const COLORS = {
  // Primary - Pink
  primary: '#EC4899',
  primaryLight: '#F9A8D4',
  primaryDark: '#DB2777',

  // Gradient Colors
  gradientStart: '#EC4899',
  gradientEnd: '#DB2777',
  gradientLight: ['#F9A8D4', '#FCE7F3'],

  // Text (Black as per user preference)
  text: '#1F1F1F',
  textSecondary: '#666666',
  textLight: '#999999',

  white: '#FFFFFF',

  // Backgrounds
  background: '#FFFFFF',
  backgroundLight: '#F9FAFB',
  backgroundGradient: '#FFF5F9',
  cardBg: '#FFFFFF',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  disabled: '#D1D5DB',

  // Shadows
  shadowColor: '#000000',
  shadowLight: '#EC489920',

  // Service tiles (pastel colors with gradients)
  service1: '#FCE7F3',
  service1Dark: '#F9A8D4',
  service2: '#F3E8FF',
  service2Dark: '#E9D5FF',
  service3: '#E0E7FF',
  service3Dark: '#C7D2FE',
  service4: '#D1FAE5',
  service4Dark: '#A7F3D0',
};

// Typography - Refined for modern, compact feel
export const TYPOGRAPHY = {
  // Large titles (screen headers)
  heading: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  // Section titles
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  // Regular body text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  // Bold body text
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  // Smaller body text
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  // Very small text (labels, badges)
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  // Button text
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  // Tiny labels and badges
  tiny: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 12,
  },
};

// Spacing - Enhanced with more options
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadows - Modern elevation
// Shadows - Modern elevation
import { Platform } from 'react-native';

const shadowGenerator = (color: string, offset: { width: number, height: number }, opacity: number, radius: number, elevation: number) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` // Simple hex alpha approximation
      // Or cleaner: boxShadow: `0px ${offset.height}px ${radius}px rgba(0,0,0,${opacity})`
    };
  }
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
};

export const SHADOWS = {
  sm: Platform.OS === 'web'
    ? { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' }
    : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
  md: Platform.OS === 'web'
    ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
    : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
  lg: Platform.OS === 'web'
    ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)' }
    : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  xl: Platform.OS === 'web'
    ? { boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)' }
    : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
  primary: Platform.OS === 'web'
    ? { boxShadow: '0px 4px 12px rgba(236, 72, 153, 0.3)' } // Pink shadow
    : {
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
};

// Time slots
export const TIME_SLOTS = [
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '6:00 PM - 8:00 PM',
];

// Order statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  PICKED: 'picked',
  PROCESSING: 'processing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;
