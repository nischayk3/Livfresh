import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  writeBatch,
  db
} from '../services/firebase';

export interface NotificationData {
  id: string;
  type:
    | 'order_confirmed'
    | 'pickup_completed'
    | 'ready'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'weekly_reminder'
    | 'credit_expiry'
    | 'winback';
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  data?: {
    orderId?: string;
    screen?: string;
    action?: string;
    url?: string;
    autoOpenScheduler?: boolean;
  };
}

interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  subscribeToNotifications: (userId: string) => () => void;
  markAsRead: (userId: string, notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  subscribeToNotifications: (userId: string) => {
    set({ isLoading: true });
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: NotificationData[] = [];
        let unread = 0;
        snapshot.forEach((snapDoc) => {
          const data = snapDoc.data() as Omit<NotificationData, 'id'>;
          if (!data.read) {
            unread += 1;
          }
          list.push({
            id: snapDoc.id,
            ...data,
          } as NotificationData);
        });
        set({ notifications: list, unreadCount: unread, isLoading: false });

        // Update iOS application badge count
        if (Platform.OS === 'ios') {
          Notifications.setBadgeCountAsync(unread).catch((err) => {
            console.warn('Failed to set iOS badge count:', err);
          });
        }
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        set({ isLoading: false });
      }
    );

    return unsubscribe;
  },

  markAsRead: async (userId: string, notificationId: string) => {
    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const { notifications } = get();
      const unreadNotifs = notifications.filter((n) => !n.read);
      if (unreadNotifs.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifs.forEach((n) => {
        const notifRef = doc(db, 'users', userId, 'notifications', n.id);
        batch.update(notifRef, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
}));
