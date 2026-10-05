import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAppContext } from '../src/context/AppContext';
import { apiFetch } from '../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAppContext();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      await setToken(result.token);
      await setUser(result.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container as any}>
      <ScrollView contentContainerStyle={styles.scroll as any}>
        <View style={styles.card as any}>
          <Text style={styles.title as any}>Create Account</Text>
          <TextInput placeholder="Name" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} style={styles.input as any} />
          <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(value) => setForm({ ...form, email: value })} style={styles.input as any} />
          <TextInput placeholder="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={(value) => setForm({ ...form, phone: value })} style={styles.input as any} />
          <TextInput placeholder="Password" secureTextEntry value={form.password} onChangeText={(value) => setForm({ ...form, password: value })} style={styles.input as any} />
          <TextInput placeholder="Confirm Password" secureTextEntry value={form.confirmPassword} onChangeText={(value) => setForm({ ...form, confirmPassword: value })} style={styles.input as any} />

          {error ? <Text style={styles.error as any}>{error}</Text> : null}

          <Pressable style={styles.primaryButton as any} onPress={handleRegister} disabled={loading}>
            <Text style={styles.primaryButtonText as any}>{loading ? 'Creating...' : 'Create account'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles: any = {
  container: { flex: 1, backgroundColor: '#0b1220' },
  scroll: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  card: { backgroundColor: '#121c2d', borderRadius: 24, padding: 24 },
  title: { color: '#e5edf8', fontSize: 30, fontWeight: '700', marginBottom: 18 },
  input: { backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 14, color: '#e5edf8', marginBottom: 12 },
  primaryButton: { backgroundColor: '#60a5fa', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#08111d', fontWeight: '700' },
  error: { color: '#fca5a5', marginBottom: 8 },
};
