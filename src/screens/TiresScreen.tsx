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
type TirePosition = 'front_left' | 'front_right' | 'rear_left' | 'rear_right' | 'spare';
type TireType = 'summer' | 'all_season' | 'winter' | 'performance' | 'other';
type PositionFilter = 'all' | 'front' | 'rear' | 'spare';
type TireCondition = 'new' | 'good' | 'dueSoon' | 'replace';
type Vehicle = { id: string; user_id: string; make: string; model: string; mileage: number };
type TireRecord = {
  id: string;
  vehicle_id: string;
  user_id: string;
  position: TirePosition;
  brand: string;
  model: string;
  size: string;
  tire_type: TireType | null;
  purchase_date: string | null;
  installation_date: string | null;
  odometer_at_installation: number | null;
  current_odometer: number | null;
  expected_life_km: number | null;
  price: number | null;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type BrandChoice = 'michelin' | 'bridgestone' | 'continental' | 'goodyear' | 'pirelli' | 'dunlop' | 'other';
type TireDraft = {
  position: TirePosition;
  brandChoice: BrandChoice;
  customBrand: string;
  model: string;
  size: string;
  tireType: TireType | null;
  purchaseDate: string;
  installationDate: string;
  installationOdometer: string;
  currentOdometer: string;
  expectedLife: string;
  price: string;
  vendor: string;
  notes: string;
};
type DraftField =
  | 'customBrand'
  | 'model'
  | 'size'
  | 'purchaseDate'
  | 'installationDate'
  | 'installationOdometer'
  | 'currentOdometer'
  | 'expectedLife'
  | 'price'
  | 'vendor'
  | 'notes';
type LoadStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'signedOut' | 'unconfigured';
type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof makeStyles>;
type Copy = { [Key in keyof typeof copy.en]: string };
type Props = { vehicleId: string; colorScheme: ThemeName; onBack: () => void };
type ValidationErrors = Partial<Record<DraftField | 'position' | 'brand' | 'tireType', string>>;

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');
const columns =
  'id, vehicle_id, user_id, position, brand, model, size, tire_type, purchase_date, installation_date, odometer_at_installation, current_odometer, expected_life_km, price, vendor, notes, created_at, updated_at';
const positions: TirePosition[] = ['front_left', 'front_right', 'rear_left', 'rear_right', 'spare'];
const tireTypes: TireType[] = ['summer', 'all_season', 'winter', 'performance', 'other'];
const brandChoices: BrandChoice[] = [
  'michelin', 'bridgestone', 'continental', 'goodyear', 'pirelli', 'dunlop', 'other',
];
const filters: PositionFilter[] = ['all', 'front', 'rear', 'spare'];
const NEW_TIRE_USED_LIFE_THRESHOLD = 0.05;
const DUE_SOON_REMAINING_LIFE_THRESHOLD = 0.2;

const copy = {
  en: {
    back: 'Back',
    section: 'TIRE SYSTEM',
    title: 'Tires',
    totalTires: 'TOTAL TIRES',
    installed: 'INSTALLED',
    totalSpent: 'TOTAL SPENT',
    averagePrice: 'AVG. PRICE',
    overview: 'POSITION OVERVIEW',
    front: 'FRONT',
    rear: 'REAR',
    spare: 'SPARE',
    records: 'TIRE RECORDS',
    add: 'ADD TIRE',
    addFirst: 'ADD FIRST TIRE',
    emptyTitle: 'NO TIRES RECORDED',
    emptyBody: 'Add tire details to keep an eye on fitment, mileage, and expected replacement.',
    emptyFiltered: 'NO TIRES IN THIS VIEW',
    emptyFilteredBody: 'Choose another position or add a tire record.',
    loading: 'Loading tire records…',
    loadError: 'Unable to load tire records.',
    retry: 'TRY AGAIN',
    signedOut: 'Sign in again to view this vehicle’s tires.',
    notFound: 'This vehicle is unavailable or no longer in your garage.',
    unconfigured: 'Connect Supabase to view tire records.',
    all: 'ALL',
    position: 'POSITION',
    frontLeft: 'Front Left',
    frontRight: 'Front Right',
    rearLeft: 'Rear Left',
    rearRight: 'Rear Right',
    sparePosition: 'Spare',
    brand: 'BRAND',
    model: 'MODEL',
    size: 'TIRE SIZE',
    tireType: 'TIRE TYPE',
    purchaseDate: 'PURCHASE DATE',
    installationDate: 'INSTALLATION DATE',
    installationOdometer: 'ODOMETER AT INSTALLATION',
    currentOdometer: 'CURRENT ODOMETER',
    expectedLife: 'EXPECTED LIFE',
    replaceAt: 'REPLACE AT',
    price: 'PRICE',
    vendor: 'VENDOR',
    notes: 'NOTES',
    optional: 'OPTIONAL',
    km: 'KM',
    currency: 'EGP',
    datePlaceholder: 'YYYY-MM-DD',
    modelPlaceholder: 'Tire model',
    sizePlaceholder: '225/45 R17',
    customBrandPlaceholder: 'Enter brand',
    odometerPlaceholder: 'Kilometres',
    lifePlaceholder: 'e.g. 50000',
    pricePlaceholder: '0.00',
    vendorPlaceholder: 'Tire shop or dealer',
    notesPlaceholder: 'Additional details',
    michelin: 'Michelin',
    bridgestone: 'Bridgestone',
    continental: 'Continental',
    goodyear: 'Goodyear',
    pirelli: 'Pirelli',
    dunlop: 'Dunlop',
    other: 'Other',
    summer: 'Summer',
    allSeason: 'All Season',
    winter: 'Winter',
    performance: 'Performance',
    addTitle: 'NEW TIRE RECORD',
    editTitle: 'EDIT TIRE RECORD',
    save: 'SAVE TIRE',
    saveChanges: 'SAVE CHANGES',
    cancel: 'CANCEL',
    edit: 'Edit',
    delete: 'Delete',
    deleteTitle: 'DELETE TIRE RECORD?',
    deleteBody: 'This tire record will be permanently removed from the vehicle log.',
    confirmDelete: 'DELETE RECORD',
    saved: 'Tire record saved.',
    updated: 'Tire record updated.',
    deleted: 'Tire record deleted.',
    saveError: 'Unable to save this tire record. Please try again.',
    deleteError: 'Unable to delete this tire record. Please try again.',
    invalidPosition: 'Choose a tire position.',
    invalidBrand: 'Choose or enter a tire brand.',
    invalidModel: 'Enter the tire model.',
    invalidSize: 'Enter the tire size.',
    invalidType: 'Choose a tire type.',
    invalidPurchaseDate: 'Enter a valid purchase date as YYYY-MM-DD.',
    invalidInstallationDate: 'Enter a valid installation date as YYYY-MM-DD.',
    invalidDateOrder: 'Installation date cannot be before purchase date.',
    invalidInstallationOdometer: 'Enter a valid non-negative odometer reading.',
    invalidCurrentOdometer: 'Enter a valid non-negative odometer reading.',
    invalidExpectedLife: 'Expected life must be a positive whole number of kilometres.',
    invalidPrice: 'Price must be greater than zero with up to two decimals.',
    invalidMileageOrder: 'Current odometer cannot be below installation odometer.',
    new: 'NEW',
    good: 'GOOD',
    dueSoon: 'DUE SOON',
    replace: 'REPLACE',
    noMileageData: 'NO MILEAGE DATA',
    noMileage: 'No mileage data',
    used: 'USED',
    remaining: 'REMAINING',
    noInstall: 'NOT INSTALLED',
    saving: 'SAVING…',
    deleting: 'DELETING…',
    close: 'Close',
    priceNotRecorded: 'PRICE NOT RECORDED',
  },
  ar: {
    back: 'رجوع',
    section: 'نظام الإطارات',
    title: 'الإطارات',
    totalTires: 'إجمالي الإطارات',
    installed: 'المركبة',
    totalSpent: 'إجمالي الإنفاق',
    averagePrice: 'متوسط السعر',
    overview: 'توزيع المواقع',
    front: 'الأمام',
    rear: 'الخلف',
    spare: 'احتياطي',
    records: 'سجلات الإطارات',
    add: 'إضافة إطار',
    addFirst: 'أضف أول إطار',
    emptyTitle: 'لا توجد إطارات مسجلة',
    emptyBody: 'أضف تفاصيل الإطارات لمتابعة المقاس والمسافة وموعد الاستبدال المتوقع.',
    emptyFiltered: 'لا توجد إطارات في هذا العرض',
    emptyFilteredBody: 'اختر موقعًا آخر أو أضف سجل إطار.',
    loading: 'جارٍ تحميل سجلات الإطارات…',
    loadError: 'تعذّر تحميل سجلات الإطارات.',
    retry: 'حاول مرة أخرى',
    signedOut: 'سجّل الدخول مجددًا لعرض إطارات المركبة.',
    notFound: 'المركبة غير متاحة أو لم تعد في مرآبك.',
    unconfigured: 'اربط Supabase لعرض سجلات الإطارات.',
    all: 'الكل',
    position: 'الموقع',
    frontLeft: 'أمامي أيسر',
    frontRight: 'أمامي أيمن',
    rearLeft: 'خلفي أيسر',
    rearRight: 'خلفي أيمن',
    sparePosition: 'احتياطي',
    brand: 'العلامة التجارية',
    model: 'الموديل',
    size: 'مقاس الإطار',
    tireType: 'نوع الإطار',
    purchaseDate: 'تاريخ الشراء',
    installationDate: 'تاريخ التركيب',
    installationOdometer: 'العداد عند التركيب',
    currentOdometer: 'العداد الحالي',
    expectedLife: 'العمر المتوقع',
    replaceAt: 'الاستبدال عند',
    price: 'السعر',
    vendor: 'مقدم الخدمة',
    notes: 'ملاحظات',
    optional: 'اختياري',
    km: 'كم',
    currency: 'ج.م',
    datePlaceholder: 'YYYY-MM-DD',
    modelPlaceholder: 'موديل الإطار',
    sizePlaceholder: '225/45 R17',
    customBrandPlaceholder: 'أدخل العلامة التجارية',
    odometerPlaceholder: 'الكيلومترات',
    lifePlaceholder: 'مثال: ٥٠٠٠٠',
    pricePlaceholder: '0.00',
    vendorPlaceholder: 'متجر إطارات أو وكيل',
    notesPlaceholder: 'تفاصيل إضافية',
    michelin: 'ميشلان',
    bridgestone: 'بريدجستون',
    continental: 'كونتيننتال',
    goodyear: 'جوديير',
    pirelli: 'بيريللي',
    dunlop: 'دنلوب',
    other: 'أخرى',
    summer: 'صيفي',
    allSeason: 'جميع الفصول',
    winter: 'شتوي',
    performance: 'أداء',
    addTitle: 'سجل إطار جديد',
    editTitle: 'تعديل سجل الإطار',
    save: 'حفظ الإطار',
    saveChanges: 'حفظ التعديلات',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    deleteTitle: 'حذف سجل الإطار؟',
    deleteBody: 'سيُحذف سجل الإطار نهائيًا من سجل المركبة.',
    confirmDelete: 'حذف السجل',
    saved: 'تم حفظ سجل الإطار.',
    updated: 'تم تعديل سجل الإطار.',
    deleted: 'تم حذف سجل الإطار.',
    saveError: 'تعذّر حفظ سجل الإطار. حاول مرة أخرى.',
    deleteError: 'تعذّر حذف سجل الإطار. حاول مرة أخرى.',
    invalidPosition: 'اختر موقع الإطار.',
    invalidBrand: 'اختر أو أدخل علامة الإطار.',
    invalidModel: 'أدخل موديل الإطار.',
    invalidSize: 'أدخل مقاس الإطار.',
    invalidType: 'اختر نوع الإطار.',
    invalidPurchaseDate: 'أدخل تاريخ شراء صحيحًا بصيغة YYYY-MM-DD.',
    invalidInstallationDate: 'أدخل تاريخ تركيب صحيحًا بصيغة YYYY-MM-DD.',
    invalidDateOrder: 'لا يمكن أن يسبق تاريخ التركيب تاريخ الشراء.',
    invalidInstallationOdometer: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    invalidCurrentOdometer: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    invalidExpectedLife: 'يجب أن يكون العمر المتوقع عدد كيلومترات صحيحًا أكبر من صفر.',
    invalidPrice: 'يجب أن يكون السعر أكبر من صفر وبحد أقصى منزلتين عشريتين.',
    invalidMileageOrder: 'لا يمكن أن تقل قراءة العداد الحالية عن قراءة التركيب.',
    new: 'جديد',
    good: 'جيد',
    dueSoon: 'اقترب الاستبدال',
    replace: 'استبدل',
    noMileageData: 'لا توجد بيانات مسافة',
    noMileage: 'لا توجد بيانات مسافة',
    used: 'المستخدم',
    remaining: 'المتبقي',
    noInstall: 'غير مركب',
    saving: 'جارٍ الحفظ…',
    deleting: 'جارٍ الحذف…',
    close: 'إغلاق',
    priceNotRecorded: 'لم يُسجل السعر',
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
    good: '#54D6A0',
    warning: '#F4BC57',
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
    good: '#187A52',
    warning: '#A96700',
  },
} satisfies Record<ThemeName, Record<string, string>>;

const brandLabels: Record<BrandChoice, keyof typeof copy.en> = {
  michelin: 'michelin',
  bridgestone: 'bridgestone',
  continental: 'continental',
  goodyear: 'goodyear',
  pirelli: 'pirelli',
  dunlop: 'dunlop',
  other: 'other',
};
const knownBrandValues: Record<Exclude<BrandChoice, 'other'>, string> = {
  michelin: 'Michelin',
  bridgestone: 'Bridgestone',
  continental: 'Continental',
  goodyear: 'Goodyear',
  pirelli: 'Pirelli',
  dunlop: 'Dunlop',
};

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

function normalizeDecimal(value: string) {
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
  return normalized;
}

function parseCents(value: string) {
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

function formatMoney(value: number, text: Copy) {
  const cents = Math.round(value * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const numberLocale = isArabic ? 'ar-EG' : 'en-US';
  const groupedWhole = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(whole);
  if (fraction === 0) return `${text.currency} ${groupedWhole}`;
  const separator = new Intl.NumberFormat(numberLocale)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.';
  const fractionText = new Intl.NumberFormat(numberLocale, {
    minimumIntegerDigits: fraction % 10 === 0 ? 1 : 2,
    useGrouping: false,
  }).format(fraction % 10 === 0 ? fraction / 10 : fraction);
  return `${text.currency} ${groupedWhole}${separator}${fractionText}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

function positionLabel(position: TirePosition, text: Copy) {
  switch (position) {
    case 'front_left': return text.frontLeft;
    case 'front_right': return text.frontRight;
    case 'rear_left': return text.rearLeft;
    case 'rear_right': return text.rearRight;
    case 'spare': return text.sparePosition;
  }
}

function tireTypeLabel(type: TireType, text: Copy) {
  switch (type) {
    case 'summer': return text.summer;
    case 'all_season': return text.allSeason;
    case 'winter': return text.winter;
    case 'performance': return text.performance;
    case 'other': return text.other;
  }
}

function brandChoiceFor(value: string): BrandChoice {
  const matched = (Object.entries(knownBrandValues) as Array<[Exclude<BrandChoice, 'other'>, string]>)
    .find(([, brand]) => brand.toLowerCase() === value.toLowerCase());
  return matched?.[0] ?? 'other';
}

function makeDraft(vehicle: Vehicle): TireDraft {
  return {
    position: 'front_left',
    brandChoice: 'michelin',
    customBrand: '',
    model: '',
    size: '',
    tireType: null,
    purchaseDate: '',
    installationDate: '',
    installationOdometer: '',
    currentOdometer: String(vehicle.mileage),
    expectedLife: '',
    price: '',
    vendor: '',
    notes: '',
  };
}

function draftFromRecord(record: TireRecord): TireDraft {
  const brandChoice = brandChoiceFor(record.brand);
  return {
    position: record.position,
    brandChoice,
    customBrand: brandChoice === 'other' ? record.brand : '',
    model: record.model,
    size: record.size,
    tireType: record.tire_type,
    purchaseDate: record.purchase_date ?? '',
    installationDate: record.installation_date ?? '',
    installationOdometer: record.odometer_at_installation === null
      ? ''
      : String(record.odometer_at_installation),
    currentOdometer: record.current_odometer === null ? '' : String(record.current_odometer),
    expectedLife: record.expected_life_km === null ? '' : String(record.expected_life_km),
    price: record.price === null ? '' : Number(record.price).toFixed(2),
    vendor: record.vendor ?? '',
    notes: record.notes ?? '',
  };
}

function compareRecords(left: TireRecord, right: TireRecord) {
  return (right.installation_date ?? '').localeCompare(left.installation_date ?? '') ||
    right.created_at.localeCompare(left.created_at);
}

function tireLife(record: TireRecord) {
  if (
    record.odometer_at_installation === null ||
    record.current_odometer === null ||
    record.expected_life_km === null
  ) return null;
  const used = Math.max(0, record.current_odometer - record.odometer_at_installation);
  const remaining = Math.max(0, record.expected_life_km - used);
  const progress = Math.min(1, used / record.expected_life_km);
  let condition: TireCondition;
  if (used >= record.expected_life_km) condition = 'replace';
  else if (remaining / record.expected_life_km <= DUE_SOON_REMAINING_LIFE_THRESHOLD) {
    condition = 'dueSoon';
  } else if (used / record.expected_life_km <= NEW_TIRE_USED_LIFE_THRESHOLD) {
    condition = 'new';
  }
  else condition = 'good';
  return {
    used,
    remaining,
    progress,
    replacementOdometer: record.odometer_at_installation + record.expected_life_km,
    condition,
  };
}

async function fetchTires(
  client: NonNullable<typeof supabase>,
  vehicleId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('tire_records')
    .select(columns)
    .eq('vehicle_id', vehicleId)
    .eq('user_id', userId)
    .order('installation_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export default function TiresScreen({ vehicleId, colorScheme, onBack }: Props) {
  const colors = palette[colorScheme];
  const text = copy[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(supabase ? 'loading' : 'unconfigured');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<TireRecord[]>([]);
  const [filter, setFilter] = useState<PositionFilter>('all');
  const [draft, setDraft] = useState<TireDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TireRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const requestIdRef = useRef(0);
  const saveLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldsRef = useRef<Record<DraftField, TextInput | null>>({
    customBrand: null,
    model: null,
    size: null,
    purchaseDate: null,
    installationDate: null,
    installationOdometer: null,
    currentOdometer: null,
    expectedLife: null,
    price: null,
    vendor: null,
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
      const tires = await fetchTires(client, vehicleId, authData.user.id);
      if (requestId !== requestIdRef.current) return;
      setUser(authData.user);
      setVehicle(vehicleData);
      setRecords(tires);
      setLoadStatus('ready');
    } catch (error) {
      logError('Unable to load tires for the authenticated vehicle', error);
      if (requestId === requestIdRef.current) setLoadStatus('error');
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadData();
    return () => {
      requestIdRef.current += 1;
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [loadData]);

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => setNotice(''), 3200);
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
    if (!vehicle) return;
    setDraft(makeDraft(vehicle));
  }, [vehicle]);

  const beginEdit = useCallback((record: TireRecord) => {
    setEditingId(record.id);
    setErrors({});
    setFormError('');
    setErrorMessage('');
    setDraft(draftFromRecord(record));
  }, []);

  const updateDraft = useCallback(<Key extends keyof TireDraft>(key: Key, value: TireDraft[Key]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setFormError('');
    setErrors((current) => ({ ...current, [key]: undefined }));
  }, []);

  const validateDraft = useCallback((value: TireDraft) => {
    const nextErrors: ValidationErrors = {};
    if (!positions.includes(value.position)) nextErrors.position = text.invalidPosition;
    if (!brandChoices.includes(value.brandChoice) ||
      !(value.brandChoice === 'other' ? value.customBrand.trim() : knownBrandValues[value.brandChoice])) {
      nextErrors.brand = text.invalidBrand;
    }
    if (!value.model.trim()) nextErrors.model = text.invalidModel;
    if (!value.size.trim()) nextErrors.size = text.invalidSize;
    if (value.tireType !== null && !tireTypes.includes(value.tireType)) {
      nextErrors.tireType = text.invalidType;
    }
    if (value.purchaseDate.trim() && !isValidDate(value.purchaseDate)) {
      nextErrors.purchaseDate = text.invalidPurchaseDate;
    }
    if (value.installationDate.trim() && !isValidDate(value.installationDate)) {
      nextErrors.installationDate = text.invalidInstallationDate;
    }
    if (
      value.purchaseDate.trim() &&
      value.installationDate.trim() &&
      isValidDate(value.purchaseDate) &&
      isValidDate(value.installationDate) &&
      value.installationDate < value.purchaseDate
    ) nextErrors.installationDate = text.invalidDateOrder;

    const installationOdometer = value.installationOdometer.trim()
      ? parseInteger(value.installationOdometer)
      : null;
    const currentOdometer = value.currentOdometer.trim()
      ? parseInteger(value.currentOdometer)
      : null;
    const expectedLife = value.expectedLife.trim() ? parseInteger(value.expectedLife) : null;
    if (installationOdometer !== null &&
      (!Number.isSafeInteger(installationOdometer) || installationOdometer < 0 ||
        installationOdometer > 2_147_483_647)) {
      nextErrors.installationOdometer = text.invalidInstallationOdometer;
    }
    if (currentOdometer !== null &&
      (!Number.isSafeInteger(currentOdometer) || currentOdometer < 0 ||
        currentOdometer > 2_147_483_647)) {
      nextErrors.currentOdometer = text.invalidCurrentOdometer;
    }
    if (expectedLife !== null &&
      (!Number.isSafeInteger(expectedLife) || expectedLife <= 0 ||
        expectedLife > 2_147_483_647)) {
      nextErrors.expectedLife = text.invalidExpectedLife;
    }
    if (
      installationOdometer !== null &&
      currentOdometer !== null &&
      Number.isSafeInteger(installationOdometer) &&
      Number.isSafeInteger(currentOdometer) &&
      currentOdometer < installationOdometer
    ) nextErrors.currentOdometer = text.invalidMileageOrder;

    if (value.price.trim()) {
      const cents = parseCents(value.price);
      if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 999_999_999_999) {
        nextErrors.price = text.invalidPrice;
      }
    }
    return nextErrors;
  }, [text]);

  const saveRecord = useCallback(async () => {
    if (!supabase || !vehicle || !user || !draft || saveLockRef.current) return;
    const validationErrors = validateDraft(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

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
      const brand = draft.brandChoice === 'other'
        ? draft.customBrand.trim()
        : knownBrandValues[draft.brandChoice];
      const payload = {
        position: draft.position,
        brand,
        model: draft.model.trim(),
        size: draft.size.trim(),
        tire_type: draft.tireType,
        purchase_date: draft.purchaseDate.trim() || null,
        installation_date: draft.installationDate.trim() || null,
        odometer_at_installation: draft.installationOdometer.trim()
          ? parseInteger(draft.installationOdometer)
          : null,
        current_odometer: draft.currentOdometer.trim()
          ? parseInteger(draft.currentOdometer)
          : null,
        expected_life_km: draft.expectedLife.trim() ? parseInteger(draft.expectedLife) : null,
        price: draft.price.trim() ? parseCents(draft.price) / 100 : null,
        vendor: draft.vendor.trim() || null,
        notes: draft.notes.trim() || null,
      };
      let saved: TireRecord;
      if (editingId) {
        const { data, error } = await supabase
          .from('tire_records')
          .update(payload)
          .eq('id', editingId)
          .eq('vehicle_id', vehicle.id)
          .eq('user_id', user.id)
          .select(columns)
          .maybeSingle();
        if (error) throw error;
        if (!data || data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Tire record was not updated for the authenticated owner');
        }
        saved = data;
      } else {
        const { data, error } = await supabase
          .from('tire_records')
          .insert({ ...payload, vehicle_id: vehicle.id, user_id: user.id })
          .select(columns)
          .single();
        if (error) throw error;
        if (data.user_id !== user.id || data.vehicle_id !== vehicle.id) {
          throw new Error('Inserted tire record did not match the authenticated owner');
        }
        saved = data;
      }
      const wasEditing = editingId !== null;
      setRecords((current) => [...current.filter((record) => record.id !== saved.id), saved].sort(compareRecords));
      setDraft(null);
      setEditingId(null);
      setErrors({});
      showNotice(wasEditing ? text.updated : text.saved);
    } catch (error) {
      logError('Unable to save tire record', error);
      setFormError(text.saveError);
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  }, [draft, editingId, showNotice, text, user, validateDraft, vehicle]);

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
        .from('tire_records')
        .delete()
        .eq('id', recordToDelete.id)
        .eq('vehicle_id', vehicle.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Tire record was not deleted for the authenticated owner');
      setRecords((current) => current.filter((record) => record.id !== recordToDelete.id));
      setRecordToDelete(null);
      showNotice(text.deleted);
    } catch (error) {
      logError('Unable to delete tire record', error);
      setRecordToDelete(null);
      setErrorMessage(text.deleteError);
    } finally {
      deleteLockRef.current = false;
      setIsDeleting(false);
    }
  }, [recordToDelete, showNotice, text.deleteError, text.deleted, user, vehicle]);

  const overview = useMemo(() => {
    const latestByPosition = new Map<TirePosition, TireRecord>();
    for (const record of [...records].sort(compareRecords)) {
      if (!latestByPosition.has(record.position)) latestByPosition.set(record.position, record);
    }
    return latestByPosition;
  }, [records]);
  const summary = useMemo(() => {
    const installedCount = records.filter(
      (record) => record.installation_date !== null || record.odometer_at_installation !== null,
    ).length;
    const pricedRecords = records.filter((record) => record.price !== null);
    const totalCents = pricedRecords.reduce(
      (sum, record) => sum + Math.round(Number(record.price) * 100),
      0,
    );
    return {
      count: records.length,
      installed: installedCount,
      totalCents,
      averageCents: pricedRecords.length ? Math.round(totalCents / pricedRecords.length) : null,
    };
  }, [records]);
  const filteredRecords = useMemo(() => records.filter((record) => {
    if (filter === 'all') return true;
    if (filter === 'spare') return record.position === 'spare';
    if (filter === 'front') return record.position === 'front_left' || record.position === 'front_right';
    return record.position === 'rear_left' || record.position === 'rear_right';
  }), [filter, records]);
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
          <Text style={styles.topBrand}>CAR CARE / TIRE SYSTEM</Text>
          <View style={styles.topIndicator} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.headingBlock}>
            <Text style={[styles.eyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>{text.section}</Text>
            <View style={[styles.headingRow, isArabic && sharedStyles.rowReverse]}>
              <Text style={[styles.title, { writingDirection: direction }]}>{text.title}</Text>
              {vehicle && <Text numberOfLines={1} style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>}
            </View>
            {vehicle && (
              <View style={[styles.vehicleLine, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.vehicleDot} />
                <Text style={styles.vehicleMileage}>{formatNumber(vehicle.mileage)} KM</Text>
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
                  <Text style={styles.summaryEyebrow}>TREAD / 01</Text>
                  <View style={styles.onlineDot} />
                </View>
                <View style={styles.summaryGrid}>
                  <Metric label={text.totalTires} value={formatNumber(summary.count)} styles={styles} />
                  <Metric label={text.installed} value={formatNumber(summary.installed)} styles={styles} />
                  <Metric label={text.totalSpent} value={summary.totalCents ? formatMoney(summary.totalCents / 100, text) : '—'} styles={styles} accent />
                  <Metric label={text.averagePrice} value={summary.averageCents === null ? '—' : formatMoney(summary.averageCents / 100, text)} styles={styles} />
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

              <View style={[styles.sectionHeading, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.accentRule} />
                <Text style={styles.sectionTitle}>{text.overview}</Text>
                <View style={styles.sectionRule} />
              </View>
              <TireOverview
                overview={overview}
                text={text}
                styles={styles}
                colors={colors}
                arabic={isArabic}
                onSelect={(record) => beginEdit(record)}
              />

              <View style={[styles.sectionHeading, styles.recordsHeading, isArabic && sharedStyles.rowReverse]}>
                <View style={styles.accentRule} />
                <Text style={styles.sectionTitle}>{text.records}</Text>
                <View style={styles.sectionRule} />
                <Pressable accessibilityRole="button" accessibilityLabel={text.add} onPress={beginAdd} style={styles.addButton}>
                  <Text style={styles.addGlyph}>＋</Text>
                  <Text style={styles.addButtonText}>{text.add}</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, isArabic && sharedStyles.rowReverse]}>
                {filters.map((option) => {
                  const selected = filter === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setFilter(option)}
                      style={[styles.filterChip, selected && styles.filterChipSelected]}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                        {option === 'all' ? text.all : text[option]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {filteredRecords.length === 0 ? (
                <View style={styles.emptyPanel}>
                  <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>◎</Text></View>
                  <Text style={[styles.emptyEyebrow, { textAlign: isArabic ? 'right' : 'left' }]}>00 / TIRES</Text>
                  <Text style={[styles.emptyTitle, { textAlign: isArabic ? 'right' : 'left' }]}>
                    {records.length ? text.emptyFiltered : text.emptyTitle}
                  </Text>
                  <Text style={[styles.emptyBody, { writingDirection: direction, textAlign: isArabic ? 'right' : 'left' }]}>
                    {records.length ? text.emptyFilteredBody : text.emptyBody}
                  </Text>
                  {!records.length && (
                    <Pressable accessibilityRole="button" onPress={beginAdd} style={styles.emptyAction}>
                      <Text style={styles.emptyActionText}>＋  {text.addFirst}</Text>
                      <Text style={styles.emptyActionArrow}>{isArabic ? '‹' : '›'}</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.recordsList}>
                  {filteredRecords.map((record) => (
                    <TireCard
                      key={record.id}
                      record={record}
                      text={text}
                      styles={styles}
                      colors={colors}
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
        <TireFormModal
          draft={draft}
          errors={errors}
          formError={formError}
          isEditing={editingId !== null}
          isSaving={isSaving}
          colors={colors}
          styles={styles}
          text={text}
          direction={direction}
          arabic={isArabic}
          width={width}
          height={height}
          fieldsRef={fieldsRef}
          onChange={updateDraft}
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
                {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmDeleteText}>{text.confirmDelete}</Text>}
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
    <>
      <View style={styles.accentRule} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </>
  );
}

function TireOverview({
  overview,
  text,
  styles,
  colors,
  arabic,
  onSelect,
}: {
  overview: Map<TirePosition, TireRecord>;
  text: Copy;
  styles: ScreenStyles;
  colors: ScreenColors;
  arabic: boolean;
  onSelect: (record: TireRecord) => void;
}) {
  const positionsForAxle: Array<[TirePosition, TirePosition]> = [
    ['front_left', 'front_right'],
    ['rear_left', 'rear_right'],
  ];
  return (
    <View style={styles.overviewPanel}>
      <View style={[styles.axleLabel, arabic && sharedStyles.rowReverse]}>
        <Text style={styles.axleText}>{text.front}</Text>
        <View style={styles.axleRule} />
      </View>
      <View style={styles.vehicleDiagram}>
        <View style={styles.vehicleNose} />
        {positionsForAxle.map((axle, index) => (
          <View key={index} style={[styles.tireAxle, arabic && sharedStyles.rowReverse]}>
            {axle.map((position) => {
              const record = overview.get(position);
              return (
                <PositionTile
                  key={position}
                  position={position}
                  record={record}
                  text={text}
                  styles={styles}
                  colors={colors}
                  onPress={() => record && onSelect(record)}
                />
              );
            })}
            <View style={[styles.chassis, index === 1 && styles.chassisRear]}>
              <View style={styles.chassisLine} />
              <Text style={styles.chassisText}>CAR CARE</Text>
              <View style={styles.chassisLine} />
            </View>
          </View>
        ))}
        <View style={styles.vehicleTail} />
      </View>
      <View style={[styles.axleLabel, arabic && sharedStyles.rowReverse]}>
        <Text style={styles.axleText}>{text.rear}</Text>
        <View style={styles.axleRule} />
      </View>
      {overview.has('spare') && (
        <View style={styles.spareWrap}>
          <Text style={styles.spareLabel}>{text.spare}</Text>
          <PositionTile
            position="spare"
            record={overview.get('spare')}
            text={text}
            styles={styles}
            colors={colors}
            onPress={() => {
              const spare = overview.get('spare');
              if (spare) onSelect(spare);
            }}
          />
        </View>
      )}
    </View>
  );
}

function PositionTile({
  position,
  record,
  text,
  styles,
  colors,
  onPress,
}: {
  position: TirePosition;
  record: TireRecord | undefined;
  text: Copy;
  styles: ScreenStyles;
  colors: ScreenColors;
  onPress: () => void;
}) {
  const life = record ? tireLife(record) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${positionLabel(position, text)}${record ? `, ${record.brand} ${record.model}` : ''}`}
      disabled={!record}
      onPress={onPress}
      style={[styles.positionTile, !record && styles.positionTileEmpty]}
    >
      <View style={[styles.treadMarks, !record && styles.treadMarksEmpty]}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={styles.treadMark} />
        ))}
      </View>
      <Text numberOfLines={1} style={[styles.positionLabel, !record && styles.positionLabelEmpty]}>
        {positionLabel(position, text)}
      </Text>
      {record && <Text numberOfLines={1} style={styles.positionBrand}>{record.brand}</Text>}
      {record && (
        <View style={[
          styles.miniConditionDot,
          life ? conditionDotStyle(life.condition, colors) : styles.dotMuted,
        ]} />
      )}
    </Pressable>
  );
}

