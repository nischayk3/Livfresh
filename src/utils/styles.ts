import { StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from './constants';

export const commonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  
  // Text
  heading: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  subheading: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  bodySecondary: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  caption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  
  // Buttons
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: COLORS.background,
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  
  // Cards
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});



