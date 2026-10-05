import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAppContext } from '../src/context/AppContext';

export default function SplashScreen() {
  const router = useRouter();
  const { token } = useAppContext();

  useEffect(() => {
    if (token) {
      router.replace('/(tabs)');
      return;
    }

    router.replace('/login');
  }, [token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
      <ActivityIndicator size="large" color="#60a5fa" />
    </View>
  );
}
