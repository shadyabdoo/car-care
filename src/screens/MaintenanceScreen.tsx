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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import CockpitBackdrop from '../components/CockpitBackdrop';
import {
  getMaintenanceStatus,
  type MaintenanceRecord,
  type MaintenanceStatus,
} from '../lib/maintenance';
import { supabase } from '../lib/supabase';

type ThemeName = 'dark' | 'light';
type VehicleType = 'car' | 'motorcycle';
type Vehicle = {
  id: string;
  user_id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  mileage: number;
};
type FormFieldKey = keyof ServiceDraft;
type LoadStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'signedOut' | 'unconfigured';
type ServiceDraft = {
  serviceType: string;
  description: string;
  serviceDate: string;
  mileage: string;
  cost: string;
  workshop: string;
  notes: string;
  nextServiceDate: string;
  nextServiceMileage: string;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');

const copy = {
  en: {
    back: 'Back',
    section: 'MAINTENANCE LOG',
    title: 'Service',
    currentMileage: 'CURRENT ODOMETER',
    vehicle: 'VEHICLE',
    car: 'Car',
    motorcycle: 'Motorcycle',
    recordCount: 'SERVICE RECORDS',
    overdue: 'OVERDUE',
    dueSoon: 'DUE SOON',
    onTrack: 'ON TRACK',
    nextUp: 'NEXT UP',
    nextMileage: 'KM LEFT',
    kmOverdue: 'KM OVERDUE',
    dueDate: 'DUE DATE',
    noUpcoming: 'NO UPCOMING SERVICE',
    noUpcomingDetail: 'Add a next-service date or odometer reading to track what is due.',
    emptyTitle: 'NO SERVICE RECORDS',
    emptyBody: 'Your service log is clear. Add a completed service to start your maintenance history.',
    addRecord: 'ADD SERVICE RECORD',
    addFirst: 'ADD YOUR FIRST SERVICE',
    history: 'SERVICE LOG',
    noRecords: 'No records match this view.',
    edit: 'Edit record',
    delete: 'Delete record',
    serviceType: 'SERVICE TYPE',
    description: 'DESCRIPTION',
    serviceDate: 'SERVICE DATE',
    mileage: 'ODOMETER AT SERVICE',
    cost: 'COST',
    workshop: 'WORKSHOP',
    notes: 'NOTES',
    nextServiceDate: 'NEXT SERVICE DATE',
    nextServiceMileage: 'NEXT SERVICE ODOMETER',
    optional: 'OPTIONAL',
    datePlaceholder: 'YYYY-MM-DD',
    mileagePlaceholder: 'Kilometres',
    costPlaceholder: '0.00',
    workshopPlaceholder: 'Workshop or service centre',
    notesPlaceholder: 'Additional details',
    descriptionPlaceholder: 'What work was completed?',
    serviceTypePlaceholder: 'e.g. Oil and filter',
    nextDatePlaceholder: 'YYYY-MM-DD',
    save: 'SAVE RECORD',
    saveChanges: 'SAVE CHANGES',
    cancel: 'CANCEL',
    loading: 'Loading service log…',
    loadError: 'Unable to load maintenance records.',
    signedOut: 'Sign in again to view this service log.',
    unconfigured: 'Connect Supabase to view maintenance records.',
    notFound: 'This vehicle is unavailable or no longer in your garage.',
    retry: 'TRY AGAIN',
    invalidServiceType: 'Enter the service type.',
    invalidDate: 'Enter a valid service date as YYYY-MM-DD.',
    invalidMileage: 'Enter a valid non-negative odometer reading.',
    invalidCost: 'Enter a valid non-negative cost with up to two decimal places.',
    invalidNextDate: 'Enter a valid next-service date as YYYY-MM-DD.',
    invalidNextDateOrder: 'The next service date cannot be before the service date.',
    invalidNextMileage: 'Enter a valid non-negative next-service odometer reading.',
    invalidNextMileageOrder: 'The next service odometer cannot be below the service odometer.',
    saveError: 'Unable to save this service record. Please try again.',
    saved: 'Service record saved.',
    updated: 'Service record updated.',
    savedRefreshError: 'Record saved, but the service log could not refresh. Try again.',
    deleteTitle: 'DELETE SERVICE RECORD?',
    deleteBody: 'This service entry will be permanently removed.',
    confirmDelete: 'DELETE RECORD',
    deleteError: 'Unable to delete this service record. Please try again.',
    deleted: 'Service record deleted.',
    service: 'SERVICE',
    date: 'DATE',
    noWorkshop: 'WORKSHOP NOT RECORDED',
    next: 'NEXT SERVICE',
    notScheduled: 'NO NEXT SERVICE SET',
    due: 'DUE',
    onTrackLabel: 'ON TRACK',
    logged: 'LOGGED',
    dateAndMileage: 'DATE · ODOMETER',
    adding: 'SAVING…',
    deleting: 'DELETING…',
    close: 'Close',
    workshopOptional: 'WORKSHOP · OPTIONAL',
    costOptional: 'COST · OPTIONAL',
    descriptionOptional: 'DESCRIPTION · OPTIONAL',
    notesOptional: 'NOTES · OPTIONAL',
    nextService: 'NEXT SERVICE · OPTIONAL',
    km: 'KM',
    egp: 'COST',
  },
  ar: {
    back: 'رجوع',
    section: 'سجل الصيانة',
    title: 'الصيانة',
    currentMileage: 'قراءة العداد الحالية',
    vehicle: 'المركبة',
    car: 'سيارة',
    motorcycle: 'موتوسيكل',
    recordCount: 'سجلات الخدمة',
    overdue: 'متأخر',
    dueSoon: 'مستحق قريبًا',
    onTrack: 'ضمن الموعد',
    nextUp: 'الخدمة القادمة',
    nextMileage: 'كم متبقية',
    kmOverdue: 'كم متأخرة',
    dueDate: 'تاريخ الاستحقاق',
    noUpcoming: 'لا توجد خدمة قادمة',
    noUpcomingDetail: 'أضف موعد الصيانة أو قراءة العداد القادمة لمتابعة الاستحقاق.',
    emptyTitle: 'لا توجد سجلات صيانة',
    emptyBody: 'سجل الخدمة فارغ. أضف صيانة منجزة لبدء سجل مركبتك.',
    addRecord: 'إضافة سجل صيانة',
    addFirst: 'أضف أول صيانة',
    history: 'سجل الخدمة',
    noRecords: 'لا توجد سجلات في هذا العرض.',
    edit: 'تعديل السجل',
    delete: 'حذف السجل',
    serviceType: 'نوع الصيانة',
    description: 'الوصف',
    serviceDate: 'تاريخ الصيانة',
    mileage: 'قراءة العداد وقت الصيانة',
    cost: 'التكلفة',
    workshop: 'مركز الخدمة',
    notes: 'ملاحظات',
    nextServiceDate: 'موعد الصيانة القادمة',
    nextServiceMileage: 'عداد الصيانة القادمة',
    optional: 'اختياري',
    datePlaceholder: 'YYYY-MM-DD',
    mileagePlaceholder: 'الكيلومترات',
    costPlaceholder: '0.00',
    workshopPlaceholder: 'الورشة أو مركز الخدمة',
    notesPlaceholder: 'تفاصيل إضافية',
    descriptionPlaceholder: 'ما الأعمال التي أُنجزت؟',
    serviceTypePlaceholder: 'مثال: زيت وفلتر',
    nextDatePlaceholder: 'YYYY-MM-DD',
    save: 'حفظ السجل',
    saveChanges: 'حفظ التعديلات',
    cancel: 'إلغاء',
    loading: 'جارٍ تحميل سجل الصيانة…',
    loadError: 'تعذّر تحميل سجلات الصيانة.',
    signedOut: 'سجّل الدخول مجددًا لعرض سجل الصيانة.',
    unconfigured: 'اربط Supabase لعرض سجلات الصيانة.',
    notFound: 'المركبة غير متاحة أو لم تعد في مرآبك.',
    retry: 'حاول مرة أخرى',
    invalidServiceType: 'أدخل نوع الصيانة.',
    invalidDate: 'أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD.',
    invalidMileage: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    invalidCost: 'أدخل تكلفة صحيحة غير سالبة وبحد أقصى منزلتين عشريتين.',
    invalidNextDate: 'أدخل تاريخًا صحيحًا للصيانة القادمة بصيغة YYYY-MM-DD.',
    invalidNextDateOrder: 'لا يمكن أن يسبق موعد الصيانة القادمة تاريخ الصيانة.',
    invalidNextMileage: 'أدخل قراءة عداد صحيحة للصيانة القادمة.',
    invalidNextMileageOrder: 'لا يمكن أن تقل قراءة الصيانة القادمة عن قراءة الصيانة الحالية.',
    saveError: 'تعذّر حفظ سجل الصيانة. حاول مرة أخرى.',
    saved: 'تم حفظ سجل الصيانة.',
    updated: 'تم تعديل سجل الصيانة.',
    savedRefreshError: 'تم الحفظ، لكن تعذّر تحديث السجل. حاول مرة أخرى.',
    deleteTitle: 'حذف سجل الصيانة؟',
    deleteBody: 'سيتم حذف سجل الخدمة نهائيًا.',
    confirmDelete: 'حذف السجل',
    deleteError: 'تعذّر حذف سجل الصيانة. حاول مرة أخرى.',
    deleted: 'تم حذف سجل الصيانة.',
    service: 'الصيانة',
    date: 'التاريخ',
    noWorkshop: 'لم يُسجل مركز الخدمة',
    next: 'الصيانة القادمة',
    notScheduled: 'لم تُحدد صيانة قادمة',
    due: 'الاستحقاق',
    onTrackLabel: 'ضمن الموعد',
    logged: 'مسجلة',
    dateAndMileage: 'التاريخ · العداد',
    adding: 'جارٍ الحفظ…',
    deleting: 'جارٍ الحذف…',
    close: 'إغلاق',
    workshopOptional: 'مركز الخدمة · اختياري',
    costOptional: 'التكلفة · اختياري',
    descriptionOptional: 'الوصف · اختياري',
    notesOptional: 'ملاحظات · اختياري',
    nextService: 'الصيانة القادمة · اختياري',
    km: 'كم',
    egp: 'التكلفة',
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
    warning: '#FFB547',
    success: '#34E8A0',
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
    warning: '#A26400',
    success: '#0B9A63',
  },
} satisfies Record<ThemeName, Record<string, string>>;

type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof makeStyles>;
type Copy = { [Key in keyof typeof copy.en]: string };
type Props = {
  vehicleId: string;
  colorScheme: ThemeName;
  onBack: () => void;
};

const recordColumns =
  'id, vehicle_id, user_id, service_type, description, service_date, mileage, cost, workshop, notes, next_service_date, next_service_mileage, created_at, updated_at';

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

function parseLocalizedCost(value: string) {
  const normalized = normalizeDigits(value)
    .replace(/\u066b/g, '.')
    .replace(/[,\u066c\s]/g, '');
  return /^\d+(?:\.\d{1,2})?$/.test(normalized)
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

function formatMileage(value: number) {
  return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCost(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

function compareRecords(left: MaintenanceRecord, right: MaintenanceRecord) {
  return (
    right.service_date.localeCompare(left.service_date) ||
    right.created_at.localeCompare(left.created_at)
  );
}

function makeEmptyDraft(vehicle: Vehicle): ServiceDraft {
  return {
    serviceType: '',
    description: '',
    serviceDate: todayAsISO(),
    mileage: String(vehicle.mileage),
    cost: '',
    workshop: '',
    notes: '',
    nextServiceDate: '',
    nextServiceMileage: '',
  };
}

function makeRecordDraft(record: MaintenanceRecord): ServiceDraft {
  return {
    serviceType: record.service_type,
    description: record.description ?? '',
    serviceDate: record.service_date,
    mileage: String(record.mileage),
    cost: record.cost === null ? '' : String(record.cost),
    workshop: record.workshop ?? '',
    notes: record.notes ?? '',
    nextServiceDate: record.next_service_date ?? '',
    nextServiceMileage:
      record.next_service_mileage === null
        ? ''
        : String(record.next_service_mileage),
  };
}

function isVehicleType(value: string): value is VehicleType {
  return value === 'car' || value === 'motorcycle';
}

async function fetchRecords(
  client: NonNullable<typeof supabase>,
  vehicleId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('maintenance_records')
    .select(recordColumns)
    .eq('vehicle_id', vehicleId)
    .eq('user_id', userId)
    .order('service_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export default function MaintenanceScreen({
  vehicleId,
  colorScheme,
  onBack,
}: Props) {
  const colors = palette[colorScheme];
  const text = copy[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(
    supabase ? 'loading' : 'unconfigured',
  );
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const requestIdRef = useRef(0);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceTypeRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const dateRef = useRef<TextInput>(null);
  const mileageRef = useRef<TextInput>(null);
  const costRef = useRef<TextInput>(null);
  const workshopRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const nextDateRef = useRef<TextInput>(null);
  const nextMileageRef = useRef<TextInput>(null);

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
        .select('id, user_id, type, make, model, year, mileage')
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
      if (!isVehicleType(vehicleData.type)) {
        throw new Error(`Unsupported vehicle type: ${vehicleData.type}`);
      }

      const realRecords = await fetchRecords(client, vehicleId, authData.user.id);
      if (requestId !== requestIdRef.current) return;
      setUser(authData.user);
      setVehicle(vehicleData);
      setRecords(realRecords);
      setLoadStatus('ready');
    } catch (error) {
      logError('Unable to load maintenance records for the authenticated vehicle', error);
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
    setDraft(makeEmptyDraft(vehicle));
  }, [vehicle]);

  const beginEdit = useCallback((record: MaintenanceRecord) => {
    setEditingRecordId(record.id);
    setFormError('');
    setErrorMessage('');
    setDraft(makeRecordDraft(record));
  }, []);

  const closeForm = useCallback(() => {
    if (isSaving) return;
    setDraft(null);
    setEditingRecordId(null);
    setFormError('');
  }, [isSaving]);

  const validateDraft = useCallback(
    (value: ServiceDraft) => {
      if (!value.serviceType.trim()) return text.invalidServiceType;
      if (!isValidDate(value.serviceDate)) return text.invalidDate;

      const mileage = parseLocalizedInteger(value.mileage);
      if (
        value.mileage.trim().length === 0 ||
        !Number.isSafeInteger(mileage) ||
        mileage < 0 ||
        mileage > 2_147_483_647
      ) {
        return text.invalidMileage;
      }

      if (value.cost.trim()) {
        const cost = parseLocalizedCost(value.cost);
        if (!Number.isFinite(cost) || cost < 0 || cost > 9_999_999_999.99) {
          return text.invalidCost;
        }
      }

      if (value.nextServiceDate.trim() && !isValidDate(value.nextServiceDate)) {
        return text.invalidNextDate;
      }
      if (
        value.nextServiceDate.trim() &&
        value.nextServiceDate < value.serviceDate
      ) {
        return text.invalidNextDateOrder;
      }
      if (value.nextServiceMileage.trim()) {
        const nextMileage = parseLocalizedInteger(value.nextServiceMileage);
        if (
          !Number.isSafeInteger(nextMileage) ||
          nextMileage < 0 ||
          nextMileage > 2_147_483_647
        ) {
          return text.invalidNextMileage;
        }
        if (nextMileage < mileage) return text.invalidNextMileageOrder;
      }
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
    let persistedRecord: MaintenanceRecord | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setLoadStatus('signedOut');
        setDraft(null);
        return;
      }

      const mileage = parseLocalizedInteger(draft.mileage);
      const cost = draft.cost.trim()
        ? parseLocalizedCost(draft.cost)
        : null;
      const nextServiceMileage = draft.nextServiceMileage.trim()
        ? parseLocalizedInteger(draft.nextServiceMileage)
        : null;
      const payload = {
        service_type: draft.serviceType.trim(),
        description: draft.description.trim() || null,
        service_date: draft.serviceDate,
        mileage,
        cost,
        workshop: draft.workshop.trim() || null,
        notes: draft.notes.trim() || null,
        next_service_date: draft.nextServiceDate.trim() || null,
        next_service_mileage: nextServiceMileage,
      };

      if (editingRecordId) {
        const { data, error } = await supabase
          .from('maintenance_records')
          .update(payload)
          .eq('id', editingRecordId)
          .eq('vehicle_id', vehicle.id)
          .eq('user_id', user.id)
          .select(recordColumns)
          .maybeSingle();
        if (error) throw error;
        if (!data || data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Maintenance record was not updated for the authenticated owner');
        }
        persistedRecord = data;
      } else {
        const { data, error } = await supabase
          .from('maintenance_records')
          .insert({
            ...payload,
            vehicle_id: vehicle.id,
            user_id: user.id,
          })
          .select(recordColumns)
          .single();
        if (error) throw error;
        if (data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Inserted maintenance record did not match its authenticated owner');
        }
        persistedRecord = data;
      }

      const wasEditing = editingRecordId !== null;
      setDraft(null);
      setEditingRecordId(null);
      setFormError('');
      try {
        const refreshedRecords = await fetchRecords(supabase, vehicle.id, user.id);
        setRecords(refreshedRecords);
        showNotice(wasEditing ? text.updated : text.saved);
      } catch (refreshError) {
        logError('Maintenance record saved but the service log failed to refresh', refreshError);
        setRecords((current) =>
          [
            ...current.filter((record) => record.id !== persistedRecord?.id),
            persistedRecord!,
          ].sort(compareRecords),
        );
        showNotice(text.savedRefreshError);
      }
    } catch (error) {
      logError('Unable to save maintenance record', error);
      setFormError(text.saveError);
    } finally {
      setIsSaving(false);
    }
  }, [
    draft,
    editingRecordId,
    showNotice,
    text.saveError,
    text.saved,
    text.savedRefreshError,
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
        .from('maintenance_records')
        .delete()
        .eq('id', recordToDelete.id)
        .eq('vehicle_id', vehicle.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Maintenance record was not deleted for the authenticated owner');

      const removedId = recordToDelete.id;
      setRecordToDelete(null);
      try {
        const refreshedRecords = await fetchRecords(supabase, vehicle.id, user.id);
        setRecords(refreshedRecords);
      } catch (refreshError) {
        logError('Maintenance record deleted but the service log failed to refresh', refreshError);
        setRecords((current) => current.filter((record) => record.id !== removedId));
        setErrorMessage(text.savedRefreshError);
      }
      showNotice(text.deleted);
    } catch (error) {
      logError('Unable to delete maintenance record', error);
      setRecordToDelete(null);
      setErrorMessage(text.deleteError);
    } finally {
      setIsDeleting(false);
    }
  }, [
    recordToDelete,
    showNotice,
    text.deleteError,
    text.deleted,
    text.savedRefreshError,
    user,
    vehicle,
  ]);

  const calculatedRecords = useMemo(
    () =>
      vehicle
        ? records.map((record) => ({
            record,
            status: getMaintenanceStatus(record, vehicle.mileage),
          }))
        : [],
    [records, vehicle],
  );
  const statusCounts = useMemo(
    () => ({
      overdue: calculatedRecords.filter(({ status }) => status === 'overdue').length,
      dueSoon: calculatedRecords.filter(({ status }) => status === 'dueSoon').length,
      onTrack: calculatedRecords.filter(({ status }) => status === 'onTrack').length,
    }),
    [calculatedRecords],
  );
  const nextUp = useMemo(() => {
    const priority: Record<MaintenanceStatus, number> = {
      overdue: 0,
      dueSoon: 1,
      onTrack: 2,
    };
    return [...calculatedRecords]
      .filter(({ status }) => status !== null)
      .sort((left, right) => {
        const statusDifference = priority[left.status!] - priority[right.status!];
        if (statusDifference !== 0) return statusDifference;
        const leftDate = left.record.next_service_date ?? '9999-12-31';
        const rightDate = right.record.next_service_date ?? '9999-12-31';
        if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);
        return (
          (left.record.next_service_mileage ?? Number.MAX_SAFE_INTEGER) -
          (right.record.next_service_mileage ?? Number.MAX_SAFE_INTEGER)
        );
      })[0] ?? null;
  }, [calculatedRecords]);

  const cardWidth = Math.min(width, 496);
  const totalTracked = statusCounts.overdue + statusCounts.dueSoon + statusCounts.onTrack;
  const totalCount = records.length;
  const colorForStatus = (status: MaintenanceStatus) =>
    status === 'overdue'
      ? colors.error
      : status === 'dueSoon'
        ? colors.warning
        : colors.success;

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
            <View style={styles.vehicleType}>
              <Text style={styles.vehicleTypeText}>
                {vehicle.type === 'motorcycle' ? text.motorcycle : text.car}
              </Text>
            </View>
          </View>

          <View style={[styles.titleRow, isArabic && sharedStyles.rowReverse]}>
            <View style={styles.titleBlock}>
              <Text style={styles.pageEyebrow}>{text.vehicle}</Text>
              <Text style={[styles.pageTitle, { writingDirection: direction }]}>
                {text.title}
              </Text>
            </View>
            <View style={styles.mileagePill}>
              <Text style={styles.mileageLabel}>{text.currentMileage}</Text>
              <Text style={styles.mileageValue}>
                {formatMileage(vehicle.mileage)} <Text style={styles.mileageUnit}>KM</Text>
              </Text>
            </View>
          </View>

          <View style={styles.signalSection}>
            <View style={styles.signalBar}>
              {totalTracked > 0 ? (
                <>
                  {statusCounts.overdue > 0 && (
                    <View
                      style={[
                        styles.signalSegment,
                        {
                          flex: statusCounts.overdue,
                          backgroundColor: colors.error,
                        },
                      ]}
                    />
                  )}
                  {statusCounts.dueSoon > 0 && (
                    <View
                      style={[
                        styles.signalSegment,
                        {
                          flex: statusCounts.dueSoon,
                          backgroundColor: colors.warning,
                        },
                      ]}
                    />
                  )}
                  {statusCounts.onTrack > 0 && (
                    <View
                      style={[
                        styles.signalSegment,
                        {
                          flex: statusCounts.onTrack,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                  )}
                </>
              ) : (
                <View style={[styles.signalSegment, styles.signalUnknown]} />
              )}
            </View>
            <View style={[styles.signalLegend, isArabic && sharedStyles.rowReverse]}>
              <StatusLegend
                label={text.overdue}
                count={statusCounts.overdue}
                color={colors.error}
                styles={styles}
              />
              <StatusLegend
                label={text.dueSoon}
                count={statusCounts.dueSoon}
                color={colors.warning}
                styles={styles}
              />
              <StatusLegend
                label={text.onTrack}
                count={statusCounts.onTrack}
                color={colors.success}
                styles={styles}
              />
            </View>
            {totalTracked < totalCount && (
              <Text style={[styles.untrackedNote, { writingDirection: direction }]}>
                {formatMileage(totalCount - totalTracked)} · {text.notScheduled}
              </Text>
            )}
          </View>

          {nextUp ? (
            <NextUpPanel
              item={nextUp.record}
              status={nextUp.status}
              currentMileage={vehicle.mileage}
              color={colorForStatus(nextUp.status!)}
              styles={styles}
              text={text}
              direction={direction}
              isArabic={isArabic}
            />
          ) : (
            <View style={styles.noNextPanel}>
              <View style={[styles.panelTopRow, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.panelAccent} />
                <Text style={styles.nextEyebrow}>{text.noUpcoming}</Text>
              </View>
              <Text style={[styles.noNextDescription, { writingDirection: direction }]}>
                {text.noUpcomingDetail}
              </Text>
            </View>
          )}

          <View style={[styles.sectionHeader, isArabic && sharedStyles.rowReverse]}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionTitle}>{text.history}</Text>
            <Text style={styles.sectionCount}>{String(totalCount).padStart(2, '0')}</Text>
            <View style={styles.sectionRule} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.addRecord}
              onPress={beginAdd}
              style={styles.addCompact}
            >
              <Text style={styles.addCompactGlyph}>+</Text>
            </Pressable>
          </View>

          {totalCount === 0 ? (
            <View style={styles.emptyPanel}>
              <View style={styles.emptyDial}>
                <View style={styles.emptyDialInner} />
                <Text style={styles.emptyGlyph}>⌁</Text>
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
            <View style={styles.timeline}>
              {calculatedRecords.map(({ record, status }, index) => (
                <MaintenanceTimelineItem
                  key={record.id}
                  record={record}
                  status={status}
                  color={status ? colorForStatus(status) : colors.accent}
                  styles={styles}
                  text={text}
                  direction={direction}
                  isArabic={isArabic}
                  isLast={index === calculatedRecords.length - 1}
                  onEdit={() => beginEdit(record)}
                  onDelete={() => setRecordToDelete(record)}
                />
              ))}
            </View>
          )}

          {!!errorMessage && (
            <InlineFeedback styles={styles} message={errorMessage} isArabic={isArabic} />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={beginAdd}
            style={[styles.primaryButton, styles.bottomAddButton, isArabic && sharedStyles.rowReverse]}
          >
            <Text style={styles.primaryButtonText}>{text.addRecord}</Text>
            <Text style={styles.primaryButtonArrow}>{isArabic ? '←' : '→'}</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {draft && (
        <ServiceRecordModal
          draft={draft}
          isEditing={editingRecordId !== null}
          isSaving={isSaving}
          errorMessage={formError}
          colors={colors}
          styles={styles}
          text={text}
          direction={direction}
          isArabic={isArabic}
          width={width}
          height={height}
          refs={{
            serviceType: serviceTypeRef,
            description: descriptionRef,
            serviceDate: dateRef,
            mileage: mileageRef,
            cost: costRef,
            workshop: workshopRef,
            notes: notesRef,
            nextServiceDate: nextDateRef,
            nextServiceMileage: nextMileageRef,
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
            ? `${recordToDelete.service_type} · ${formatDate(recordToDelete.service_date)}`
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

function StatusLegend({
  label,
  count,
  color,
  styles,
}: {
  label: string;
  count: number;
  color: string;
  styles: ScreenStyles;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendCount}>{String(count).padStart(2, '0')}</Text>
      <Text numberOfLines={1} style={styles.legendLabel}>
        {label}
      </Text>
    </View>
  );
}

function NextUpPanel({
  item,
  status,
  currentMileage,
  color,
  styles,
  text,
  direction,
  isArabic: arabic,
}: {
  item: MaintenanceRecord;
  status: MaintenanceStatus | null;
  currentMileage: number;
  color: string;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
}) {
  const remainingMileage =
    item.next_service_mileage === null
      ? null
      : item.next_service_mileage - currentMileage;
  const hasDate = item.next_service_date !== null;

  return (
    <View style={styles.nextPanel}>
      <View style={styles.scanLine} />
      <View style={[styles.panelTopRow, isArabic && sharedStyles.rowReverse]}>
        <View style={[styles.panelAccent, { backgroundColor: color }]} />
        <Text style={styles.nextEyebrow}>{text.nextUp} · {item.service_type}</Text>
        {status && (
          <View style={[styles.statusBadge, { borderColor: `${color}66`, backgroundColor: `${color}14` }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>
              {status === 'overdue'
                ? text.overdue
                : status === 'dueSoon'
                  ? text.dueSoon
                  : text.onTrack}
            </Text>
          </View>
        )}
      </View>
      {remainingMileage !== null ? (
        <View style={[styles.nextMileageRow, isArabic && sharedStyles.rowReverse]}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.nextMileageValue, remainingMileage < 0 && { color }]}
          >
            {formatMileage(remainingMileage)}
          </Text>
          <Text style={styles.nextMileageUnit}>
            {remainingMileage < 0 ? text.kmOverdue : text.nextMileage}
          </Text>
        </View>
      ) : (
        <Text style={[styles.nextMileagePlaceholder, { color }]}>{text.noUpcoming}</Text>
      )}
      {hasDate && (
        <View style={[styles.nextDateLine, isArabic && sharedStyles.rowReverse]}>
          <Text style={styles.nextDateLabel}>{text.dueDate}</Text>
          <Text style={[styles.nextDateValue, { writingDirection: direction }]}>
            {formatDate(item.next_service_date)}
          </Text>
        </View>
      )}
      <View style={[styles.nextSignalLine, { backgroundColor: `${color}55` }]} />
      <Text style={[styles.nextSource, { writingDirection: direction }]}>
        {text.service}: {item.service_type}
        {item.next_service_mileage !== null
          ? ` · ${formatMileage(item.next_service_mileage)} KM`
          : ''}
      </Text>
    </View>
  );
}

function MaintenanceTimelineItem({
  record,
  status,
  color,
  styles,
  text,
  direction,
  isArabic: arabic,
  isLast,
  onEdit,
  onDelete,
}: {
  record: MaintenanceRecord;
  status: MaintenanceStatus | null;
  color: string;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.timelineRow, arabic && sharedStyles.rowReverse]}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineNode, { borderColor: color, backgroundColor: `${color}22` }]}>
          <View style={[styles.timelineNodeCore, { backgroundColor: color }]} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.recordCard}>
        <View style={[styles.recordTop, arabic && sharedStyles.rowReverse]}>
          <View style={styles.recordHeading}>
            <Text style={styles.recordEyebrow}>{text.service}</Text>
            <Text
              numberOfLines={2}
              style={[styles.recordTitle, { writingDirection: direction }]}
            >
              {record.service_type}
            </Text>
          </View>
          <View style={styles.recordDateBlock}>
            <Text style={styles.recordDate}>{formatDate(record.service_date)}</Text>
            <View style={[styles.recordStatus, { borderColor: `${color}55` }]}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.recordStatusText, { color }]}>
                {status === null
                  ? text.logged
                  : status === 'overdue'
                    ? text.overdue
                    : status === 'dueSoon'
                      ? text.dueSoon
                      : text.onTrackLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.recordMetrics, arabic && sharedStyles.rowReverse]}>
          <Metric label={text.mileage} value={`${formatMileage(record.mileage)} KM`} styles={styles} />
          {record.cost !== null && (
            <Metric label={text.cost} value={formatCost(record.cost) ?? ''} styles={styles} />
          )}
        </View>

        {!!record.description && (
          <Text style={[styles.recordDescription, { writingDirection: direction }]}>
            {record.description}
          </Text>
        )}
        <View style={[styles.workshopRow, arabic && sharedStyles.rowReverse]}>
          <Text style={styles.workshopGlyph}>⌖</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.workshopText,
              !record.workshop && styles.workshopMissing,
              { writingDirection: direction },
            ]}
          >
            {record.workshop ?? text.noWorkshop}
          </Text>
        </View>

        {(record.next_service_date || record.next_service_mileage !== null) && (
          <View style={[styles.nextRecordLine, arabic && sharedStyles.rowReverse]}>
            <Text style={styles.nextRecordLabel}>{text.next}</Text>
            <Text style={[styles.nextRecordValue, { writingDirection: direction }]}>
              {[
                record.next_service_date
                  ? formatDate(record.next_service_date)
                  : null,
                record.next_service_mileage !== null
                  ? `${formatMileage(record.next_service_mileage)} KM`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        )}

        {!!record.notes && (
          <Text style={[styles.recordNotes, { writingDirection: direction }]}>
            {record.notes}
          </Text>
        )}

        <View style={[styles.recordActions, arabic && sharedStyles.rowReverse]}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={styles.recordAction}>
            <Text style={styles.editActionGlyph}>✎</Text>
            <Text style={styles.editActionText}>{text.edit}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDelete} style={styles.recordAction}>
            <Text style={styles.deleteActionGlyph}>×</Text>
            <Text style={styles.deleteActionText}>{text.delete}</Text>
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
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function ServiceRecordModal({
  draft,
  isEditing,
  isSaving,
  errorMessage,
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
  draft: ServiceDraft;
  isEditing: boolean;
  isSaving: boolean;
  errorMessage: string;
  colors: ScreenColors;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  width: number;
  height: number;
  refs: Record<FormFieldKey, React.RefObject<TextInput | null>>;
  onChange: React.Dispatch<React.SetStateAction<ServiceDraft | null>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const update = (key: keyof ServiceDraft) => (value: string) => {
    onChange((current) => (current ? { ...current, [key]: value } : current));
  };
  const focus = (key: FormFieldKey) => () => refs[key].current?.focus();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View
        style={[
          styles.modalBackdrop,
          {
            paddingTop: Math.max(12, height * 0.025, insets.top + 8),
            paddingBottom: Math.max(8, insets.bottom + 8),
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { maxWidth: Math.min(width - 28, 500) }]}>
            <View style={[styles.modalHeader, arabic && sharedStyles.rowReverse]}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalEyebrow}>{text.section}</Text>
                <Text style={[styles.modalTitle, { writingDirection: direction }]}>
                  {isEditing ? text.edit : text.addRecord}
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
                label={text.serviceType}
                value={draft.serviceType}
                placeholder={text.serviceTypePlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={refs.serviceType}
                onChangeText={update('serviceType')}
                returnKeyType="next"
                onSubmitEditing={focus('description')}
              />
              <FormField
                label={text.descriptionOptional}
                value={draft.description}
                placeholder={text.descriptionPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={refs.description}
                onChangeText={update('description')}
                returnKeyType="next"
                onSubmitEditing={focus('serviceDate')}
              />
              <View style={[styles.formColumns, arabic && sharedStyles.rowReverse]}>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.serviceDate}
                    value={draft.serviceDate}
                    placeholder={text.datePlaceholder}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    ref={refs.serviceDate}
                    onChangeText={update('serviceDate')}
                    returnKeyType="next"
                    onSubmitEditing={focus('mileage')}
                  />
                </View>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.mileage}
                    value={draft.mileage}
                    placeholder={text.mileagePlaceholder}
                    suffix={text.km}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="number-pad"
                    ref={refs.mileage}
                    onChangeText={update('mileage')}
                    returnKeyType="next"
                    onSubmitEditing={focus('cost')}
                  />
                </View>
              </View>
              <View style={[styles.formColumns, arabic && sharedStyles.rowReverse]}>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.costOptional}
                    value={draft.cost}
                    placeholder={text.costPlaceholder}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="decimal-pad"
                    ref={refs.cost}
                    onChangeText={update('cost')}
                    returnKeyType="next"
                    onSubmitEditing={focus('workshop')}
                  />
                </View>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.workshopOptional}
                    value={draft.workshop}
                    placeholder={text.workshopPlaceholder}
                    styles={styles}
                    colors={colors}
                    direction={direction}
                    disabled={isSaving}
                    ref={refs.workshop}
                    onChangeText={update('workshop')}
                    returnKeyType="next"
                    onSubmitEditing={focus('notes')}
                  />
                </View>
              </View>
              <FormField
                label={text.notesOptional}
                value={draft.notes}
                placeholder={text.notesPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={refs.notes}
                onChangeText={update('notes')}
                returnKeyType="next"
                onSubmitEditing={focus('nextServiceDate')}
                multiline
              />
              <View style={styles.nextFormDivider}>
                <View style={styles.sectionRule} />
                <Text style={styles.nextFormLabel}>{text.nextService}</Text>
                <View style={styles.sectionRule} />
              </View>
              <View style={[styles.formColumns, arabic && sharedStyles.rowReverse]}>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.nextServiceDate}
                    value={draft.nextServiceDate}
                    placeholder={text.nextDatePlaceholder}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    ref={refs.nextServiceDate}
                    onChangeText={update('nextServiceDate')}
                    returnKeyType="next"
                    onSubmitEditing={focus('nextServiceMileage')}
                  />
                </View>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.nextServiceMileage}
                    value={draft.nextServiceMileage}
                    placeholder={text.mileagePlaceholder}
                    suffix={text.km}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="number-pad"
                    ref={refs.nextServiceMileage}
                    onChangeText={update('nextServiceMileage')}
                    returnKeyType="done"
                    onSubmitEditing={onSave}
                  />
                </View>
              </View>

              {!!errorMessage && (
                <InlineFeedback styles={styles} message={errorMessage} isArabic={arabic} />
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
  returnKeyType?: 'next' | 'done';
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmTopRule} />
          <Text style={[styles.confirmEyebrow, { writingDirection: direction }]}>{title}</Text>
          <Text style={[styles.confirmBody, { writingDirection: direction }]}>{body}</Text>
          <Text style={[styles.confirmDescription, { writingDirection: direction }]}>
            {description}
          </Text>
          <View style={[styles.confirmActions, direction === 'rtl' && sharedStyles.rowReverse]}>
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onCancel}
              style={styles.confirmCancel}
            >
              <Text style={styles.confirmCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onConfirm}
              style={styles.confirmButton}
            >
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
    scrollContent: {
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 24,
    },
    header: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
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
    headerEyebrow: {
      color: colors.muted,
      fontSize: 8,
      fontWeight: '600',
      letterSpacing: 1.8,
      marginTop: 5,
      textTransform: 'uppercase',
    },
    vehicleType: {
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    vehicleTypeText: { color: colors.accent, fontSize: 9, fontWeight: '600' },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 9,
      marginTop: 22,
    },
    titleBlock: { flexShrink: 1 },
    pageEyebrow: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 2 },
    pageTitle: {
      color: colors.foreground,
      fontSize: 32,
      lineHeight: 37,
      fontWeight: '700',
      letterSpacing: -1.1,
      marginTop: 5,
    },
    mileagePill: {
      alignItems: 'flex-end',
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    mileageLabel: { color: colors.muted, fontSize: 7, fontWeight: '600', letterSpacing: 1.1 },
    mileageValue: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
      marginTop: 5,
    },
    mileageUnit: { color: colors.accent, fontSize: 8, fontWeight: '700' },
    signalSection: { marginTop: 17 },
    signalBar: {
      height: 6,
      flexDirection: 'row',
      gap: 2,
      overflow: 'hidden',
      borderRadius: 4,
      backgroundColor: colors.surfaceStrong,
    },
    signalSegment: { minWidth: 3, height: '100%' },
    signalUnknown: { flex: 1, backgroundColor: colors.borderStrong },
    signalLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 6, height: 6, borderRadius: 2 },
    legendCount: { color: colors.foreground, fontSize: 8, fontWeight: '600', fontVariant: ['tabular-nums'] },
    legendLabel: { color: colors.muted, fontSize: 7, fontWeight: '500', letterSpacing: 0.5 },
    untrackedNote: { color: colors.muted, fontSize: 8, marginTop: 7 },
    nextPanel: {
      position: 'relative',
      overflow: 'hidden',
      marginTop: 16,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${colors.accent}55`,
      backgroundColor: colors.surface,
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 36,
      backgroundColor: `${colors.accent}0B`,
    },
    panelTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    panelAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: colors.accent },
    nextEyebrow: {
      flex: 1,
      color: colors.accent,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
    },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
    nextMileageRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 11 },
    nextMileageValue: {
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 44,
      lineHeight: 50,
      fontWeight: '300',
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
    },
    nextMileageUnit: { color: colors.accent, fontSize: 9, fontWeight: '600', letterSpacing: 1 },
    nextMileagePlaceholder: { fontSize: 19, fontWeight: '600', marginTop: 15 },
    nextDateLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 7 },
    nextDateLabel: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1 },
    nextDateValue: { color: colors.foreground, fontSize: 10, fontWeight: '500' },
    nextSignalLine: { width: 36, height: 2, borderRadius: 1, marginTop: 15 },
    nextSource: { color: colors.muted, fontSize: 9, marginTop: 10 },
    noNextPanel: {
      marginTop: 16,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    noNextDescription: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 22,
      marginBottom: 10,
    },
    sectionMarker: { width: 3, height: 13, borderRadius: 2, backgroundColor: colors.accent },
    sectionTitle: { color: colors.foreground, fontSize: 9, fontWeight: '600', letterSpacing: 1.5 },
    sectionCount: { color: colors.accent, fontSize: 9, fontWeight: '600', fontVariant: ['tabular-nums'] },
    sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    addCompact: {
      width: 29,
      height: 29,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: `${colors.accent}66`,
      backgroundColor: `${colors.accent}12`,
    },
    addCompactGlyph: { color: colors.accent, fontSize: 19, lineHeight: 21 },
    emptyPanel: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 26,
      paddingBottom: 21,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    emptyDial: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 40,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.panel,
    },
    emptyDialInner: {
      position: 'absolute',
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyGlyph: { color: colors.accent, fontSize: 31 },
    emptyTitle: { color: colors.foreground, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginTop: 15 },
    emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8 },
    primaryButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 17,
      borderRadius: 15,
      backgroundColor: colors.accent,
    },
    primaryButtonText: { color: colors.accentInk, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    primaryButtonArrow: { color: colors.accentInk, fontSize: 17, lineHeight: 20 },
    bottomAddButton: { alignSelf: 'stretch', marginTop: 14 },
    timeline: { paddingTop: 1 },
    timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: 9 },
    timelineRail: { width: 20, alignItems: 'center' },
    timelineNode: {
      zIndex: 1,
      width: 17,
      height: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      borderWidth: 1,
      marginTop: 17,
    },
    timelineNodeCore: { width: 5, height: 5, borderRadius: 3 },
    timelineLine: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginTop: 3 },
    recordCard: {
      flex: 1,
      minWidth: 0,
      marginBottom: 9,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    recordTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    recordHeading: { flex: 1, minWidth: 0 },
    recordEyebrow: { color: colors.muted, fontSize: 7, fontWeight: '600', letterSpacing: 1.4 },
    recordTitle: { color: colors.foreground, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 5 },
    recordDateBlock: { alignItems: 'flex-end', gap: 6 },
    recordDate: { color: colors.muted, fontSize: 8, fontWeight: '500' },
    recordStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    recordStatusText: { fontSize: 7, fontWeight: '700', letterSpacing: 0.4 },
    recordMetrics: { flexDirection: 'row', gap: 10, marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border },
    metricCell: { flex: 1, minWidth: 0 },
    metricLabel: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 0.6 },
    metricValue: { color: colors.foreground, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 5 },
    recordDescription: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 11 },
    workshopRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
    workshopGlyph: { color: colors.accent, fontSize: 13 },
    workshopText: { flex: 1, color: colors.foreground, fontSize: 9, fontWeight: '500' },
    workshopMissing: { color: colors.muted },
    nextRecordLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 11,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    nextRecordLabel: { color: colors.accent, fontSize: 7, fontWeight: '600', letterSpacing: 0.8 },
    nextRecordValue: { flex: 1, color: colors.foreground, fontSize: 8, textAlign: 'right' },
    recordNotes: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 9 },
    recordActions: { flexDirection: 'row', gap: 8, marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border },
    recordAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 3 },
    editActionGlyph: { color: colors.accent, fontSize: 12 },
    editActionText: { color: colors.muted, fontSize: 8, fontWeight: '600' },
    deleteActionGlyph: { color: colors.error, fontSize: 14, lineHeight: 15 },
    deleteActionText: { color: colors.error, fontSize: 8, fontWeight: '600' },
    stateScreen: { flex: 1, padding: 20, paddingTop: 10 },
    stateCard: {
      alignItems: 'center',
      gap: 14,
      marginTop: 30,
      padding: 24,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    stateTitle: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
    stateAction: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 13, backgroundColor: colors.accent },
    stateActionText: { color: colors.accentInk, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    feedback: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      padding: 11,
      borderWidth: 1,
      borderColor: `${colors.error}55`,
      borderRadius: 13,
      backgroundColor: `${colors.error}12`,
    },
    feedbackDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error, marginTop: 5 },
    feedbackText: { flex: 1, color: colors.error, fontSize: 10, lineHeight: 16 },
    refreshSpinner: { marginTop: 10 },
    toast: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 18,
      paddingVertical: 13,
      paddingHorizontal: 15,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.panel,
    },
    toastText: { color: colors.foreground, fontSize: 11, textAlign: 'center' },
    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 14,
      paddingBottom: 8,
      backgroundColor: 'rgba(0,0,0,0.74)',
    },
    modalKeyboard: { width: '100%', maxHeight: '100%', alignItems: 'center', justifyContent: 'flex-end' },
    modalCard: {
      width: '100%',
      maxHeight: '97%',
      paddingHorizontal: 17,
      paddingTop: 16,
      paddingBottom: 12,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    modalHeading: { flex: 1 },
    modalEyebrow: { color: colors.accent, fontSize: 7, fontWeight: '600', letterSpacing: 1.6 },
    modalTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700', marginTop: 5 },
    modalClose: { color: colors.muted, fontSize: 24, lineHeight: 28 },
    formField: { marginTop: 4 },
    fieldLabel: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1, marginTop: 11, marginBottom: 6 },
    inputWrap: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: { flex: 1, minHeight: 44, paddingVertical: 0, color: colors.foreground, fontSize: 12, fontWeight: '500' },
    inputSuffix: { color: colors.accent, fontSize: 9, fontWeight: '700' },
    formColumns: { flexDirection: 'row', gap: 9 },
    formColumn: { flex: 1, minWidth: 0 },
    multilineWrap: { alignItems: 'flex-start', minHeight: 63 },
    multilineInput: { minHeight: 61, paddingTop: 10 },
    nextFormDivider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
    nextFormLabel: { color: colors.accent, fontSize: 7, fontWeight: '600', letterSpacing: 0.8 },
    buttonDisabled: { opacity: 0.58 },
    cancelButton: { alignItems: 'center', paddingVertical: 10 },
    cancelButtonText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 23, backgroundColor: 'rgba(0,0,0,0.74)' },
    confirmCard: {
      width: '100%',
      maxWidth: 390,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 17,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.panel,
    },
    confirmTopRule: { width: 35, height: 2, borderRadius: 1, backgroundColor: colors.error, marginBottom: 16 },
    confirmEyebrow: { color: colors.error, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
    confirmBody: { color: colors.foreground, fontSize: 14, fontWeight: '600', marginTop: 9 },
    confirmDescription: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 7 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 19 },
    confirmCancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    confirmCancelText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    confirmButton: { minHeight: 42, minWidth: 105, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.error },
    confirmButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  });
}
