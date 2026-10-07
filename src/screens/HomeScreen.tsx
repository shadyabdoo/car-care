import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CockpitBackdrop from '../components/CockpitBackdrop';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type ThemeName = 'dark' | 'light';
type VehicleType = 'car' | 'motorcycle';
type Vehicle = {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  mileage: number;
  image_path: string | null;
  imageUri: string | null;
};
type HomeStatus = 'loading' | 'ready' | 'signedOut' | 'error' | 'unconfigured';
type Copy = {
  greeting: string;
  headline: string;
  subtitle: string;
  add: string;
  garage: string;
  car: string;
  motorcycle: string;
  swipe: string;
  odometer: string;
  emptyTitle: string;
  emptyBody: string;
  addFirst: string;
  openDetails: string;
  loading: string;
  loadError: string;
  retry: string;
  signedOut: string;
  setupTitle: string;
  setupBody: string;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');

const copy: Record<'en' | 'ar', Copy> = {
  en: {
    greeting: 'YOUR GARAGE',
    headline: 'A better drive\nstarts here.',
    subtitle: 'Every vehicle, in one place.',
    add: 'Add vehicle',
    garage: 'MY GARAGE',
    car: 'Car',
    motorcycle: 'Motorcycle',
    swipe: 'SWIPE TO SEE ALL VEHICLES',
    odometer: 'ODOMETER',
    emptyTitle: 'Your garage is ready.',
    emptyBody: 'Add your first car or motorcycle to keep its details close at hand.',
    addFirst: 'Add your first vehicle',
    openDetails: 'Open vehicle details',
    loading: 'Connecting to your garage…',
    loadError: 'Unable to load your vehicles.',
    retry: 'Try again',
    signedOut: 'Sign in to your Car Care account to see your vehicles.',
    setupTitle: 'Connect your garage',
    setupBody: 'Add your Supabase URL and public key to the local .env file, then restart Expo.',
  },
  ar: {
    greeting: 'مرآبك',
    headline: 'رحلة أفضل\nتبدأ من هنا.',
    subtitle: 'كل مركباتك في مكان واحد.',
    add: 'إضافة مركبة',
    garage: 'مركباتي',
    car: 'سيارة',
    motorcycle: 'موتوسيكل',
    swipe: 'اسحب لاستعراض كل المركبات',
    odometer: 'عداد الكيلومترات',
    emptyTitle: 'مرآبك جاهز.',
    emptyBody: 'أضف أول سيارة أو موتوسيكل لتتابع بياناته بسهولة.',
    addFirst: 'أضف أول مركبة',
    openDetails: 'عرض تفاصيل المركبة',
    loading: 'جارٍ الاتصال بمرآبك…',
    loadError: 'تعذّر تحميل مركباتك.',
    retry: 'حاول مرة أخرى',
    signedOut: 'سجّل الدخول إلى حساب Car Care لعرض مركباتك.',
    setupTitle: 'اربط مرآبك',
    setupBody: 'أضف رابط Supabase والمفتاح العام إلى ملف .env ثم أعد تشغيل Expo.',
  },
};

const palette = {
  dark: {
    background: '#05070A',
    panel: '#0B1016',
    surface: 'rgba(255,255,255,0.045)',
    surfaceStrong: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.22)',
    foreground: '#E9F1F4',
    muted: '#8796A0',
    accent: '#2EF2E2',
    accentInk: '#021614',
    grid: 'rgba(255,255,255,0.035)',
    error: '#FF3355',
  },
  light: {
    background: '#E6EBEE',
    panel: '#F4F7F9',
    surface: 'rgba(255,255,255,0.72)',
    surfaceStrong: 'rgba(8,20,28,0.07)',
    border: 'rgba(8,20,28,0.1)',
    borderStrong: 'rgba(8,20,28,0.24)',
    foreground: '#0A1218',
    muted: '#4F5D66',
    accent: '#00C2B3',
    accentInk: '#00201D',
    grid: 'rgba(8,20,28,0.05)',
    error: '#D9143A',
  },
} satisfies Record<ThemeName, Record<string, string>>;

