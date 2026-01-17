import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableButtonProps extends PressableProps {
    style?: ViewStyle | ViewStyle[];
    children: React.ReactNode;
    scaleDown?: number;
}

/**
 * A reusable pressable component with a smooth scale animation on press.
 * Uses Reanimated for 60fps native-thread animations.
 */
export const AnimatedButton: React.FC<AnimatedPressableButtonProps> = ({
    style,
    children,
    scaleDown = 0.96,
    ...props
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = () => {
        scale.value = withTiming(scaleDown, {
            duration: 100,
            easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, {
            duration: 150,
            easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(1, { duration: 150 });
    };

    return (
        <AnimatedPressable
            style={[style, animatedStyle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            {...props}
        >
            {children}
        </AnimatedPressable>
    );
};
