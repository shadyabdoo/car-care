import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { User } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';

import CockpitBackdrop from '../components/CockpitBackdrop';
import { supabase } from '../lib/supabase';

type ThemeName = 'dark' | 'light';
type FuelType = 'gasoline_92' | 'gasoline_95' | 'gasoline_80' | 'diesel' | 'other';
type FuelRecord = {
  id: string;
  vehicle_id: string;
  user_id: string;
  date: string;
  odometer_km: number;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  fuel_type: FuelType;
  station: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type Vehicle = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  mileage: number;
};
type ScreenStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'signedOut' | 'unconfigured';
type FuelDraft = {
  date: string;
  odometer: string;
  liters: string;
  pricePerLiter: string;
  fuelType: FuelType;
  station: string;
  notes: string;
};
type Copy = { [Key in keyof typeof copy.en]: string };
type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof makeStyles>;
type FieldKey = keyof FuelDraft;
type Props = {
  vehicleId: string;
  colorScheme: ThemeName;
  onBack: () => void;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');
const recordColumns =
  'id, vehicle_id, user_id, date, odometer_km, liters, price_per_liter, total_cost, fuel_type, station, notes, created_at, updated_at';

const fuelTypes: FuelType[] = [
  'gasoline_92',
  'gasoline_95',
  'gasoline_80',
  'diesel',
  'other',
];

const copy = {
  en: {
    back: 'Back',
    section: 'FUEL LOG',
    title: 'Fuel',
    odometer: 'CURRENT ODOMETER',
    records: 'REFUELLING RECORDS',
    totalCost: 'TOTAL FUEL COST',
    totalLiters: 'TOTAL LITRES',
    averagePrice: 'AVG. PRICE / L',
    latestOdometer: 'LATEST ODOMETER',
    history: 'FILL-UP HISTORY',
    addFuel: 'ADD FUEL',
    emptyTitle: 'NO REFUELLING RECORDS',
    emptyBody: 'Your fuel log is clear. Record a fill-up to start tracking cost and consumption.',
    addFirst: 'ADD FIRST FILL-UP',
    loading: 'Loading fuel records…',
    loadError: 'Unable to load fuel records.',
    retry: 'TRY AGAIN',
    signedOut: 'Sign in again to view this fuel log.',
    notFound: 'This vehicle is unavailable or no longer in your garage.',
    unconfigured: 'Connect Supabase to view fuel records.',
    date: 'DATE',
    odometerField: 'ODOMETER',
    liters: 'LITRES',
    pricePerLiter: 'PRICE / LITRE',
    total: 'TOTAL',
    fuelType: 'FUEL TYPE',
    station: 'STATION',
    noStation: 'STATION NOT RECORDED',
    notes: 'NOTES',
    optional: 'OPTIONAL',
    datePlaceholder: 'YYYY-MM-DD',
    odometerPlaceholder: 'Kilometres',
    litersPlaceholder: '0.000',
    pricePlaceholder: '0.0000',
    stationPlaceholder: 'Fuel station',
    notesPlaceholder: 'Additional details',
    gasoline92: 'Gasoline 92',
    gasoline95: 'Gasoline 95',
    gasoline80: 'Gasoline 80',
    diesel: 'Diesel',
    other: 'Other',
    edit: 'Edit',
    delete: 'Delete',
    addTitle: 'NEW FILL-UP',
    editTitle: 'EDIT FILL-UP',
    save: 'SAVE FUEL RECORD',
    saveChanges: 'SAVE CHANGES',
    cancel: 'CANCEL',
    invalidDate: 'Enter a valid date as YYYY-MM-DD.',
    invalidOdometer: 'Enter a valid non-negative odometer reading.',
    invalidLiters: 'Litres must be greater than zero.',
    invalidLitersPrecision: 'Enter up to three decimal places for litres.',
    invalidPrice: 'Price per litre must be greater than zero.',
    invalidPricePrecision: 'Enter up to four decimal places for price per litre.',
    invalidTotal: 'Calculated total exceeds the supported amount.',
    invalidFuelType: 'Choose a fuel type.',
    saveError: 'Unable to save this fuel record. Please try again.',
    saved: 'Fuel record saved.',
    updated: 'Fuel record updated.',
    refreshError: 'Saved, but the fuel log could not refresh. Try again.',
    deleteRefreshError: 'Deleted, but the fuel log could not refresh. Try again.',
    deleteTitle: 'DELETE FUEL RECORD?',
    deleteBody: 'This refuelling record will be permanently removed.',
    confirmDelete: 'DELETE RECORD',
    deleteError: 'Unable to delete this fuel record. Please try again.',
    deleted: 'Fuel record deleted.',
    saving: 'SAVING…',
    deleting: 'DELETING…',
    close: 'Close',
    currency: 'EGP',
    perLiter: '/ L',
  },
  ar: {
    back: 'رجوع',
    section: 'سجل الوقود',
    title: 'الوقود',
    odometer: 'قراءة العداد الحالية',
    records: 'سجلات التزود بالوقود',
    totalCost: 'إجمالي تكلفة الوقود',
    totalLiters: 'إجمالي اللترات',
    averagePrice: 'متوسط سعر اللتر',
    latestOdometer: 'أحدث قراءة للعداد',
    history: 'سجل التعبئة',
    addFuel: 'إضافة وقود',
    emptyTitle: 'لا توجد سجلات للتزود بالوقود',
    emptyBody: 'سجل الوقود فارغ. سجّل تعبئة لبدء متابعة التكلفة والاستهلاك.',
    addFirst: 'أضف أول تعبئة',
    loading: 'جارٍ تحميل سجلات الوقود…',
    loadError: 'تعذّر تحميل سجلات الوقود.',
    retry: 'حاول مرة أخرى',
    signedOut: 'سجّل الدخول مجددًا لعرض سجل الوقود.',
    notFound: 'المركبة غير متاحة أو لم تعد في مرآبك.',
    unconfigured: 'اربط Supabase لعرض سجلات الوقود.',
    date: 'التاريخ',
    odometerField: 'العداد',
    liters: 'اللترات',
    pricePerLiter: 'سعر اللتر',
    total: 'الإجمالي',
    fuelType: 'نوع الوقود',
    station: 'المحطة',
    noStation: 'لم تُسجل المحطة',
    notes: 'ملاحظات',
    optional: 'اختياري',
    datePlaceholder: 'YYYY-MM-DD',
    odometerPlaceholder: 'الكيلومترات',
    litersPlaceholder: '0.000',
    pricePlaceholder: '0.0000',
    stationPlaceholder: 'محطة الوقود',
    notesPlaceholder: 'تفاصيل إضافية',
    gasoline92: 'بنزين ٩٢',
    gasoline95: 'بنزين ٩٥',
    gasoline80: 'بنزين ٨٠',
    diesel: 'ديزل',
    other: 'أخرى',
    edit: 'تعديل',
    delete: 'حذف',
    addTitle: 'تعبئة جديدة',
    editTitle: 'تعديل التعبئة',
    save: 'حفظ سجل الوقود',
    saveChanges: 'حفظ التعديلات',
    cancel: 'إلغاء',
    invalidDate: 'أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD.',
    invalidOdometer: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    invalidLiters: 'يجب أن تكون كمية اللترات أكبر من صفر.',
    invalidLitersPrecision: 'أدخل حتى ثلاث خانات عشرية لكمية اللترات.',
    invalidPrice: 'يجب أن يكون سعر اللتر أكبر من صفر.',
    invalidPricePrecision: 'أدخل حتى أربع خانات عشرية لسعر اللتر.',
    invalidTotal: 'الإجمالي المحسوب يتجاوز المبلغ المدعوم.',
    invalidFuelType: 'اختر نوع الوقود.',
    saveError: 'تعذّر حفظ سجل الوقود. حاول مرة أخرى.',
    saved: 'تم حفظ سجل الوقود.',
    updated: 'تم تعديل سجل الوقود.',
    refreshError: 'تم الحفظ، لكن تعذّر تحديث سجل الوقود. حاول مرة أخرى.',
    deleteRefreshError: 'تم الحذف، لكن تعذّر تحديث سجل الوقود. حاول مرة أخرى.',
    deleteTitle: 'حذف سجل الوقود؟',
    deleteBody: 'سيتم حذف سجل التعبئة نهائيًا.',
    confirmDelete: 'حذف السجل',
    deleteError: 'تعذّر حذف سجل الوقود. حاول مرة أخرى.',
    deleted: 'تم حذف سجل الوقود.',
    saving: 'جارٍ الحفظ…',
    deleting: 'جارٍ الحذف…',
    close: 'إغلاق',
    currency: 'ج.م',
    perLiter: '/ لتر',
  },
} as const;

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

function logError(context: string, error: unknown) {
  if (__DEV__) console.error(`[Car Care] ${context}`, error);
}

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function parseLocalizedInteger(value: string) {
  const normalized = normalizeDigits(value).replace(/[,\u066c\s]/g, '');
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function parseLocalizedDecimal(value: string) {
  let normalized = normalizeDigits(value)
    .replace(/\u066c/g, '')
    .replace(/\u066b/g, '.')
    .trim();
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = /,\d{3}$/.test(normalized)
      ? normalized.replace(/,/g, '')
      : normalized.replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }
  return /^\d+(?:\.\d+)?$/.test(normalized)
    ? Number(normalized)
    : Number.NaN;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function todayAsISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

function fuelTypeLabel(type: FuelType, text: Copy) {
  switch (type) {
    case 'gasoline_92':
      return text.gasoline92;
    case 'gasoline_95':
      return text.gasoline95;
    case 'gasoline_80':
      return text.gasoline80;
    case 'diesel':
      return text.diesel;
    case 'other':
      return text.other;
  }
}

function makeDraft(vehicle: Vehicle): FuelDraft {
  return {
    date: todayAsISO(),
    odometer: String(vehicle.mileage),
    liters: '',
    pricePerLiter: '',
    fuelType: 'gasoline_92',
    station: '',
    notes: '',
  };
}

function draftFromRecord(record: FuelRecord): FuelDraft {
  return {
    date: record.date,
    odometer: String(record.odometer_km),
    liters: String(record.liters),
    pricePerLiter: String(record.price_per_liter),
    fuelType: record.fuel_type,
    station: record.station ?? '',
    notes: record.notes ?? '',
  };
}

function isFuelType(value: string): value is FuelType {
  return fuelTypes.some((fuelType) => fuelType === value);
}

function compareRecords(left: FuelRecord, right: FuelRecord) {
  return right.date.localeCompare(left.date) ||
    right.created_at.localeCompare(left.created_at);
}

async function fetchFuelRecords(
  client: NonNullable<typeof supabase>,
  vehicleId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('fuel_records')
    .select(recordColumns)
    .eq('vehicle_id', vehicleId)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export default function FuelScreen({ vehicleId, colorScheme, onBack }: Props) {
  const colors = palette[colorScheme];
  const text = copy[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loadStatus, setLoadStatus] = useState<ScreenStatus>(
    supabase ? 'loading' : 'unconfigured',
  );
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [draft, setDraft] = useState<FuelDraft | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FuelRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const requestIdRef = useRef(0);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef<TextInput>(null);
  const odometerRef = useRef<TextInput>(null);
  const litersRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const stationRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const loadData = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setLoadStatus('unconfigured');
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoadStatus('loading');
    setErrorMessage('');

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setUser(null);
        setVehicle(null);
        setRecords([]);
        setLoadStatus('signedOut');
        return;
      }

      const { data: vehicleData, error: vehicleError } = await client
        .from('vehicles')
        .select('id, user_id, make, model, mileage')
        .eq('id', vehicleId)
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (vehicleError) throw vehicleError;
      if (requestId !== requestIdRef.current) return;
      if (!vehicleData || vehicleData.user_id !== authData.user.id) {
        setUser(authData.user);
        setVehicle(null);
        setRecords([]);
        setLoadStatus('notFound');
        return;
      }

      const realRecords = await fetchFuelRecords(client, vehicleId, authData.user.id);
      if (requestId !== requestIdRef.current) return;
      setUser(authData.user);
      setVehicle(vehicleData);
      setRecords(realRecords);
      setLoadStatus('ready');
    } catch (error) {
      logError('Unable to load fuel records for the authenticated vehicle', error);
      if (requestId === requestIdRef.current) setLoadStatus('error');
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadData();
    return () => {
      requestIdRef.current += 1;
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, [loadData]);

  const showNotice = useCallback((message: string) => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setNotice(message);
    noticeTimeoutRef.current = setTimeout(() => setNotice(''), 3200);
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (recordToDelete) {
        setRecordToDelete(null);
        return true;
      }
      if (draft && !isSaving) {
        setDraft(null);
        setFormError('');
        return true;
      }
      if (isSaving || isDeleting) return true;
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [draft, isDeleting, isSaving, onBack, recordToDelete]);

  const beginAdd = useCallback(() => {
    if (!vehicle) return;
    setEditingRecordId(null);
    setFormError('');
    setErrorMessage('');
    setDraft(makeDraft(vehicle));
  }, [vehicle]);

  const beginEdit = useCallback((record: FuelRecord) => {
    setEditingRecordId(record.id);
    setFormError('');
    setErrorMessage('');
    setDraft(draftFromRecord(record));
  }, []);

  const closeForm = useCallback(() => {
    if (isSaving) return;
    setDraft(null);
    setEditingRecordId(null);
    setFormError('');
  }, [isSaving]);

  const validateDraft = useCallback(
    (value: FuelDraft) => {
      if (!isValidDate(value.date)) return text.invalidDate;

      const odometer = parseLocalizedInteger(value.odometer);
      if (
        value.odometer.trim().length === 0 ||
        !Number.isSafeInteger(odometer) ||
        odometer < 0 ||
        odometer > 2_147_483_647
      ) {
        return text.invalidOdometer;
      }

      const liters = parseLocalizedDecimal(value.liters);
      if (!Number.isFinite(liters) || liters <= 0 || liters > 99_999.999) {
        return text.invalidLiters;
      }
      if ((value.liters.split(/[.,\u066b]/)[1] ?? '').length > 3) {
        return text.invalidLitersPrecision;
      }
      const price = parseLocalizedDecimal(value.pricePerLiter);
      if (!Number.isFinite(price) || price <= 0 || price > 999_999.9999) {
        return text.invalidPrice;
      }
      if ((value.pricePerLiter.split(/[.,\u066b]/)[1] ?? '').length > 4) {
        return text.invalidPricePrecision;
      }
      if (liters * price > 9_999_999_999.99) return text.invalidTotal;
      if (!isFuelType(value.fuelType)) return text.invalidFuelType;
      return null;
    },
    [text],
  );

  const saveRecord = useCallback(async () => {
    if (!supabase || !vehicle || !user || !draft) return;
    setFormError('');
    const validationError = validateDraft(draft);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    let savedRecord: FuelRecord | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setLoadStatus('signedOut');
        setDraft(null);
        return;
      }

      const payload = {
        date: draft.date,
        odometer_km: parseLocalizedInteger(draft.odometer),
        liters: parseLocalizedDecimal(draft.liters),
        price_per_liter: parseLocalizedDecimal(draft.pricePerLiter),
        fuel_type: draft.fuelType,
        station: draft.station.trim() || null,
        notes: draft.notes.trim() || null,
      };

      if (editingRecordId) {
        const { data, error } = await supabase
          .from('fuel_records')
          .update(payload)
          .eq('id', editingRecordId)
          .eq('vehicle_id', vehicle.id)
          .eq('user_id', user.id)
          .select(recordColumns)
          .maybeSingle();
        if (error) throw error;
        if (!data || data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Fuel record was not updated for the authenticated owner');
        }
        savedRecord = data;
      } else {
        const { data, error } = await supabase
          .from('fuel_records')
          .insert({
            ...payload,
            vehicle_id: vehicle.id,
            user_id: user.id,
          })
          .select(recordColumns)
          .single();
        if (error) throw error;
        if (data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Inserted fuel record did not match its authenticated owner');
        }
        savedRecord = data;
      }

      const wasEditing = editingRecordId !== null;
      setDraft(null);
      setEditingRecordId(null);
      setFormError('');
      try {
        const refreshedRecords = await fetchFuelRecords(supabase, vehicle.id, user.id);
        setRecords(refreshedRecords);
        showNotice(wasEditing ? text.updated : text.saved);
      } catch (refreshError) {
        logError('Fuel record saved but the fuel log failed to refresh', refreshError);
        setRecords((current) =>
          [
            ...current.filter((record) => record.id !== savedRecord?.id),
            savedRecord!,
          ].sort(compareRecords),
        );
        showNotice(text.refreshError);
      }
    } catch (error) {
      logError('Unable to save fuel record', error);
      setFormError(text.saveError);
    } finally {
      setIsSaving(false);
    }
  }, [
    draft,
    editingRecordId,
    showNotice,
    text.refreshError,
    text.saveError,
    text.saved,
    text.updated,
    user,
    validateDraft,
    vehicle,
  ]);

  const deleteRecord = useCallback(async () => {
    if (!supabase || !vehicle || !user || !recordToDelete) return;
    setIsDeleting(true);
    setErrorMessage('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setLoadStatus('signedOut');
        setRecordToDelete(null);
        return;
      }

      const { data, error } = await supabase
        .from('fuel_records')
        .delete()
        .eq('id', recordToDelete.id)
        .eq('vehicle_id', vehicle.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Fuel record was not deleted for the authenticated owner');

      const deletedId = recordToDelete.id;
      setRecordToDelete(null);
      try {
        const refreshedRecords = await fetchFuelRecords(supabase, vehicle.id, user.id);
        setRecords(refreshedRecords);
      } catch (refreshError) {
        logError('Fuel record deleted but the fuel log failed to refresh', refreshError);
        setRecords((current) => current.filter((record) => record.id !== deletedId));
        setErrorMessage(text.deleteRefreshError);
      }
      showNotice(text.deleted);
    } catch (error) {
      logError('Unable to delete fuel record', error);
      setRecordToDelete(null);
      setErrorMessage(text.deleteError);
    } finally {
      setIsDeleting(false);
    }
  }, [
    recordToDelete,
    showNotice,
    text.deleteError,
    text.deleteRefreshError,
    text.deleted,
    user,
    vehicle,
  ]);

  const stats = useMemo(() => {
    const totalLiters = records.reduce((sum, record) => sum + Number(record.liters), 0);
    const totalCost = records.reduce((sum, record) => sum + Number(record.total_cost), 0);
    const weightedCost = records.reduce(
      (sum, record) =>
        sum + Number(record.liters) * Number(record.price_per_liter),
      0,
    );
    const latestOdometer = records[0]?.odometer_km ?? null;
    return {
      totalLiters,
      totalCost,
      averagePrice: totalLiters > 0 ? weightedCost / totalLiters : null,
      latestOdometer,
    };
  }, [records]);

  const cardWidth = Math.min(width, 496);
  const currentLiters = draft ? parseLocalizedDecimal(draft.liters) : Number.NaN;
  const currentPrice = draft ? parseLocalizedDecimal(draft.pricePerLiter) : Number.NaN;
  const previewTotal =
    Number.isFinite(currentLiters) &&
    Number.isFinite(currentPrice) &&
    currentLiters > 0 &&
    currentPrice > 0
      ? currentLiters * currentPrice
      : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CockpitBackdrop colors={colors} />

      {loadStatus === 'loading' ? (
        <StateView
          colors={colors}
          styles={styles}
          title={text.loading}
          onBack={onBack}
          isArabic={isArabic}
          loading
        />
      ) : loadStatus === 'error' ||
        loadStatus === 'notFound' ||
        loadStatus === 'signedOut' ||
        loadStatus === 'unconfigured' ? (
        <StateView
          colors={colors}
          styles={styles}
          title={
            loadStatus === 'error'
              ? text.loadError
              : loadStatus === 'notFound'
                ? text.notFound
                : loadStatus === 'signedOut'
                  ? text.signedOut
                  : text.unconfigured
          }
          action={loadStatus === 'error' ? text.retry : undefined}
          onAction={loadStatus === 'error' ? () => void loadData() : undefined}
          onBack={onBack}
          isArabic={isArabic}
          isError={loadStatus === 'error'}
        />
      ) : vehicle ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { width: cardWidth }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={[styles.header, isArabic && sharedStyles.rowReverse]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.back}
              onPress={onBack}
              style={styles.iconButton}
            >
              <Text style={[styles.backIcon, isArabic && sharedStyles.flip]}>‹</Text>
            </Pressable>
            <View style={styles.headerTitle}>
              <Text
                numberOfLines={1}
                style={[styles.headerVehicle, { writingDirection: direction }]}
              >
                {vehicle.make} {vehicle.model}
              </Text>
              <Text style={styles.headerEyebrow}>{text.section}</Text>
            </View>
            <View style={styles.vehicleSignal}>
              <View style={styles.signalDot} />
              <Text style={styles.vehicleSignalText}>KM</Text>
            </View>
          </View>

          <View style={[styles.titleRow, isArabic && sharedStyles.rowReverse]}>
            <View style={styles.titleBlock}>
              <Text style={styles.pageEyebrow}>{text.records}</Text>
              <Text style={[styles.pageTitle, { writingDirection: direction }]}>
                {text.title}
              </Text>
            </View>
            <View style={styles.odometerPanel}>
              <Text style={styles.odometerLabel}>{text.odometer}</Text>
              <Text style={styles.odometerValue}>
                {formatNumber(vehicle.mileage, 0)} <Text style={styles.odometerUnit}>KM</Text>
              </Text>
            </View>
          </View>

          {records.length > 0 ? (
            <View style={styles.statsPanel}>
              <View style={[styles.statsTopRule, isArabic && styles.ruleRight]} />
              <View style={styles.statsGrid}>
                <StatCell
                  label={text.totalCost}
                  value={formatMoney(stats.totalCost, text.currency)}
                  styles={styles}
                  accent
                />
                <StatCell
                  label={text.totalLiters}
                  value={`${formatNumber(stats.totalLiters, 3)} L`}
                  styles={styles}
                />
                <StatCell
                  label={text.averagePrice}
                  value={
                    stats.averagePrice === null
                      ? '—'
                      : `${text.currency} ${formatNumber(stats.averagePrice, 4)} ${text.perLiter}`
                  }
                  styles={styles}
                />
                <StatCell
                  label={text.latestOdometer}
                  value={
                    stats.latestOdometer === null
                      ? '—'
                      : `${formatNumber(stats.latestOdometer, 0)} KM`
                  }
                  styles={styles}
                />
              </View>
            </View>
          ) : (
            <View style={styles.statsEmpty}>
              <View style={styles.statsEmptyRule} />
              <Text style={styles.statsEmptyText}>{text.records}</Text>
              <Text style={styles.statsEmptyValue}>—</Text>
            </View>
          )}

          <View style={[styles.sectionHeader, isArabic && sharedStyles.rowReverse]}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionTitle}>{text.history}</Text>
            <Text style={styles.sectionCount}>{String(records.length).padStart(2, '0')}</Text>
            <View style={styles.sectionRule} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.addFuel}
              onPress={beginAdd}
              style={styles.addCompact}
            >
              <Text style={styles.addCompactGlyph}>+</Text>
            </Pressable>
          </View>

          {records.length === 0 ? (
            <View style={styles.emptyPanel}>
              <View style={styles.emptyDial}>
                <View style={styles.emptyDialInner} />
                <Text style={styles.emptyGlyph}>◉</Text>
              </View>
              <Text style={[styles.emptyTitle, { writingDirection: direction }]}>
                {text.emptyTitle}
              </Text>
              <Text style={[styles.emptyBody, { writingDirection: direction }]}>
                {text.emptyBody}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={beginAdd}
                style={[styles.primaryButton, isArabic && sharedStyles.rowReverse]}
              >
                <Text style={styles.primaryButtonText}>{text.addFirst}</Text>
                <Text style={styles.primaryButtonArrow}>{isArabic ? '←' : '→'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {records.map((record, index) => (
                <FuelRecordCard
                  key={record.id}
                  record={record}
                  text={text}
                  styles={styles}
                  direction={direction}
                  isArabic={isArabic}
                  isLast={index === records.length - 1}
                  onEdit={() => beginEdit(record)}
                  onDelete={() => setRecordToDelete(record)}
                />
              ))}
            </View>
          )}

          {!!errorMessage && (
            <InlineFeedback styles={styles} message={errorMessage} isArabic={isArabic} />
          )}
          {records.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={beginAdd}
              style={[styles.primaryButton, styles.bottomAddButton, isArabic && sharedStyles.rowReverse]}
            >
              <Text style={styles.primaryButtonText}>{text.addFuel}</Text>
              <Text style={styles.primaryButtonArrow}>{isArabic ? '←' : '→'}</Text>
            </Pressable>
          )}
        </ScrollView>
      ) : null}

      {draft && (
        <FuelRecordModal
          draft={draft}
          isEditing={editingRecordId !== null}
          isSaving={isSaving}
          formError={formError}
          calculatedTotal={previewTotal}
          colors={colors}
          styles={styles}
          text={text}
          direction={direction}
          isArabic={isArabic}
          width={width}
          height={height}
          refs={{
            date: dateRef,
            odometer: odometerRef,
            liters: litersRef,
            pricePerLiter: priceRef,
            station: stationRef,
            notes: notesRef,
          }}
          onChange={setDraft}
          onSave={() => void saveRecord()}
          onCancel={closeForm}
        />
      )}

      <ConfirmationModal
        visible={recordToDelete !== null}
        title={text.deleteTitle}
        body={
          recordToDelete
            ? `${fuelTypeLabel(recordToDelete.fuel_type, text)} · ${formatDate(recordToDelete.date)}`
            : text.deleteBody
        }
        description={text.deleteBody}
        confirmLabel={isDeleting ? text.deleting : text.confirmDelete}
        cancelLabel={text.cancel}
        styles={styles}
        direction={direction}
        isBusy={isDeleting}
        onCancel={() => {
          if (!isDeleting) setRecordToDelete(null);
        }}
        onConfirm={() => void deleteRecord()}
      />

      {!!notice && (
        <Pressable
          accessibilityRole="alert"
          onPress={() => setNotice('')}
          style={styles.toast}
        >
          <Text style={[styles.toastText, { writingDirection: direction }]}>{notice}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function StateView({
  colors,
  styles,
  title,
  action,
  onAction,
  onBack,
  isArabic: arabic,
  loading = false,
  isError = false,
}: {
  colors: ScreenColors;
  styles: ScreenStyles;
  title: string;
  action?: string;
  onAction?: () => void;
  onBack: () => void;
  isArabic: boolean;
  loading?: boolean;
  isError?: boolean;
}) {
  return (
    <View style={styles.stateScreen}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
        <Text style={[styles.backIcon, arabic && sharedStyles.flip]}>‹</Text>
      </Pressable>
      <View style={styles.stateCard}>
        {loading && <ActivityIndicator color={colors.accent} />}
        <Text
          style={[
            styles.stateTitle,
            isError && { color: colors.error },
            { writingDirection: arabic ? 'rtl' : 'ltr' },
          ]}
        >
          {title}
        </Text>
        {!!action && onAction && (
          <Pressable accessibilityRole="button" onPress={onAction} style={styles.stateAction}>
            <Text style={styles.stateActionText}>{action}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StatCell({
  label,
  value,
  styles,
  accent = false,
}: {
  label: string;
  value: string;
  styles: ScreenStyles;
  accent?: boolean;
}) {
  return (
    <View style={styles.statCell}>
      <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.statValue, accent && styles.statValueAccent]}
      >
        {value}
      </Text>
    </View>
  );
}

function FuelRecordCard({
  record,
  text,
  styles,
  direction,
  isArabic: arabic,
  isLast,
  onEdit,
  onDelete,
}: {
  record: FuelRecord;
  text: Copy;
  styles: ScreenStyles;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.recordRow, arabic && sharedStyles.rowReverse]}>
      <View style={styles.recordRail}>
        <View style={styles.recordNode}>
          <View style={styles.recordNodeCore} />
        </View>
        {!isLast && <View style={styles.recordRailLine} />}
      </View>
      <View style={styles.recordCard}>
        <View style={[styles.recordHeader, arabic && sharedStyles.rowReverse]}>
          <View style={styles.recordHeaderTitle}>
            <Text style={styles.recordEyebrow}>{text.section}</Text>
            <Text style={styles.recordFuelType}>
              {fuelTypeLabel(record.fuel_type, text)}
            </Text>
          </View>
          <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
        </View>

        <View style={styles.recordTotal}>
          <Text style={styles.recordTotalLabel}>{text.total}</Text>
          <Text style={styles.recordTotalValue}>
            {formatMoney(Number(record.total_cost), text.currency)}
          </Text>
        </View>

        <View style={[styles.recordMetrics, arabic && sharedStyles.rowReverse]}>
          <Metric label={text.odometerField} value={`${formatNumber(record.odometer_km, 0)} KM`} styles={styles} />
          <Metric label={text.liters} value={`${formatNumber(Number(record.liters), 3)} L`} styles={styles} />
          <Metric
            label={text.pricePerLiter}
            value={`${text.currency} ${formatNumber(Number(record.price_per_liter), 4)} ${text.perLiter}`}
            styles={styles}
          />
        </View>

        <View style={[styles.stationRow, arabic && sharedStyles.rowReverse]}>
          <Text style={styles.stationGlyph}>⌖</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.stationText,
              !record.station && styles.stationMissing,
              { writingDirection: direction },
            ]}
          >
            {record.station ?? text.noStation}
          </Text>
        </View>

        {!!record.notes && (
          <Text style={[styles.recordNotes, { writingDirection: direction }]}>
            {record.notes}
          </Text>
        )}

        <View style={[styles.recordActions, arabic && sharedStyles.rowReverse]}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={styles.recordAction}>
            <Text style={styles.editGlyph}>✎</Text>
            <Text style={styles.editText}>{text.edit}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDelete} style={styles.recordAction}>
            <Text style={styles.deleteGlyph}>×</Text>
            <Text style={styles.deleteText}>{text.delete}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ScreenStyles;
}) {
  return (
    <View style={styles.metricCell}>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
    </View>
  );
}

