import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useAppContext } from '../../src/context/AppContext';
import { apiFetch } from '../../src/services/api';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token } = useAppContext();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => apiFetch<any>('/dashboard'),
    enabled: !!token,
  });

  if (!token) {
    router.replace('/login');
    return null;
  }

  if (isLoading) {
    return <View style={styles.center as any}><ActivityIndicator size="large" color="#60a5fa" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center as any}>
        <Text style={styles.error as any}>{error instanceof Error ? error.message : 'Unable to load dashboard'}</Text>
        <Pressable onPress={() => refetch()} style={styles.retry as any}><Text style={styles.retryText as any}>Retry</Text></Pressable>
      </View>
    );
  }

  const dashboard = data?.data ?? data ?? {};
  const name = user?.name ?? dashboard.user?.name ?? 'Driver';
  const vehicle = dashboard.primaryVehicle ?? null;

  return (
    <ScrollView style={styles.container as any} contentContainerStyle={styles.content as any}>
      <View style={styles.headerRow as any}>
        <View>
          <Text style={styles.greeting as any}>Good day,</Text>
          <Text style={styles.name as any}>{name}</Text>
        </View>
        <Pressable style={styles.iconButton as any}>
          <Text style={styles.iconText as any}>🔔</Text>
        </Pressable>
      </View>

      <View style={styles.card as any}>
        <Text style={styles.cardLabel as any}>Primary vehicle</Text>
        {vehicle ? (
          <>
            <Text style={styles.vehicleName as any}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={styles.vehicleMeta as any}>{vehicle.year} • {vehicle.mileage} km</Text>
            <Text style={styles.score as any}>Health: {dashboard.healthScore ?? 92}%</Text>
          </>
        ) : (
          <>
            <Text style={styles.emptyText as any}>No vehicle yet</Text>
            <Pressable style={styles.primaryButton as any} onPress={() => router.push('/(tabs)/vehicles')}>
              <Text style={styles.primaryButtonText as any}>Add Vehicle</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card as any}>
        <Text style={styles.sectionTitle as any}>Upcoming maintenance</Text>
        {dashboard.upcomingMaintenance?.length ? (
          dashboard.upcomingMaintenance.slice(0, 2).map((item: any) => (
            <View key={item.id} style={styles.listItem as any}>
              <Text style={styles.listTitle as any}>{item.title}</Text>
              <Text style={styles.listMeta as any}>{item.category} • {item.service_date}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText as any}>No maintenance records yet.</Text>
        )}
      </View>

      <View style={styles.card as any}>
        <Text style={styles.sectionTitle as any}>Recent expenses</Text>
        {dashboard.recentExpenses?.length ? (
          dashboard.recentExpenses.slice(0, 2).map((item: any) => (
            <View key={item.id} style={styles.listItem as any}>
              <Text style={styles.listTitle as any}>{item.title}</Text>
              <Text style={styles.listMeta as any}>SAR {item.amount}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText as any}>No expenses yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles: any = {
  container: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 20, paddingTop: 50 },
  center: { flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: '#9aa8bb', fontSize: 16 },
  name: { color: '#e5edf8', fontSize: 28, fontWeight: '700' },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#121c2d', justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18 },
  card: { backgroundColor: '#121c2d', borderRadius: 20, padding: 18, marginBottom: 16 },
  cardLabel: { color: '#9aa8bb', fontSize: 13, marginBottom: 8 },
  vehicleName: { color: '#e5edf8', fontSize: 24, fontWeight: '700' },
  vehicleMeta: { color: '#9aa8bb', marginTop: 6 },
  score: { marginTop: 8, color: '#60a5fa', fontWeight: '700' },
  sectionTitle: { color: '#e5edf8', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  listItem: { paddingVertical: 8 },
  listTitle: { color: '#e5edf8', fontSize: 16 },
  listMeta: { color: '#9aa8bb', fontSize: 13 },
  emptyText: { color: '#9aa8bb' },
  primaryButton: { backgroundColor: '#60a5fa', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 12 },
  primaryButtonText: { color: '#08111d', fontWeight: '700' },
  retry: { marginTop: 12, backgroundColor: '#60a5fa', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18 },
  retryText: { color: '#08111d', fontWeight: '700' },
  error: { color: '#fca5a5', marginBottom: 12 },
};
