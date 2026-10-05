import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = (Constants.expoConfig?.extra?.API_URL as string | undefined) ?? 'http://127.0.0.1:5000/api';

export async function getToken() {
  return SecureStore.getItemAsync('carcare_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Request failed');
  }

  return payload as T;
}
