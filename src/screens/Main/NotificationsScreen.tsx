import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isToday as isDateToday, isYesterday as isDateYesterday, isThisWeek as isDateThisWeek, format } from 'date-fns';

import { COLORS, SPACING, SHADOWS, TYPOGRAPHY } from '../../utils/constants';
import { useAuthStore, useNotificationStore } from '../../store';
import { BrandHeader } from '../../components/BrandHeader';
import { BrandLoader } from '../../components/BrandLoader';
import { NotificationData } from '../../store/notificationStore';

// Safe date conversion helper
const getNotificationDate = (createdAt: any): Date => {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }
  if (createdAt.seconds) {
    return new Date(createdAt.seconds * 1000);
  }
  return new Date(createdAt);
};

// Group notifications by date categories
const groupNotifications = (notifications: NotificationData[]) => {
  const groups: { title: string; data: NotificationData[] }[] = [
    { title: 'Today', data: [] },
    { title: 'Yesterday', data: [] },
    { title: 'This Week', data: [] },
    { title: 'Earlier', data: [] },
  ];

  notifications.forEach((item) => {
    const date = getNotificationDate(item.createdAt);
    if (isDateToday(date)) {
      groups[0].data.push(item);
    } else if (isDateYesterday(date)) {
      groups[1].data.push(item);
    } else if (isDateThisWeek(date)) {
      groups[2].data.push(item);
    } else {
      groups[3].data.push(item);
    }
  });

  return groups.filter((g) => g.data.length > 0);
};

// Map notification type to icon name and background color
const getNotificationIconInfo = (type: NotificationData['type']) => {
  switch (type) {
    case 'order_confirmed':
      return { icon: 'receipt-outline', color: '#3B82F6', bg: '#EFF6FF' };
    case 'pickup_completed':
      return { icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' };
    case 'ready':
      return { icon: 'shirt-outline', color: '#8B5CF6', bg: '#F5F3FF' };
    case 'out_for_delivery':
      return { icon: 'car-sport-outline', color: '#F59E0B', bg: '#FEF3C7' };
    case 'delivered':
      return { icon: 'gift-outline', color: '#EC4899', bg: '#FDF2F8' };
    case 'cancelled':
      return { icon: 'close-circle-outline', color: '#EF4444', bg: '#FEF2F2' };
    case 'weekly_reminder':
      return { icon: 'calendar-outline', color: '#06B6D4', bg: '#ECFEFF' };
    case 'credit_expiry':
      return { icon: 'alert-circle-outline', color: '#F97316', bg: '#FFF7ED' };
    default:
      return { icon: 'notifications-outline', color: '#64748B', bg: '#F8FAFC' };
  }
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    subscribeToNotifications,
    markAsRead,
    markAllAsRead
  } = useNotificationStore();

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToNotifications(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid]);

  const handleNotificationPress = async (item: NotificationData) => {
    if (user?.uid) {
      await markAsRead(user.uid, item.id);
    }

    const { orderId, screen, action, url, autoOpenScheduler } = item.data || {};

    if (action === 'open_review' && url) {
      Linking.openURL(url).catch((err) => console.error('Failed to open GMB link:', err));
      return;
    }

    if (screen === 'OrderDetail' && orderId) {
      navigation.navigate('OrderDetail', { orderId, autoOpenScheduler });
    } else if (screen === 'Credits') {
      navigation.navigate('MainTabs', { screen: 'Credits' });
    } else {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const handleMarkAllRead = () => {
    if (user?.uid) {
      markAllAsRead(user.uid);
    }
  };

  const grouped = groupNotifications(notifications);

  // Render a single notification item
  const renderItem = ({ item }: { item: NotificationData }) => {
    const { icon, color, bg } = getNotificationIconInfo(item.type);
    const date = getNotificationDate(item.createdAt);
    const timeStr = format(date, 'hh:mm a');

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.cardHeader}>
            <Text style={[styles.titleText, !item.read && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Render group section (e.g., Today, Yesterday)
  const renderSection = ({ item }: { item: { title: string; data: NotificationData[] } }) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeader}>{item.title}</Text>
      {item.data.map((notif) => (
        <React.Fragment key={notif.id}>
          {renderItem({ item: notif })}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.pageBg, '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />

      <BrandHeader
        title="Notifications"
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadButton}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <BrandLoader message="Fetching notifications..." />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.textLight} />
          </View>
          <Text style={styles.emptyTitle}>All caught up! 🧺</Text>
          <Text style={styles.emptySubtitle}>
            You'll see updates here when we pick up, wash, or deliver your clothes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          renderItem={renderSection}
          keyExtractor={(item) => item.title}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  sectionContainer: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  unreadCard: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFF', // Subtle purple hue for unread
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    color: COLORS.text,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: 'Outfit_400Regular',
  },
  bodyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  markReadButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  markReadText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