type Props = {
  colorScheme: ThemeName;
  onAddVehicle: () => void;
  onSelectVehicle: (vehicleId: string) => void;
  notice: string | null;
  onDismissNotice: () => void;
};

function logError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`[Car Care] ${context}`, error);
  }
}

function formatMileage(mileage: number) {
  return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(mileage);
}

function asVehicleType(value: string): VehicleType {
  return value === 'motorcycle' || value === 'bike' ? 'motorcycle' : 'car';
}

export default function HomeScreen({
  colorScheme,
  onAddVehicle,
  onSelectVehicle,
  notice,
  onDismissNotice,
}: Props) {
  const colors = palette[colorScheme];
  const strings = copy[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 350);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<HomeStatus>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  );
  const userIdRef = useRef<string | null>(null);
  const hasResolvedSessionRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadVehicles = useCallback(async (userId: string) => {
    const client = supabase;
    if (!client) return;

    const requestId = ++requestIdRef.current;
    setStatus('loading');

    try {
      const { data, error } = await client
        .from('vehicles')
        .select('id, type, make, model, year, mileage, image_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (requestId !== requestIdRef.current || userIdRef.current !== userId) return;

      const rows = data ?? [];
      const vehiclesWithImages = await Promise.all(
        rows.map(async (row) => {
          let imageUri: string | null = null;
          const imagePath = row.image_path;

          if (imagePath) {
            if (/^https?:\/\//i.test(imagePath)) {
              imageUri = imagePath;
            } else {
              const { data: signedImage, error: imageError } = await client.storage
                .from('vehicle-images')
                .createSignedUrl(imagePath, 60 * 60);

              if (imageError) {
                logError(`Unable to load image for vehicle ${row.id}`, imageError);
              } else {
                imageUri = signedImage.signedUrl;
              }
            }
          }

          return {
            id: row.id,
            type: asVehicleType(row.type),
            make: row.make,
            model: row.model,
            year: row.year,
            mileage: Number(row.mileage),
            image_path: imagePath,
            imageUri,
          };
        }),
      );

      if (requestId !== requestIdRef.current || userIdRef.current !== userId) return;
      setVehicles(vehiclesWithImages);
      setStatus('ready');
    } catch (error) {
      logError('Unable to load the authenticated user’s vehicles', error);
      if (requestId !== requestIdRef.current || userIdRef.current !== userId) return;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    let isMounted = true;
    const applyUser = (nextUser: User | null) => {
      if (!isMounted) return;
      if (
        hasResolvedSessionRef.current &&
        userIdRef.current === (nextUser?.id ?? null)
      ) {
        return;
      }

      hasResolvedSessionRef.current = true;
      requestIdRef.current += 1;
      userIdRef.current = nextUser?.id ?? null;
      setVehicles([]);

      if (nextUser) {
        void loadVehicles(nextUser.id);
      } else {
        setStatus('signedOut');
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setTimeout(() => applyUser(nextUser), 0);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        applyUser(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        logError('Unable to restore the Supabase session', error);
        if (isMounted) setStatus('error');
      });

    return () => {
      isMounted = false;
      requestIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [loadVehicles]);

  const retry = useCallback(async () => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    if (userIdRef.current) {
      await loadVehicles(userIdRef.current);
      return;
    }

    setStatus('loading');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session?.user) {
        hasResolvedSessionRef.current = true;
        userIdRef.current = data.session.user.id;
        await loadVehicles(data.session.user.id);
      } else {
        hasResolvedSessionRef.current = true;
        userIdRef.current = null;
        setStatus('signedOut');
      }
    } catch (error) {
      logError('Unable to restore the Supabase session', error);
      setStatus('error');
    }
  }, [loadVehicles]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onDismissNotice, 3200);
    return () => clearTimeout(timer);
  }, [notice, onDismissNotice]);

  const stylesheet = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={stylesheet.safeArea} edges={['top', 'left', 'right']}>
      <CockpitBackdrop colors={colors} />
      <ScrollView
        contentContainerStyle={stylesheet.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[stylesheet.header, isArabic && styles.rowReverse]}>
          <View style={[stylesheet.brand, isArabic && styles.rowReverse]}>
            <View style={stylesheet.logoMark}>
              <View style={[stylesheet.corner, stylesheet.cornerTopLeft]} />
              <View style={[stylesheet.corner, stylesheet.cornerTopRight]} />
              <View style={[stylesheet.corner, stylesheet.cornerBottomLeft]} />
              <View style={[stylesheet.corner, stylesheet.cornerBottomRight]} />
              <View style={stylesheet.logoBar} />
            </View>
            <Text style={[stylesheet.brandName, { writingDirection: direction }]}>Car Care</Text>
          </View>
          {status === 'ready' && (
            <Pressable
              accessibilityRole="button"
              onPress={onAddVehicle}
              style={[stylesheet.addButton, isArabic && styles.rowReverse]}
            >
              <Text style={stylesheet.addButtonPlus}>+</Text>
              <Text style={stylesheet.addButtonText}>{strings.add}</Text>
            </Pressable>
          )}
        </View>

        <Text style={[stylesheet.eyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>
          {strings.greeting}
        </Text>
        <Text style={[stylesheet.headline, { textAlign: isArabic ? 'right' : 'left', writingDirection: direction }]}>
          {strings.headline}
        </Text>
        <Text style={[stylesheet.subtitle, { textAlign: isArabic ? 'right' : 'left', writingDirection: direction }]}>
          {strings.subtitle}
        </Text>

        {(status === 'loading' || status === 'unconfigured') && (
          <StatePanel
            colors={colors}
            styles={stylesheet}
            title={status === 'unconfigured' ? strings.setupTitle : strings.loading}
            body={status === 'unconfigured' ? strings.setupBody : undefined}
            loading={status === 'loading'}
          />
        )}

        {status === 'error' && (
          <StatePanel
            colors={colors}
            styles={stylesheet}
            title={strings.loadError}
            action={strings.retry}
            onAction={retry}
            isError
          />
        )}

        {status === 'signedOut' && (
          <StatePanel colors={colors} styles={stylesheet} title={strings.signedOut} />
        )}

        {status === 'ready' && vehicles.length === 0 && (
          <View style={stylesheet.emptyCard}>
            <View style={stylesheet.emptyIllustration}>
              <View style={stylesheet.emptyRing}>
                <Text style={stylesheet.emptyPlus}>+</Text>
              </View>
            </View>
            <Text style={[stylesheet.emptyTitle, { writingDirection: direction }]}>
              {strings.emptyTitle}
            </Text>
            <Text style={[stylesheet.emptyBody, { writingDirection: direction }]}>
              {strings.emptyBody}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onAddVehicle}
              style={[stylesheet.primaryButton, isArabic && styles.rowReverse]}
            >
              <Text style={stylesheet.primaryButtonText}>{strings.addFirst}</Text>
              <Text style={stylesheet.primaryButtonArrow}>{isArabic ? '←' : '→'}</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && vehicles.length > 0 && (
          <>
            <View style={[stylesheet.sectionHeader, isArabic && styles.rowReverse]}>
              <Text style={stylesheet.sectionTitle}>{strings.garage}</Text>
              <Text style={stylesheet.vehicleCount}>
                {formatMileage(vehicles.length).padStart(2, '0')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                stylesheet.vehicleList,
                isArabic && styles.rowReverse,
              ]}
              decelerationRate="fast"
              snapToInterval={cardWidth + 12}
            >
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  width={cardWidth}
                  styles={stylesheet}
                  isArabic={isArabic}
                  onPress={() => onSelectVehicle(vehicle.id)}
                  accessibilityLabel={strings.openDetails}
                />
              ))}
            </ScrollView>
            {vehicles.length > 1 && (
              <Text style={[stylesheet.swipeHint, { textAlign: isArabic ? 'right' : 'left' }]}>
                {strings.swipe}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {!!notice && (
        <Pressable
          accessibilityRole="alert"
          onPress={onDismissNotice}
          style={stylesheet.toast}
        >
          <Text style={[stylesheet.toastText, { writingDirection: direction }]}>
            {notice}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof makeStyles>;

function StatePanel({
  colors,
  styles: screenStyles,
  title,
  body,
  action,
  onAction,
  loading = false,
  isError = false,
}: {
  colors: ScreenColors;
  styles: ScreenStyles;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  loading?: boolean;
  isError?: boolean;
}) {
  return (
    <View style={screenStyles.stateCard}>
      {loading && <ActivityIndicator color={colors.accent} size="small" />}
      <Text
        style={[
          screenStyles.stateTitle,
          isError && { color: colors.error },
          { writingDirection: isArabic ? 'rtl' : 'ltr' },
        ]}
      >
        {title}
      </Text>
      {!!body && (
        <Text style={[screenStyles.stateBody, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {body}
        </Text>
      )}
      {!!action && onAction && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={screenStyles.stateAction}
        >
          <Text style={screenStyles.stateActionText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function VehicleCard({
  vehicle,
  width,
  styles: screenStyles,
  isArabic: arabic,
  onPress,
  accessibilityLabel,
}: {
  vehicle: Vehicle;
  width: number;
  styles: ScreenStyles;
  isArabic: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const strings = copy[arabic ? 'ar' : 'en'];
  const direction = arabic ? 'rtl' : 'ltr';
  const kind = vehicle.type === 'motorcycle' ? strings.motorcycle : strings.car;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${vehicle.make} ${vehicle.model}`}
      onPress={onPress}
      style={[screenStyles.vehicleCard, { width }]}
    >
      <View style={screenStyles.vehicleImageArea}>
        {vehicle.imageUri ? (
          <Image
            source={{ uri: vehicle.imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={`${vehicle.make} ${vehicle.model}`}
          />
        ) : (
          <View style={screenStyles.imageFallback}>
            <View style={screenStyles.fallbackHalo} />
            <Text style={screenStyles.fallbackYear}>{formatMileage(vehicle.year)}</Text>
            <Text style={screenStyles.fallbackType}>{kind}</Text>
            <View style={screenStyles.fallbackRule} />
          </View>
        )}
        <View style={[screenStyles.vehicleTag, arabic && styles.tagReverse]}>
          <Text style={screenStyles.vehicleTagText}>{strings.garage}</Text>
        </View>
        <View style={[screenStyles.typeTag, arabic && styles.tagReverse]}>
          <Text style={screenStyles.typeTagText}>{kind}</Text>
        </View>
      </View>
      <View style={[screenStyles.vehicleDetails, arabic && styles.rowReverse]}>
        <View style={screenStyles.vehicleNameBlock}>
          <Text
            numberOfLines={1}
            style={[screenStyles.vehicleName, { textAlign: arabic ? 'right' : 'left', writingDirection: direction }]}
          >
            {vehicle.make} {vehicle.model}
          </Text>
          <Text style={[screenStyles.vehicleYear, { textAlign: arabic ? 'right' : 'left' }]}>
            {vehicle.year} · {strings.odometer.toUpperCase()}
          </Text>
          <View style={[screenStyles.odometerRow, arabic && styles.rowReverse]}>
            <Text style={screenStyles.odometerValue}>{formatMileage(vehicle.mileage)}</Text>
            <Text style={screenStyles.odometerUnit}>KM</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: 'row-reverse' },
  tagReverse: { left: undefined, right: 12 },
});

function makeStyles(colors: ScreenColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
    header: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoMark: { width: 26, height: 26, position: 'relative' },
    corner: { position: 'absolute', width: 8, height: 8, borderColor: colors.accent },
    cornerTopLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
    cornerTopRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
    cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
    cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
    logoBar: {
      position: 'absolute',
      left: 8,
      right: 8,
      top: 12,
      height: 2,
      backgroundColor: colors.accent,
    },
    brandName: { color: colors.foreground, fontSize: 21, fontWeight: '700', letterSpacing: -0.6 },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 40,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
    },
    addButtonPlus: { color: colors.accent, fontSize: 20, lineHeight: 22, fontWeight: '400' },
    addButtonText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
    eyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2.4,
      marginTop: 23,
    },
    headline: {
      color: colors.foreground,
      fontSize: 34,
      lineHeight: 37,
      fontWeight: '700',
      letterSpacing: -1.1,
      marginTop: 10,
    },
    subtitle: { color: colors.muted, fontSize: 14, marginTop: 9 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 31,
      marginBottom: 13,
    },
    sectionTitle: { color: colors.foreground, fontSize: 12, fontWeight: '600', letterSpacing: 2 },
    vehicleCount: {
      color: colors.accent,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    vehicleList: { gap: 12, paddingBottom: 3 },
    toast: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 22,
      paddingVertical: 14,
      paddingHorizontal: 17,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.panel,
    },
    toastText: { color: colors.foreground, fontSize: 13, textAlign: 'center' },
    vehicleCard: {
      height: 258,
      borderRadius: 26,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panel,
    },
    vehicleImageArea: { height: 145, backgroundColor: colors.panel, overflow: 'hidden' },
    imageFallback: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.panel,
    },
    fallbackHalo: {
      position: 'absolute',
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: colors.accent,
      opacity: colorSchemeOpacity(colors) * 1.8,
    },
    fallbackYear: {
      color: colors.foreground,
      fontSize: 55,
      fontWeight: '300',
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
    },
    fallbackType: {
      color: colors.accent,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 2,
      marginTop: 7,
    },
    fallbackRule: { width: 40, height: 1, backgroundColor: colors.borderStrong, marginTop: 15 },
    vehicleTag: {
      position: 'absolute',
      top: 13,
      left: 13,
      borderRadius: 10,
      backgroundColor: 'rgba(5,7,10,0.72)',
      paddingHorizontal: 10,
      height: 27,
      justifyContent: 'center',
    },
    vehicleTagText: { color: '#E9F1F4', fontSize: 9, fontWeight: '600', letterSpacing: 1.3 },
    typeTag: {
      position: 'absolute',
      top: 13,
      right: 13,
      borderRadius: 10,
      backgroundColor: 'rgba(5,7,10,0.72)',
      paddingHorizontal: 10,
      height: 27,
      justifyContent: 'center',
    },
    typeTagText: { color: colors.accent, fontSize: 9, fontWeight: '600' },
    vehicleDetails: {
      flex: 1,
      minHeight: 86,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.panel,
    },
    vehicleNameBlock: { flex: 1, minWidth: 0 },
    vehicleName: { color: colors.foreground, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    vehicleYear: { color: colors.muted, fontSize: 10, marginTop: 5, letterSpacing: 1 },
    odometerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 4 },
    odometerValue: {
      color: colors.foreground,
      fontSize: 24,
      fontWeight: '300',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.3,
    },
    odometerUnit: { color: colors.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1.1 },
    swipeHint: { color: colors.muted, fontSize: 9, fontWeight: '600', letterSpacing: 1.4, marginTop: 12 },
    stateCard: {
      alignItems: 'center',
      padding: 24,
      marginTop: 28,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 12,
    },
    stateTitle: { color: colors.foreground, textAlign: 'center', fontSize: 16, fontWeight: '600' },
    stateBody: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
    stateAction: {
      paddingHorizontal: 18,
      paddingVertical: 11,
      marginTop: 2,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    stateActionText: { color: colors.accentInk, fontSize: 13, fontWeight: '700' },
    emptyCard: {
      alignItems: 'center',
      marginTop: 30,
      paddingHorizontal: 24,
      paddingTop: 27,
      paddingBottom: 24,
      borderRadius: 26,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },
    emptyIllustration: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      marginBottom: 21,
    },
    emptyRing: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    emptyPlus: { color: colors.accent, fontSize: 35, fontWeight: '300', marginTop: -3 },
    emptyTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    emptyBody: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 280,
    },
    primaryButton: {
      minHeight: 52,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 20,
      borderRadius: 17,
      backgroundColor: colors.accent,
    },
    primaryButtonText: { color: colors.accentInk, fontSize: 14, fontWeight: '700' },
    primaryButtonArrow: { color: colors.accentInk, fontSize: 19, fontWeight: '500' },
  });
}

function colorSchemeOpacity(colors: ScreenColors) {
  return colors.background === '#05070A' ? 0.055 : 0.09;
}
