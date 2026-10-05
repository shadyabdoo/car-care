import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  const tabBarStyle = { backgroundColor: '#0b1220', borderTopColor: '#1f2a3b' } as any;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#60a5fa',
        tabBarStyle,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={18} color={color} /> }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Vehicles', tabBarIcon: ({ color }) => <FontAwesome5 name="car" size={18} color={color} /> }} />
      <Tabs.Screen name="maintenance" options={{ title: 'Maintenance', tabBarIcon: ({ color }) => <FontAwesome5 name="tools" size={18} color={color} /> }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses', tabBarIcon: ({ color }) => <FontAwesome5 name="wallet" size={18} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={18} color={color} /> }} />
    </Tabs>
  );
}
