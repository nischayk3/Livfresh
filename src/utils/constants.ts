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

// Typography - Enhanced with better weights
export const TYPOGRAPHY = {
  heading: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.5,
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
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
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
