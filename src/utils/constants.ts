export const COLORS = {
  // Primary - Deep Premium Violet
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',

  // Gradient Colors (Deeper, more sophisticated)
  gradientStart: '#7C3AED',
  gradientEnd: '#4C1D95',
  gradientLight: ['#F5F3FF', '#EDE9FE'],

  // Text (Deep Indigo Tinted for luxury feel)
  text: '#1E1B4B',
  textSecondary: '#475569',
  textLight: '#94A3B8',

  white: '#FFFFFF',

  // Backgrounds - Modern Surface Palette
  background: '#FFFFFF',
  backgroundLight: '#F8FAFC',
  backgroundGradient: '#F1F5F9',
  pageBg: '#F1F5F9', // Light Slate for card popping
  cardBg: '#FFFFFF',
  glassBg: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',

  // Brand Accents
  accentPurple: '#F5F3FF',
  accentBlue: '#F0F9FF',
  accentIndigo: '#EEF2FF',

  // Status (Desaturated & Modern)
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  disabled: '#E2E8F0',

  // Shadows
  shadowColor: '#1E1B4B',
  shadowLight: '#7C3AED10',

  // Service tiles (Sophisticated variants)
  service1: '#F5F3FF',
  service1Dark: '#C4B5FD',
  service2: '#F0F9FF',
  service2Dark: '#BAE6FD',
  service3: '#ECFDF5',
  service3Dark: '#A7F3D0',
  service4: '#FFF7ED',
  service4Dark: '#FED7AA',
};

// Typography - Standardized for professional, aesthetic look using Outfit
export const TYPOGRAPHY = {
  // Extra large titles (main greetings, hero text)
  display: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -1,
  },
  // Large titles (screen headers, main headings)
  heading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  // Section titles, card titles
  subheading: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  // Regular body text (primary content)
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  // Bold body text
  bodyBold: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  // Smaller body text (secondary content)
  bodySmall: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  // Labels, badges, small text
  caption: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  // Button text
  button: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  // Very small labels and badges
  tiny: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  // Address label (DELIVER TO style)
  addressLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  // Address text
  addressText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
};

// Spacing - Enhanced with more options for better visual hierarchy
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
  xxxl: 56,
  // Header specific spacing
  headerTop: 12,
  headerGap: 16,
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
    ? { boxShadow: '0px 2px 8px rgba(30, 27, 75, 0.05)' }
    : {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
  md: Platform.OS === 'web'
    ? { boxShadow: '0px 8px 16px rgba(30, 27, 75, 0.08)' }
    : {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 5,
    },
  lg: Platform.OS === 'web'
    ? { boxShadow: '0px 12px 24px rgba(30, 27, 75, 0.12)' }
    : {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
  xl: Platform.OS === 'web'
    ? { boxShadow: '0px 24px 48px rgba(30, 27, 75, 0.15)' }
    : {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.15,
      shadowRadius: 32,
      elevation: 12,
    },
  primary: Platform.OS === 'web'
    ? { boxShadow: '0px 8px 24px rgba(124, 58, 237, 0.25)' }
    : {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
  success: Platform.OS === 'web'
    ? { boxShadow: '0px 8px 24px rgba(16, 185, 129, 0.25)' }
    : {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
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
