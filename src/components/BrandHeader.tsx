import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={[
            styles.header,
            {
                paddingTop: insets.top + SPACING.md,
                // On Android, we might not want double padding if the status bar is translucent, 
                // but usually insets.top is correct. 
                // If standard padding is SPACING.md, we add insets.top to it.
            }
        ]}>
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
        paddingBottom: SPACING.md, // Changed from paddingVertical to explicit bottom
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
