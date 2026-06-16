import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '../utils/constants';

export const CartTrust: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Trust Seal */}
            <View style={styles.sealContainer}>
            <ShieldCheck size={32} color="#10B981" strokeWidth={1.5} />
            </View>

            {/* Slogan */}
            <Text style={styles.slogan}>
                With Spinzo, you're not just booking{'\n'}
                laundry, you're choosing{'\n'}
                <Text style={styles.highlight}>peace of mind!</Text>
            </Text>

            {/* Underline for emphasis */}
            <View style={styles.underline} />

            {/* Trust Matrix */}
            <View style={styles.matrixContainer}>
                <View style={styles.matrixItem}>
                    <Text style={styles.statValue}>5K+</Text>
                    <Text style={styles.statLabel}>Orders{'\n'}Delivered</Text>
                </View>

                <View style={styles.separator} />

                <View style={styles.matrixItem}>
                    <Text style={styles.statValue}>4.8 ★</Text>
                    <Text style={styles.statLabel}>Top Rated{'\n'}Service</Text>
                </View>

                <View style={styles.separator} />

                <View style={styles.matrixItem}>
                    <Text style={styles.statValue}>100%</Text>
                    <Text style={styles.statLabel}>Pay on{'\n'}Delivery</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        backgroundColor: '#FFFFFF',
        marginBottom: SPACING.md,
    },
    sealContainer: {
        marginBottom: SPACING.md,
    },
    slogan: {
        fontSize: 18,
        color: '#94A3B8', // Muted grey
        textAlign: 'center',
        fontFamily: 'Outfit_700Bold',
        lineHeight: 26,
    },
    highlight: {
        color: COLORS.primary, // Trust Green
        fontWeight: '800',
    },
    underline: {
        width: 100,
        height: 3,
        backgroundColor: '#10B981',
        borderRadius: 2,
        marginTop: 4,
        marginBottom: SPACING.xl,
    },
    matrixContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
    },
    matrixItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#64748B',
        textAlign: 'center',
        fontFamily: 'Outfit_500Medium',
        lineHeight: 14,
    },
    separator: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
});
