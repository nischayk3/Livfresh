import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/constants';

interface ServiceInfoProps {
    serviceId: string;
}

interface ServiceData {
    inclusions: string[];
    process: { title: string; icon: string }[];
}

const SERVICE_DATA: Record<string, ServiceData> = {
    wash_fold: {
        inclusions: [
            "Expert sorting by color & fabric",
            "Premium detergent wash",
            "Tumble dry",
            "Professional folding",
            "Hygienic packaging"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Wash', icon: 'water' },
            { title: 'Fold', icon: 'layers' },
            { title: 'Deliver', icon: 'gift' },
        ]
    },
    wash_iron: {
        inclusions: [
            "Expert sorting",
            "Premium wash & stain removal",
            "Steam ironing",
            "Wrinkle-free packaging",
            "Hanger options available"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Wash', icon: 'water' },
            { title: 'Iron', icon: 'shirt' },
            { title: 'Deliver', icon: 'gift' },
        ]
    },
    blanket_wash: {
        inclusions: [
            "Heavy duty machine wash",
            "Anti-bacterial treatment",
            "Softener for fluffiness",
            "Complete drying",
            "Vacuum packing (if requested)"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Wash', icon: 'water' },
            { title: 'Dry', icon: 'sunny' },
            { title: 'Deliver', icon: 'gift' },
        ]
    },
    dry_clean: {
        inclusions: [
            "Spot stain treatment",
            "Chemical solvent cleaning",
            "Steam press",
            "Finishing touches",
            "Hanger packaging"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Clean', icon: 'sparkles' },
            { title: 'Press', icon: 'shirt' },
            { title: 'Deliver', icon: 'gift' },
        ]
    },
    premium_laundry: {
        inclusions: [
            "Individual fabric care",
            "Imported detergents",
            "Hand finishing",
            "Premium packaging",
            "Perfume finish"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Care', icon: 'heart' },
            { title: 'Finish', icon: 'ribbon' },
            { title: 'Deliver', icon: 'gift' },
        ]
    },
    shoe_clean: {
        inclusions: [
            "Deep cleaning of upper",
            "Sole scrubbing",
            "Lace washing",
            "Deodorizing",
            "Shape restoration"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Scrub', icon: 'hand-left' },
            { title: 'Dry', icon: 'sunny' },
            { title: 'Deliver', icon: 'gift' },
        ]
    },
    ironing: {
        inclusions: [
            "High-pressure steam press",
            "Temperature-controlled ironing",
            "Collar & cuff stiffening",
            "Premium anti-wrinkle spray",
            "Hanger/Folding options"
        ],
        process: [
            { title: 'Pickup', icon: 'bicycle' },
            { title: 'Inspect', icon: 'search' },
            { title: 'Press', icon: 'shirt' },
            { title: 'Deliver', icon: 'gift' },
        ]
    }
};

export const ServiceInfo: React.FC<ServiceInfoProps> = ({ serviceId }) => {
    const data = SERVICE_DATA[serviceId] || SERVICE_DATA['wash_fold'];

    return (
        <View style={styles.container}>
            {/* SECTION 1: What's Included */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>What's Included</Text>
                <View style={styles.listContainer}>
                    {data.inclusions.map((item, index) => (
                        <View key={index} style={styles.listItem}>
                            <View style={styles.iconBg}>
                                <Ionicons name="checkmark" size={12} color={COLORS.success} />
                            </View>
                            <Text style={styles.listText}>{item}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* SECTION 2: How it works */}
            <View style={[styles.card, { marginTop: SPACING.md }]}>
                <Text style={styles.sectionTitle}>How it works</Text>
                <View style={styles.processContainer}>
                    {data.process.map((step, index) => (
                        <React.Fragment key={index}>
                            <View style={styles.stepItem}>
                                <View style={styles.stepIconCtx}>
                                    <Ionicons name={step.icon as any} size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.stepText}>{step.title}</Text>
                            </View>
                            {index < data.process.length - 1 && (
                                <View style={styles.connector} />
                            )}
                        </React.Fragment>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.xl,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...SHADOWS.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A', // Dark text
        marginBottom: SPACING.md,
        fontFamily: 'Outfit_700Bold',
    },
    listContainer: {
        gap: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBg: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#DCFCE7', // Light green
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    listText: {
        fontSize: 14,
        color: '#475569', // Slate 600
        fontFamily: 'Outfit_400Regular',
        flex: 1,
    },
    processContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    stepItem: {
        alignItems: 'center',
        gap: 6,
    },
    stepIconCtx: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F3FF', // Light primary
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EDE9FE',
    },
    stepText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        fontFamily: 'Outfit_600SemiBold',
    },
    connector: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
        marginBottom: 20, // Align with center of icons roughly
        marginHorizontal: 4,
    },
});
