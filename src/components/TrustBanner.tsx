import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/constants';

export const TrustBanner: React.FC<{ style?: any }> = ({ style }) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.content}>
                {/* Item 1 */}
                <View style={styles.item}>
                    <View style={styles.iconBox}>
                        <Ionicons name="people" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.text}>Trusted by{'\n'}5000+ Families</Text>
                </View>

                <View style={styles.divider} />

                {/* Item 2 */}
                <View style={styles.item}>
                    <View style={styles.iconBox}>
                        <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.text}>Verified{'\n'}Professionals</Text>
                </View>

                <View style={styles.divider} />

                {/* Item 3 */}
                <View style={styles.item}>
                    <View style={styles.iconBox}>
                        <Ionicons name="headset" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.text}>Dedicated{'\n'}Support</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 0, // FULL WIDTH
        marginTop: -10, // Reduced overlap to prevent clipping content
        marginBottom: SPACING.md,
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        ...SHADOWS.lg,
        paddingVertical: 16, // Slightly reduced vertical padding
        elevation: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, // Balanced internal padding
    },
    item: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F3F4F6', // Neutral/Soft grey for expert look
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    text: {
        fontSize: 11,
        fontWeight: '600',
        color: '#334155', // Slate-700
        textAlign: 'center',
        lineHeight: 15,
        fontFamily: 'Outfit_600SemiBold',
    },
    divider: {
        width: 1,
        height: 32,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
    },
});
