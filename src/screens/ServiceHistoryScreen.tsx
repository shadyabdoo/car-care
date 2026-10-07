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
type ServiceType =
  | 'oil_change'
  | 'inspection'
  | 'brake_service'
  | 'tire_service'
  | 'battery'
  | 'cooling_system'
  | 'ac_service'
  | 'electrical'
  | 'engine'
  | 'transmission'
  | 'suspension'
  | 'scheduled_service'
  | 'repair'
  | 'other';
type Vehicle = {
  id: string;
  user_id: string;
  make: string;
  model: string;
  mileage: number;
};
type ServiceRecord = {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_date: string;
  odometer_km: number;
  service_type: ServiceType;
  title: string;
  description: string | null;
  workshop: string | null;
  technician: string | null;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type Draft = {
  serviceType: ServiceType;
  title: string;
  description: string;
  serviceDate: string;
  odometer: string;
  workshop: string;
  technician: string;
  partsCost: string;
  laborCost: string;
  notes: string;
};
type LoadStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'signedOut' | 'unconfigured';
type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof makeStyles>;
type Copy = { [Key in keyof typeof copy.en]: string };
type Props = { vehicleId: string; colorScheme: ThemeName; onBack: () => void };
type DraftField =
  | 'title'
  | 'description'
  | 'serviceDate'
  | 'odometer'
  | 'workshop'
  | 'technician'
  | 'partsCost'
  | 'laborCost'
  | 'notes';

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');
const recordColumns =
  'id, vehicle_id, user_id, service_date, odometer_km, service_type, title, description, workshop, technician, parts_cost, labor_cost, total_cost, notes, created_at, updated_at';
const serviceTypes: ServiceType[] = [
  'oil_change',
  'inspection',
  'brake_service',
  'tire_service',
  'battery',
  'cooling_system',
  'ac_service',
  'electrical',
  'engine',
  'transmission',
  'suspension',
  'scheduled_service',
  'repair',
  'other',
];

const copy = {
  en: {
    back: 'Back',
    section: 'SERVICE HISTORY',
    title: 'Logbook',
    currentOdometer: 'CURRENT ODOMETER',
    totalServices: 'TOTAL SERVICES',
    totalCost: 'TOTAL SPEND',
    latestService: 'LATEST SERVICE',
    latestOdometer: 'LATEST SERVICE ODOMETER',
    history: 'SERVICE TIMELINE',
    add: 'ADD SERVICE',
    addFirst: 'ADD FIRST SERVICE',
    emptyTitle: 'NO SERVICE HISTORY',
    emptyBody: 'Keep a clear record of repairs and routine work by logging the first completed service.',
    loading: 'Loading service history…',
    loadError: 'Unable to load service history.',
    retry: 'TRY AGAIN',
    signedOut: 'Sign in again to view this service history.',
    notFound: 'This vehicle is unavailable or no longer in your garage.',
    unconfigured: 'Connect Supabase to view service history.',
    date: 'DATE',
    odometer: 'ODOMETER',
    type: 'SERVICE TYPE',
    titleField: 'SERVICE TITLE',
    description: 'WORK COMPLETED',
    workshop: 'WORKSHOP',
    technician: 'TECHNICIAN',
    parts: 'PARTS COST',
    labor: 'LABOR COST',
    total: 'TOTAL COST',
    notes: 'NOTES',
    optional: 'OPTIONAL',
    km: 'KM',
    currency: 'EGP',
    datePlaceholder: 'YYYY-MM-DD',
    titlePlaceholder: 'e.g. Oil and filter change',
    descriptionPlaceholder: 'Describe the work completed',
    workshopPlaceholder: 'Workshop or service centre',
    technicianPlaceholder: 'Technician name',
    amountPlaceholder: '0.00',
    notesPlaceholder: 'Additional details',
    oilChange: 'Oil change',
    inspection: 'Inspection',
    brakeService: 'Brake service',
    tireService: 'Tyre service',
    battery: 'Battery',
    coolingSystem: 'Cooling system',
    acService: 'A/C service',
    electrical: 'Electrical',
    engine: 'Engine',
    transmission: 'Transmission',
    suspension: 'Suspension',
    scheduledService: 'Scheduled service',
    repair: 'Repair',
    other: 'Other',
    addTitle: 'NEW SERVICE ENTRY',
    editTitle: 'EDIT SERVICE ENTRY',
    save: 'SAVE SERVICE',
    saveChanges: 'SAVE CHANGES',
    cancel: 'CANCEL',
    edit: 'Edit',
    delete: 'Delete',
    invalidType: 'Choose a service type.',
    invalidTitle: 'Enter a service title.',
    invalidDate: 'Enter a valid date as YYYY-MM-DD.',
    invalidOdometer: 'Enter a valid non-negative odometer reading.',
    invalidParts: 'Enter a valid non-negative parts cost with up to two decimals.',
    invalidLabor: 'Enter a valid non-negative labor cost with up to two decimals.',
    invalidTotal: 'The combined service cost is above the supported limit.',
    saveError: 'Unable to save this service entry. Please try again.',
    saved: 'Service entry saved.',
    updated: 'Service entry updated.',
    refreshError: 'Saved, but service history could not refresh. Try again.',
    deleteTitle: 'DELETE SERVICE ENTRY?',
    deleteBody: 'This entry will be permanently removed from the vehicle logbook.',
    confirmDelete: 'DELETE ENTRY',
    deleteError: 'Unable to delete this service entry. Please try again.',
    deleteRefreshError: 'Deleted, but service history could not refresh. Try again.',
    deleted: 'Service entry deleted.',
    saving: 'SAVING…',
    deleting: 'DELETING…',
    noWorkshop: 'WORKSHOP NOT RECORDED',
    close: 'Close',
    records: 'ENTRIES',
    partsLabor: 'PARTS + LABOR',
  },
  ar: {
    back: 'رجوع',
    section: 'سجل الخدمات',
    title: 'دفتر الخدمة',
    currentOdometer: 'قراءة العداد الحالية',
    totalServices: 'إجمالي الخدمات',
    totalCost: 'إجمالي التكلفة',
    latestService: 'أحدث خدمة',
    latestOdometer: 'عداد أحدث خدمة',
    history: 'الجدول الزمني للخدمات',
    add: 'إضافة خدمة',
    addFirst: 'أضف أول خدمة',
    emptyTitle: 'لا يوجد سجل خدمات',
    emptyBody: 'احتفظ بسجل واضح للإصلاحات والصيانة الدورية بإضافة أول خدمة منجزة.',
    loading: 'جارٍ تحميل سجل الخدمات…',
    loadError: 'تعذّر تحميل سجل الخدمات.',
    retry: 'حاول مرة أخرى',
    signedOut: 'سجّل الدخول مجددًا لعرض سجل الخدمات.',
    notFound: 'المركبة غير متاحة أو لم تعد في مرآبك.',
    unconfigured: 'اربط Supabase لعرض سجل الخدمات.',
    date: 'التاريخ',
    odometer: 'العداد',
    type: 'نوع الخدمة',
    titleField: 'عنوان الخدمة',
    description: 'الأعمال المنجزة',
    workshop: 'مركز الخدمة',
    technician: 'الفني',
    parts: 'تكلفة القطع',
    labor: 'تكلفة العمالة',
    total: 'إجمالي التكلفة',
    notes: 'ملاحظات',
    optional: 'اختياري',
    km: 'كم',
    currency: 'ج.م',
    datePlaceholder: 'YYYY-MM-DD',
    titlePlaceholder: 'مثال: تغيير الزيت والفلتر',
    descriptionPlaceholder: 'صف الأعمال التي أُنجزت',
    workshopPlaceholder: 'الورشة أو مركز الخدمة',
    technicianPlaceholder: 'اسم الفني',
    amountPlaceholder: '0.00',
    notesPlaceholder: 'تفاصيل إضافية',
    oilChange: 'تغيير الزيت',
    inspection: 'فحص',
    brakeService: 'صيانة الفرامل',
    tireService: 'صيانة الإطارات',
    battery: 'البطارية',
    coolingSystem: 'نظام التبريد',
    acService: 'صيانة التكييف',
    electrical: 'كهرباء',
    engine: 'المحرك',
    transmission: 'ناقل الحركة',
    suspension: 'نظام التعليق',
    scheduledService: 'صيانة دورية',
    repair: 'إصلاح',
    other: 'أخرى',
    addTitle: 'إضافة سجل خدمة',
    editTitle: 'تعديل سجل الخدمة',
    save: 'حفظ الخدمة',
    saveChanges: 'حفظ التعديلات',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    invalidType: 'اختر نوع الخدمة.',
    invalidTitle: 'أدخل عنوان الخدمة.',
    invalidDate: 'أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD.',
    invalidOdometer: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    invalidParts: 'أدخل تكلفة قطع صحيحة غير سالبة وبحد أقصى منزلتين عشريتين.',
    invalidLabor: 'أدخل تكلفة عمالة صحيحة غير سالبة وبحد أقصى منزلتين عشريتين.',
    invalidTotal: 'إجمالي تكلفة الخدمة يتجاوز الحد المدعوم.',
    saveError: 'تعذّر حفظ سجل الخدمة. حاول مرة أخرى.',
    saved: 'تم حفظ سجل الخدمة.',
    updated: 'تم تعديل سجل الخدمة.',
    refreshError: 'تم الحفظ، لكن تعذّر تحديث سجل الخدمات. حاول مرة أخرى.',
    deleteTitle: 'حذف سجل الخدمة؟',
    deleteBody: 'سيُحذف هذا السجل نهائيًا من دفتر المركبة.',
    confirmDelete: 'حذف السجل',
    deleteError: 'تعذّر حذف سجل الخدمة. حاول مرة أخرى.',
    deleteRefreshError: 'تم الحذف، لكن تعذّر تحديث سجل الخدمات. حاول مرة أخرى.',
    deleted: 'تم حذف سجل الخدمة.',
    saving: 'جارٍ الحفظ…',
    deleting: 'جارٍ الحذف…',
    noWorkshop: 'لم يُسجل مركز الخدمة',
    close: 'إغلاق',
    records: 'السجلات',
    partsLabor: 'القطع + العمالة',
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
    dangerSurface: 'rgba(255,51,85,0.1)',
  },
  light: {
    background: '#E6EBEE',
    panel: '#F4F7F9',
    surface: 'rgba(255,255,255,0.72)',
    surfaceStrong: 'rgba(255,255,255,0.95)',
    border: 'rgba(8,20,28,0.09)',
    borderStrong: 'rgba(8,20,28,0.2)',
    foreground: '#0A1218',
    muted: '#5F707A',
    accent: '#00C2B3',
    accentInk: '#00201D',
    grid: 'rgba(8,20,28,0.05)',
    error: '#D9143A',
    dangerSurface: 'rgba(217,20,58,0.08)',
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

function parseInteger(value: string) {
  const normalized = normalizeDigits(value).replace(/[,\u066c\s]/g, '');
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function parseDecimal(value: string) {
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
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function decimalPlaces(value: string) {
  let normalized = normalizeDigits(value)
    .replace(/\u066c/g, '')
    .replace(/\u066b/g, '.')
    .trim();
  const comma = normalized.lastIndexOf(',');
  const period = normalized.lastIndexOf('.');
  if (comma >= 0 && period >= 0) {
    const decimalSeparator = comma > period ? ',' : '.';
    return normalized.slice(normalized.lastIndexOf(decimalSeparator) + 1).length;
  }
  if (comma >= 0) {
    return /,\d{3}$/.test(normalized) ? 0 : normalized.length - comma - 1;
  }
  return period >= 0 ? normalized.length - period - 1 : 0;
}

function decimalToCents(value: number) {
  return Math.round(value * 100);
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

function formatMoney(value: number, text: Copy) {
  return `${text.currency} ${formatNumber(value)}`;
}

function serviceTypeLabel(type: ServiceType, text: Copy) {
  switch (type) {
    case 'oil_change': return text.oilChange;
    case 'inspection': return text.inspection;
    case 'brake_service': return text.brakeService;
    case 'tire_service': return text.tireService;
    case 'battery': return text.battery;
    case 'cooling_system': return text.coolingSystem;
    case 'ac_service': return text.acService;
    case 'electrical': return text.electrical;
    case 'engine': return text.engine;
    case 'transmission': return text.transmission;
    case 'suspension': return text.suspension;
    case 'scheduled_service': return text.scheduledService;
    case 'repair': return text.repair;
    case 'other': return text.other;
  }
}

function makeDraft(vehicle: Vehicle): Draft {
  return {
    serviceType: 'oil_change',
    title: '',
    description: '',
    serviceDate: todayAsISO(),
    odometer: String(vehicle.mileage),
    workshop: '',
    technician: '',
    partsCost: '',
    laborCost: '',
    notes: '',
  };
}

function draftFromRecord(record: ServiceRecord): Draft {
  return {
    serviceType: record.service_type,
    title: record.title,
    description: record.description ?? '',
    serviceDate: record.service_date,
    odometer: String(record.odometer_km),
    workshop: record.workshop ?? '',
    technician: record.technician ?? '',
    partsCost: Number(record.parts_cost) ? String(record.parts_cost) : '',
    laborCost: Number(record.labor_cost) ? String(record.labor_cost) : '',
    notes: record.notes ?? '',
  };
}

function compareRecords(left: ServiceRecord, right: ServiceRecord) {
  return (
    right.service_date.localeCompare(left.service_date) ||
    right.created_at.localeCompare(left.created_at)
  );
}

async function fetchServiceRecords(
  client: NonNullable<typeof supabase>,
  vehicleId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('service_records')
    .select(recordColumns)
    .eq('vehicle_id', vehicleId)
    .eq('user_id', userId)
    .order('service_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export default function ServiceHistoryScreen({ vehicleId, colorScheme, onBack }: Props) {
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
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ServiceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const requestIdRef = useRef(0);
  const saveLockRef = useRef(false);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldRefs = useRef<Record<DraftField, TextInput | null>>({
    title: null,
    description: null,
    serviceDate: null,
    odometer: null,
    workshop: null,
    technician: null,
    partsCost: null,
    laborCost: null,
    notes: null,
  });

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
      const realRecords = await fetchServiceRecords(client, vehicleId, authData.user.id);
      if (requestId !== requestIdRef.current) return;
      setUser(authData.user);
      setVehicle(vehicleData);
      setRecords(realRecords);
      setLoadStatus('ready');
    } catch (error) {
      logError('Unable to load service history for the authenticated vehicle', error);
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
    setEditingId(null);
    setFormError('');
    setErrorMessage('');
    setDraft(makeDraft(vehicle));
  }, [vehicle]);

  const beginEdit = useCallback((record: ServiceRecord) => {
    setEditingId(record.id);
    setFormError('');
    setErrorMessage('');
    setDraft(draftFromRecord(record));
  }, []);

  const closeForm = useCallback(() => {
    if (isSaving) return;
    setDraft(null);
    setEditingId(null);
    setFormError('');
  }, [isSaving]);

  const validateDraft = useCallback((value: Draft) => {
    if (!serviceTypes.includes(value.serviceType)) return text.invalidType;
    if (!value.title.trim()) return text.invalidTitle;
    if (!isValidDate(value.serviceDate)) return text.invalidDate;
    const odometer = parseInteger(value.odometer);
    if (
      value.odometer.trim().length === 0 ||
      !Number.isSafeInteger(odometer) ||
      odometer < 0 ||
      odometer > 2_147_483_647
    ) return text.invalidOdometer;

    const partsText = value.partsCost.trim() || '0';
    const laborText = value.laborCost.trim() || '0';
    const parts = parseDecimal(partsText);
    const labor = parseDecimal(laborText);
    if (!Number.isFinite(parts) || parts < 0 || parts > 9_999_999_999.99 ||
      decimalPlaces(partsText) > 2) return text.invalidParts;
    if (!Number.isFinite(labor) || labor < 0 || labor > 9_999_999_999.99 ||
      decimalPlaces(laborText) > 2) return text.invalidLabor;
    if (parts + labor > 99_999_999_999.99) return text.invalidTotal;
    return null;
  }, [text]);

  const saveRecord = useCallback(async () => {
    if (!supabase || !vehicle || !user || !draft || saveLockRef.current) return;
    setFormError('');
    const validationError = validateDraft(draft);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);
    let savedRecord: ServiceRecord | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setLoadStatus('signedOut');
        setDraft(null);
        return;
      }

      const payload = {
        service_date: draft.serviceDate,
        odometer_km: parseInteger(draft.odometer),
        service_type: draft.serviceType,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        workshop: draft.workshop.trim() || null,
        technician: draft.technician.trim() || null,
        parts_cost: parseDecimal(draft.partsCost.trim() || '0'),
        labor_cost: parseDecimal(draft.laborCost.trim() || '0'),
        notes: draft.notes.trim() || null,
      };
      if (editingId) {
        const { data, error } = await supabase
          .from('service_records')
          .update(payload)
          .eq('id', editingId)
          .eq('vehicle_id', vehicle.id)
          .eq('user_id', user.id)
          .select(recordColumns)
          .maybeSingle();
        if (error) throw error;
        if (!data || data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Service record was not updated for the authenticated owner');
        }
        savedRecord = data;
      } else {
        const { data, error } = await supabase
          .from('service_records')
          .insert({ ...payload, vehicle_id: vehicle.id, user_id: user.id })
          .select(recordColumns)
          .single();
        if (error) throw error;
        if (data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Inserted service record did not match its authenticated owner');
        }
        savedRecord = data;
      }

      const wasEditing = editingId !== null;
      setDraft(null);
      setEditingId(null);
      try {
        setRecords(await fetchServiceRecords(supabase, vehicle.id, user.id));
        showNotice(wasEditing ? text.updated : text.saved);
      } catch (refreshError) {
        logError('Service history saved but failed to refresh', refreshError);
        setRecords((current) =>
          [...current.filter((record) => record.id !== savedRecord?.id), savedRecord!]
            .sort(compareRecords),
        );
        showNotice(text.refreshError);
      }
    } catch (error) {
      logError('Unable to save service history record', error);
      setFormError(text.saveError);
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  }, [
    draft,
    editingId,
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
        .from('service_records')
        .delete()
        .eq('id', recordToDelete.id)
        .eq('vehicle_id', vehicle.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Service record was not deleted for the authenticated owner');

      const deletedId = recordToDelete.id;
      setRecordToDelete(null);
      try {
        setRecords(await fetchServiceRecords(supabase, vehicle.id, user.id));
      } catch (refreshError) {
        logError('Service history deleted but failed to refresh', refreshError);
        setRecords((current) => current.filter((record) => record.id !== deletedId));
        setErrorMessage(text.deleteRefreshError);
      }
      showNotice(text.deleted);
    } catch (error) {
      logError('Unable to delete service history record', error);
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
    const totalCostCents = records.reduce(
      (sum, record) => sum + Math.round(Number(record.total_cost) * 100),
      0,
    );
    return {
      count: records.length,
      totalCost: totalCostCents / 100,
      latest: records[0] ?? null,
    };
  }, [records]);
  const cardWidth = Math.min(width - 36, 540);
  const partsPreview = draft ? parseDecimal(draft.partsCost || '0') : 0;
  const laborPreview = draft ? parseDecimal(draft.laborCost || '0') : 0;
  const previewTotal =
    Number.isFinite(partsPreview) && Number.isFinite(laborPreview)
      ? (decimalToCents(partsPreview) + decimalToCents(laborPreview)) / 100
      : null;
  const statusMessage =
    loadStatus === 'error'
      ? text.loadError
      : loadStatus === 'signedOut'
        ? text.signedOut
        : loadStatus === 'notFound'
          ? text.notFound
          : text.unconfigured;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CockpitBackdrop colors={colors} />
      <View style={[styles.page, { paddingHorizontal: width < 370 ? 16 : 18 }]}>
        <View style={[styles.topBar, isArabic && sharedStyles.rowReverse]}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backArrow, isArabic && styles.arrowReversed]}>‹</Text>
            <Text style={styles.backLabel}>{text.back}</Text>
          </Pressable>
          <Text style={styles.topBrand}>CAR CARE / LOGBOOK</Text>
          <View style={styles.topIndicator} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingBlock}>
            <Text style={[styles.eyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>
              {text.section}
            </Text>
            <View style={[styles.headingRow, isArabic && sharedStyles.rowReverse]}>
              <Text style={[styles.title, { writingDirection: direction }]}>{text.title}</Text>
              <Text style={styles.recordCount}>{formatNumber(stats.count, 0)} {text.records}</Text>
            </View>
            {vehicle && (
              <View style={[styles.vehicleLine, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.vehicleDot} />
                <Text
                  numberOfLines={1}
                  style={[styles.vehicleName, { writingDirection: direction }]}
                >
                  {vehicle.make} {vehicle.model}
                </Text>
                <Text style={styles.vehicleMileage}>
                  {formatNumber(vehicle.mileage, 0)} KM
                </Text>
              </View>
            )}
          </View>

          {loadStatus === 'loading' ? (
            <View style={styles.statePanel}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.stateText}>{text.loading}</Text>
            </View>
          ) : loadStatus !== 'ready' ? (
            <View style={styles.statePanel}>
              <View style={styles.stateGlyph}><Text style={styles.stateGlyphText}>!</Text></View>
              <Text style={[styles.stateTitle, { writingDirection: direction }]}>{statusMessage}</Text>
              {loadStatus === 'error' && (
                <Pressable accessibilityRole="button" onPress={() => void loadData()} style={styles.retryButton}>
                  <Text style={styles.retryText}>{text.retry}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              <View style={styles.statsPanel}>
                <View style={[styles.statsHeader, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.statsEyebrow}>LOGBOOK / 01</Text>
                  <View style={styles.onlineDot} />
                </View>
                <View style={[styles.statsGrid, isArabic && sharedStyles.rowReverse]}>
                  <Metric label={text.totalServices} value={formatNumber(stats.count, 0)} styles={styles} />
                  <Metric label={text.totalCost} value={formatMoney(stats.totalCost, text)} styles={styles} />
                  <Metric
                    label={text.latestService}
                    value={stats.latest ? formatDate(stats.latest.service_date) : '—'}
                    styles={styles}
                  />
                  <Metric
                    label={text.latestOdometer}
                    value={stats.latest
                      ? `${formatNumber(stats.latest.odometer_km, 0)} KM`
                      : '—'}
                    styles={styles}
                  />
                </View>
                <View style={styles.statsRule} />
                <View style={[styles.odometerRow, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.odometerLabel}>{text.currentOdometer}</Text>
                  <Text style={styles.odometerValue}>{formatNumber(vehicle?.mileage ?? 0, 0)}</Text>
                  <Text style={styles.odometerUnit}>KM</Text>
                </View>
              </View>

              {!!errorMessage && (
                <View style={[styles.inlineError, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.inlineErrorGlyph}>!</Text>
                  <Text style={[styles.inlineErrorText, { writingDirection: direction }]}>
                    {errorMessage}
                  </Text>
                </View>
              )}
              {!!notice && (
                <View style={[styles.notice, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.noticeGlyph}>✓</Text>
                  <Text style={[styles.noticeText, { writingDirection: direction }]}>{notice}</Text>
                </View>
              )}

              <View style={[styles.sectionHeading, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.accentRule} />
                <Text style={styles.sectionTitle}>{text.history}</Text>
                <View style={styles.sectionRule} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={text.add}
                  onPress={beginAdd}
                  style={styles.addButton}
                >
                  <Text style={styles.addGlyph}>＋</Text>
                  <Text style={styles.addButtonText}>{text.add}</Text>
                </Pressable>
              </View>

              {records.length === 0 ? (
                <View style={styles.emptyPanel}>
                  <View style={styles.emptyDecor}>
                    <View style={styles.emptyRing}><Text style={styles.emptyGlyph}>⌁</Text></View>
                    <View style={styles.emptyLine} />
                  </View>
                  <Text style={[styles.emptyEyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>
                    00 / LOGBOOK
                  </Text>
                  <Text style={[styles.emptyTitle, { textAlign: isArabic ? 'right' : 'left' }]}>
                    {text.emptyTitle}
                  </Text>
                  <Text style={[styles.emptyBody, { writingDirection: direction, textAlign: isArabic ? 'right' : 'left' }]}>
                    {text.emptyBody}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={beginAdd} style={styles.emptyAction}>
                    <Text style={styles.emptyActionText}>＋  {text.addFirst}</Text>
                    <Text style={styles.emptyActionArrow}>{isArabic ? '‹' : '›'}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {records.map((record, index) => (
                    <ServiceRecordCard
                      key={record.id}
                      record={record}
                      isLast={index === records.length - 1}
                      text={text}
                      styles={styles}
                      direction={direction}
                      onEdit={() => beginEdit(record)}
                      onDelete={() => setRecordToDelete(record)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {draft && (
        <ServiceFormModal
          draft={draft}
          isEditing={editingId !== null}
          isSaving={isSaving}
          formError={formError}
          previewTotal={previewTotal}
          colors={colors}
          styles={styles}
          text={text}
          direction={direction}
          arabic={isArabic}
          width={width}
          height={height}
          fieldRefs={fieldRefs}
          onChange={setDraft}
          onSave={() => void saveRecord()}
          onCancel={closeForm}
        />
      )}

      <Modal
        visible={recordToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setRecordToDelete(null)}
        statusBarTranslucent
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmCard, { maxWidth: cardWidth }]}>
            <View style={styles.confirmMark}><Text style={styles.confirmMarkText}>!</Text></View>
            <Text style={styles.confirmEyebrow}>{text.section}</Text>
            <Text style={[styles.confirmTitle, { writingDirection: direction }]}>{text.deleteTitle}</Text>
            <Text style={[styles.confirmBody, { writingDirection: direction }]}>{text.deleteBody}</Text>
            <View style={[styles.confirmActions, isArabic && sharedStyles.rowReverse]}>
              <Pressable
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => setRecordToDelete(null)}
                style={styles.confirmCancel}
              >
                <Text style={styles.confirmCancelText}>{text.cancel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => void deleteRecord()}
                style={styles.confirmDelete}
              >
                {isDeleting ? <ActivityIndicator color={colors.foreground} /> :
                  <Text style={styles.confirmDeleteText}>{text.confirmDelete}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Metric({ label, value, styles }: { label: string; value: string; styles: ScreenStyles }) {
  return (
    <View style={styles.metricCell}>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ServiceRecordCard({
  record,
  isLast,
  text,
  styles,
  direction,
  onEdit,
  onDelete,
}: {
  record: ServiceRecord;
  isLast: boolean;
  text: Copy;
  styles: ScreenStyles;
  direction: 'ltr' | 'rtl';
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineNode}><View style={styles.timelineNodeInner} /></View>
        {!isLast && <View style={styles.timelineStem} />}
      </View>
      <View style={styles.recordCard}>
        <View style={[styles.recordTopline, isArabic && sharedStyles.rowReverse]}>
          <Text style={styles.recordType}>{serviceTypeLabel(record.service_type, text)}</Text>
          <Text style={styles.recordDate}>{formatDate(record.service_date)}</Text>
        </View>
        <Text style={[styles.recordTitle, { writingDirection: direction }]}>{record.title}</Text>
        <View style={[styles.recordMeta, isArabic && sharedStyles.rowReverse]}>
          <Text style={styles.recordMetaText}>
            {formatNumber(record.odometer_km, 0)} KM
          </Text>
          <View style={styles.metaDot} />
          <Text numberOfLines={1} style={[styles.recordMetaText, styles.workshopMeta, { writingDirection: direction }]}>
            {record.workshop || text.noWorkshop}
          </Text>
        </View>
        {!!record.description && (
          <Text style={[styles.recordDescription, { writingDirection: direction }]}>{record.description}</Text>
        )}
        <View style={styles.costStrip}>
          <View style={[styles.costLine, isArabic && sharedStyles.rowReverse]}>
            <Text style={styles.costLabel}>{text.partsLabor}</Text>
            <Text style={styles.costSubValue}>
              {formatMoney(Number(record.parts_cost) + Number(record.labor_cost), text)}
            </Text>
          </View>
          <View style={[styles.costLine, styles.totalCostLine, isArabic && sharedStyles.rowReverse]}>
            <Text style={styles.totalCostLabel}>{text.total}</Text>
            <Text style={styles.totalCostValue}>
              {formatMoney(Number(record.total_cost), text)}
            </Text>
          </View>
        </View>
        {!!record.notes && (
          <Text style={[styles.recordNotes, { writingDirection: direction }]}>{record.notes}</Text>
        )}
        {!!record.technician && (
          <Text style={[styles.technicianText, { writingDirection: direction }]}>
            {text.technician}: {record.technician}
          </Text>
        )}
        <View style={[styles.recordActions, isArabic && sharedStyles.rowReverse]}>
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

type ServiceFormProps = {
  draft: Draft;
  isEditing: boolean;
  isSaving: boolean;
  formError: string;
  previewTotal: number | null;
  colors: ScreenColors;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  arabic: boolean;
  width: number;
  height: number;
  fieldRefs: React.MutableRefObject<Record<DraftField, TextInput | null>>;
  onChange: React.Dispatch<React.SetStateAction<Draft | null>>;
  onSave: () => void;
  onCancel: () => void;
};

function ServiceFormModal({
  draft,
  isEditing,
  isSaving,
  formError,
  previewTotal,
  colors,
  styles,
  text,
  direction,
  arabic,
  width,
  height,
  fieldRefs,
  onChange,
  onSave,
  onCancel,
}: ServiceFormProps) {
  const update = (key: DraftField) => (value: string) => {
    onChange((current) => current ? { ...current, [key]: value } : current);
  };
  const focus = (key: DraftField) => () => fieldRefs.current[key]?.focus();
  const optional = ` · ${text.optional}`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.modalBackdrop, { paddingTop: Math.max(12, height * 0.02) }]}>
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { maxWidth: Math.min(width - 28, 540) }]}>
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
              <Text style={[styles.fieldLabel, { textAlign: arabic ? 'right' : 'left' }]}>{text.type}</Text>
              <View style={[styles.typeChoices, arabic && sharedStyles.rowReverse]}>
                {serviceTypes.map((serviceType) => (
                  <Pressable
                    key={serviceType}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: draft.serviceType === serviceType }}
                    disabled={isSaving}
                    onPress={() => onChange((current) => current ? { ...current, serviceType } : current)}
                    style={[styles.typeChoice, draft.serviceType === serviceType && styles.typeChoiceSelected]}
                  >
                    <Text style={[
                      styles.typeChoiceText,
                      draft.serviceType === serviceType && styles.typeChoiceTextSelected,
                    ]}>
                      {serviceTypeLabel(serviceType, text)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <FormField
                label={text.titleField}
                value={draft.title}
                placeholder={text.titlePlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={(ref) => { fieldRefs.current.title = ref; }}
                onChangeText={update('title')}
                returnKeyType="next"
                onSubmitEditing={focus('serviceDate')}
              />
              <FormField
                label={text.date}
                value={draft.serviceDate}
                placeholder={text.datePlaceholder}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                ref={(ref) => { fieldRefs.current.serviceDate = ref; }}
                onChangeText={update('serviceDate')}
                returnKeyType="next"
                onSubmitEditing={focus('odometer')}
              />
              <FormField
                label={text.odometer}
                value={draft.odometer}
                placeholder="Kilometres"
                suffix="KM"
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="number-pad"
                ref={(ref) => { fieldRefs.current.odometer = ref; }}
                onChangeText={update('odometer')}
                returnKeyType="next"
                onSubmitEditing={focus('workshop')}
              />
              <FormField
                label={`${text.workshop}${optional}`}
                value={draft.workshop}
                placeholder={text.workshopPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={(ref) => { fieldRefs.current.workshop = ref; }}
                onChangeText={update('workshop')}
                returnKeyType="next"
                onSubmitEditing={focus('technician')}
              />
              <FormField
                label={`${text.technician}${optional}`}
                value={draft.technician}
                placeholder={text.technicianPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                ref={(ref) => { fieldRefs.current.technician = ref; }}
                onChangeText={update('technician')}
                returnKeyType="next"
                onSubmitEditing={focus('partsCost')}
              />
              <View style={[styles.formColumns, arabic && sharedStyles.rowReverse]}>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.parts}
                    value={draft.partsCost}
                    placeholder={text.amountPlaceholder}
                    suffix={text.currency}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="decimal-pad"
                    ref={(ref) => { fieldRefs.current.partsCost = ref; }}
                    onChangeText={update('partsCost')}
                    returnKeyType="next"
                    onSubmitEditing={focus('laborCost')}
                  />
                </View>
                <View style={styles.formColumn}>
                  <FormField
                    label={text.labor}
                    value={draft.laborCost}
                    placeholder={text.amountPlaceholder}
                    suffix={text.currency}
                    styles={styles}
                    colors={colors}
                    direction="ltr"
                    disabled={isSaving}
                    keyboardType="decimal-pad"
                    ref={(ref) => { fieldRefs.current.laborCost = ref; }}
                    onChangeText={update('laborCost')}
                    returnKeyType="next"
                    onSubmitEditing={focus('description')}
                  />
                </View>
              </View>

              <View style={styles.totalPreview}>
                <View style={[styles.totalPreviewRule, arabic && styles.ruleRight]} />
                <View style={[styles.totalPreviewContent, arabic && sharedStyles.rowReverse]}>
                  <View>
                    <Text style={styles.totalPreviewLabel}>{text.total}</Text>
                    <Text style={styles.totalPreviewHint}>{text.partsLabor}</Text>
                  </View>
                  <Text style={styles.totalPreviewValue}>
                    {previewTotal === null ? '—' : formatMoney(previewTotal, text)}
                  </Text>
                </View>
              </View>

              <FormField
                label={`${text.description}${optional}`}
                value={draft.description}
                placeholder={text.descriptionPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                multiline
                ref={(ref) => { fieldRefs.current.description = ref; }}
                onChangeText={update('description')}
              />
              <FormField
                label={`${text.notes}${optional}`}
                value={draft.notes}
                placeholder={text.notesPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                multiline
                ref={(ref) => { fieldRefs.current.notes = ref; }}
                onChangeText={update('notes')}
              />

              {!!formError && (
                <View style={[styles.formError, arabic && sharedStyles.rowReverse]}>
                  <Text style={styles.inlineErrorGlyph}>!</Text>
                  <Text style={[styles.formErrorText, { writingDirection: direction }]}>{formError}</Text>
                </View>
              )}
              <View style={[styles.formActions, arabic && sharedStyles.rowReverse]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={onCancel}
                  style={styles.formCancel}
                >
                  <Text style={styles.formCancelText}>{text.cancel}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={onSave}
                  style={styles.formSave}
                >
                  {isSaving
                    ? <ActivityIndicator color={colors.accentInk} />
                    : <Text style={styles.formSaveText}>{isEditing ? text.saveChanges : text.save}</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  styles: ScreenStyles;
  colors: ScreenColors;
  direction: 'ltr' | 'rtl';
  disabled: boolean;
  suffix?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  returnKeyType?: 'next' | 'done';
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
};

const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  {
    label,
    value,
    placeholder,
    styles,
    colors,
    direction,
    disabled,
    suffix,
    keyboardType = 'default',
    multiline = false,
    returnKeyType,
    onChangeText,
    onSubmitEditing,
  },
  ref,
) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}>
        {label}
      </Text>
      <View style={[styles.inputShell, multiline && styles.inputShellMultiline]}>
        <TextInput
          ref={ref}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          editable={!disabled}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={!multiline}
          autoCapitalize={keyboardType === 'default' ? 'sentences' : 'none'}
          autoCorrect={keyboardType === 'default'}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            {
              writingDirection: direction,
              textAlign: direction === 'rtl' ? 'right' : 'left',
            },
          ]}
        />
        {!!suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
});

const sharedStyles = StyleSheet.create({
  rowReverse: { flexDirection: 'row-reverse' },
});

function makeStyles(colors: ScreenColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    page: { flex: 1, position: 'relative' },
    topBar: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: { flexDirection: 'row', alignItems: 'center', minWidth: 80, gap: 4 },
    backArrow: { color: colors.accent, fontSize: 30, lineHeight: 32, fontWeight: '300' },
    arrowReversed: { transform: [{ scaleX: -1 }] },
    backLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    topBrand: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
    topIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    scrollContent: { paddingTop: 18, paddingBottom: 24 },
    headingBlock: { marginBottom: 18 },
    eyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 2.1, fontWeight: '800' },
    headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 4 },
    title: { color: colors.foreground, fontSize: 34, lineHeight: 40, letterSpacing: -1.4, fontWeight: '700' },
    recordCount: { color: colors.muted, fontSize: 9, letterSpacing: 1.1, fontWeight: '700' },
    vehicleLine: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    vehicleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    vehicleName: { color: colors.foreground, fontSize: 12, fontWeight: '600', flex: 1 },
    vehicleMileage: { color: colors.muted, fontSize: 10, letterSpacing: 0.7, fontVariant: ['tabular-nums'] },
    statsPanel: {
      backgroundColor: colors.panel,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 15,
      overflow: 'hidden',
    },
    statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statsEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, fontWeight: '700' },
    onlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, opacity: 0.85 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    metricCell: { width: '50%', minWidth: 0, paddingEnd: 8, paddingTop: 7, paddingBottom: 5 },
    metricLabel: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
    metricValue: { color: colors.foreground, marginTop: 5, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
    statsRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: 15, marginBottom: 12 },
    odometerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
    odometerLabel: { flex: 1, color: colors.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '700' },
    odometerValue: { color: colors.accent, fontSize: 20, fontWeight: '700', letterSpacing: 1.1, fontVariant: ['tabular-nums'] },
    odometerUnit: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
    inlineError: { backgroundColor: colors.dangerSurface, borderColor: colors.error, borderWidth: 1, borderRadius: 10, marginTop: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
    inlineErrorGlyph: { color: colors.error, fontWeight: '900', fontSize: 14 },
    inlineErrorText: { flex: 1, color: colors.error, fontSize: 11, lineHeight: 16 },
    notice: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, marginTop: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
    noticeGlyph: { color: colors.accent, fontSize: 13, fontWeight: '900' },
    noticeText: { color: colors.foreground, flex: 1, fontSize: 11 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 27, marginBottom: 12 },
    accentRule: { width: 3, height: 14, backgroundColor: colors.accent, borderRadius: 2 },
    sectionTitle: { color: colors.foreground, fontSize: 10, letterSpacing: 1.3, fontWeight: '800' },
    sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    addButton: { minHeight: 32, paddingHorizontal: 9, borderRadius: 8, borderColor: colors.borderStrong, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    addGlyph: { color: colors.accent, fontSize: 16, lineHeight: 18 },
    addButtonText: { color: colors.foreground, fontSize: 8, letterSpacing: 0.7, fontWeight: '800' },
    emptyPanel: { borderRadius: 18, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, padding: 18, minHeight: 225, overflow: 'hidden' },
    emptyDecor: { height: 63, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    emptyRing: { width: 48, height: 48, borderRadius: 24, borderColor: colors.borderStrong, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    emptyGlyph: { color: colors.accent, fontSize: 22 },
    emptyLine: { height: StyleSheet.hairlineWidth, flex: 1, marginStart: 12, backgroundColor: colors.border },
    emptyEyebrow: { color: colors.accent, fontSize: 8, letterSpacing: 1.5, fontWeight: '800' },
    emptyTitle: { color: colors.foreground, marginTop: 6, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
    emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7, maxWidth: 330 },
    emptyAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, minHeight: 42, paddingHorizontal: 12, backgroundColor: colors.accent, borderRadius: 10 },
    emptyActionText: { color: colors.accentInk, fontSize: 9, letterSpacing: 0.8, fontWeight: '900' },
    emptyActionArrow: { color: colors.accentInk, fontSize: 22, fontWeight: '300' },
    timeline: { paddingTop: 1 },
    timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
    timelineRail: { width: 23, alignItems: 'center' },
    timelineNode: { width: 13, height: 13, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.background, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 18, zIndex: 1 },
    timelineNodeInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    timelineStem: { position: 'absolute', width: 1, top: 31, bottom: -1, backgroundColor: colors.borderStrong },
    recordCard: { flex: 1, backgroundColor: colors.panel, borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 12 },
    recordTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    recordType: { color: colors.accent, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', flexShrink: 1 },
    recordDate: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    recordTitle: { color: colors.foreground, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 7 },
    recordMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
    recordMetaText: { color: colors.muted, fontSize: 9, letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
    workshopMeta: { flexShrink: 1 },
    metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.accent, opacity: 0.8 },
    recordDescription: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
    costStrip: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 11, paddingTop: 9, gap: 6 },
    costLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    costLabel: { color: colors.muted, fontSize: 8, letterSpacing: 0.9, fontWeight: '700' },
    costSubValue: { color: colors.muted, fontSize: 9, fontVariant: ['tabular-nums'] },
    totalCostLine: { marginTop: 2 },
    totalCostLabel: { color: colors.foreground, fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
    totalCostValue: { color: colors.accent, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    recordNotes: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
    technicianText: { color: colors.muted, fontSize: 9, marginTop: 6 },
    recordActions: { flexDirection: 'row', gap: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 11, paddingTop: 9 },
    recordAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 },
    editGlyph: { color: colors.accent, fontSize: 13 },
    editText: { color: colors.foreground, fontSize: 9, fontWeight: '700' },
    deleteGlyph: { color: colors.error, fontSize: 17, lineHeight: 17 },
    deleteText: { color: colors.error, fontSize: 9, fontWeight: '700' },
    statePanel: { minHeight: 230, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    stateText: { color: colors.muted, fontSize: 12 },
    stateGlyph: { width: 36, height: 36, borderRadius: 18, borderColor: colors.error, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    stateGlyphText: { color: colors.error, fontSize: 18, fontWeight: '700' },
    stateTitle: { color: colors.foreground, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 300 },
    retryButton: { borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10, marginTop: 3 },
    retryText: { color: colors.accent, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingBottom: 10 },
    modalKeyboard: { width: '100%', maxHeight: '100%', alignItems: 'center', justifyContent: 'center' },
    modalCard: { width: '100%', maxHeight: '100%', backgroundColor: colors.panel, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalHeading: { flex: 1 },
    modalEyebrow: { color: colors.accent, fontSize: 8, letterSpacing: 1.7, fontWeight: '800' },
    modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 3 },
    iconButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    modalClose: { color: colors.muted, fontSize: 22, lineHeight: 24, fontWeight: '300' },
    typeChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7, marginBottom: 4 },
    typeChoice: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
    typeChoiceSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceStrong },
    typeChoiceText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    typeChoiceTextSelected: { color: colors.accent },
    fieldWrap: { marginTop: 11 },
    fieldLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
    inputShell: { minHeight: 43, marginTop: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 10 },
    inputShellMultiline: { minHeight: 68, alignItems: 'flex-start', paddingTop: 8 },
    input: { flex: 1, color: colors.foreground, fontSize: 12, minHeight: 41, paddingVertical: 7 },
    inputMultiline: { minHeight: 53, paddingTop: 0 },
    inputSuffix: { color: colors.muted, fontSize: 9, marginStart: 8, fontWeight: '700' },
    formColumns: { flexDirection: 'row', gap: 10 },
    formColumn: { flex: 1, minWidth: 0 },
    totalPreview: { marginTop: 13, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
    totalPreviewRule: { height: 2, width: 40, backgroundColor: colors.accent },
    ruleRight: { alignSelf: 'flex-end' },
    totalPreviewContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 9, gap: 8 },
    totalPreviewLabel: { color: colors.foreground, fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
    totalPreviewHint: { color: colors.muted, fontSize: 8, marginTop: 3 },
    totalPreviewValue: { color: colors.accent, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    formError: { marginTop: 11, padding: 9, borderRadius: 9, backgroundColor: colors.dangerSurface, flexDirection: 'row', gap: 7, alignItems: 'center' },
    formErrorText: { flex: 1, color: colors.error, fontSize: 10, lineHeight: 15 },
    formActions: { flexDirection: 'row', gap: 9, marginTop: 16, marginBottom: 4 },
    formCancel: { minHeight: 43, minWidth: 88, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
    formCancelText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
    formSave: { flex: 1, minHeight: 43, backgroundColor: colors.accent, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
    formSaveText: { color: colors.accentInk, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
    confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    confirmCard: { width: '100%', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 18, padding: 18 },
    confirmMark: { width: 30, height: 30, borderRadius: 15, borderColor: colors.error, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    confirmMarkText: { color: colors.error, fontWeight: '800', fontSize: 14 },
    confirmEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: '800', marginTop: 13 },
    confirmTitle: { color: colors.foreground, fontSize: 17, fontWeight: '800', marginTop: 5 },
    confirmBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
    confirmActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
    confirmCancel: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    confirmCancelText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
    confirmDelete: { flex: 1, minHeight: 42, backgroundColor: colors.error, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    confirmDeleteText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  });
}
