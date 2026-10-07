import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import CockpitBottomNav from './src/components/CockpitBottomNav';
import AuthScreen from './src/screens/AuthScreen';
import AddVehicleScreen from './src/screens/AddVehicleScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import FuelScreen from './src/screens/FuelScreen';
import HomeScreen from './src/screens/HomeScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import ServiceHistoryScreen from './src/screens/ServiceHistoryScreen';
import TiresScreen from './src/screens/TiresScreen';
import VehicleDetailsScreen from './src/screens/VehicleDetailsScreen';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';

type AppStatus = 'loading' | 'signedIn' | 'signedOut';
type AppPage =
  | 'home'
  | 'addVehicle'
  | 'vehicleDetails'
  | 'maintenance'
  | 'fuel'
  | 'serviceHistory'
  | 'expenses'
  | 'tires'
  | 'documents';
type ThemeName = 'dark' | 'light';

const colors = {
  dark: { background: '#05070A', foreground: '#E9F1F4', accent: '#2EF2E2' },
  light: { background: '#E6EBEE', foreground: '#0A1218', accent: '#00C2B3' },
} satisfies Record<ThemeName, Record<string, string>>;

function logAuthError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`[Car Care] ${context}`, error);
  }
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const themeName: ThemeName = scheme === 'light' ? 'light' : 'dark';
  const theme = colors[themeName];
  const [status, setStatus] = useState<AppStatus>(
    isSupabaseConfigured ? 'loading' : 'signedOut',
  );
  const [page, setPage] = useState<AppPage>('home');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [homeNotice, setHomeNotice] = useState<string | null>(null);

  const retrySession = useCallback(async () => {
    if (!supabase) return;

    setSessionError(false);
    setStatus('loading');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setStatus(data.session?.user ? 'signedIn' : 'signedOut');
    } catch (error) {
      logAuthError('Unable to restore the Supabase session', error);
      setSessionError(true);
      setStatus('signedOut');
    }
  }, []);

  const dismissHomeNotice = useCallback(() => setHomeNotice(null), []);

  useEffect(() => {
    if (!supabase) {
      setStatus('signedOut');
      return;
    }

    let isMounted = true;
    let sawAuthEvent = false;

    const applySession = (session: Session | null, event?: AuthChangeEvent) => {
      if (isMounted) {
        setStatus(session?.user ? 'signedIn' : 'signedOut');
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setPage('home');
          setSelectedVehicleId(null);
          if (event === 'SIGNED_OUT') setHomeNotice(null);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      sawAuthEvent = true;
      setTimeout(() => applySession(session, event), 0);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!sawAuthEvent) applySession(data.session, 'INITIAL_SESSION');
      })
      .catch((error: unknown) => {
        logAuthError('Unable to restore the Supabase session', error);
        if (isMounted && !sawAuthEvent) {
          setSessionError(true);
          setStatus('signedOut');
        }
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const navTab: 'home' | 'garage' | 'service' =
    page === 'serviceHistory'
      ? 'service'
      : page === 'home' || page === 'vehicleDetails'
        ? 'garage'
        : 'home';

  const renderSignedInScreen = () => {
    if (page === 'addVehicle') {
      return (
        <AddVehicleScreen
          colorScheme={themeName}
          onCancel={() => setPage('home')}
          onAdded={(message) => {
            setHomeNotice(message);
            setPage('home');
          }}
        />
      );
    }

    if (page === 'vehicleDetails' && selectedVehicleId) {
      return (
        <VehicleDetailsScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('home')}
          onDeleted={() => setPage('home')}
          onOpenMaintenance={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setPage('maintenance');
          }}
          onOpenFuel={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setPage('fuel');
          }}
          onOpenServiceHistory={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setPage('serviceHistory');
          }}
          onOpenExpenses={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setPage('expenses');
          }}
          onOpenTires={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setPage('tires');
          }}
          onOpenDocuments={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setPage('documents');
          }}
        />
      );
    }

    if (page === 'maintenance' && selectedVehicleId) {
      return (
        <MaintenanceScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('vehicleDetails')}
        />
      );
    }

    if (page === 'fuel' && selectedVehicleId) {
      return (
        <FuelScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('vehicleDetails')}
        />
      );
    }

    if (page === 'serviceHistory' && selectedVehicleId) {
      return (
        <ServiceHistoryScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('vehicleDetails')}
        />
      );
    }

    if (page === 'expenses' && selectedVehicleId) {
      return (
        <ExpensesScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('vehicleDetails')}
        />
      );
    }

    if (page === 'tires' && selectedVehicleId) {
      return (
        <TiresScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('vehicleDetails')}
        />
      );
    }

    if (page === 'documents' && selectedVehicleId) {
      return (
        <DocumentsScreen
          vehicleId={selectedVehicleId}
          colorScheme={themeName}
          onBack={() => setPage('vehicleDetails')}
        />
      );
    }

    return (
      <HomeScreen
        colorScheme={themeName}
        onAddVehicle={() => setPage('addVehicle')}
        onSelectVehicle={(vehicleId) => {
          setSelectedVehicleId(vehicleId);
          setPage('vehicleDetails');
        }}
        notice={homeNotice}
        onDismissNotice={dismissHomeNotice}
      />
    );
  };

  return (
    <>
      <StatusBar style={themeName === 'light' ? 'dark' : 'light'} />
      {status === 'loading' ? (
        <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
          <View style={styles.logoMark}>
            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: theme.accent }]} />
            <View style={[styles.corner, styles.cornerTopRight, { borderColor: theme.accent }]} />
            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: theme.accent }]} />
            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: theme.accent }]} />
            <View style={[styles.logoBar, { backgroundColor: theme.accent }]} />
          </View>
          <Text style={[styles.loadingText, { color: theme.foreground }]}>Car Care</Text>
          <ActivityIndicator color={theme.accent} style={styles.spinner} />
        </View>
      ) : status === 'signedIn' ? (
        <View style={styles.appShell}>
          <View style={[styles.screenViewport, { paddingBottom: 90 + insets.bottom }]}>
            {renderSignedInScreen()}
          </View>
          <CockpitBottomNav
            activeTab={navTab}
            hasVehicle={Boolean(selectedVehicleId)}
            colorScheme={themeName}
            onHome={() => {
              setSelectedVehicleId(null);
              setPage('home');
            }}
            onGarage={() => {
              if (selectedVehicleId) {
                setPage('vehicleDetails');
              } else {
                setPage('home');
              }
            }}
            onService={() => {
              if (selectedVehicleId) {
                setPage('serviceHistory');
              }
            }}
          />
        </View>
      ) : (
        <AuthScreen
          colorScheme={themeName}
          sessionError={sessionError}
          onSessionRetry={() => void retrySession()}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1 },
  screenViewport: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 32, height: 32, position: 'relative' },
  corner: { position: 'absolute', width: 9, height: 9, borderWidth: 2 },
  cornerTopLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTopRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  logoBar: { position: 'absolute', left: 9, right: 9, top: 15, height: 2 },
  loadingText: { fontSize: 20, fontWeight: '700', marginTop: 15 },
  spinner: { marginTop: 24 },
});
