import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useAppContext } from '../src/context/AppContext';
import { apiFetch } from '../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAppContext();
  const [email, setEmail] = useState('demo@carcare.local');
  const [password, setPassword] = useState('Demo1234!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await apiFetch<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      await setToken(result.token);
      await setUser(result.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container as any}>
      <View style={styles.card as any}>
        <Text style={styles.title as any}>Car Care</Text>
        <Text style={styles.subtitle as any}>Welcome back</Text>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input as any}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input as any}
        />

        {error ? <Text style={styles.error as any}>{error}</Text> : null}

        <Pressable style={styles.primaryButton as any} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryButtonText as any}>{loading ? 'Signing in...' : 'Login'}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/register')}>
          <Text style={styles.link as any}>Create Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles: any = {
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    padding: 24,
  },
  card: {
    backgroundColor: '#121c2d',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#e5edf8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9aa8bb',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    color: '#e5edf8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#08111d',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#fca5a5',
    marginBottom: 8,
  },
  link: {
    marginTop: 18,
    textAlign: 'center',
    color: '#60a5fa',
    fontWeight: '600',
  },
};
