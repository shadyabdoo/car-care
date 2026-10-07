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
type ExpenseCategory =
  | 'fuel'
  | 'maintenance'
  | 'service'
  | 'repair'
  | 'parts'
  | 'tires'
  | 'car_wash'
  | 'insurance'
  | 'registration'
  | 'fines'
  | 'parking'
  | 'tolls'
  | 'accessories'
  | 'other';
type PaymentMethod =
  | 'cash'
  | 'visa'
  | 'mastercard'
  | 'wallet'
  | 'bank_transfer'
  | 'other';
type Vehicle = { id: string; user_id: string; make: string; model: string; mileage: number };
type ExpenseRecord = {
  id: string;
  vehicle_id: string;
  user_id: string;
  expense_date: string;
  category: ExpenseCategory;
  title: string;
  description: string | null;
  amount: number;
  odometer_km: number | null;
  vendor: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type Draft = {
  expenseDate: string;
  category: ExpenseCategory;
  title: string;
  amount: string;
  odometer: string;
  vendor: string;
  paymentMethod: PaymentMethod | null;
  description: string;
  notes: string;
};
type DraftField =
  | 'expenseDate'
  | 'title'
  | 'amount'
  | 'odometer'
  | 'vendor'
  | 'description'
  | 'notes';
type LoadStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'signedOut' | 'unconfigured';
type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof makeStyles>;
type Copy = { [Key in keyof typeof copy.en]: string };
type Props = { vehicleId: string; colorScheme: ThemeName; onBack: () => void };

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');
const columns =
  'id, vehicle_id, user_id, expense_date, category, title, description, amount, odometer_km, vendor, payment_method, notes, created_at, updated_at';
const categories: ExpenseCategory[] = [
  'fuel', 'maintenance', 'service', 'repair', 'parts', 'tires', 'car_wash',
  'insurance', 'registration', 'fines', 'parking', 'tolls', 'accessories', 'other',
];
const filterCategories: Array<ExpenseCategory | 'all'> = [
  'all', 'fuel', 'maintenance', 'service', 'repair', 'other',
];
const paymentMethods: PaymentMethod[] = [
  'cash', 'visa', 'mastercard', 'wallet', 'bank_transfer', 'other',
];

const copy = {
  en: {
    back: 'Back',
    section: 'EXPENSE CONTROL',
    title: 'Expenses',
    totalExpenses: 'TOTAL EXPENSES',
    totalCost: 'TOTAL COST',
    averageExpense: 'AVERAGE / EXPENSE',
    latestExpense: 'LATEST EXPENSE',
    latestOdometer: 'LATEST ODOMETER',
    currentOdometer: 'CURRENT ODOMETER',
    breakdown: 'CATEGORY BREAKDOWN',
    records: 'EXPENSE LEDGER',
    add: 'ADD EXPENSE',
    addFirst: 'ADD FIRST EXPENSE',
    emptyTitle: 'NO EXPENSES LOGGED',
    emptyBody: 'Track costs tied to this vehicle. Only expenses entered here appear in this ledger.',
    emptyFiltered: 'NO EXPENSES IN THIS CATEGORY',
    emptyFilteredBody: 'Choose another category or add a matching expense.',
    loading: 'Loading expense ledger…',
    loadError: 'Unable to load expenses.',
    retry: 'TRY AGAIN',
    signedOut: 'Sign in again to view this expense ledger.',
    notFound: 'This vehicle is unavailable or no longer in your garage.',
    unconfigured: 'Connect Supabase to view expenses.',
    all: 'All',
    fuel: 'Fuel',
    maintenance: 'Maintenance',
    service: 'Service',
    repair: 'Repair',
    parts: 'Parts',
    tires: 'Tires',
    carWash: 'Car Wash',
    insurance: 'Insurance',
    registration: 'Registration',
    fines: 'Fines',
    parking: 'Parking',
    tolls: 'Tolls',
    accessories: 'Accessories',
    other: 'Other',
    cash: 'Cash',
    visa: 'Visa',
    mastercard: 'Mastercard',
    wallet: 'Wallet',
    bankTransfer: 'Bank Transfer',
    paymentOther: 'Other',
    date: 'EXPENSE DATE',
    category: 'CATEGORY',
    titleField: 'TITLE',
    amount: 'AMOUNT',
    odometer: 'ODOMETER',
    vendor: 'VENDOR',
    paymentMethod: 'PAYMENT METHOD',
    description: 'DESCRIPTION',
    notes: 'NOTES',
    optional: 'OPTIONAL',
    datePlaceholder: 'YYYY-MM-DD',
    titlePlaceholder: 'e.g. Monthly parking',
    amountPlaceholder: '0.00',
    odometerPlaceholder: 'Kilometres',
    vendorPlaceholder: 'Shop, station, or provider',
    descriptionPlaceholder: 'Additional details',
    notesPlaceholder: 'Private notes for this expense',
    addTitle: 'NEW EXPENSE',
    editTitle: 'EDIT EXPENSE',
    save: 'SAVE EXPENSE',
    saveChanges: 'SAVE CHANGES',
    cancel: 'CANCEL',
    edit: 'Edit',
    delete: 'Delete',
    deleteTitle: 'DELETE EXPENSE?',
    deleteBody: 'This expense will be permanently removed from this vehicle ledger.',
    confirmDelete: 'DELETE EXPENSE',
    saving: 'SAVING…',
    deleting: 'DELETING…',
    invalidDate: 'Enter a valid date as YYYY-MM-DD.',
    invalidCategory: 'Choose an expense category.',
    invalidTitle: 'Enter a title.',
    invalidAmount: 'Enter an amount greater than zero with up to two decimal places.',
    invalidOdometer: 'Enter a valid non-negative odometer reading.',
    invalidAmountLimit: 'Amount exceeds the supported limit.',
    saveError: 'Unable to save this expense. Please try again.',
    saved: 'Expense saved.',
    updated: 'Expense updated.',
    deleteError: 'Unable to delete this expense. Please try again.',
    deleted: 'Expense deleted.',
    currency: 'EGP',
    km: 'KM',
    noOdometer: 'ODOMETER NOT RECORDED',
    noVendor: 'VENDOR NOT RECORDED',
    noPayment: 'PAYMENT NOT RECORDED',
    close: 'Close',
    share: 'OF TOTAL',
  },
  ar: {
    back: 'رجوع',
    section: 'متابعة المصروفات',
    title: 'المصروفات',
    totalExpenses: 'إجمالي المصروفات',
    totalCost: 'إجمالي التكلفة',
    averageExpense: 'متوسط المصروف',
    latestExpense: 'أحدث مصروف',
    latestOdometer: 'أحدث قراءة للعداد',
    currentOdometer: 'قراءة العداد الحالية',
    breakdown: 'توزيع الفئات',
    records: 'سجل المصروفات',
    add: 'إضافة مصروف',
    addFirst: 'أضف أول مصروف',
    emptyTitle: 'لا توجد مصروفات مسجلة',
    emptyBody: 'تابع تكاليف هذه المركبة. تظهر هنا المصروفات التي تضيفها إلى هذا السجل فقط.',
    emptyFiltered: 'لا توجد مصروفات في هذه الفئة',
    emptyFilteredBody: 'اختر فئة أخرى أو أضف مصروفًا مطابقًا.',
    loading: 'جارٍ تحميل سجل المصروفات…',
    loadError: 'تعذّر تحميل المصروفات.',
    retry: 'حاول مرة أخرى',
    signedOut: 'سجّل الدخول مجددًا لعرض سجل المصروفات.',
    notFound: 'المركبة غير متاحة أو لم تعد في مرآبك.',
    unconfigured: 'اربط Supabase لعرض المصروفات.',
    all: 'الكل',
    fuel: 'الوقود',
    maintenance: 'الصيانة',
    service: 'الخدمة',
    repair: 'الإصلاح',
    parts: 'القطع',
    tires: 'الإطارات',
    carWash: 'غسيل المركبة',
    insurance: 'التأمين',
    registration: 'الترخيص',
    fines: 'المخالفات',
    parking: 'مواقف',
    tolls: 'الطرق',
    accessories: 'الإضافات',
    other: 'أخرى',
    cash: 'نقدًا',
    visa: 'فيزا',
    mastercard: 'ماستركارد',
    wallet: 'محفظة',
    bankTransfer: 'تحويل بنكي',
    paymentOther: 'أخرى',
    date: 'تاريخ المصروف',
    category: 'الفئة',
    titleField: 'العنوان',
    amount: 'المبلغ',
    odometer: 'العداد',
    vendor: 'مقدم الخدمة',
    paymentMethod: 'طريقة الدفع',
    description: 'الوصف',
    notes: 'ملاحظات',
    optional: 'اختياري',
    datePlaceholder: 'YYYY-MM-DD',
    titlePlaceholder: 'مثال: موقف شهري',
    amountPlaceholder: '0.00',
    odometerPlaceholder: 'الكيلومترات',
    vendorPlaceholder: 'المتجر أو مقدم الخدمة',
    descriptionPlaceholder: 'تفاصيل إضافية',
    notesPlaceholder: 'ملاحظات لهذا المصروف',
    addTitle: 'مصروف جديد',
    editTitle: 'تعديل المصروف',
    save: 'حفظ المصروف',
    saveChanges: 'حفظ التعديلات',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    deleteTitle: 'حذف المصروف؟',
    deleteBody: 'سيُحذف هذا المصروف نهائيًا من سجل المركبة.',
    confirmDelete: 'حذف المصروف',
    saving: 'جارٍ الحفظ…',
    deleting: 'جارٍ الحذف…',
    invalidDate: 'أدخل تاريخًا صحيحًا بصيغة YYYY-MM-DD.',
    invalidCategory: 'اختر فئة المصروف.',
    invalidTitle: 'أدخل عنوانًا للمصروف.',
    invalidAmount: 'أدخل مبلغًا أكبر من صفر وبحد أقصى منزلتين عشريتين.',
    invalidOdometer: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    invalidAmountLimit: 'المبلغ يتجاوز الحد المدعوم.',
    saveError: 'تعذّر حفظ المصروف. حاول مرة أخرى.',
    saved: 'تم حفظ المصروف.',
    updated: 'تم تعديل المصروف.',
    deleteError: 'تعذّر حذف المصروف. حاول مرة أخرى.',
    deleted: 'تم حذف المصروف.',
    currency: 'ج.م',
    km: 'كم',
    noOdometer: 'لم تُسجل قراءة العداد',
    noVendor: 'لم يُسجل مقدم الخدمة',
    noPayment: 'لم تُسجل طريقة الدفع',
    close: 'إغلاق',
    share: 'من الإجمالي',
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

function normalizeDecimal(value: string) {
  let normalized = normalizeDigits(value).replace(/\u066c/g, '').replace(/\u066b/g, '.').trim();
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = /,\d{3}$/.test(normalized)
      ? normalized.replace(/,/g, '')
      : normalized.replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }
  return normalized;
}

function amountToCents(value: string): number {
  const normalized = normalizeDecimal(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : Number.NaN;
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatMoneyCents(cents: number, text: Copy) {
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const numberLocale = isArabic ? 'ar-EG' : 'en-US';
  if (fraction === 0) {
    return `${text.currency} ${new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: 0,
    }).format(whole)}`;
  }
  const decimalSeparator = new Intl.NumberFormat(numberLocale)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.';
  const groupedWhole = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  }).format(whole);
  const localizedFraction = new Intl.NumberFormat(numberLocale, {
    minimumIntegerDigits: fraction % 10 === 0 ? 1 : 2,
    useGrouping: false,
  }).format(fraction % 10 === 0 ? fraction / 10 : fraction);
  return `${text.currency} ${groupedWhole}${decimalSeparator}${localizedFraction}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
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

function categoryLabel(category: ExpenseCategory, text: Copy) {
  switch (category) {
    case 'fuel': return text.fuel;
    case 'maintenance': return text.maintenance;
    case 'service': return text.service;
    case 'repair': return text.repair;
    case 'parts': return text.parts;
    case 'tires': return text.tires;
    case 'car_wash': return text.carWash;
    case 'insurance': return text.insurance;
    case 'registration': return text.registration;
    case 'fines': return text.fines;
    case 'parking': return text.parking;
    case 'tolls': return text.tolls;
    case 'accessories': return text.accessories;
    case 'other': return text.other;
  }
}

function paymentLabel(method: PaymentMethod, text: Copy) {
  switch (method) {
    case 'cash': return text.cash;
    case 'visa': return text.visa;
    case 'mastercard': return text.mastercard;
    case 'wallet': return text.wallet;
    case 'bank_transfer': return text.bankTransfer;
    case 'other': return text.paymentOther;
  }
}

function makeDraft(): Draft {
  return {
    expenseDate: todayAsISO(),
    category: 'fuel',
    title: '',
    amount: '',
    odometer: '',
    vendor: '',
    paymentMethod: null,
    description: '',
    notes: '',
  };
}

function draftFromRecord(record: ExpenseRecord): Draft {
  return {
    expenseDate: record.expense_date,
    category: record.category,
    title: record.title,
    amount: (Number(record.amount)).toFixed(2),
    odometer: record.odometer_km === null ? '' : String(record.odometer_km),
    vendor: record.vendor ?? '',
    paymentMethod: record.payment_method,
    description: record.description ?? '',
    notes: record.notes ?? '',
  };
}

function compareRecords(left: ExpenseRecord, right: ExpenseRecord) {
  return right.expense_date.localeCompare(left.expense_date) ||
    right.created_at.localeCompare(left.created_at);
}

async function fetchExpenses(
  client: NonNullable<typeof supabase>,
  vehicleId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('expense_records')
    .select(columns)
    .eq('vehicle_id', vehicleId)
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export default function ExpensesScreen({ vehicleId, colorScheme, onBack }: Props) {
  const colors = palette[colorScheme];
  const text = copy[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(supabase ? 'loading' : 'unconfigured');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [filter, setFilter] = useState<ExpenseCategory | 'all'>('all');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ExpenseRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<DraftField | 'category', string>>>({});
  const [formError, setFormError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const requestIdRef = useRef(0);
  const saveLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldsRef = useRef<Record<DraftField, TextInput | null>>({
    expenseDate: null,
    title: null,
    amount: null,
    odometer: null,
    vendor: null,
    description: null,
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
      const expenseRecords = await fetchExpenses(client, vehicleId, authData.user.id);
      if (requestId !== requestIdRef.current) return;
      setUser(authData.user);
      setVehicle(vehicleData);
      setRecords(expenseRecords);
      setLoadStatus('ready');
    } catch (error) {
      logError('Unable to load expenses for the authenticated vehicle', error);
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

  const closeForm = useCallback(() => {
    if (isSaving) return;
    setDraft(null);
    setEditingId(null);
    setErrors({});
    setFormError('');
  }, [isSaving]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (recordToDelete) {
        setRecordToDelete(null);
        return true;
      }
      if (draft && !isSaving) {
        closeForm();
        return true;
      }
      if (isSaving || isDeleting) return true;
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [closeForm, draft, isDeleting, isSaving, onBack, recordToDelete]);

  const beginAdd = useCallback(() => {
    setEditingId(null);
    setErrors({});
    setFormError('');
    setErrorMessage('');
    setDraft(makeDraft());
  }, []);

  const beginEdit = useCallback((record: ExpenseRecord) => {
    setEditingId(record.id);
    setErrors({});
    setFormError('');
    setErrorMessage('');
    setDraft(draftFromRecord(record));
  }, []);

  const setField = useCallback(<Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setFormError('');
    if (key in errors) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }, [errors]);

  const validate = useCallback((value: Draft) => {
    const nextErrors: Partial<Record<DraftField | 'category', string>> = {};
    if (!isValidDate(value.expenseDate)) nextErrors.expenseDate = text.invalidDate;
    if (!categories.includes(value.category)) nextErrors.category = text.invalidCategory;
    if (!value.title.trim()) nextErrors.title = text.invalidTitle;
    const cents = amountToCents(value.amount);
    if (!Number.isSafeInteger(cents) || cents <= 0) {
      nextErrors.amount = text.invalidAmount;
    } else if (cents > 999_999_999_999) {
      nextErrors.amount = text.invalidAmountLimit;
    }
    if (value.odometer.trim()) {
      const normalizedOdometer = normalizeDigits(value.odometer).replace(/[,\u066c\s]/g, '');
      const odometer = /^\d+$/.test(normalizedOdometer) ? Number(normalizedOdometer) : Number.NaN;
      if (!Number.isSafeInteger(odometer) || odometer < 0 || odometer > 2_147_483_647) {
        nextErrors.odometer = text.invalidOdometer;
      }
    }
    return nextErrors;
  }, [text]);

  const saveRecord = useCallback(async () => {
    if (!supabase || !vehicle || !user || !draft || saveLockRef.current) return;
    const validationErrors = validate(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    saveLockRef.current = true;
    setIsSaving(true);
    setFormError('');
    setErrorMessage('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setLoadStatus('signedOut');
        setDraft(null);
        return;
      }
      const odometerText = normalizeDigits(draft.odometer).replace(/[,\u066c\s]/g, '');
      const payload = {
        expense_date: draft.expenseDate,
        category: draft.category,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        amount: amountToCents(draft.amount) / 100,
        odometer_km: odometerText ? Number(odometerText) : null,
        vendor: draft.vendor.trim() || null,
        payment_method: draft.paymentMethod,
        notes: draft.notes.trim() || null,
      };
      let savedRecord: ExpenseRecord;
      if (editingId) {
        const { data, error } = await supabase
          .from('expense_records')
          .update(payload)
          .eq('id', editingId)
          .eq('vehicle_id', vehicle.id)
          .eq('user_id', user.id)
          .select(columns)
          .maybeSingle();
        if (error) throw error;
        if (!data || data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Expense was not updated for the authenticated owner');
        }
        savedRecord = data;
      } else {
        const { data, error } = await supabase
          .from('expense_records')
          .insert({ ...payload, vehicle_id: vehicle.id, user_id: user.id })
          .select(columns)
          .single();
        if (error) throw error;
        if (data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Inserted expense did not match the authenticated owner');
        }
        savedRecord = data;
      }
      const wasEditing = editingId !== null;
      setRecords((current) =>
        [...current.filter((record) => record.id !== savedRecord.id), savedRecord].sort(compareRecords),
      );
      setDraft(null);
      setEditingId(null);
      setErrors({});
      showNotice(wasEditing ? text.updated : text.saved);
    } catch (error) {
      logError('Unable to save expense', error);
      setFormError(text.saveError);
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  }, [draft, editingId, showNotice, text, user, validate, vehicle]);

  const deleteRecord = useCallback(async () => {
    if (!supabase || !vehicle || !user || !recordToDelete || deleteLockRef.current) return;
    deleteLockRef.current = true;
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
        .from('expense_records')
        .delete()
        .eq('id', recordToDelete.id)
        .eq('vehicle_id', vehicle.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Expense was not deleted for the authenticated owner');
      setRecords((current) => current.filter((record) => record.id !== recordToDelete.id));
      setRecordToDelete(null);
      showNotice(text.deleted);
    } catch (error) {
      logError('Unable to delete expense', error);
      setRecordToDelete(null);
      setErrorMessage(text.deleteError);
    } finally {
      deleteLockRef.current = false;
      setIsDeleting(false);
    }
  }, [recordToDelete, showNotice, text.deleteError, text.deleted, user, vehicle]);

  const visibleRecords = useMemo(
    () => filter === 'all' ? records : records.filter((record) => record.category === filter),
    [filter, records],
  );
  const summary = useMemo(() => {
    const totalCents = visibleRecords.reduce(
      (sum, record) => sum + Math.round(Number(record.amount) * 100),
      0,
    );
    const latestWithOdometer = visibleRecords.find((record) => record.odometer_km !== null);
    return {
      count: visibleRecords.length,
      totalCents,
      averageCents: visibleRecords.length ? Math.round(totalCents / visibleRecords.length) : 0,
      latest: visibleRecords[0] ?? null,
      latestOdometer: latestWithOdometer?.odometer_km ?? null,
    };
  }, [visibleRecords]);
  const breakdown = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const record of visibleRecords) {
      totals.set(
        record.category,
        (totals.get(record.category) ?? 0) + Math.round(Number(record.amount) * 100),
      );
    }
    return categories.flatMap((category) => {
      const cents = totals.get(category);
      return cents === undefined ? [] : [{
        category,
        cents,
        percentage: summary.totalCents > 0 ? Math.round((cents / summary.totalCents) * 100) : 0,
      }];
    });
  }, [summary.totalCents, visibleRecords]);
  const formWidth = Math.min(width - 28, 540);
  const statusMessage = loadStatus === 'error'
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
          <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backArrow, isArabic && styles.arrowReversed]}>‹</Text>
            <Text style={styles.backLabel}>{text.back}</Text>
          </Pressable>
          <Text style={styles.topBrand}>CAR CARE / EXPENSES</Text>
          <View style={styles.topIndicator} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingBlock}>
            <Text style={[styles.eyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>{text.section}</Text>
            <View style={[styles.headingRow, isArabic && sharedStyles.rowReverse]}>
              <Text style={[styles.title, { writingDirection: direction }]}>{text.title}</Text>
              {vehicle && <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>}
            </View>
            {vehicle && (
              <View style={[styles.vehicleLine, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.vehicleDot} />
                <Text style={styles.vehicleMileage}>
                  {formatNumber(vehicle.mileage)} {text.km}
                </Text>
                <Text style={styles.currentOdometer}>{text.currentOdometer}</Text>
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
              <View style={styles.summaryPanel}>
                <View style={[styles.summaryHeader, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.summaryEyebrow}>LEDGER / 01</Text>
                  <View style={styles.onlineDot} />
                </View>
                <View style={styles.summaryGrid}>
                  <Metric label={text.totalExpenses} value={formatNumber(summary.count)} styles={styles} />
                  <Metric label={text.totalCost} value={formatMoneyCents(summary.totalCents, text)} styles={styles} accent />
                  <Metric label={text.averageExpense} value={summary.count ? formatMoneyCents(summary.averageCents, text) : '—'} styles={styles} />
                  <Metric label={text.latestExpense} value={summary.latest ? formatDate(summary.latest.expense_date) : '—'} styles={styles} />
                </View>
                <View style={styles.summaryRule} />
                <View style={[styles.latestOdometerRow, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.latestOdometerLabel}>{text.latestOdometer}</Text>
                  <Text style={styles.latestOdometerValue}>
                    {summary.latestOdometer === null ? '—' : `${formatNumber(summary.latestOdometer)} ${text.km}`}
                  </Text>
                </View>
              </View>

              {!!errorMessage && (
                <View style={[styles.inlineError, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.errorGlyph}>!</Text>
                  <Text style={[styles.inlineErrorText, { writingDirection: direction }]}>{errorMessage}</Text>
                </View>
              )}
              {!!notice && (
                <View style={[styles.notice, isArabic && sharedStyles.rowReverse]}>
                  <Text style={styles.noticeGlyph}>✓</Text>
                  <Text style={[styles.noticeText, { writingDirection: direction }]}>{notice}</Text>
                </View>
              )}

              {breakdown.length > 0 && (
                <View style={styles.breakdownPanel}>
                  <SectionHeading title={text.breakdown} styles={styles} />
                  {breakdown.map((item) => (
                    <View key={item.category} style={styles.breakdownRow}>
                      <View style={[styles.breakdownLabels, isArabic && sharedStyles.rowReverse]}>
                        <Text style={[styles.breakdownCategory, { writingDirection: direction }]}>
                          {categoryLabel(item.category, text)}
                        </Text>
                        <Text style={styles.breakdownAmount}>{formatMoneyCents(item.cents, text)}</Text>
                        <Text style={styles.breakdownPercent}>{item.percentage}%</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${item.percentage}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.sectionTop, isArabic && sharedStyles.rowReverse]}>
                <SectionHeading title={text.records} styles={styles} />
                <Pressable accessibilityRole="button" accessibilityLabel={text.add} onPress={beginAdd} style={styles.addButton}>
                  <Text style={styles.addGlyph}>＋</Text>
                  <Text style={styles.addButtonText}>{text.add}</Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.filterRow, isArabic && sharedStyles.rowReverse]}
              >
                {filterCategories.map((category) => {
                  const selected = filter === category;
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setFilter(category)}
                      style={[styles.filterChip, selected && styles.filterChipSelected]}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                        {category === 'all' ? text.all : categoryLabel(category, text)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {visibleRecords.length === 0 ? (
                <View style={styles.emptyPanel}>
                  <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>↗</Text></View>
                  <Text style={[styles.emptyEyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>00 / LEDGER</Text>
                  <Text style={[styles.emptyTitle, { textAlign: isArabic ? 'right' : 'left' }]}>
                    {records.length === 0 ? text.emptyTitle : text.emptyFiltered}
                  </Text>
                  <Text style={[styles.emptyBody, { writingDirection: direction, textAlign: isArabic ? 'right' : 'left' }]}>
                    {records.length === 0 ? text.emptyBody : text.emptyFilteredBody}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={beginAdd} style={styles.emptyAction}>
                    <Text style={styles.emptyActionText}>＋  {text.addFirst}</Text>
                    <Text style={styles.emptyActionArrow}>{isArabic ? '‹' : '›'}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.recordsList}>
                  {visibleRecords.map((record) => (
                    <ExpenseCard
                      key={record.id}
                      record={record}
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
        <ExpenseFormModal
          draft={draft}
          errors={errors}
          isEditing={editingId !== null}
          isSaving={isSaving}
          colors={colors}
          styles={styles}
          text={text}
          direction={direction}
          arabic={isArabic}
          width={formWidth}
          height={height}
          fieldsRef={fieldsRef}
          formError={formError}
          onChange={setField}
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
          <View style={[styles.confirmCard, { maxWidth: Math.min(width - 40, 420) }]}>
            <View style={styles.confirmMark}><Text style={styles.confirmMarkText}>!</Text></View>
            <Text style={styles.confirmEyebrow}>{text.section}</Text>
            <Text style={[styles.confirmTitle, { writingDirection: direction }]}>{text.deleteTitle}</Text>
            <Text style={[styles.confirmBody, { writingDirection: direction }]}>{text.deleteBody}</Text>
            <View style={[styles.confirmActions, isArabic && sharedStyles.rowReverse]}>
              <Pressable accessibilityRole="button" disabled={isDeleting} onPress={() => setRecordToDelete(null)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>{text.cancel}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={isDeleting} onPress={() => void deleteRecord()} style={styles.confirmDelete}>
                {isDeleting
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.confirmDeleteText}>{text.confirmDelete}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Metric({
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
    <View style={styles.metricCell}>
      <Text numberOfLines={2} style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, accent && styles.metricAccent]}>
        {value}
      </Text>
    </View>
  );
}

function SectionHeading({ title, styles }: { title: string; styles: ScreenStyles }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.accentRule} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function ExpenseCard({
  record,
  text,
  styles,
  direction,
  onEdit,
  onDelete,
}: {
  record: ExpenseRecord;
  text: Copy;
  styles: ScreenStyles;
  direction: 'ltr' | 'rtl';
  onEdit: () => void;
  onDelete: () => void;
}) {
  const amountCents = Math.round(Number(record.amount) * 100);
  return (
    <View style={styles.expenseCard}>
      <View style={[styles.cardTopline, isArabic && sharedStyles.rowReverse]}>
        <View style={styles.categoryBadge}>
          <View style={styles.categoryDot} />
          <Text style={styles.categoryText}>{categoryLabel(record.category, text)}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(record.expense_date)}</Text>
      </View>
      <View style={[styles.cardTitleRow, isArabic && sharedStyles.rowReverse]}>
        <Text numberOfLines={2} style={[styles.expenseTitle, { writingDirection: direction }]}>
          {record.title}
        </Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.expenseAmount}>
          {formatMoneyCents(amountCents, text)}
        </Text>
      </View>
      <View style={[styles.cardMeta, isArabic && sharedStyles.rowReverse]}>
        {record.odometer_km !== null && (
          <>
            <Text style={styles.metaText}>{formatNumber(record.odometer_km)} {text.km}</Text>
            {!!record.vendor && <View style={styles.metaDot} />}
          </>
        )}
        <Text numberOfLines={1} style={[styles.metaText, styles.vendorText, { writingDirection: direction }]}>
          {record.vendor ?? text.noVendor}
        </Text>
      </View>
      {!!record.description && (
        <Text numberOfLines={2} style={[styles.descriptionText, { writingDirection: direction }]}>
          {record.description}
        </Text>
      )}
      <View style={[styles.cardFoot, isArabic && sharedStyles.rowReverse]}>
        <Text style={styles.paymentText}>
          {record.payment_method ? paymentLabel(record.payment_method, text) : text.noPayment}
        </Text>
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={text.edit} onPress={onEdit} style={styles.cardAction}>
            <Text style={styles.editGlyph}>✎</Text>
            <Text style={styles.editText}>{text.edit}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={text.delete} onPress={onDelete} style={styles.cardAction}>
            <Text style={styles.deleteGlyph}>×</Text>
            <Text style={styles.deleteText}>{text.delete}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type ExpenseFormProps = {
  draft: Draft;
  errors: Partial<Record<DraftField | 'category', string>>;
  isEditing: boolean;
  isSaving: boolean;
  colors: ScreenColors;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  arabic: boolean;
  width: number;
  height: number;
  fieldsRef: React.MutableRefObject<Record<DraftField, TextInput | null>>;
  formError: string;
  onChange: <Key extends keyof Draft>(key: Key, value: Draft[Key]) => void;
  onSave: () => void;
  onCancel: () => void;
};

function ExpenseFormModal({
  draft,
  errors,
  isEditing,
  isSaving,
  colors,
  styles,
  text,
  direction,
  arabic,
  width,
  height,
  fieldsRef,
  formError,
  onChange,
  onSave,
  onCancel,
}: ExpenseFormProps) {
  const optional = ` · ${text.optional}`;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.modalBackdrop, { paddingTop: Math.max(10, height * 0.02) }]}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCard, { maxWidth: Math.min(width, 540) }]}>
            <View style={[styles.modalHeader, arabic && sharedStyles.rowReverse]}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalEyebrow}>{text.section}</Text>
                <Text style={[styles.modalTitle, { writingDirection: direction }]}>
                  {isEditing ? text.editTitle : text.addTitle}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={text.close} disabled={isSaving} onPress={onCancel} style={styles.iconButton}>
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets
            >
              <ExpenseField
                label={text.date}
                value={draft.expenseDate}
                placeholder={text.datePlaceholder}
                error={errors.expenseDate}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                onChangeText={(value) => onChange('expenseDate', value)}
                ref={(ref) => { fieldsRef.current.expenseDate = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.title?.focus()}
              />
              <Text style={[styles.fieldLabel, { textAlign: arabic ? 'right' : 'left' }]}>{text.category}</Text>
              <View style={[styles.choices, arabic && sharedStyles.rowReverse]}>
                {categories.map((category) => {
                  const selected = draft.category === category;
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      disabled={isSaving}
                      onPress={() => onChange('category', category)}
                      style={[styles.choice, selected && styles.choiceSelected]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                        {categoryLabel(category, text)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!!errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}

              <ExpenseField
                label={text.titleField}
                value={draft.title}
                placeholder={text.titlePlaceholder}
                error={errors.title}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                onChangeText={(value) => onChange('title', value)}
                ref={(ref) => { fieldsRef.current.title = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.amount?.focus()}
              />
              <ExpenseField
                label={text.amount}
                value={draft.amount}
                placeholder={text.amountPlaceholder}
                suffix={text.currency}
                error={errors.amount}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="decimal-pad"
                onChangeText={(value) => onChange('amount', value)}
                ref={(ref) => { fieldsRef.current.amount = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.odometer?.focus()}
              />
              <ExpenseField
                label={`${text.odometer}${optional}`}
                value={draft.odometer}
                placeholder={text.odometerPlaceholder}
                suffix="KM"
                error={errors.odometer}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="number-pad"
                onChangeText={(value) => onChange('odometer', value)}
                ref={(ref) => { fieldsRef.current.odometer = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.vendor?.focus()}
              />
              <ExpenseField
                label={`${text.vendor}${optional}`}
                value={draft.vendor}
                placeholder={text.vendorPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                onChangeText={(value) => onChange('vendor', value)}
                ref={(ref) => { fieldsRef.current.vendor = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.description?.focus()}
              />
              <Text style={[styles.fieldLabel, styles.paymentLabel, { textAlign: arabic ? 'right' : 'left' }]}>
                {`${text.paymentMethod}${optional}`}
              </Text>
              <View style={[styles.choices, arabic && sharedStyles.rowReverse]}>
                {paymentMethods.map((method) => {
                  const selected = draft.paymentMethod === method;
                  return (
                    <Pressable
                      key={method}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      disabled={isSaving}
                      onPress={() => onChange('paymentMethod', selected ? null : method)}
                      style={[styles.choice, selected && styles.choiceSelected]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                        {paymentLabel(method, text)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <ExpenseField
                label={`${text.description}${optional}`}
                value={draft.description}
                placeholder={text.descriptionPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                multiline
                onChangeText={(value) => onChange('description', value)}
                ref={(ref) => { fieldsRef.current.description = ref; }}
              />
              <ExpenseField
                label={`${text.notes}${optional}`}
                value={draft.notes}
                placeholder={text.notesPlaceholder}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                multiline
                onChangeText={(value) => onChange('notes', value)}
                ref={(ref) => { fieldsRef.current.notes = ref; }}
              />
              {!!formError && (
                <View style={[styles.inlineError, arabic && sharedStyles.rowReverse]}>
                  <Text style={styles.errorGlyph}>!</Text>
                  <Text style={[styles.inlineErrorText, { writingDirection: direction }]}>
                    {formError}
                  </Text>
                </View>
              )}
              <View style={[styles.formActions, arabic && sharedStyles.rowReverse]}>
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={onCancel} style={styles.formCancel}>
                  <Text style={styles.formCancelText}>{text.cancel}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={onSave} style={[styles.formSave, isSaving && styles.buttonDisabled]}>
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

type ExpenseFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  styles: ScreenStyles;
  colors: ScreenColors;
  direction: 'ltr' | 'rtl';
  disabled: boolean;
  error?: string;
  suffix?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  returnKeyType?: 'next' | 'done';
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
};

const ExpenseField = forwardRef<TextInput, ExpenseFieldProps>(function ExpenseField(
  {
    label,
    value,
    placeholder,
    styles,
    colors,
    direction,
    disabled,
    error,
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
      <Text style={[styles.fieldLabel, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputShellError, multiline && styles.inputShellMultiline]}>
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
            { writingDirection: direction, textAlign: direction === 'rtl' ? 'right' : 'left' },
          ]}
        />
        {!!suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
      {!!error && <Text style={[styles.fieldError, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}>{error}</Text>}
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
    topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    backButton: { flexDirection: 'row', alignItems: 'center', minWidth: 80, gap: 4 },
    backArrow: { color: colors.accent, fontSize: 30, lineHeight: 32, fontWeight: '300' },
    arrowReversed: { transform: [{ scaleX: -1 }] },
    backLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    topBrand: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
    topIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    scrollContent: { paddingTop: 18, paddingBottom: 24 },
    headingBlock: { marginBottom: 17 },
    eyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 2.1, fontWeight: '800' },
    headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 4 },
    title: { color: colors.foreground, fontSize: 34, lineHeight: 40, letterSpacing: -1.4, fontWeight: '700' },
    vehicleName: { color: colors.foreground, fontSize: 11, fontWeight: '600', flexShrink: 1 },
    vehicleLine: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
    vehicleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    vehicleMileage: { color: colors.accent, fontSize: 10, letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
    currentOdometer: { color: colors.muted, fontSize: 8, letterSpacing: 0.8, fontWeight: '700' },
    summaryPanel: { backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 14 },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, fontWeight: '700' },
    onlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    metricCell: { width: '50%', minWidth: 0, paddingEnd: 8, paddingVertical: 7 },
    metricLabel: { color: colors.muted, fontSize: 8, lineHeight: 12, fontWeight: '700', letterSpacing: 0.6 },
    metricValue: { color: colors.foreground, marginTop: 4, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
    metricAccent: { color: colors.accent },
    summaryRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: 8, marginBottom: 9 },
    latestOdometerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    latestOdometerLabel: { color: colors.muted, fontSize: 8, letterSpacing: 0.8, fontWeight: '700', flex: 1 },
    latestOdometerValue: { color: colors.accent, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    inlineError: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.dangerSurface, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorGlyph: { color: colors.error, fontSize: 14, fontWeight: '900' },
    inlineErrorText: { flex: 1, color: colors.error, fontSize: 11, lineHeight: 16 },
    notice: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8 },
    noticeGlyph: { color: colors.accent, fontSize: 13, fontWeight: '900' },
    noticeText: { color: colors.foreground, flex: 1, fontSize: 11 },
    breakdownPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 16 },
    accentRule: { width: 3, height: 14, backgroundColor: colors.accent, borderRadius: 2 },
    sectionTitle: { color: colors.foreground, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
    sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    breakdownRow: { marginTop: 12 },
    breakdownLabels: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    breakdownCategory: { color: colors.foreground, fontSize: 10, fontWeight: '700', flex: 1 },
    breakdownAmount: { color: colors.muted, fontSize: 9, fontVariant: ['tabular-nums'] },
    breakdownPercent: { color: colors.accent, fontSize: 9, fontWeight: '800', minWidth: 32, textAlign: 'right' },
    barTrack: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
    barFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
    sectionTop: { marginTop: 25, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    addButton: { minHeight: 32, paddingHorizontal: 9, borderRadius: 8, borderColor: colors.borderStrong, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    addGlyph: { color: colors.accent, fontSize: 16, lineHeight: 18 },
    addButtonText: { color: colors.foreground, fontSize: 8, letterSpacing: 0.6, fontWeight: '800' },
    filterRow: { gap: 7, paddingBottom: 12 },
    filterChip: { minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 19, justifyContent: 'center', paddingHorizontal: 12 },
    filterChipSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceStrong },
    filterText: { color: colors.muted, fontSize: 9, fontWeight: '700' },
    filterTextSelected: { color: colors.accent },
    emptyPanel: { borderRadius: 18, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, padding: 18, minHeight: 220 },
    emptyIcon: { width: 46, height: 46, borderRadius: 23, borderColor: colors.borderStrong, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
    emptyIconText: { color: colors.accent, fontSize: 21 },
    emptyEyebrow: { color: colors.accent, fontSize: 8, letterSpacing: 1.5, fontWeight: '800' },
    emptyTitle: { color: colors.foreground, marginTop: 6, fontSize: 17, fontWeight: '700' },
    emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
    emptyAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, minHeight: 42, paddingHorizontal: 12, backgroundColor: colors.accent, borderRadius: 10 },
    emptyActionText: { color: colors.accentInk, fontSize: 9, letterSpacing: 0.6, fontWeight: '900' },
    emptyActionArrow: { color: colors.accentInk, fontSize: 22 },
    recordsList: { gap: 10 },
    expenseCard: { backgroundColor: colors.panel, borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 13 },
    cardTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 5, maxWidth: '65%' },
    categoryDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    categoryText: { color: colors.accent, fontSize: 8, letterSpacing: 0.5, fontWeight: '800' },
    dateText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 9, marginTop: 10 },
    expenseTitle: { color: colors.foreground, fontSize: 14, lineHeight: 19, fontWeight: '700', flex: 1 },
    expenseAmount: { color: colors.accent, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'], maxWidth: '47%' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
    metaText: { color: colors.muted, fontSize: 9, fontVariant: ['tabular-nums'] },
    vendorText: { flexShrink: 1 },
    metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.accent },
    descriptionText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 11, paddingTop: 9 },
    paymentText: { color: colors.muted, fontSize: 8, flex: 1 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    cardAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
    editGlyph: { color: colors.accent, fontSize: 13 },
    editText: { color: colors.foreground, fontSize: 9, fontWeight: '700' },
    deleteGlyph: { color: colors.error, fontSize: 17, lineHeight: 17 },
    deleteText: { color: colors.error, fontSize: 9, fontWeight: '700' },
    statePanel: { minHeight: 230, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    stateText: { color: colors.muted, fontSize: 12 },
    stateGlyph: { width: 36, height: 36, borderRadius: 18, borderColor: colors.error, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    stateGlyphText: { color: colors.error, fontSize: 18, fontWeight: '700' },
    stateTitle: { color: colors.foreground, textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 300 },
    retryButton: { borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
    retryText: { color: colors.accent, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingBottom: 10 },
    modalKeyboard: { width: '100%', maxHeight: '100%', alignItems: 'center', justifyContent: 'center' },
    modalCard: { width: '100%', maxHeight: '100%', backgroundColor: colors.panel, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalHeading: { flex: 1 },
    modalEyebrow: { color: colors.accent, fontSize: 8, letterSpacing: 1.7, fontWeight: '800' },
    modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 3 },
    iconButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    modalClose: { color: colors.muted, fontSize: 22, lineHeight: 24, fontWeight: '300' },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7, marginBottom: 3 },
    choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
    choiceSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceStrong },
    choiceText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    choiceTextSelected: { color: colors.accent },
    fieldWrap: { marginTop: 11 },
    fieldLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    paymentLabel: { marginTop: 13 },
    inputShell: { minHeight: 43, marginTop: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 10 },
    inputShellError: { borderColor: colors.error },
    inputShellMultiline: { minHeight: 66, alignItems: 'flex-start', paddingTop: 8 },
    input: { flex: 1, color: colors.foreground, fontSize: 12, minHeight: 41, paddingVertical: 7 },
    inputMultiline: { minHeight: 51, paddingTop: 0 },
    inputSuffix: { color: colors.muted, fontSize: 9, marginStart: 8, fontWeight: '700' },
    fieldError: { color: colors.error, fontSize: 9, lineHeight: 14, marginTop: 4 },
    formActions: { flexDirection: 'row', gap: 9, marginTop: 17, marginBottom: 4 },
    formCancel: { minHeight: 44, minWidth: 88, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
    formCancelText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
    formSave: { flex: 1, minHeight: 44, backgroundColor: colors.accent, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
    buttonDisabled: { opacity: 0.65 },
    formSaveText: { color: colors.accentInk, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
    confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    confirmCard: { width: '100%', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 18, padding: 18 },
    confirmMark: { width: 30, height: 30, borderRadius: 15, borderColor: colors.error, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    confirmMarkText: { color: colors.error, fontWeight: '800', fontSize: 14 },
    confirmEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: '800', marginTop: 13 },
    confirmTitle: { color: colors.foreground, fontSize: 17, fontWeight: '800', marginTop: 5 },
    confirmBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
    confirmActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
    confirmCancel: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    confirmCancelText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
    confirmDelete: { flex: 1, minHeight: 44, backgroundColor: colors.error, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    confirmDeleteText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  });
}
