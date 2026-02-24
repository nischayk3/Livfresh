import React, { lazy, Suspense } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSubscriptionStore, useAdminAuthStore, useUIStore } from '../store';
import { getCart, saveCart, getUserAddresses, getUser } from '../services/firestore';
import { auth, adminAuth, onAuthStateChanged } from '../services/firebase';
import { useCartStore, useAddressStore } from '../store';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../utils/constants';
import { BrandLoader } from '../components/BrandLoader';

// Helper for lazy loading components with Web compatibility
const lazyWeb = (importPath: () => Promise<any>) => {
  if (Platform.OS === 'web') {
    return lazy(importPath);
  }
  // Native doesn't support lazy as well/needed for this structure
  return null;
};

// --- Auth Screens ---
const OnboardingCarousel = Platform.OS === 'web'
  ? lazy(() => import('../screens/Auth/OnboardingCarousel').then(m => ({ default: m.OnboardingCarousel })))
  : require('../screens/Auth/OnboardingCarousel').OnboardingCarousel;

const PhoneLoginScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Auth/PhoneLoginScreen').then(m => ({ default: m.PhoneLoginScreen })))
  : require('../screens/Auth/PhoneLoginScreen').PhoneLoginScreen;

const UserDetailsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Auth/UserDetailsScreen').then(m => ({ default: m.UserDetailsScreen })))
  : require('../screens/Auth/UserDetailsScreen').UserDetailsScreen;

const OTPScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Auth/OTPScreen').then(m => ({ default: m.OTPScreen })))
  : require('../screens/Auth/OTPScreen').OTPScreen;

const LocationPermissionScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Auth/LocationPermissionScreen').then(m => ({ default: m.LocationPermissionScreen })))
  : require('../screens/Auth/LocationPermissionScreen').LocationPermissionScreen;

// --- Main Screens ---
const AddressMapScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/AddressMapScreen').then(m => ({ default: m.AddressMapScreen })))
  : require('../screens/Main/AddressMapScreen').AddressMapScreen;

const HomeScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/HomeScreen').then(m => ({ default: m.HomeScreen })))
  : require('../screens/Main/HomeScreen').HomeScreen;

const VendorDetailScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/VendorDetailScreen').then(m => ({ default: m.VendorDetailScreen })))
  : require('../screens/Main/VendorDetailScreen').VendorDetailScreen;

const AddressListScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/AddressListScreen').then(m => ({ default: m.AddressListScreen })))
  : require('../screens/Main/AddressListScreen').AddressListScreen;

const NotFoundScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/NotFoundScreen').then(m => ({ default: m.NotFoundScreen })))
  : require('../screens/Main/NotFoundScreen').NotFoundScreen;

const CartScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/CartScreen').then(m => ({ default: m.CartScreen })))
  : require('../screens/Main/CartScreen').CartScreen;

const OrderSuccessScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/OrderSuccessScreen').then(m => ({ default: m.OrderSuccessScreen })))
  : require('../screens/Main/OrderSuccessScreen').OrderSuccessScreen;

const OrderDetailScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/OrderDetailScreen').then(m => ({ default: m.OrderDetailScreen })))
  : require('../screens/Main/OrderDetailScreen').OrderDetailScreen;

const MyOrdersScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/MyOrdersScreen').then(m => ({ default: m.MyOrdersScreen })))
  : require('../screens/Main/MyOrdersScreen').MyOrdersScreen;

const ProfileScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/ProfileScreen').then(m => ({ default: m.ProfileScreen })))
  : require('../screens/Main/ProfileScreen').ProfileScreen;

const EditProfileScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/EditProfileScreen').then(m => ({ default: m.EditProfileScreen })))
  : require('../screens/Main/EditProfileScreen').EditProfileScreen;

const HelpSupportScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/HelpSupportScreen').then(m => ({ default: m.HelpSupportScreen })))
  : require('../screens/Main/HelpSupportScreen').HelpSupportScreen;

const SubscriptionsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/SubscriptionsScreen').then(m => ({ default: m.SubscriptionsScreen })))
  : require('../screens/Main/SubscriptionsScreen').SubscriptionsScreen;

const BuyCreditsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/BuyCreditsScreen').then(m => ({ default: m.BuyCreditsScreen })))
  : require('../screens/Main/BuyCreditsScreen').BuyCreditsScreen;

const SubscriptionSuccessScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Main/SubscriptionSuccessScreen').then(m => ({ default: m.SubscriptionSuccessScreen })))
  : require('../screens/Main/SubscriptionSuccessScreen').SubscriptionSuccessScreen;

// --- Admin Screens ---
const AdminLoginScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Admin/AdminLoginScreen').then(m => ({ default: m.AdminLoginScreen })))
  : require('../screens/Admin/AdminLoginScreen').AdminLoginScreen;

const AdminNavigator = Platform.OS === 'web'
  ? lazy(() => import('./AdminNavigator').then(m => ({ default: m.AdminNavigator })))
  : require('./AdminNavigator').AdminNavigator;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Global navigation ref — allows non-component code (RootNavigator effects) to navigate
export const navigationRef = createNavigationContainerRef<any>();

// Main Tab Navigator
const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8', // Slightly more vibrant inactive color
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0, // Clean look
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          height: 64 + (insets.bottom > 0 ? insets.bottom : 12),
          ...SHADOWS.lg, // Premium elevation
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Credits"
        component={SubscriptionsScreen}
        options={{
          tabBarLabel: 'Credits',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { flex: 1 },
    }}
  >
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
    <Stack.Screen name="BuyCredits" component={BuyCreditsScreen} />
    <Stack.Screen name="SubscriptionSuccess" component={SubscriptionSuccessScreen} />
  </Stack.Navigator>
);

