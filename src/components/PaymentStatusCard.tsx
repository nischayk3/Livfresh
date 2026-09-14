import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SHADOWS } from '../utils/constants';

interface PaymentStatusCardProps {
  paymentStatus: 'paid' | 'pending' | 'failed' | undefined;
  amount: number;
  onPayNow?: () => void;
  isProcessing?: boolean;
}

export const PaymentStatusCard: React.FC<PaymentStatusCardProps> = ({
  paymentStatus,
  amount,
  onPayNow,
  isProcessing,
}) => {
  if (paymentStatus === 'paid') {
    return (
      <View style={[styles.card, styles.paidCard]}>
        <View style={styles.paidHeader}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.paidText}>Payment Received</Text>
        </View>
        <Text style={styles.paidAmount}>₹{amount}</Text>
      </View>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <View style={[styles.card, styles.failedCard]}>
        <View style={styles.row}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text style={styles.failedText}>Payment failed. Please try again.</Text>
        </View>
        {onPayNow && (
          <TouchableOpacity style={styles.payButton} onPress={onPayNow} activeOpacity={0.7}>
            <Text style={styles.payButtonText}>Retry Payment — ₹{amount}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Pending state (default when undefined too)
  return (
    <View style={[styles.card, styles.pendingCard]}>
      <View style={styles.pendingHeader}>
        <Ionicons name="time-outline" size={20} color="#D97706" />
        <Text style={styles.pendingLabel}>Payment pending</Text>
      </View>
      {onPayNow && (
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={onPayNow}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{amount}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  paidCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  failedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  paidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paidText: {
    ...TYPOGRAPHY.button,
    color: '#059669',
    fontWeight: '700',
  },
  paidAmount: {
    ...TYPOGRAPHY.heading,
    color: '#065F46',
    marginLeft: 28,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pendingLabel: {
    ...TYPOGRAPHY.button,
    color: '#92400E',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  failedText: {
    ...TYPOGRAPHY.body,
    color: '#DC2626',
    flex: 1,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
  },
});
