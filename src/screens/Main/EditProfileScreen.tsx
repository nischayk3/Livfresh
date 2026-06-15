import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, ArrowRight, Camera, Mail, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useAuthStore, useUIStore } from '../../store';
import { updateUser } from '../../services/firestore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  const { showAlert } = useUIStore();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail((user as any).email || '');
    }
  }, [user]);

  const getInitials = (n: string) => {
    return n ? n.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : 'U';
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert({ title: 'Error', message: 'Name cannot be empty', type: 'error' });
      return;
    }
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      showAlert({ title: 'Invalid Email', message: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      if (user?.uid) {
        await updateUser(user.uid, { name, email });
        setUser({ ...user, name, email } as any);
        showAlert({
          title: 'Success',
          message: 'Profile updated successfully!',
          type: 'success',
          onClose: () => navigation.goBack(),
        });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showAlert({ title: 'Error', message: 'Failed to update profile. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={20} color="#09090B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <Text style={styles.headerSave}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 16 }}
            style={styles.avatarSection}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
            </View>
            {/* Camera badge — visual only; actual upload not implemented */}
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </MotiView>

          {/* Form Card */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100, type: 'timing', duration: 300 }}
            style={styles.formCard}
          >
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#A1A1AA"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputWithIcon}>
                <Mail size={16} color="#A1A1AA" strokeWidth={1.8} />
                <TextInput
                  style={styles.inputIconField}
                  placeholder="Enter your email"
                  placeholderTextColor="#A1A1AA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone (read-only) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={[styles.inputWithIcon, styles.inputDisabled]}>
                <Phone size={16} color="#A1A1AA" strokeWidth={1.8} />
                <TextInput
                  style={[styles.inputIconField, { color: '#71717A' }]}
                  value={user?.phone || ''}
                  editable={false}
                />
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={12} color="#059669" strokeWidth={2.5} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.helperText}>Phone number cannot be changed.</Text>
            </View>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Save Button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 200, type: 'timing', duration: 300 }}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    color: '#09090B',
    letterSpacing: -0.4,
  },
  headerSave: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#7C3AED',
  },
  // ─── Avatar ───
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 8,
  },
  avatarInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#7C3AED',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 16,
    right: '38%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  // ─── Form Card ───
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#09090B',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#09090B',
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  inputIconField: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#09090B',
    paddingVertical: 0,
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5,150,105,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#059669',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#A1A1AA',
    marginTop: 4,
    marginLeft: 2,
  },
  // ─── Bottom Bar ───
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245,243,255,0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
    elevation: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
});