function conditionDotStyle(condition: TireCondition, colors: ScreenColors) {
  switch (condition) {
    case 'new':
    case 'good': return { backgroundColor: colors.accent };
    case 'dueSoon': return { backgroundColor: colors.warning };
    case 'replace': return { backgroundColor: colors.error };
  }
}

function TireCard({
  record,
  text,
  styles,
  colors,
  direction,
  onEdit,
  onDelete,
}: {
  record: TireRecord;
  text: Copy;
  styles: ScreenStyles;
  colors: ScreenColors;
  direction: 'ltr' | 'rtl';
  onEdit: () => void;
  onDelete: () => void;
}) {
  const life = tireLife(record);
  const conditionText = life ? text[life.condition] : text.noMileage;
  const conditionStyle = life ? styles[`condition${life.condition.charAt(0).toUpperCase()}${life.condition.slice(1)}` as
    'conditionNew' | 'conditionGood' | 'conditionDueSoon' | 'conditionReplace'] : styles.conditionNoData;
  const usedDistance = life ? `${formatNumber(life.used)} / ${formatNumber(record.expected_life_km ?? 0)} KM` : null;
  return (
    <View style={styles.tireCard}>
      <View style={[styles.cardTopline, isArabic && sharedStyles.rowReverse]}>
        <View style={styles.positionBadge}>
          <View style={styles.badgeDot} />
          <Text style={styles.positionBadgeText}>{positionLabel(record.position, text)}</Text>
        </View>
        <View style={[styles.conditionBadge, conditionStyle]}>
          <Text style={styles.conditionText}>{conditionText}</Text>
        </View>
      </View>
      <View style={[styles.tireHeading, isArabic && sharedStyles.rowReverse]}>
        <View style={styles.tireIdentity}>
          <Text style={[styles.tireBrand, { writingDirection: direction }]}>{record.brand}</Text>
          <Text style={[styles.tireModel, { writingDirection: direction }]}>{record.model}</Text>
        </View>
        <Text style={styles.tireSize}>{record.size}</Text>
      </View>
      {!!record.tire_type && (
        <Text style={styles.tireType}>{tireTypeLabel(record.tire_type, text).toUpperCase()}</Text>
      )}

      <View style={[styles.infoGrid, isArabic && sharedStyles.rowReverse]}>
        <InfoCell label={text.installationDate} value={record.installation_date ? formatDate(record.installation_date) : text.noInstall} styles={styles} />
        <InfoCell
          label={text.price}
          value={record.price === null ? text.priceNotRecorded : formatMoney(Number(record.price), text)}
          styles={styles}
          accent
        />
        <InfoCell
          label={text.installationOdometer}
          value={record.odometer_at_installation === null ? '—' : `${formatNumber(record.odometer_at_installation)} KM`}
          styles={styles}
        />
        <InfoCell
          label={text.currentOdometer}
          value={record.current_odometer === null ? '—' : `${formatNumber(record.current_odometer)} KM`}
          styles={styles}
        />
      </View>

      {life ? (
        <View style={styles.lifePanel}>
          <View style={[styles.lifeTop, isArabic && sharedStyles.rowReverse]}>
            <Text style={styles.lifeLabel}>{text.used}</Text>
            <Text style={styles.lifeValue}>{usedDistance}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[
              styles.progressFill,
              {
                width: `${Math.max(0, life.progress * 100)}%`,
                backgroundColor: life.condition === 'replace' ? colors.error
                  : life.condition === 'dueSoon' ? colors.warning
                    : colors.accent,
              },
            ]} />
          </View>
          <View style={[styles.lifeBottom, isArabic && sharedStyles.rowReverse]}>
            <Text style={styles.lifeExpected}>
              {text.replaceAt}: {formatNumber(life.replacementOdometer)} KM
            </Text>
            <Text style={styles.remainingValue}>{text.remaining}: {formatNumber(life.remaining)} KM</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.noMileagePanel, isArabic && sharedStyles.rowReverse]}>
          <View style={styles.noMileageDot} />
          <Text style={styles.noMileageText}>{text.noMileageData}</Text>
        </View>
      )}

      {!!record.vendor && (
        <Text style={[styles.vendorText, { writingDirection: direction }]}>{record.vendor}</Text>
      )}
      {!!record.notes && (
        <Text style={[styles.notesText, { writingDirection: direction }]}>{record.notes}</Text>
      )}
      <View style={[styles.cardActions, isArabic && sharedStyles.rowReverse]}>
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
  );
}

