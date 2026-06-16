import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { doc, updateDoc, db } from '../../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  User,
  MapPin,
  ShoppingBag,
  Wallet,
  HelpCircle,
  MessageCircle,
  Star,
  Shield,
  LogOut,
  ChevronRight,
  Pencil,
  Globe,
  Trash2,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useAuthStore, useUIStore } from '../../store';

interface MenuRowProps {
  icon: React.ComponentType<any>;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon: Icon, label, onPress, rightElement, iconBg = 'rgba(124,58,237,0.06)', iconColor = '#7C3AED' }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.menuIconCircle, { backgroundColor: iconBg }]}>
      <Icon size={20} color={iconColor} strokeWidth={1.8} />
    </View>
    <Text style={styles.menuRowLabel}>{label}</Text>
    {rightElement || <ChevronRight size={18} color="#D4D4D8" strokeWidth={2} />}
  </TouchableOpacity>
);

const SECTION_HEADER: React.FC<{ label: string }> = ({ label }) => (
  <Text style={styles.sectionHeader}>{label}</Text>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout, deleteAccount } = useAuthStore();
  const { showAlert } = useUIStore();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification states derived from user profile
  const [orderUpdates, setOrderUpdates] = useState(user?.notificationPreferences?.orderUpdates !== false);
  const [weeklyReminders, setWeeklyReminders] = useState(user?.notificationPreferences?.weeklyReminders !== false);
  const [promotions, setPromotions] = useState(user?.notificationPreferences?.promotions !== false);

  // Update preferences state if user object updates
  React.useEffect(() => {
    if (user) {
      setOrderUpdates(user.notificationPreferences?.orderUpdates !== false);
      setWeeklyReminders(user.notificationPreferences?.weeklyReminders !== false);
      setPromotions(user.notificationPreferences?.promotions !== false);
    }
  }, [user]);

  const handleTogglePreference = async (key: string, value: boolean) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [`notificationPreferences.${key}`]: value
      });
      
      // Update local Zustand auth store user object
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        authStore.setUser({
          ...authStore.user,
          notificationPreferences: {
            ...(authStore.user.notificationPreferences || { orderUpdates: true, weeklyReminders: true, promotions: true }),
            [key]: value
          }
        });
      }
    } catch (err) {
      console.error(`Failed to update notification preference ${key}:`, err);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const handleLogout = () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: executeLogout },
      ],
    });
  };

  const executeLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      (navigation as any).reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: 'Delete Account',
      message: 'This action is permanent and cannot be undone.',
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: executeDeleteAccount },
      ],
    });
  };

  const executeDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        showAlert({
          title: 'Authentication Required',
          message: 'Please logout and login again before deleting your account.',
          type: 'info',
          buttons: [{ text: 'OK', onPress: executeLogout }],
        });
      } else {
        showAlert({ title: 'Error', message: 'Failed to delete account.', type: 'error' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F5F3FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        <View style={[styles.centered, { paddingTop: insets.top + 80 }]}>
          <MapPin size={64} color="#D8B4FE" strokeWidth={1} />
          <Text style={styles.emptyTitle}>Create an Account</Text>
          <Text style={styles.emptySubtext}>Save addresses and access your order history</Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => (navigation as any).navigate('PhoneLogin', { returnTo: 'Profile' })}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const creditsCount = user.credits || 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        {/* ─── Hero Banner ─── */}
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          {/* Ambient orbs */}
          <View style={[styles.orb, styles.orb1]} />
          <View style={[styles.orb, styles.orb2]} />
          <View style={[styles.orb, styles.orb3]} />

          {/* Avatar */}
          <MotiView
            from={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 16 }}
            style={styles.avatarOuter}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
          </MotiView>

          {/* Name + Email */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100, type: 'timing', duration: 300 }}
          >
            <Text style={styles.heroName}>{user.name || 'User'}</Text>
            {user.email ? (
              <Text style={styles.heroEmail}>{user.email}</Text>
            ) : null}
          </MotiView>

          {/* Edit Profile pill */}
          <TouchableOpacity
            style={styles.editPill}
            onPress={() => (navigation as any).navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Pencil size={14} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.editPillText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ─── White Sheet Overlay ─── */}
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 40) + 80 }]}>
          {/* Account */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 150, type: 'timing', duration: 300 }}
          >
            <SECTION_HEADER label="Account" />
            <View style={styles.menuCard}>
              <MenuRow icon={User} label="Personal Info" onPress={() => (navigation as any).navigate('EditProfile')} />
              <View style={styles.menuDivider} />
              <MenuRow icon={MapPin} label="My Addresses" onPress={() => (navigation as any).navigate('AddressList')} />
            </View>
          </MotiView>

          {/* Orders & Credits */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200, type: 'timing', duration: 300 }}
          >
            <SECTION_HEADER label="Orders & Credits" />
            <View style={styles.menuCard}>
              <MenuRow
                icon={ShoppingBag}
                label="My Orders"
                onPress={() => (navigation as any).navigate('MyOrders')}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                icon={Wallet}
                label="SpinZo Credits"
                iconBg="rgba(16,185,129,0.08)"
                iconColor="#059669"
                rightElement={
                  <View style={styles.creditPill}>
                    <Text style={styles.creditPillText}>{creditsCount} pts</Text>
                  </View>
                }
              />
            </View>
          </MotiView>

          {/* Preferences */}
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 250, type: 'timing', duration: 300 }}
          >
            <SECTION_HEADER label="Preferences" />
            <View style={styles.menuCard}>
              <View style={styles.preferenceRow}>
                <View style={styles.prefTextContainer}>
                  <Text style={styles.prefLabel}>Order Status Updates</Text>
                  <Text style={styles.prefSubtext}>Alerts when your laundry is picked up, ready, or delivered</Text>
                </View>
                <Switch
                  value={orderUpdates}
                  onValueChange={(val) => {
                    setOrderUpdates(val);
                    handleTogglePreference('orderUpdates', val);
                  }}
                  trackColor={{ false: '#E4E4E7', true: '#C084FC' }}
                  thumbColor={orderUpdates ? '#7C3AED' : '#F4F4F5'}
                />
              </View>
              <View style={styles.menuDivider} />
              
              <View style={styles.preferenceRow}>
                <View style={styles.prefTextContainer}>
                  <Text style={styles.prefLabel}>Weekly Reminders</Text>
                  <Text style={styles.prefSubtext}>A friendly nudge on Thursdays to schedule laundry for the weekend</Text>
                </View>
                <Switch
                  value={weeklyReminders}
                  onValueChange={(val) => {
                    setWeeklyReminders(val);
                    handleTogglePreference('weeklyReminders', val);
                  }}
                  trackColor={{ false: '#E4E4E7', true: '#C084FC' }}
                  thumbColor={weeklyReminders ? '#7C3AED' : '#F4F4F5'}
                />
              </View>
              <View style={styles.menuDivider} />

              <View style={styles.preferenceRow}>
                <View style={styles.prefTextContainer}>
                  <Text style={styles.prefLabel}>Promotions & Offers</Text>
                  <Text style={styles.prefSubtext}>Discount notifications, win-back deals, and credit updates</Text>
                </View>
                <Switch
                  value={promotions}
                  onValueChange={(val) => {
                    setPromotions(val);
                    handleTogglePreference('promotions', val);
                  }}
                  trackColor={{ false: '#E4E4E7', true: '#C084FC' }}
                  thumbColor={promotions ? '#7C3AED' : '#F4F4F5'}
                />
              </View>
              <View style={styles.menuDivider} />

              <MenuRow
                icon={Globe}
                label="Language"
                iconBg="rgba(59,130,246,0.08)"
                iconColor="#3B82F6"
                rightElement={<Text style={styles.menuHint}>English</Text>}
              />
            </View>
          </MotiView>

          {/* Support */}
          <MotiView
            from={{ opacity: 0, translateY: 28 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300, type: 'timing', duration: 300 }}
          >
            <SECTION_HEADER label="Support" />
            <View style={styles.menuCard}>
              <MenuRow icon={HelpCircle} label="Help & FAQ" onPress={() => (navigation as any).navigate('HelpSupport')} />
              <View style={styles.menuDivider} />
              <MenuRow icon={MessageCircle} label="Contact Us" onPress={() => (navigation as any).navigate('HelpSupport')} />
              <View style={styles.menuDivider} />
              <MenuRow
                icon={Star}
                label="Rate the App"
                iconBg="rgba(250,204,21,0.08)"
                iconColor="#EAB308"
                rightElement={renderStars()}
                onPress={() => {
                  const url = Platform.OS === 'ios'
                    ? 'https://apps.apple.com/in/app/spinzo-get-laundry-in-hours/id6758751814'
                    : 'https://play.google.com/store/apps/details?id=com.nischayk3.Spinit&pcampaignid=web_share';
                  Linking.openURL(url).catch(() => {});
                }}
              />
            </View>
          </MotiView>

          {/* Legal */}
          <MotiView
            from={{ opacity: 0, translateY: 32 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 350, type: 'timing', duration: 300 }}
          >
            <SECTION_HEADER label="Legal" />
            <View style={styles.menuCard}>
              <MenuRow
                icon={Shield}
                label="Privacy Policy"
                iconBg="rgba(139,92,246,0.08)"
                iconColor="#8B5CF6"
                onPress={() => Linking.openURL('https://spinzo.in/privacy').catch(() => {})}
              />
            </View>
          </MotiView>

          {/* Admin Dashboard */}
          {['9661802634', '9852030638', '9108558715'].some(p =>
            user.phone && user.phone.indexOf(p) !== -1
          ) && (
            <MotiView
              from={{ opacity: 0, translateY: 36 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 380, type: 'timing', duration: 300 }}
            >
              <SECTION_HEADER label="Admin" />
              <View style={styles.menuCard}>
                <MenuRow
                  icon={Shield}
                  label="Admin Dashboard"
                  iconColor="#7C3AED"
                  onPress={() => (navigation as any).navigate('AdminLogin')}
                />
              </View>
            </MotiView>
          )}

          {/* Logout */}
          <MotiView
            from={{ opacity: 0, translateY: 40 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 400, type: 'timing', duration: 300 }}
          >
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <LogOut size={18} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.logoutBtnText}>Log Out</Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>

          {/* Delete Account */}
          <MotiView
            from={{ opacity: 0, translateY: 44 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 420, type: 'timing', duration: 300 }}
          >
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.logoutBtnText}>Delete Account</Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>

          {/* Version */}
          <Text style={styles.versionLabel}>SpinZo v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

function renderStars() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} color="#EAB308" fill="#EAB308" strokeWidth={1.5} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  scroll: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  // ─── Hero ───
  hero: {
    backgroundColor: '#7C3AED',
    paddingBottom: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    top: -40,
    left: -20,
    width: 140,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  orb2: {
    top: 30,
    right: -30,
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orb3: {
    bottom: -20,
    left: 60,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 8,
    marginBottom: 12,
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 26,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#7C3AED',
  },
  heroName: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroEmail: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 2,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  editPillText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: '#FFFFFF',
  },
  // ─── Sheet ───
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 24,
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 8,
  },
  // ─── Section Header ───
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  // ─── Menu Card ───
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
  },
  menuHint: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    marginRight: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
  },
  creditPill: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  creditPillText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  // ─── Logout ───
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: '#FFFFFF',
    marginTop: 24,
  },
  logoutBtnText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#EF4444',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    backgroundColor: '#FEF2F2',
    marginTop: 10,
  },
  versionLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  // ─── Empty state ───
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: '#09090B',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  signInBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  prefTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  prefLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
    marginBottom: 2,
  },
  prefSubtext: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#71717A',
    lineHeight: 16,
  },
});