export const RootNavigator: React.FC = () => {
  const { isLoggedIn, user, isSessionExpired, logout } = useAuthStore();
  const { hasCompletedOnboarding } = useUIStore();
  const { setItems, items } = useCartStore();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);

  // 1. Listen to Auth State & Hydrate User Profile
  React.useEffect(() => {
    // Listen to USER App Auth
    const unsubscribeUser = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const authStore = useAuthStore.getState();
        if (authStore.isSessionExpired()) {
          console.log('⏰ User session expired (12 hours). Logging out...');
          await authStore.logout();
          return;
        }

        try {
          const userData = await getUser(firebaseUser.uid);
          console.log('🔍 RootNav: Fetched user data:', JSON.stringify(userData, null, 2));
          if (userData) {
            const currentUID = useAuthStore.getState().user?.uid;
            // Only update if UID changes OR if it's the first time
            if (currentUID !== firebaseUser.uid || !authStore.isLoggedIn) {
              useAuthStore.getState().setUser({
                uid: firebaseUser.uid,
                phone: userData.phone || firebaseUser.phoneNumber || '',
                name: userData.name || '',
                // ... rest of data
                ...userData
              } as any);
            }

            if (!useAuthStore.getState().loginTimestamp) {
              useAuthStore.getState().setLoginTimestamp(Date.now());
            }
          } else {
            useAuthStore.getState().setUser({
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber || '',
              name: '',
              email: '',
            });
            useAuthStore.getState().setLoginTimestamp(Date.now());
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      } else {
        useAuthStore.getState().clearUser();
      }
      setIsAuthLoading(false);
    });

    // Listen to ADMIN App Auth
    const unsubscribeAdmin = onAuthStateChanged(adminAuth, (adminUser) => {
      if (adminUser) {
        console.log('✅ Admin session detected on load:', adminUser.phoneNumber);
        useAdminAuthStore.setState({
          isAdmin: true,
          adminPhone: adminUser.phoneNumber,
        });
      } else {
        useAdminAuthStore.setState({
          isAdmin: false,
          adminPhone: null,
        });
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeAdmin();
    };
  }, []);

  // 2. Hydrate cart on login — merges any guest pendingItem atomically
  React.useEffect(() => {
    const hydrate = async () => {
      if (user?.uid) {
        try {
          const savedItems = await getCart(user.uid);
          // Get pendingItem BEFORE setItems so we can merge it in
          const { pendingItem, setPendingItem } = useCartStore.getState();
          const baseItems = savedItems || [];

          if (pendingItem) {
            // Merge: Firestore cart + pending guest item
            const mergedItem = {
              ...pendingItem,
              id: `${pendingItem.serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };
            setItems([...baseItems, mergedItem]);
            setPendingItem(null);

            // Show success alert with View Cart button
            const { showAlert } = useUIStore.getState();
            showAlert({
              title: 'Added to Cart! 🎉',
              message: `${pendingItem.serviceName} has been added to your cart.`,
              type: 'success',
              buttons: [
                {
                  text: 'View Cart',
                  onPress: () => {
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('Main', { screen: 'Cart' } as any);
                    }
                  }
                }
              ]
            });
          } else {
            setItems(baseItems);
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
  }, [user?.uid]);

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

  // 4. Hydrate Subscriptions on login
  React.useEffect(() => {
    if (user?.uid) {
      try {
        useSubscriptionStore.getState().fetchSubscriptions(user.uid);
      } catch (error) {
        console.error('Failed to hydrate subscriptions:', error);
      }
    }
  }, [user?.uid]);
  // 6. Force Navigation to Location/Address if no address exists (Post-login flow)
  // note: We use a ref or check to ensure we only do this once per session/login if needed, 
  // but react-navigation 'replace' or 'reset' is better handled inside a specific screen or via this effect carefully.
  // Since we are inside RootNavigator, we can't easily "navigate" because we provide the container.
  // Actually, we can pass a ref to NavigationContainer or use the conditional rendering logic.
  // BUT, LocationPermission is in the Auth stack currently? No, it's in Main stack too.
  // If user has no address, we should arguably show them the Location setup.
  // However, forcing a screen change from here is tricky without a navigation ref.
  // A better spot is HomeScreen. HomeScreen checks "if (!currentAddress) navigate('LocationPermission')".


  if (isAuthLoading || !isHydrated) {
    return (
      <View style={styles.loadingWrapper}>
        <BrandLoader message="Initializing..." />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      documentTitle={{
        formatter: () => 'SpinZo',
      }}
      linking={{
        prefixes: [
          'spinzo://',
          'http://localhost:8081',
          'exp://',
          'https://spinzo.app',
          'https://spinzo.in'
        ],
        config: {
          screens: {
            // Auth Routes
            Onboarding: 'onboarding',
            PhoneLogin: 'login',
            UserDetails: 'signup',
            OTP: 'verify-otp',
            LocationPermission: 'location-permission',

            // Main App Routes
            Main: {
              screens: {
                MainTabs: {
                  screens: {
                    Home: 'home',
                    MyOrders: 'my-orders',
                    Credits: 'credits',
                    Profile: 'profile',
                  },
                },
                VendorDetail: 'vendor/:id',
                Cart: 'cart',
                AddressList: 'addresses',
                AddressMap: 'map',
                OrderSuccess: 'order-success',
                OrderDetail: 'order/:id',
                EditProfile: 'edit-profile',
                HelpSupport: 'support',
                BuyCredits: 'buy-credits',
                SubscriptionSuccess: 'subscription-success',
              },
            },

            // Admin Routes
            AdminLogin: 'admin/login',
            Admin: {
              path: 'admin',
              screens: {
                AdminTabs: {
                  screens: {
                    Dashboard: '',
                    Orders: 'orders',
                    Subscriptions: 'subscriptions',
                    Settings: 'settings',
                  },
                },
              },
            },
            // Catch-all route for unknown paths
            NotFound: '*',
          },
        },
      } as any}>
      <Suspense fallback={<View style={styles.loadingWrapper}><BrandLoader message="Loading..." /></View>}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { flex: 1 }, // Critical for web scrolling
          }}
        >
          {/* Guest or Public routes */}
          {!hasCompletedOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingCarousel} />
          ) : (
            <>
              {/* New User Registration - only when logged in but profile incomplete (no name) */}
              {(isLoggedIn && !user?.name) ? (
                <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
              ) : (
                /* Main app routes - accessible to guests AND logged-in users */
                <Stack.Screen name="Main" component={MainStack} />
              )}
            </>
          )}

          {/* Fallback Auth Screens directly accessible from anywhere (e.g. from MainStack) */}
          <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
          <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
          <Stack.Screen name="AddressMap" component={AddressMapScreen} />

          {/* Admin routes - always defined but protected by guards inside components */}
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
          <Stack.Screen name="Admin" component={AdminNavigator} />

          {/* Fallback for unknown routes inside the app */}
          <Stack.Screen name="NotFound" component={NotFoundScreen} />
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer >
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
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
