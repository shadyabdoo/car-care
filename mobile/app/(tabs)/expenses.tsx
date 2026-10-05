import { Text, View } from 'react-native';

export default function ExpensesScreen() {
  return (
    <View style={styles.container as any}>
      <Text style={styles.title as any}>Expenses</Text>
      <Text style={styles.empty as any}>No expenses recorded for this vehicle yet.</Text>
    </View>
  );
}

const styles: any = {
  container: { flex: 1, backgroundColor: '#0b1220', padding: 20, justifyContent: 'center' },
  title: { color: '#e5edf8', fontSize: 28, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#9aa8bb', fontSize: 16 },
};
