import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandAlert } from './src/components/BrandAlert';

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
      <BrandAlert />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
