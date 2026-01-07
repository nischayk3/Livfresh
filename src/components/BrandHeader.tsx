import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../utils/constants';

interface BrandHeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
    title,
    showBack = true,
    onBackPress,
    rightElement
}) => {
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={styles.header}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                )}
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
            <View style={styles.rightContainer}>
                {rightElement}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        ...(Platform.OS === 'web' ? {
            flexShrink: 0,
        } : {}),
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: SPACING.md,
        padding: 4,
    },
    title: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        color: COLORS.text,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
