import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '../../utils/constants';
import { Ionicons } from '@expo/vector-icons';

export const NotFoundScreen = () => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.container}>
            <Ionicons name="alert-circle-outline" size={80} color={COLORS.primary} />
            <Text style={styles.title}>404 - Page Not Found</Text>
            <Text style={styles.message}>
                The page you're looking for doesn't exist or has been moved.
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Main')}
            >
                <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        ...TYPOGRAPHY.heading,
        color: COLORS.text,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        maxWidth: 300,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        ...TYPOGRAPHY.button,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
