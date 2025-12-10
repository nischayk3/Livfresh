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
import { AddressMapScreen } from '../screens/Main/AddressMapScreen';
import { HomeScreen } from '../screens/Main/HomeScreen';
import { VendorDetailScreen } from '../screens/Main/VendorDetailScreen';
import { AddressListScreen } from '../screens/Main/AddressListScreen';
import { CartScreen } from '../screens/Main/CartScreen';
import { OrderSuccessScreen } from '../screens/Main/OrderSuccessScreen';
import { OrderDetailScreen } from '../screens/Main/OrderDetailScreen';
import { MyOrdersScreen } from '../screens/Main/MyOrdersScreen';
import { ProfileScreen } from '../screens/Main/ProfileScreen';
import { EditProfileScreen } from '../screens/Main/EditProfileScreen';
import { HelpSupportScreen } from '../screens/Main/HelpSupportScreen';
import { getCart, saveCart, getUserAddresses } from '../services/firestore';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useCartStore, useAddressStore } from '../store';
import { COLORS, TYPOGRAPHY } from '../utils/constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens for tabs




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
    <Stack.Screen name="VendorDetail" component={VendorDetailScreen} />
    <Stack.Screen name="AddressList" component={AddressListScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
    <Stack.Screen name="AddressMap" component={AddressMapScreen} />
    <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
  </Stack.Navigator>
);

export const RootNavigator: React.FC = () => {
  const { isLoggedIn, user } = useAuthStore();
  const { setItems, items } = useCartStore();
  const [isHydrated, setIsHydrated] = React.useState(false);

  // 1. Listen to Auth State & Hydrate User Profile
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            useAuthStore.getState().setUser({
              uid: firebaseUser.uid,
              phone: userData.phone || firebaseUser.phoneNumber || '',
              name: userData.name || '',
              email: userData.email || '', // Add allowed fields
            } as any);
          } else {
            // Fallback if doc doesn't exist yet (rare)
            useAuthStore.getState().setUser({
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber || '',
              name: '',
            });
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      } else {
        useAuthStore.getState().clearUser();
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Hydrate cart on login (Initial Load)
  React.useEffect(() => {
    const hydrate = async () => {
      if (user?.uid) {
        try {
          const savedItems = await getCart(user.uid);
          if (savedItems) {
            setItems(savedItems);
          }
        } catch (error) {
          console.error('Failed to hydrate cart:', error);
        } finally {
          setIsHydrated(true);
        }
      } else {
        setIsHydrated(true); // No user, essentially hydrated as empty
      }
    };
    hydrate();
  }, [user]);

  // 2. Sync cart to Firestore on change (only after hydration)
  React.useEffect(() => {
    if (user?.uid && isHydrated) {
      const syncCart = async () => {
        try {
          await saveCart(user.uid, items);
        } catch (error) {
          console.error('Failed to sync cart:', error);
        }
      };
      // Debounce could be added here if frequent updates, but for now direct sync is okay
      const timeout = setTimeout(syncCart, 500);
      return () => clearTimeout(timeout);
    }
  }, [items, user, isHydrated]);

  // 3. Hydrate Addresses on login
  React.useEffect(() => {
    const hydrateAddresses = async () => {
      if (user?.uid) {
        try {
          const addresses = await getUserAddresses(user.uid);
          useAddressStore.getState().setAddresses(addresses);

          // If no current address is selected, select the first/primary one
          const { currentAddress } = useAddressStore.getState();
          if (!currentAddress && addresses.length > 0) {
            // Prefer primary
            const primary = addresses.find((a: any) => a.isPrimary) || addresses[0];
            const formatted = typeof primary.address === 'string' ? primary.address : primary.address.formattedAddress;
            useAddressStore.getState().setCurrentAddress(
              formatted,
              primary.latitude,
              primary.longitude
            );
          }
        } catch (error) {
          console.error('Failed to hydrate addresses:', error);
        }
      }
    };
    hydrateAddresses();
  }, [user]);

  // 4. Force Navigation to Location/Address if no address exists (Post-login flow)
  // note: We use a ref or check to ensure we only do this once per session/login if needed, 
  // but react-navigation 'replace' or 'reset' is better handled inside a specific screen or via this effect carefully.
  // Since we are inside RootNavigator, we can't easily "navigate" because we provide the container.
  // Actually, we can pass a ref to NavigationContainer or use the conditional rendering logic.
  // BUT, LocationPermission is in the Auth stack currently? No, it's in Main stack too.
  // If user has no address, we should arguably show them the Location setup.
  // However, forcing a screen change from here is tricky without a navigation ref.
  // A better spot is HomeScreen. HomeScreen checks "if (!currentAddress) navigate('LocationPermission')".


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
