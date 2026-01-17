import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/constants';

const TESTIMONIALS = [
    {
        id: '1',
        name: 'Priya Sharma',
        location: 'BTM Layout, Bangalore',
        rating: 5,
        text: "SpinZo saved me so much time with their wash & fold service. The clothes came back neatly folded and smelling fresh!",
        service: 'Wash & Fold'
    },
    {
        id: '2',
        name: 'Arjun Mehta',
        location: 'Koramangala, Bangalore',
        rating: 5,
        text: "I was skeptical about sending my heavy blankets, but they came back feeling brand new. Highly recommend for winter cleaning.",
        service: 'Blanket Wash'
    },
    {
        id: '3',
        name: 'Sneha Patel',
        location: 'HSR Layout, Bangalore',
        rating: 4,
        text: "Super convenient and professional delivery executives. The app is easy to use and pickup is always on time.",
        service: 'Wash & Iron'
    },
    {
        id: '4',
        name: 'Rahul Verma',
        location: 'Bommanahalli, Bangalore',
        rating: 5,
        text: "The ironing quality is top-notch. Much better than my local dhobi and cheaper too with the offers.",
        service: 'Wash & Iron'
    },
    {
        id: '5',
        name: 'Anjali Gupta',
        location: 'JP Nagar, Bangalore',
        rating: 5,
        text: "Best laundry app I've used so far. The transparency in pricing and weight calculation builds a lot of trust.",
        service: 'Premium Laundry'
    },
    {
        id: '6',
        name: 'Vikram Singh',
        location: 'Tavarekere, Bangalore',
        rating: 4.5,
        text: "Quick pickup and delivery. Essential service for bachelors!",
        service: 'Wash & Fold'
    }
];

export const TestimonialsSection: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>What our customers say</Text>
                <Text style={styles.subtitle}>Trusted by 2000+ happy families</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={Dimensions.get('window').width * 0.65 + 12} // Updated for new width
            >
                {TESTIMONIALS.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{item.name}</Text>
                                <Text style={styles.userLocation}>{item.location}</Text>
                            </View>
                        </View>

                        <View style={styles.ratingContainer}>
                            {[...Array(5)].map((_, i) => (
                                <Ionicons
                                    key={i}
                                    name={i < Math.floor(item.rating) ? "star" : (i < item.rating ? "star-half" : "star-outline")}
                                    size={14}
                                    color="#F59E0B"
                                />
                            ))}
                        </View>

                        <Text style={styles.reviewText} numberOfLines={2}>"{item.text}"</Text>

                        <View style={styles.footer}>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                            <Text style={styles.serviceTag}>{item.service}</Text>
                        </View>
                    </View>
                ))
                }
            </ScrollView >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.xl, // Add spacing before FAQ
    },
    header: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm, // space for shadow
    },
    card: {
        width: Dimensions.get('window').width * 0.65, // Compact cards, 65% of screen
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginRight: 12, // Reduced margin
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    userLocation: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    ratingContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    reviewText: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '500',
    },
    serviceTag: {
        fontSize: 11,
        color: COLORS.textLight,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
});
