import React, { lazy, Suspense } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { useAdminAuthStore, useAdminPermissions } from '../store';
import { BrandLoader } from '../components/BrandLoader';

// Admin screens (will be created)
const AdminDashboardScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Admin/AdminDashboardScreen').then(m => ({ default: m.AdminDashboardScreen })))
  : require('../screens/Admin/AdminDashboardScreen').AdminDashboardScreen;

const AdminOrdersScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Admin/AdminOrdersScreen').then(m => ({ default: m.AdminOrdersScreen })))
  : require('../screens/Admin/AdminOrdersScreen').AdminOrdersScreen;

const AdminSubscriptionsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Admin/AdminSubscriptionsScreen').then(m => ({ default: m.AdminSubscriptionsScreen })))
  : require('../screens/Admin/AdminSubscriptionsScreen').AdminSubscriptionsScreen;

const AdminSettingsScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Admin/AdminSettingsScreen').then(m => ({ default: m.AdminSettingsScreen })))
  : require('../screens/Admin/AdminSettingsScreen').AdminSettingsScreen;

// Fix: Ensure this is declared at module scope
const AdminDemandScreen = Platform.OS === 'web'
  ? lazy(() => import('../screens/Admin/AdminDemandScreen').then(m => ({ default: m.AdminDemandScreen })))
  : require('../screens/Admin/AdminDemandScreen').AdminDemandScreen;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
const AdminTabs = () => {
  const { canViewSubscriptions } = useAdminPermissions();

  return (
    <Suspense fallback={<></>}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            paddingTop: 8,
            paddingBottom: 12,
            height: 60,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={AdminDashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Orders"
          component={AdminOrdersScreen}
          options={{
            tabBarLabel: 'Orders',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="bag" size={size} color={color} />
            ),
          }}
        />
        {canViewSubscriptions && (
          <Tab.Screen
            name="Subscriptions"
            component={AdminSubscriptionsScreen}
            options={{
              tabBarLabel: 'Subscriptions',
              tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name="card" size={size} color={color} />
              ),
            }}
          />
        )}
        <Tab.Screen
          name="Settings"
          component={AdminSettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </Suspense>
  );
};

// Admin Stack Navigator
export const AdminNavigator = () => {
  const { adminPhone, adminRole } = useAdminAuthStore();
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    if (!adminPhone) {
      navigation.navigate('AdminLogin');
    }
  }, [adminPhone, navigation]);

  if (!adminPhone) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <BrandLoader message="Redirecting to Admin Login..." />
      </View>
    );
  }

  // Ensure role is loaded before showing the dashboard to prevent "restricted view" flash on reload
  if (!adminRole) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <BrandLoader message="Verifying Admin Permissions..." />
      </View>
    );
  }


  return (
    <Suspense fallback={<View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}><BrandLoader /></View>}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { flex: 1 },
        }}
      >
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="AdminDemand" component={AdminDemandScreen} />
      </Stack.Navigator>
    </Suspense>
  );
};
