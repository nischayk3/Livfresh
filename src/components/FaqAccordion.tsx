import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../utils/constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqItem {
    question: string;
    answer: string;
}

interface FaqAccordionProps {
    items: FaqItem[];
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleExpand = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <View style={styles.container}>
            {items.map((item, index) => {
                const isExpanded = expandedIndex === index;
                return (
                    <View key={index} style={styles.itemContainer}>
                        <TouchableOpacity
                            style={styles.header}
                            onPress={() => toggleExpand(index)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.question}>{item.question}</Text>
                            <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={COLORS.textSecondary}
                            />
                        </TouchableOpacity>
                        {isExpanded && (
                            <View style={styles.body}>
                                <Text style={styles.answer}>{item.answer}</Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: SPACING.sm,
    },
    itemContainer: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: COLORS.white,
    },
    question: {
        ...TYPOGRAPHY.body,
        fontWeight: '500',
        color: COLORS.text,
        flex: 1,
        paddingRight: SPACING.sm,
    },
    body: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        paddingTop: 0,
    },
    answer: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});