type FuelInputRefs = Record<
  Exclude<FieldKey, 'fuelType'>,
  React.RefObject<TextInput | null>
>;

function FuelRecordModal({
  draft,
  isEditing,
  isSaving,
  formError,
  calculatedTotal,
  colors,
  styles,
  text,
  direction,
  isArabic: arabic,
  width,
  height,
  refs,
  onChange,
  onSave,
  onCancel,
}: {
  draft: FuelDraft;
  isEditing: boolean;
  isSaving: boolean;
  formError: string;
  calculatedTotal: number;
  colors: ScreenColors;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  width: number;
  height: number;
  refs: FuelInputRefs;
  onChange: React.Dispatch<React.SetStateAction<FuelDraft | null>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: Exclude<FieldKey, 'fuelType'>) => (value: string) => {
    onChange((current) => (current ? { ...current, [key]: value } : current));
  };
  const focus = (key: Exclude<FieldKey, 'fuelType'>) => () => refs[key].current?.focus();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.modalBackdrop, { paddingTop: Math.max(12, height * 0.025) }]}>
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { maxWidth: Math.min(width - 28, 500) }]}>
            <View style={[styles.modalHeader, arabic && sharedStyles.rowReverse]}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalEyebrow}>{text.section}</Text>
                <Text style={[styles.modalTitle, { writingDirection: direction }]}>
                  {isEditing ? text.editTitle : text.addTitle}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.close}
                disabled={isSaving}
                onPress={onCancel}
                style={styles.iconButton}
              >
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets
            >
              <FormField
                label={text.date}
                value={draft.date}
                placeholder={text.datePlaceholder}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                ref={refs.date}
                onChangeText={update('date')}
                returnKeyType="next"
                onSubmitEditing={focus('odometer')}
              />
              <View style={[styles.formColumns, arabic && sharedStyles.rowReverse]}>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.odometerField}
                    value={draft.odometer}
                    placeholder={text.odometerPlaceholder}
                    suffix="KM"
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="number-pad"
                    ref={refs.odometer}
                    onChangeText={update('odometer')}
                    returnKeyType="next"
                    onSubmitEditing={focus('liters')}
                  />
                </View>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.liters}
                    value={draft.liters}
                    placeholder={text.litersPlaceholder}
                    suffix="L"
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="decimal-pad"
                    ref={refs.liters}
                    onChangeText={update('liters')}
                    returnKeyType="next"
                    onSubmitEditing={focus('pricePerLiter')}
                  />
                </View>
              </View>
              <FormField
                label={text.pricePerLiter}
                value={draft.pricePerLiter}
                placeholder={text.pricePlaceholder}
                suffix={`${text.currency} / L`}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="decimal-pad"
                ref={refs.pricePerLiter}
                onChangeText={update('pricePerLiter')}
                returnKeyType="next"
                onSubmitEditing={focus('station')}
              />

              <Text style={[styles.fieldLabel, { textAlign: arabic ? 'right' : 'left' }]}>
                {text.fuelType}
              </Text>
              <View style={[styles.fuelTypeChoices, arabic && sharedStyles.rowReverse]}>
                {fuelTypes.map((fuelType) => (
                  <Pressable
                    key={fuelType}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: draft.fuelType === fuelType }}
                    disabled={isSaving}
                    onPress={() => onChange((current) => current ? { ...current, fuelType } : current)}
                    style={[
                      styles.fuelTypeChoice,
                      draft.fuelType === fuelType && styles.fuelTypeChoiceSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.fuelTypeChoiceText,
                        draft.fuelType === fuelType && styles.fuelTypeChoiceTextSelected,
                      ]}
                    >
                      {fuelTypeLabel(fuelType, text)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.totalPreview}>
                <View style={[styles.totalPreviewRule, arabic && styles.ruleRight]} />
                <View style={[styles.totalPreviewRow, arabic && sharedStyles.rowReverse]}>
                  <View>
                    <Text style={styles.totalPreviewEyebrow}>{text.total}</Text>
                    <Text style={styles.totalFormula}>
                      {draft.liters || '0'} L × {draft.pricePerLiter || '0'} {text.currency} / L
                    </Text>
                  </View>
                  <Text style={styles.totalPreviewValue}>
                    {formatMoney(calculatedTotal, text.currency)}
                  </Text>
                </View>
              </View>

              <FormField
                label={text.station}
                value={draft.station}
                placeholder={text.stationPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={refs.station}
                onChangeText={update('station')}
                returnKeyType="next"
                onSubmitEditing={focus('notes')}
              />
              <FormField
                label={text.notes}
                value={draft.notes}
                placeholder={text.notesPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={refs.notes}
                onChangeText={update('notes')}
                returnKeyType="default"
                multiline
              />

              {!!formError && (
                <InlineFeedback styles={styles} message={formError} isArabic={arabic} />
              )}
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onSave}
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.accentInk} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isEditing ? text.saveChanges : text.save}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>{text.cancel}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const FormField = forwardRef<TextInput, {
  label: string;
  value: string;
  placeholder: string;
  styles: ScreenStyles;
  colors: ScreenColors;
  direction: 'ltr' | 'rtl';
  disabled: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  suffix?: string;
  multiline?: boolean;
  returnKeyType?: 'next' | 'done' | 'default';
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
}>(function FormField(
  {
    label,
    value,
    placeholder,
    styles,
    colors,
    direction,
    disabled,
    keyboardType = 'default',
    suffix,
    multiline = false,
    returnKeyType,
    onChangeText,
    onSubmitEditing,
  },
  ref,
) {
  return (
    <View style={styles.formField}>
      <Text style={[styles.fieldLabel, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          direction === 'rtl' && sharedStyles.rowReverse,
          multiline && styles.multilineWrap,
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'default' ? 'sentences' : 'none'}
          autoCorrect={keyboardType === 'default'}
          editable={!disabled}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          returnKeyType={multiline ? 'default' : returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={!multiline && returnKeyType !== 'next'}
          style={[
            styles.input,
            { textAlign: direction === 'rtl' ? 'right' : 'left', writingDirection: direction },
            multiline && styles.multilineInput,
          ]}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
});

function InlineFeedback({
  styles,
  message,
  isArabic: arabic,
}: {
  styles: ScreenStyles;
  message: string;
  isArabic: boolean;
}) {
  return (
    <View accessibilityRole="alert" style={styles.feedback}>
      <View style={styles.feedbackDot} />
      <Text style={[styles.feedbackText, { writingDirection: arabic ? 'rtl' : 'ltr' }]}>
        {message}
      </Text>
    </View>
  );
}

function ConfirmationModal({
  visible,
  title,
  body,
  description,
  confirmLabel,
  cancelLabel,
  styles,
  direction,
  onCancel,
  onConfirm,
  isBusy = false,
}: {
  visible: boolean;
  title: string;
  body: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  styles: ScreenStyles;
  direction: 'ltr' | 'rtl';
  onCancel: () => void;
  onConfirm: () => void;
  isBusy?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmTopRule} />
          <Text style={[styles.confirmEyebrow, { writingDirection: direction }]}>{title}</Text>
          <Text style={[styles.confirmBody, { writingDirection: direction }]}>{body}</Text>
          <Text style={[styles.confirmDescription, { writingDirection: direction }]}>
            {description}
          </Text>
          <View style={[styles.confirmActions, direction === 'rtl' && sharedStyles.rowReverse]}>
            <Pressable accessibilityRole="button" disabled={isBusy} onPress={onCancel} style={styles.confirmCancel}>
              <Text style={styles.confirmCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={isBusy} onPress={onConfirm} style={styles.confirmButton}>
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sharedStyles = StyleSheet.create({
  rowReverse: { flexDirection: 'row-reverse' },
  flip: { transform: [{ scaleX: -1 }] },
});

function makeStyles(colors: ScreenColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: { alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
    header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 11 },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    backIcon: { color: colors.foreground, fontSize: 27, lineHeight: 30, marginTop: -3 },
    headerTitle: { flex: 1, minWidth: 0, alignItems: 'center' },
    headerVehicle: { maxWidth: '100%', color: colors.foreground, fontSize: 14, fontWeight: '700' },
    headerEyebrow: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1.7, marginTop: 5 },
    vehicleSignal: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    signalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    vehicleSignalText: { color: colors.accent, fontSize: 8, fontWeight: '700', letterSpacing: 0.7 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 9, marginTop: 24 },
    titleBlock: { flexShrink: 1 },
    pageEyebrow: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1.6 },
    pageTitle: { color: colors.foreground, fontSize: 34, lineHeight: 39, fontWeight: '700', letterSpacing: -1.1, marginTop: 5 },
    odometerPanel: { alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    odometerLabel: { color: colors.muted, fontSize: 6, fontWeight: '600', letterSpacing: 0.9 },
    odometerValue: { color: colors.foreground, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 5 },
    odometerUnit: { color: colors.accent, fontSize: 7, fontWeight: '700' },
    statsPanel: { overflow: 'hidden', marginTop: 16, padding: 14, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    statsTopRule: { position: 'absolute', top: 0, left: 0, width: 48, height: 2, backgroundColor: colors.accent },
    ruleRight: { left: undefined, right: 0 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
    statCell: { width: '50%', minHeight: 59, justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    statLabel: { color: colors.muted, fontSize: 7, fontWeight: '600', letterSpacing: 0.7 },
    statValue: { color: colors.foreground, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 6 },
    statValueAccent: { color: colors.accent, fontSize: 14 },
    statsEmpty: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    statsEmptyRule: { width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent },
    statsEmptyText: { flex: 1, color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1 },
    statsEmptyValue: { color: colors.muted, fontSize: 17 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 23, marginBottom: 11 },
    sectionMarker: { width: 3, height: 13, borderRadius: 2, backgroundColor: colors.accent },
    sectionTitle: { color: colors.foreground, fontSize: 9, fontWeight: '600', letterSpacing: 1.35 },
    sectionCount: { color: colors.accent, fontSize: 9, fontWeight: '600', fontVariant: ['tabular-nums'] },
    sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    addCompact: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: `${colors.accent}66`, backgroundColor: `${colors.accent}12` },
    addCompactGlyph: { color: colors.accent, fontSize: 19, lineHeight: 21 },
    emptyPanel: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 25, paddingBottom: 21, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    emptyDial: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center', borderRadius: 43, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.panel },
    emptyDialInner: { position: 'absolute', width: 69, height: 69, borderRadius: 35, borderWidth: 1, borderColor: colors.border },
    emptyGlyph: { color: colors.accent, fontSize: 27 },
    emptyTitle: { color: colors.foreground, fontSize: 10, fontWeight: '700', letterSpacing: 1.1, textAlign: 'center', marginTop: 17 },
    emptyBody: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8 },
    primaryButton: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, paddingHorizontal: 16, borderRadius: 15, backgroundColor: colors.accent },
    primaryButtonText: { color: colors.accentInk, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
    primaryButtonArrow: { color: colors.accentInk, fontSize: 16, lineHeight: 19 },
    bottomAddButton: { alignSelf: 'stretch', marginTop: 13 },
    recordsList: { paddingTop: 1 },
    recordRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
    recordRail: { width: 19, alignItems: 'center' },
    recordNode: { zIndex: 1, width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: `${colors.accent}88`, backgroundColor: `${colors.accent}18`, marginTop: 17 },
    recordNodeCore: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    recordRailLine: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginTop: 3 },
    recordCard: { flex: 1, minWidth: 0, marginBottom: 9, padding: 12, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    recordHeaderTitle: { flex: 1, minWidth: 0 },
    recordEyebrow: { color: colors.muted, fontSize: 7, fontWeight: '600', letterSpacing: 1.35 },
    recordFuelType: { color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 5 },
    recordDate: { color: colors.muted, fontSize: 8, fontWeight: '500' },
    recordTotal: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border },
    recordTotalLabel: { color: colors.muted, fontSize: 7, fontWeight: '600', letterSpacing: 0.9 },
    recordTotalValue: { color: colors.accent, fontSize: 17, fontWeight: '500', fontVariant: ['tabular-nums'] },
    recordMetrics: { flexDirection: 'row', gap: 7, marginTop: 10 },
    metricCell: { flex: 1, minWidth: 0, paddingRight: 3 },
    metricLabel: { color: colors.muted, fontSize: 6, fontWeight: '600', letterSpacing: 0.55 },
    metricValue: { color: colors.foreground, fontSize: 9, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 5 },
    stationRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
    stationGlyph: { color: colors.accent, fontSize: 13 },
    stationText: { flex: 1, color: colors.foreground, fontSize: 9, fontWeight: '500' },
    stationMissing: { color: colors.muted },
    recordNotes: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 8 },
    recordActions: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    recordAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 3 },
    editGlyph: { color: colors.accent, fontSize: 12 },
    editText: { color: colors.muted, fontSize: 8, fontWeight: '600' },
    deleteGlyph: { color: colors.error, fontSize: 14, lineHeight: 15 },
    deleteText: { color: colors.error, fontSize: 8, fontWeight: '600' },
    stateScreen: { flex: 1, padding: 20, paddingTop: 10 },
    stateCard: { alignItems: 'center', gap: 14, marginTop: 30, padding: 24, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    stateTitle: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
    stateAction: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 13, backgroundColor: colors.accent },
    stateActionText: { color: colors.accentInk, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
    feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 11, borderWidth: 1, borderColor: `${colors.error}55`, borderRadius: 13, backgroundColor: `${colors.error}12` },
    feedbackDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error, marginTop: 5 },
    feedbackText: { flex: 1, color: colors.error, fontSize: 10, lineHeight: 16 },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 18, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.panel },
    toastText: { color: colors.foreground, fontSize: 11, textAlign: 'center' },
    modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.74)' },
    modalKeyboard: { width: '100%', maxHeight: '100%', alignItems: 'center', justifyContent: 'flex-end' },
    modalCard: { width: '100%', maxHeight: '97%', paddingHorizontal: 17, paddingTop: 17, paddingBottom: 10, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    modalHeading: { flex: 1 },
    modalEyebrow: { color: colors.accent, fontSize: 7, fontWeight: '600', letterSpacing: 1.5 },
    modalTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700', marginTop: 5 },
    modalClose: { color: colors.muted, fontSize: 24, lineHeight: 28 },
    formField: { marginTop: 3 },
    fieldLabel: { color: colors.muted, fontSize: 7, fontWeight: '600', letterSpacing: 0.8, marginTop: 10, marginBottom: 5 },
    inputWrap: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    input: { flex: 1, minHeight: 40, paddingVertical: 0, color: colors.foreground, fontSize: 11, fontWeight: '500' },
    inputSuffix: { color: colors.accent, fontSize: 8, fontWeight: '700' },
    formColumns: { flexDirection: 'row', gap: 9 },
    formColumn: { flex: 1, minWidth: 0 },
    fuelTypeChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    fuelTypeChoice: { minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    fuelTypeChoiceSelected: { borderColor: colors.accent, backgroundColor: `${colors.accent}16` },
    fuelTypeChoiceText: { color: colors.muted, fontSize: 8, fontWeight: '600' },
    fuelTypeChoiceTextSelected: { color: colors.accent },
    totalPreview: { overflow: 'hidden', marginTop: 14, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: `${colors.accent}44`, backgroundColor: `${colors.accent}0A` },
    totalPreviewRule: { position: 'absolute', left: 0, top: 0, width: 28, height: 2, backgroundColor: colors.accent },
    totalPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    totalPreviewEyebrow: { color: colors.accent, fontSize: 7, fontWeight: '700', letterSpacing: 1 },
    totalFormula: { color: colors.muted, fontSize: 8, marginTop: 5 },
    totalPreviewValue: { color: colors.foreground, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
    multilineWrap: { alignItems: 'flex-start', minHeight: 61 },
    multilineInput: { minHeight: 59, paddingTop: 9 },
    buttonDisabled: { opacity: 0.58 },
    cancelButton: { alignItems: 'center', paddingVertical: 10 },
    cancelButtonText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 23, backgroundColor: 'rgba(0,0,0,0.74)' },
    confirmCard: { width: '100%', maxWidth: 390, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 17, borderRadius: 22, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.panel },
    confirmTopRule: { width: 35, height: 2, borderRadius: 1, backgroundColor: colors.error, marginBottom: 16 },
    confirmEyebrow: { color: colors.error, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
    confirmBody: { color: colors.foreground, fontSize: 13, fontWeight: '600', marginTop: 9 },
    confirmDescription: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 7 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 19 },
    confirmCancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    confirmCancelText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    confirmButton: { minHeight: 42, minWidth: 105, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.error },
    confirmButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  });
}
