import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import { OnboardingCarousel } from '../screens/Auth/OnboardingCarousel';
import { PhoneLoginScreen } from '../screens/Auth/PhoneLoginScreen';
import { UserDetailsScreen } from '../screens/Auth/UserDetailsScreen';
import { OTPScreen } from '../screens/Auth/OTPScreen';
import { LocationPermissionScreen } from '../screens/Auth/LocationPermissionScreen';
import { HomeScreen } from '../screens/Main/HomeScreen';
import { COLORS, TYPOGRAPHY } from '../utils/constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens for tabs
const MyOrdersScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderTitle}>My Orders</Text>
    <Text style={styles.placeholderText}>Coming soon...</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderTitle}>Profile</Text>
    <Text style={styles.placeholderText}>Coming soon...</Text>
  </View>
);

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        paddingBottom: 8,
        height: 60,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="MyOrders"
      component={MyOrdersScreen}
      options={{
        tabBarLabel: 'Orders',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="receipt" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

// Main Stack Navigator (includes modals and detail screens)
const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    {/* Add other screens like ServiceDetail, AddressList, etc. here */}
  </Stack.Navigator>
);

export const RootNavigator: React.FC = () => {
  const { isLoggedIn } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingCarousel} />
            <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
            <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
            <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  placeholderTitle: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  placeholderText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
});
