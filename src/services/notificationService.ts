import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import { doc, updateDoc, db } from './firebase';
import { navigationRef } from '../navigation/RootNavigator';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Setup Android notification channel
export async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default-v2', {
      name: 'SpinZo Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#994BFF',
      sound: 'default',
      showBadge: true,
    });
  }
}

// Register for push notifications and return token
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('EAS Project ID not found in expoConfig');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    await setupAndroidChannel();

    return tokenData.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// Save token to user document in Firestore
export async function savePushToken(userId: string, token: string | null) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: token,
    });
    console.log(`Push token saved for user ${userId}:`, token);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

// Handle notification tap (deep linking)
export function handleNotificationTap(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as any;
  if (!data) return;

  console.log('Notification tapped with data:', data);

  const { orderId, screen, action, url } = data;

  if (action === 'open_review' && url) {
    Linking.openURL(url).catch((err) => console.error('Failed to open GMB URL:', err));
    return;
  }

  if (navigationRef.isReady()) {
    if (screen === 'OrderDetail' && orderId) {
      const autoOpenScheduler = data.autoOpenScheduler === 'true' || data.autoOpenScheduler === true;
      navigationRef.navigate('OrderDetail', { orderId, autoOpenScheduler });
    } else if (screen === 'Credits') {
      navigationRef.navigate('MainTabs', { screen: 'Credits' });
    } else {
      navigationRef.navigate('MainTabs', { screen: 'Home' });
    }
  } else {
    // If navigation is not ready, retry after a small delay
    setTimeout(() => {
      if (navigationRef.isReady()) {
        if (screen === 'OrderDetail' && orderId) {
          const autoOpenScheduler = data.autoOpenScheduler === 'true' || data.autoOpenScheduler === true;
          navigationRef.navigate('OrderDetail', { orderId, autoOpenScheduler });
        } else if (screen === 'Credits') {
          navigationRef.navigate('MainTabs', { screen: 'Credits' });
        } else {
          navigationRef.navigate('MainTabs', { screen: 'Home' });
        }
      }
    }, 1000);
  }
}

// Setup foreground and tap listeners
export function setupNotificationHandlers() {
  // Foreground listener
  const subscription1 = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received in foreground:', notification);
  });

  // Tap listener (runs when app is opened from notification)
  const subscription2 = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationTap(response);
  });

  return () => {
    subscription1.remove();
    subscription2.remove();
  };
}
