import { Text, View } from 'react-native';

export default function MaintenanceScreen() {
  return (
    <View style={styles.container as any}>
      <Text style={styles.title as any}>Maintenance</Text>
      <Text style={styles.empty as any}>You haven’t added any maintenance records yet.</Text>
    </View>
  );
}

const styles: any = {
  container: { flex: 1, backgroundColor: '#0b1220', padding: 20, justifyContent: 'center' },
  title: { color: '#e5edf8', fontSize: 28, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#9aa8bb', fontSize: 16 },
};
