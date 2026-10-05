import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { apiFetch } from '../../src/services/api';

export default function VehiclesScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => apiFetch<any>('/vehicles'),
  });

  if (isLoading) {
    return <View style={styles.center as any}><ActivityIndicator size="large" color="#60a5fa" /></View>;
  }

  const vehicles = data?.vehicles ?? [];

  return (
    <ScrollView style={styles.container as any} contentContainerStyle={styles.content as any}>
      <Text style={styles.title as any}>Vehicles</Text>
      {error ? <Text style={styles.error as any}>{error instanceof Error ? error.message : 'Unable to load vehicles'}</Text> : null}
      {vehicles.length === 0 ? <Text style={styles.empty as any}>No vehicle yet</Text> : vehicles.map((vehicle: any) => (
        <View key={vehicle.id} style={styles.card as any}>
          <Text style={styles.name as any}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.meta as any}>{vehicle.year} • {vehicle.type}</Text>
          <Text style={styles.meta as any}>Mileage: {vehicle.mileage} km</Text>
        </View>
      ))}
      <Pressable style={styles.primaryButton as any}>
        <Text style={styles.primaryButtonText as any}>Add Vehicle</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles: any = {
  container: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 20, paddingTop: 50 },
  center: { flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#e5edf8', fontSize: 28, fontWeight: '700', marginBottom: 18 },
  card: { backgroundColor: '#121c2d', borderRadius: 20, padding: 18, marginBottom: 12 },
  name: { color: '#e5edf8', fontSize: 20, fontWeight: '700' },
  meta: { color: '#9aa8bb', marginTop: 6 },
  empty: { color: '#9aa8bb' },
  primaryButton: { marginTop: 18, backgroundColor: '#60a5fa', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#08111d', fontWeight: '700' },
  error: { color: '#fca5a5', marginBottom: 10 },
};
