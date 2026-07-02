import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DownloadCloud } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface ForceUpdateScreenProps {
  currentVersion: string;
}

export const ForceUpdateScreen: React.FC<ForceUpdateScreenProps> = ({ currentVersion }) => {
  const insets = useSafeAreaInsets();

  const handleUpdate = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/app/id6758751814');
    } else {
      Linking.openURL('market://details?id=com.nischayk3.Spinit');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.centerBox}>
          <View style={styles.iconCircle}>
            <DownloadCloud size={48} color="#7C3AED" />
          </View>
          
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.subtitle}>
            We've made some major improvements to SpinZo. Please update to the latest version to continue using the app.
          </Text>
          
          <Text style={styles.versionText}>Your Version: {currentVersion}</Text>
        </View>

        <TouchableOpacity 
          style={styles.updateButton} 
          onPress={handleUpdate}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Update Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Outfit_800ExtraBold',
    color: '#1E1B4B',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  versionText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: '#94A3B8',
  },
  updateButton: {
    width: '100%',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
});
