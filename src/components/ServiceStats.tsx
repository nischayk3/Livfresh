import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface ServiceStatsProps {
    rating: number;
    reviewCount: number;
}

export const ServiceStats: React.FC<ServiceStatsProps> = ({ rating, reviewCount }) => {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.rating}>{rating}</Text>
                <Ionicons name="star" size={12} color="#FFFFFF" style={styles.star} />
            </View>
            <Text style={styles.reviewsText}>({reviewCount}+ reviews)</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>Top Rated</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16, // Increase bottom margin slightly for separation from next section
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#16A34A', // Green
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 8,
    },
    rating: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginRight: 2,
    },
    star: {
        marginTop: -1
    },
    reviewsText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#94A3B8',
        marginHorizontal: 6,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    }

});
