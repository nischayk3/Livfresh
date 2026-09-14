import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

export type PaymentOption = 'now' | 'later';

interface PaymentMethodSelectorProps {
  value: PaymentOption;
  onChange: (option: PaymentOption) => void;
  totalAmount: number;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onChange,
  totalAmount,
}) => {
  const options: { key: PaymentOption; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    {
      key: 'now',
      label: `Pay now — ₹${totalAmount}`,
      description: 'UPI, Card, or Wallet',
      icon: 'flash',
    },
    {
      key: 'later',
      label: 'Pay later',
      description: 'Complete payment anytime before delivery',
      icon: 'time-outline',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Payment option</Text>
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <Ionicons
                name={opt.icon}
                size={20}
                color={isSelected ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
            </View>
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={styles.trustBadge}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
        <Text style={styles.trustText}>100% digital — we never handle cash</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  heading: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F3FF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    fontSize: 14,
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  optionDesc: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  trustText: {
    ...TYPOGRAPHY.tiny,
    color: COLORS.success,
    fontWeight: '600',
    fontSize: 11,
  },
});
