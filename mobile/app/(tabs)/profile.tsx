import { useAppContext } from '../../src/context/AppContext';
import { Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, setUser, setToken } = useAppContext();
  const router = useRouter();

  const handleLogout = async () => {
    await setToken(null);
    await setUser(null);
    router.replace('/login');
  };

  return (
    <View style={styles.container as any}>
      <Text style={styles.title as any}>Profile</Text>
      <Text style={styles.label as any}>Name</Text>
      <Text style={styles.value as any}>{user?.name ?? 'Guest'}</Text>
      <Text style={styles.label as any}>Email</Text>
      <Text style={styles.value as any}>{user?.email ?? '—'}</Text>
      <Text style={styles.label as any}>Phone</Text>
      <Text style={styles.value as any}>{user?.phone ?? '—'}</Text>

      <Pressable style={styles.button as any} onPress={handleLogout}>
        <Text style={styles.buttonText as any}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles: any = {
  container: { flex: 1, backgroundColor: '#0b1220', padding: 20, justifyContent: 'center' },
  title: { color: '#e5edf8', fontSize: 28, fontWeight: '700', marginBottom: 18 },
  label: { color: '#9aa8bb', marginTop: 12 },
  value: { color: '#e5edf8', fontSize: 18, marginTop: 4 },
  button: { marginTop: 24, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
};
