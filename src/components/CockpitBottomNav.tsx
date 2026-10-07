import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'home' | 'garage' | 'service';
type IconName = 'home' | 'garage' | 'service' | 'profile';
type HubAction = 'upload' | 'scan' | 'service' | 'voice';

type CockpitBottomNavProps = {
  activeTab: Tab;
  hasVehicle: boolean;
  colorScheme: 'dark' | 'light';
  onHome: () => void;
  onGarage: () => void;
  onService: () => void;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');

const labels = {
  en: {
    home: 'Home',
    garage: 'Garage',
    service: 'Service',
    profile: 'Profile',
    upload: 'Upload receipt',
    scan: 'Scan warning',
    log: 'Log service',
    voice: 'Ask by voice',
    add: 'Open action hub',
    close: 'Close action hub',
    comingSoon: 'Coming soon',
    noVehicle: 'Select a vehicle first',
  },
  ar: {
    home: 'الرئيسية',
    garage: 'المرآب',
    service: 'الخدمة',
    profile: 'الملف الشخصي',
    upload: 'رفع إيصال',
    scan: 'فحص تحذير',
    log: 'تسجيل صيانة',
    voice: 'اسأل صوتيًا',
    add: 'فتح قائمة الإجراءات',
    close: 'إغلاق قائمة الإجراءات',
    comingSoon: 'قريبًا',
    noVehicle: 'اختر مركبة أولًا',
  },
} as const;

const palette = {
  dark: {
    background: 'rgba(11, 16, 22, 0.98)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.22)',
    foreground: '#E9F1F4',
    muted: '#8796A0',
    accent: '#2EF2E2',
    accentInk: '#021614',
    activeGlow: 'rgba(46,242,226,0.11)',
    fabOuter: 'rgba(233,241,244,0.14)',
    toast: '#111B22',
  },
  light: {
    background: 'rgba(244, 247, 249, 0.98)',
    border: 'rgba(8,20,28,0.1)',
    borderStrong: 'rgba(8,20,28,0.24)',
    foreground: '#0A1218',
    muted: '#4F5D66',
    accent: '#00C2B3',
    accentInk: '#00201D',
    activeGlow: 'rgba(0,194,179,0.1)',
    fabOuter: 'rgba(8,20,28,0.08)',
    toast: '#F4F7F9',
  },
} as const;

const ACTIONS: HubAction[] = ['upload', 'scan', 'service', 'voice'];

export default function CockpitBottomNav({
  activeTab,
  hasVehicle,
  colorScheme,
  onHome,
  onGarage,
  onService,
}: CockpitBottomNavProps) {
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const copy = labels[isArabic ? 'ar' : 'en'];
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isHubVisible, setIsHubVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropProgress = useRef(new Animated.Value(0)).current;
  const fabProgress = useRef(new Animated.Value(0)).current;
  const actionProgress = useRef(ACTIONS.map(() => new Animated.Value(0))).current;
  const closeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const offsets = Math.min(60, Math.max(48, width * 0.155));

  const closeHub = useCallback(() => {
    if (!isHubVisible) return;
    setIsHubOpen(false);
    closeAnimationRef.current?.stop();
    const animations = actionProgress.map((progress) =>
      Animated.timing(progress, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    closeAnimationRef.current = Animated.parallel([
      Animated.stagger(28, animations.reverse()),
      Animated.timing(backdropProgress, {
        toValue: 0,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fabProgress, {
        toValue: 0,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    closeAnimationRef.current.start(({ finished }) => {
      if (finished) setIsHubVisible(false);
      closeAnimationRef.current = null;
    });
  }, [actionProgress, backdropProgress, fabProgress, isHubVisible]);

  const openHub = useCallback(() => {
    closeAnimationRef.current?.stop();
    setIsHubVisible(true);
    setIsHubOpen(true);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const handleHubAction = useCallback((action: HubAction) => {
    closeHub();
    if (action === 'service' && hasVehicle) {
      onService();
      return;
    }
    showToast(action === 'service' ? copy.noVehicle : copy.comingSoon);
  }, [closeHub, copy.comingSoon, copy.noVehicle, hasVehicle, onService, showToast]);

  useEffect(() => {
    if (!isHubOpen) return undefined;
    actionProgress.forEach((progress) => progress.setValue(0));
    backdropProgress.setValue(0);
    fabProgress.setValue(0);
    const stagger = Animated.stagger(
      55,
      actionProgress.map((progress) =>
        Animated.timing(progress, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );
    stagger.start();
    Animated.parallel([
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fabProgress, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    return () => stagger.stop();
  }, [actionProgress, backdropProgress, fabProgress, isHubOpen]);

  useEffect(() => {
    if (!isHubOpen) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeHub();
      return true;
    });
    return () => subscription.remove();
  }, [closeHub, isHubOpen]);

  useEffect(() => () => {
    closeAnimationRef.current?.stop();
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  const fabRotation = fabProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  const fabScale = fabProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {isHubVisible && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.hubBackdrop,
              { opacity: backdropProgress },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={closeHub}
            style={StyleSheet.absoluteFill}
          />
          {ACTIONS.map((action, index) => {
            const progress = actionProgress[index];
            const horizontalOffset =
              action === 'scan' ? -offsets : action === 'service' ? offsets : 0;
            const bottom =
              action === 'upload'
                ? insets.bottom + 330
                : action === 'scan' || action === 'service'
                  ? insets.bottom + 238
                  : insets.bottom + 146;
            const label =
              action === 'upload'
                ? copy.upload
                : action === 'scan'
                  ? copy.scan
                  : action === 'service'
                    ? copy.log
                    : copy.voice;
            const opacity = progress;
            const translateY = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            });
            const scale = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1],
            });
            return (
              <Animated.View
                key={action}
                pointerEvents={isHubOpen ? 'auto' : 'none'}
                style={[
                  styles.hubActionPosition,
                  {
                    left: '50%',
                    marginLeft: horizontalOffset - 45,
                    bottom,
                    opacity,
                    transform: [{ translateY }, { scale }],
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => handleHubAction(action)}
                  style={({ pressed }) => [
                    styles.hubAction,
                    { borderColor: colors.borderStrong, backgroundColor: colors.toast },
                    pressed && styles.hubActionPressed,
                  ]}
                >
                  <HubIcon action={action} colors={colors} />
                  <Text numberOfLines={2} style={[styles.hubActionLabel, { color: colors.foreground }]}>
                    {label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </>
      )}

      <View
        style={[
          styles.host,
          {
            height: 90 + insets.bottom,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.navBar}>
          <View style={styles.sideTabs}>
            <NavTab
              icon="home"
              label={copy.home}
              active={activeTab === 'home'}
              disabled={false}
              colors={colors}
              onPress={onHome}
            />
            <NavTab
              icon="garage"
              label={copy.garage}
              active={activeTab === 'garage'}
              disabled={false}
              colors={colors}
              onPress={onGarage}
            />
          </View>
          <View accessibilityElementsHidden style={styles.centerSlot} />
          <View style={styles.sideTabs}>
            <NavTab
              icon="service"
              label={copy.service}
              active={activeTab === 'service'}
              disabled={!hasVehicle}
              colors={colors}
              onPress={hasVehicle ? onService : onGarage}
            />
            <NavTab
              icon="profile"
              label={copy.profile}
              active={false}
              disabled
              colors={colors}
              onPress={() => undefined}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isHubOpen ? copy.close : copy.add}
          accessibilityState={{ expanded: isHubOpen }}
          onPress={isHubOpen ? closeHub : openHub}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <View
            style={[
              styles.fabOuterDiamond,
              { backgroundColor: colors.fabOuter, borderColor: colors.borderStrong },
            ]}
          />
          <View
            style={[
              styles.fabInnerDiamond,
              { backgroundColor: colors.accent, shadowColor: colors.accent },
            ]}
          />
          <Animated.View style={{ transform: [{ rotate: fabRotation }, { scale: fabScale }] }}>
            <View style={styles.plusIcon}>
              <View style={[styles.plusStroke, { backgroundColor: colors.accentInk }]} />
              <View style={[styles.plusStroke, styles.plusVertical, { backgroundColor: colors.accentInk }]} />
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {!!toastMessage && (
        <View
          accessibilityRole="alert"
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: 100 + insets.bottom,
              backgroundColor: colors.toast,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <View style={[styles.toastDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.toastText, { color: colors.foreground }]}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

function NavTab({
  icon,
  label,
  active,
  disabled,
  colors,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  disabled: boolean;
  colors: (typeof palette)[keyof typeof palette];
  onPress: () => void;
}) {
  const color = active ? colors.accent : colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active && { backgroundColor: colors.activeGlow },
        disabled && styles.tabButtonDisabled,
        pressed && styles.tabButtonPressed,
      ]}
    >
      <NavIcon icon={icon} color={color} />
      <Text style={[styles.tabLabel, { color: active ? colors.foreground : colors.muted }]}>
        {label}
      </Text>
      <View style={[styles.tabDot, { backgroundColor: active ? colors.accent : 'transparent' }]} />
    </Pressable>
  );
}

function NavIcon({ icon, color }: { icon: IconName; color: string }) {
  return (
    <View style={styles.iconBox}>
      {icon === 'home' && (
        <>
          <View style={[styles.homeRoofLeft, { borderColor: color }]} />
          <View style={[styles.homeRoofRight, { borderColor: color }]} />
          <View style={[styles.homeBody, { borderColor: color }]}>
            <View style={[styles.homeDoor, { backgroundColor: color }]} />
          </View>
        </>
      )}
      {icon === 'garage' && (
        <View style={[styles.garageFrame, { borderColor: color }]}>
          <View style={[styles.garageRoofLeft, { backgroundColor: color }]} />
          <View style={[styles.garageRoofRight, { backgroundColor: color }]} />
          <View style={[styles.garageDoorLine, { backgroundColor: color }]} />
          <View style={[styles.garageDoorLine, { backgroundColor: color }]} />
        </View>
      )}
      {icon === 'service' && (
        <View style={[styles.serviceGear, { borderColor: color }]}>
          <View style={[styles.serviceGearCore, { borderColor: color }]} />
          <View style={[styles.serviceGearTooth, styles.serviceGearToothTop, { backgroundColor: color }]} />
          <View style={[styles.serviceGearTooth, styles.serviceGearToothRight, { backgroundColor: color }]} />
          <View style={[styles.serviceGearTooth, styles.serviceGearToothBottom, { backgroundColor: color }]} />
          <View style={[styles.serviceGearTooth, styles.serviceGearToothLeft, { backgroundColor: color }]} />
        </View>
      )}
      {icon === 'profile' && (
        <>
          <View style={[styles.profileHead, { borderColor: color }]} />
          <View style={[styles.profileShoulders, { borderColor: color }]} />
        </>
      )}
    </View>
  );
}

function HubIcon({
  action,
  colors,
}: {
  action: HubAction;
  colors: (typeof palette)[keyof typeof palette];
}) {
  return (
    <View style={styles.hubIcon}>
      {action === 'upload' && (
        <>
          <View style={[styles.hubReceipt, { borderColor: colors.accent }]} />
          <View style={[styles.uploadArrowStem, { backgroundColor: colors.accent }]} />
          <View style={[styles.uploadArrowLeft, { borderColor: colors.accent }]} />
          <View style={[styles.uploadArrowRight, { borderColor: colors.accent }]} />
        </>
      )}
      {action === 'scan' && (
        <>
          <View style={[styles.hubWarning, { borderColor: colors.accent }]} />
          <View style={[styles.scanLine, { backgroundColor: colors.accent }]} />
        </>
      )}
      {action === 'service' && (
        <>
          <View style={[styles.hubWrenchRing, { borderColor: colors.accent }]} />
          <View style={[styles.hubWrenchHandle, { backgroundColor: colors.accent }]} />
        </>
      )}
      {action === 'voice' && (
        <>
          <View style={[styles.micBody, { borderColor: colors.accent }]} />
          <View style={[styles.micStem, { backgroundColor: colors.accent }]} />
          <View style={[styles.micBase, { borderColor: colors.accent }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 30 },
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    elevation: 12,
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sideTabs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  centerSlot: { width: 60, flexShrink: 0 },
  tabButton: {
    minWidth: 48,
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    gap: 4,
  },
  tabButtonDisabled: { opacity: 0.55 },
  tabButtonPressed: { transform: [{ scale: 0.94 }] },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  homeRoofLeft: { position: 'absolute', top: 3, left: 5, width: 10, height: 10, borderTopWidth: 1.6, borderLeftWidth: 1.6, transform: [{ rotate: '45deg' }] },
  homeRoofRight: { position: 'absolute', top: 3, right: 5, width: 10, height: 10, borderTopWidth: 1.6, borderRightWidth: 1.6, transform: [{ rotate: '-45deg' }] },
  homeBody: { position: 'absolute', left: 6, right: 6, bottom: 3, height: 12, borderWidth: 1.6, borderTopWidth: 0, alignItems: 'center' },
  homeDoor: { position: 'absolute', bottom: 0, width: 4, height: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  garageFrame: { width: 17, height: 18, borderWidth: 1.5, borderTopLeftRadius: 2, borderTopRightRadius: 2, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 3, gap: 3 },
  garageRoofLeft: { position: 'absolute', top: 3, left: 2, width: 8, height: 1.5, transform: [{ rotate: '-28deg' }] },
  garageRoofRight: { position: 'absolute', top: 3, right: 2, width: 8, height: 1.5, transform: [{ rotate: '28deg' }] },
  garageDoorLine: { width: 9, height: 1 },
  serviceGear: { width: 19, height: 19, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  serviceGearCore: { width: 6, height: 6, borderWidth: 1.2, borderRadius: 4 },
  serviceGearTooth: { position: 'absolute', width: 4, height: 2, borderRadius: 1 },
  serviceGearToothTop: { top: -2 },
  serviceGearToothRight: { right: -2, transform: [{ rotate: '90deg' }] },
  serviceGearToothBottom: { bottom: -2 },
  serviceGearToothLeft: { left: -2, transform: [{ rotate: '90deg' }] },
  profileHead: { position: 'absolute', top: 2, width: 8, height: 8, borderWidth: 1.5, borderRadius: 5 },
  profileShoulders: { position: 'absolute', bottom: 2, width: 17, height: 9, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  tabLabel: { maxWidth: '100%', fontSize: 9, lineHeight: 12, fontWeight: '500', textAlign: 'center' },
  tabDot: { position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: 2 },
  fab: { position: 'absolute', left: '50%', bottom: 44, width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginLeft: -38 },
  fabPressed: { transform: [{ scale: 0.94 }] },
  fabOuterDiamond: { position: 'absolute', top: 4, right: 4, bottom: 4, left: 4, borderRadius: 24, transform: [{ rotate: '45deg' }], borderWidth: 1 },
  fabInnerDiamond: { position: 'absolute', top: 11, right: 11, bottom: 11, left: 11, borderRadius: 19, transform: [{ rotate: '45deg' }], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.44, shadowRadius: 15, elevation: 14 },
  plusIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  plusStroke: { position: 'absolute', width: 17, height: 2, borderRadius: 1 },
  plusVertical: { transform: [{ rotate: '90deg' }] },
  hubBackdrop: { backgroundColor: 'rgba(2,5,8,0.54)' },
  hubActionPosition: { position: 'absolute', width: 90, alignItems: 'center' },
  hubAction: { width: 90, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5, paddingVertical: 8, borderWidth: 1, borderRadius: 18 },
  hubActionPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  hubIcon: { width: 24, height: 24, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  hubActionLabel: { minHeight: 24, fontSize: 9, lineHeight: 11, fontWeight: '600', textAlign: 'center' },
  hubReceipt: { position: 'absolute', left: 2, top: 3, width: 14, height: 18, borderWidth: 1.3, borderRadius: 2 },
  uploadArrowStem: { position: 'absolute', right: 2, top: 8, width: 1.5, height: 12 },
  uploadArrowLeft: { position: 'absolute', right: -1, top: 7, width: 6, height: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5, transform: [{ rotate: '45deg' }] },
  uploadArrowRight: { position: 'absolute', right: -1, top: 7, width: 6, height: 6, borderTopWidth: 1.5, borderRightWidth: 1.5, transform: [{ rotate: '-45deg' }] },
  hubWarning: { width: 18, height: 18, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, transform: [{ rotate: '45deg' }] },
  scanLine: { position: 'absolute', width: 12, height: 1.5, top: 12, opacity: 0.9 },
  hubWrenchRing: { position: 'absolute', top: 2, right: 1, width: 12, height: 12, borderWidth: 1.5, borderRadius: 7 },
  hubWrenchHandle: { position: 'absolute', left: 5, bottom: 1, width: 3, height: 14, borderRadius: 2, transform: [{ rotate: '42deg' }] },
  micBody: { position: 'absolute', top: 1, width: 9, height: 15, borderWidth: 1.5, borderRadius: 5 },
  micStem: { position: 'absolute', top: 14, width: 1.5, height: 5 },
  micBase: { position: 'absolute', bottom: 1, width: 15, height: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  toast: { position: 'absolute', alignSelf: 'center', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, borderWidth: 1, borderRadius: 15 },
  toastDot: { width: 6, height: 6, borderRadius: 3 },
  toastText: { fontSize: 11, fontWeight: '600' },
});