function InfoCell({
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
    <View style={styles.infoCell}>
      <Text numberOfLines={1} style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.infoValue, accent && styles.infoAccent]}>
        {value}
      </Text>
    </View>
  );
}

type TireFormProps = {
  draft: TireDraft;
  errors: ValidationErrors;
  formError: string;
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
  onChange: <Key extends keyof TireDraft>(key: Key, value: TireDraft[Key]) => void;
  onSave: () => void;
  onCancel: () => void;
};

function TireFormModal({
  draft,
  errors,
  formError,
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
  onChange,
  onSave,
  onCancel,
}: TireFormProps) {
  const optional = ` · ${text.optional}`;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.modalBackdrop, { paddingTop: Math.max(10, height * 0.02) }]}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCard, { maxWidth: Math.min(width - 28, 540) }]}>
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
              <Text style={styles.fieldLabel}>{text.position}</Text>
              <View style={[styles.choices, arabic && sharedStyles.rowReverse]}>
                {positions.map((position) => (
                  <Choice
                    key={position}
                    label={positionLabel(position, text)}
                    selected={draft.position === position}
                    disabled={isSaving}
                    styles={styles}
                    onPress={() => onChange('position', position)}
                  />
                ))}
              </View>
              {!!errors.position && <Text style={styles.fieldError}>{errors.position}</Text>}

              <Text style={[styles.fieldLabel, styles.groupLabel]}>{text.brand}</Text>
              <View style={[styles.choices, arabic && sharedStyles.rowReverse]}>
                {brandChoices.map((choice) => (
                  <Choice
                    key={choice}
                    label={text[brandLabels[choice]]}
                    selected={draft.brandChoice === choice}
                    disabled={isSaving}
                    styles={styles}
                    onPress={() => onChange('brandChoice', choice)}
                  />
                ))}
              </View>
              {draft.brandChoice === 'other' && (
                <TireField
                  label={text.brand}
                  value={draft.customBrand}
                  placeholder={text.customBrandPlaceholder}
                  error={errors.brand}
                  styles={styles}
                  colors={colors}
                  direction={direction}
                  disabled={isSaving}
                  onChangeText={(value) => onChange('customBrand', value)}
                  ref={(ref) => { fieldsRef.current.customBrand = ref; }}
                />
              )}
              {!!errors.brand && draft.brandChoice !== 'other' && <Text style={styles.fieldError}>{errors.brand}</Text>}
              <TireField
                label={text.model}
                value={draft.model}
                placeholder={text.modelPlaceholder}
                error={errors.model}
                styles={styles}
                colors={colors}
                direction={direction}
                disabled={isSaving}
                onChangeText={(value) => onChange('model', value)}
                ref={(ref) => { fieldsRef.current.model = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.size?.focus()}
              />
              <TireField
                label={text.size}
                value={draft.size}
                placeholder={text.sizePlaceholder}
                error={errors.size}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                onChangeText={(value) => onChange('size', value)}
                ref={(ref) => { fieldsRef.current.size = ref; }}
                returnKeyType="done"
              />

              <Text style={[styles.fieldLabel, styles.groupLabel]}>{`${text.tireType} · ${text.optional}`}</Text>
              <View style={[styles.choices, arabic && sharedStyles.rowReverse]}>
                {tireTypes.map((type) => (
                  <Choice
                    key={type}
                    label={tireTypeLabel(type, text)}
                    selected={draft.tireType === type}
                    disabled={isSaving}
                    styles={styles}
                    onPress={() => onChange('tireType', draft.tireType === type ? null : type)}
                  />
                ))}
              </View>

              <TireField
                label={`${text.purchaseDate}${optional}`}
                value={draft.purchaseDate}
                placeholder={text.datePlaceholder}
                error={errors.purchaseDate}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                onChangeText={(value) => onChange('purchaseDate', value)}
                ref={(ref) => { fieldsRef.current.purchaseDate = ref; }}
              />
              <TireField
                label={`${text.installationDate}${optional}`}
                value={draft.installationDate}
                placeholder={text.datePlaceholder}
                error={errors.installationDate}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                onChangeText={(value) => onChange('installationDate', value)}
                ref={(ref) => { fieldsRef.current.installationDate = ref; }}
              />
              <TireField
                label={`${text.installationOdometer}${optional}`}
                value={draft.installationOdometer}
                placeholder={text.odometerPlaceholder}
                suffix="KM"
                error={errors.installationOdometer}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="number-pad"
                onChangeText={(value) => onChange('installationOdometer', value)}
                ref={(ref) => { fieldsRef.current.installationOdometer = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.currentOdometer?.focus()}
              />
              <TireField
                label={`${text.currentOdometer}${optional}`}
                value={draft.currentOdometer}
                placeholder={text.odometerPlaceholder}
                suffix="KM"
                error={errors.currentOdometer}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="number-pad"
                onChangeText={(value) => onChange('currentOdometer', value)}
                ref={(ref) => { fieldsRef.current.currentOdometer = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.expectedLife?.focus()}
              />
              <TireField
                label={`${text.expectedLife}${optional}`}
                value={draft.expectedLife}
                placeholder={text.lifePlaceholder}
                suffix="KM"
                error={errors.expectedLife}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="number-pad"
                onChangeText={(value) => onChange('expectedLife', value)}
                ref={(ref) => { fieldsRef.current.expectedLife = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.price?.focus()}
              />
              <TireField
                label={`${text.price}${optional}`}
                value={draft.price}
                placeholder={text.pricePlaceholder}
                suffix={text.currency}
                error={errors.price}
                styles={styles}
                colors={colors}
                direction="ltr"
                disabled={isSaving}
                keyboardType="decimal-pad"
                onChangeText={(value) => onChange('price', value)}
                ref={(ref) => { fieldsRef.current.price = ref; }}
                returnKeyType="next"
                onSubmitEditing={() => fieldsRef.current.vendor?.focus()}
              />
              <TireField
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
                onSubmitEditing={() => fieldsRef.current.notes?.focus()}
              />
              <TireField
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
                <View style={[styles.formError, arabic && sharedStyles.rowReverse]}>
                  <Text style={styles.errorGlyph}>!</Text>
                  <Text style={[styles.formErrorText, { writingDirection: direction }]}>{formError}</Text>
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

function Choice({
  label,
  selected,
  disabled,
  styles,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  styles: ScreenStyles;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type TireFieldProps = {
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

const TireField = forwardRef<TextInput, TireFieldProps>(function TireField(
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
    headingBlock: { marginBottom: 16 },
    eyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 2.1, fontWeight: '800' },
    headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 4 },
    title: { color: colors.foreground, fontSize: 34, lineHeight: 40, letterSpacing: -1.4, fontWeight: '700' },
    vehicleName: { color: colors.foreground, fontSize: 11, fontWeight: '600', flexShrink: 1 },
    vehicleLine: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    vehicleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    vehicleMileage: { color: colors.accent, fontSize: 10, fontVariant: ['tabular-nums'] },
    summaryPanel: { backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 14 },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, fontWeight: '700' },
    onlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    metricCell: { width: '50%', minWidth: 0, paddingEnd: 8, paddingVertical: 7 },
    metricLabel: { color: colors.muted, fontSize: 8, lineHeight: 12, fontWeight: '700', letterSpacing: 0.6 },
    metricValue: { color: colors.foreground, marginTop: 4, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
    metricAccent: { color: colors.accent },
    inlineError: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.dangerSurface, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorGlyph: { color: colors.error, fontSize: 14, fontWeight: '900' },
    inlineErrorText: { flex: 1, color: colors.error, fontSize: 11, lineHeight: 16 },
    notice: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8 },
    noticeGlyph: { color: colors.accent, fontSize: 13, fontWeight: '900' },
    noticeText: { color: colors.foreground, flex: 1, fontSize: 11 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10 },
    recordsHeading: { marginTop: 25 },
    accentRule: { width: 3, height: 14, backgroundColor: colors.accent, borderRadius: 2 },
    sectionTitle: { color: colors.foreground, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
    sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    overviewPanel: { borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 13 },
    axleLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    axleText: { color: colors.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '800' },
    axleRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    vehicleDiagram: { alignItems: 'center', paddingVertical: 7 },
    vehicleNose: { height: 9, width: 104, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.borderStrong, backgroundColor: colors.panel },
    tireAxle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: 69 },
    chassis: { position: 'absolute', left: '31%', right: '31%', top: 0, bottom: 0, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
    chassisRear: { borderRadius: 10 },
    chassisLine: { width: 9, height: 1, backgroundColor: colors.borderStrong },
    chassisText: { color: colors.muted, fontSize: 6, letterSpacing: 0.8, fontWeight: '800' },
    vehicleTail: { height: 7, width: 94, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderWidth: 1, borderTopWidth: 0, borderColor: colors.borderStrong, backgroundColor: colors.panel },
    positionTile: { zIndex: 1, minWidth: 71, minHeight: 54, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 4 },
    positionTileEmpty: { borderStyle: 'dashed', opacity: 0.58 },
    treadMarks: { flexDirection: 'row', gap: 3, marginBottom: 3 },
    treadMarksEmpty: { opacity: 0.35 },
    treadMark: { width: 2, height: 8, backgroundColor: colors.accent, borderRadius: 1 },
    positionLabel: { color: colors.foreground, fontSize: 7, fontWeight: '800', textAlign: 'center' },
    positionLabelEmpty: { color: colors.muted },
    positionBrand: { color: colors.muted, fontSize: 6, marginTop: 2 },
    miniConditionDot: { position: 'absolute', top: 4, end: 4, width: 5, height: 5, borderRadius: 3 },
    dotMuted: { backgroundColor: colors.muted },
    spareWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 10, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    spareLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1, fontWeight: '800' },
    addButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: 8, borderColor: colors.borderStrong, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    addGlyph: { color: colors.accent, fontSize: 16, lineHeight: 18 },
    addButtonText: { color: colors.foreground, fontSize: 8, letterSpacing: 0.5, fontWeight: '800' },
    filterRow: { gap: 7, paddingBottom: 11 },
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
    emptyAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, minHeight: 44, paddingHorizontal: 12, backgroundColor: colors.accent, borderRadius: 10 },
    emptyActionText: { color: colors.accentInk, fontSize: 9, letterSpacing: 0.6, fontWeight: '900' },
    emptyActionArrow: { color: colors.accentInk, fontSize: 22 },
    recordsList: { gap: 10 },
    tireCard: { backgroundColor: colors.panel, borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 13 },
    cardTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 7 },
    positionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 6, flexShrink: 1 },
    badgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    positionBadgeText: { color: colors.accent, fontSize: 8, fontWeight: '800' },
    conditionBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
    conditionNew: { borderColor: colors.accent, backgroundColor: colors.surfaceStrong },
    conditionGood: { borderColor: colors.good, backgroundColor: colors.surface },
    conditionDueSoon: { borderColor: colors.warning, backgroundColor: colors.surface },
    conditionReplace: { borderColor: colors.error, backgroundColor: colors.dangerSurface },
    conditionNoData: { borderColor: colors.borderStrong, backgroundColor: colors.surface },
    conditionText: { color: colors.foreground, fontSize: 7, letterSpacing: 0.6, fontWeight: '900' },
    tireHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 9, marginTop: 9 },
    tireIdentity: { flex: 1 },
    tireBrand: { color: colors.foreground, fontSize: 16, lineHeight: 20, fontWeight: '800' },
    tireModel: { color: colors.muted, fontSize: 11, marginTop: 1 },
    tireSize: { color: colors.accent, fontSize: 12, letterSpacing: 0.4, fontWeight: '800', fontVariant: ['tabular-nums'] },
    tireType: { color: colors.muted, fontSize: 7, letterSpacing: 1.1, fontWeight: '800', marginTop: 7 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 11, paddingVertical: 7 },
    infoCell: { width: '50%', minWidth: 0, paddingVertical: 5, paddingEnd: 6 },
    infoLabel: { color: colors.muted, fontSize: 7, lineHeight: 10, fontWeight: '800', letterSpacing: 0.5 },
    infoValue: { color: colors.foreground, fontSize: 10, fontWeight: '700', marginTop: 3, fontVariant: ['tabular-nums'] },
    infoAccent: { color: colors.accent },
    lifePanel: { marginTop: 11, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 9 },
    lifeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    lifeLabel: { color: colors.muted, fontSize: 7, letterSpacing: 0.7, fontWeight: '800' },
    lifeValue: { color: colors.foreground, fontSize: 9, fontWeight: '800', fontVariant: ['tabular-nums'] },
    progressTrack: { height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, overflow: 'hidden', marginTop: 7 },
    progressFill: { height: 4, borderRadius: 2 },
    lifeBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, marginTop: 6 },
    lifeExpected: { color: colors.muted, fontSize: 7, flexShrink: 1 },
    remainingValue: { color: colors.accent, fontSize: 8, fontWeight: '800' },
    noMileagePanel: { marginTop: 11, minHeight: 32, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
    noMileageDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.muted },
    noMileageText: { flex: 1, color: colors.muted, fontSize: 7, letterSpacing: 0.8, fontWeight: '800' },
    vendorText: { color: colors.muted, fontSize: 9, marginTop: 8 },
    notesText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 7 },
    cardActions: { flexDirection: 'row', gap: 14, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: 10, paddingTop: 5 },
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
    choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 9, minHeight: 36, justifyContent: 'center' },
    choiceSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceStrong },
    choiceText: { color: colors.muted, fontSize: 9, fontWeight: '600' },
    choiceTextSelected: { color: colors.accent },
    groupLabel: { marginTop: 14 },
    fieldWrap: { marginTop: 11 },
    fieldLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    inputShell: { minHeight: 44, marginTop: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 10 },
    inputShellError: { borderColor: colors.error },
    inputShellMultiline: { minHeight: 66, alignItems: 'flex-start', paddingTop: 8 },
    input: { flex: 1, color: colors.foreground, fontSize: 12, minHeight: 42, paddingVertical: 7 },
    inputMultiline: { minHeight: 51, paddingTop: 0 },
    inputSuffix: { color: colors.muted, fontSize: 9, marginStart: 8, fontWeight: '700' },
    fieldError: { color: colors.error, fontSize: 9, lineHeight: 14, marginTop: 4 },
    formError: { marginTop: 12, padding: 9, borderRadius: 9, backgroundColor: colors.dangerSurface, flexDirection: 'row', gap: 7, alignItems: 'center' },
    formErrorText: { flex: 1, color: colors.error, fontSize: 10, lineHeight: 15 },
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
