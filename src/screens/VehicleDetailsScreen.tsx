import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  ActivityIndicator,
  BackHandler,
  Easing,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';

import CockpitBackdrop from '../components/CockpitBackdrop';
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
  image_path: string | null;
  created_at: string;
  updated_at: string;
};
type ScreenStatus = 'loading' | 'ready' | 'error' | 'notFound' | 'signedOut' | 'unconfigured';
type Action = 'maintenance' | 'fuel' | 'history' | 'documents' | 'invoices' | 'body' | 'scanWarning';
type ImageDraft = ImagePicker.ImagePickerAsset | null;
type EditDraft = {
  type: VehicleType;
  make: string;
  model: string;
  year: string;
  mileage: string;
  photo: ImageDraft;
  removePhoto: boolean;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');
const instrumentIntegerFormat = new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
  maximumFractionDigits: 0,
  useGrouping: false,
});

const copy = {
  en: {
    back: 'Back',
    healthDetails: 'HEALTH DETAILS',
    healthIndex: 'HEALTH INDEX',
    car: 'Car',
    motorcycle: 'Motorcycle',
    vehicle: 'VEHICLE',
    odometer: 'ODOMETER',
    health: 'VEHICLE HEALTH',
    notScored: 'NOT SCORED',
    noMaintenance: 'No maintenance data yet',
    noMaintenanceDetail: 'Log a service to start tracking this vehicle’s health.',
    noUpcomingService: 'No upcoming service data',
    noLicenseData: 'No license expiry data',
    noServiceData: 'NO SERVICE DATA',
    noLicenseRecord: 'NO EXPIRY DATA',
    comingSoon: 'Coming soon',
    scanWarning: 'Scan warning light',
    scanVehicle: 'SCAN VEHICLE',
    noFiles: 'NO FILES',
    bodyScan: 'Body scan',
    uploadReceipt: 'Upload receipt',
    askByVoice: 'Ask by voice',
    logService: 'Log service',
    serviceTab: 'Service',
    profileTab: 'Profile',
    close: 'Close',
    nextService: 'NEXT SERVICE',
    openServiceLog: 'Open service log',
    documentCenter: 'DOCUMENTS',
    openDocuments: 'Review vehicle documents',
    actions: 'VEHICLE RECORDS',
    maintenance: 'Maintenance',
    fuel: 'Fuel',
    history: 'Service history',
    expenses: 'Expenses',
    tires: 'Tires',
    documents: 'Documents',
    invoices: 'Invoices',
    body: '3D body scan',
    edit: 'Edit vehicle',
    delete: 'Delete vehicle',
    editTitle: 'EDIT VEHICLE',
    typeLabel: 'VEHICLE TYPE',
    make: 'MAKE / BRAND',
    model: 'MODEL',
    year: 'YEAR',
    mileage: 'CURRENT ODOMETER',
    mileagePlaceholder: 'Enter kilometres',
    changePhoto: 'Replace photo',
    addPhoto: 'Add a vehicle photo',
    removePhoto: 'Remove photo',
    save: 'Save changes',
    cancel: 'Cancel',
    invalidType: 'Choose a vehicle type.',
    invalidMake: 'Enter the vehicle make or brand.',
    invalidModel: 'Enter the vehicle model.',
    invalidYear: 'Enter a valid year between 1886 and next year.',
    invalidMileage: 'Enter a valid mileage of zero or more kilometres.',
    photoPermission: 'Allow photo library access to choose a vehicle photo.',
    photoTooLarge: 'Choose an image smaller than 10 MB.',
    photoType: 'Choose a JPEG, PNG, WebP, or HEIC image.',
    photoPickerError: 'Unable to open your photo library. Please try again.',
    saveError: 'Unable to update this vehicle. Please try again.',
    photoSaveError: 'The photo could not be saved. Your vehicle details were not changed.',
    imageCleanupWarning: 'Details were saved, but the old photo could not be removed.',
    imageDisplayWarning: 'Details were saved, but the new photo could not be displayed. Reload to retry.',
    deleteTitle: 'Delete this vehicle?',
    deleteBody: 'This will permanently remove this vehicle and cannot be undone.',
    confirmDelete: 'Delete vehicle',
    deleteError: 'Unable to delete this vehicle. Its details are still in your garage.',
    retry: 'Try again',
    loadError: 'Unable to load this vehicle.',
    notFound: 'This vehicle is unavailable or no longer in your garage.',
    signedOut: 'Sign in again to view this vehicle.',
    unconfigured: 'Connect Supabase to view vehicle details.',
    actionUnavailable: 'Coming soon',
    loading: 'Loading vehicle details…',
    emptyPhoto: 'VEHICLE PHOTO',
    photo: 'PHOTO',
    yearSuffix: 'MODEL YEAR',
    saving: 'Saving…',
    deleting: 'Deleting…',
  },
  ar: {
    back: 'رجوع',
    healthDetails: 'تفاصيل الحالة',
    healthIndex: 'مؤشر الصحة',
    car: 'سيارة',
    motorcycle: 'موتوسيكل',
    vehicle: 'المركبة',
    odometer: 'عداد الكيلومترات',
    health: 'حالة المركبة',
    notScored: 'لم تُقيّم بعد',
    noMaintenance: 'لا توجد بيانات صيانة بعد',
    noMaintenanceDetail: 'سجّل صيانة لبدء متابعة حالة هذه المركبة.',
    noUpcomingService: 'لا توجد بيانات للصيانة القادمة',
    noLicenseData: 'لا توجد بيانات لانتهاء الرخصة',
    noServiceData: 'لا توجد بيانات صيانة',
    noLicenseRecord: 'لا توجد بيانات لانتهاء الرخصة',
    comingSoon: 'قريبًا',
    scanWarning: 'افحص ضوء التحذير',
    scanVehicle: 'فحص المركبة',
    noFiles: 'لا توجد ملفات',
    bodyScan: 'فحص الهيكل',
    uploadReceipt: 'رفع إيصال',
    askByVoice: 'اسأل صوتيًا',
    logService: 'تسجيل صيانة',
    serviceTab: 'الخدمة',
    profileTab: 'الملف الشخصي',
    close: 'إغلاق',
    nextService: 'الصيانة القادمة',
    openServiceLog: 'عرض سجل الصيانة',
    documentCenter: 'المستندات',
    openDocuments: 'مراجعة مستندات المركبة',
    actions: 'سجل المركبة',
    maintenance: 'الصيانة',
    fuel: 'الوقود',
    history: 'سجل الخدمة',
    expenses: 'المصروفات',
    tires: 'الإطارات',
    documents: 'المستندات',
    invoices: 'الفواتير',
    body: 'فحص الهيكل ثلاثي الأبعاد',
    edit: 'تعديل المركبة',
    delete: 'حذف المركبة',
    editTitle: 'تعديل المركبة',
    typeLabel: 'نوع المركبة',
    make: 'الماركة',
    model: 'الموديل',
    year: 'سنة الصنع',
    mileage: 'قراءة العداد الحالية',
    mileagePlaceholder: 'أدخل الكيلومترات',
    changePhoto: 'استبدال الصورة',
    addPhoto: 'إضافة صورة للمركبة',
    removePhoto: 'إزالة الصورة',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    invalidType: 'اختر نوع المركبة.',
    invalidMake: 'أدخل ماركة المركبة.',
    invalidModel: 'أدخل موديل المركبة.',
    invalidYear: 'أدخل سنة صحيحة بين ١٨٨٦ والسنة القادمة.',
    invalidMileage: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    photoPermission: 'اسمح بالوصول إلى مكتبة الصور لاختيار صورة المركبة.',
    photoTooLarge: 'اختر صورة يقل حجمها عن ١٠ ميجابايت.',
    photoType: 'اختر صورة بصيغة JPEG أو PNG أو WebP أو HEIC.',
    photoPickerError: 'تعذّر فتح مكتبة الصور. حاول مرة أخرى.',
    saveError: 'تعذّر تعديل المركبة. حاول مرة أخرى.',
    photoSaveError: 'تعذّر حفظ الصورة، ولم يتم تغيير بيانات المركبة.',
    imageCleanupWarning: 'تم حفظ التغييرات، لكن تعذّر حذف الصورة القديمة.',
    imageDisplayWarning: 'تم حفظ التغييرات، لكن تعذّر عرض الصورة الجديدة. أعد تحميل الصفحة للمحاولة.',
    deleteTitle: 'حذف هذه المركبة؟',
    deleteBody: 'سيتم حذف المركبة نهائيًا ولا يمكن التراجع عن ذلك.',
    confirmDelete: 'حذف المركبة',
    deleteError: 'تعذّر حذف المركبة. ما زالت بياناتها في مرآبك.',
    retry: 'حاول مرة أخرى',
    loadError: 'تعذّر تحميل المركبة.',
    notFound: 'المركبة غير متاحة أو لم تعد في مرآبك.',
    signedOut: 'سجّل الدخول مجددًا لعرض هذه المركبة.',
    unconfigured: 'اربط Supabase لعرض تفاصيل المركبة.',
    actionUnavailable: 'قريبًا',
    loading: 'جارٍ تحميل تفاصيل المركبة…',
    emptyPhoto: 'صورة المركبة',
    photo: 'الصورة',
    yearSuffix: 'سنة الصنع',
    saving: 'جارٍ الحفظ…',
    deleting: 'جارٍ الحذف…',
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

type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof createStyles>;
type Copy = { [Key in keyof typeof copy.en]: string };
type Props = {
  vehicleId: string;
  colorScheme: ThemeName;
  onBack: () => void;
  onDeleted: () => void;
  onOpenMaintenance: (vehicleId: string) => void;
  onOpenFuel: (vehicleId: string) => void;
  onOpenServiceHistory: (vehicleId: string) => void;
  onOpenExpenses: (vehicleId: string) => void;
  onOpenTires: (vehicleId: string) => void;
  onOpenDocuments: (vehicleId: string) => void;
};

function logError(context: string, error: unknown) {
  if (__DEV__) console.error(`[Car Care] ${context}`, error);
}

function parseLocalizedInteger(value: string) {
  const westernDigits = value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  const normalized = westernDigits.replace(/[,\u066c\s]/g, '');
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function formatMileage(value: number) {
  return new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0,
    minimumIntegerDigits: 6,
  }).format(value);
}

function getImageInfo(asset: ImagePicker.ImagePickerAsset) {
  const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return { mimeType, extension: extensions[mimeType] };
}

function createDraft(vehicle: Vehicle): EditDraft {
  return {
    type: vehicle.type,
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    mileage: String(vehicle.mileage),
    photo: null,
    removePhoto: false,
  };
}

function isVehicleType(value: string): value is VehicleType {
  return value === 'car' || value === 'motorcycle';
}

function isOwnedImagePath(path: string, userId: string) {
  const segments = path.split('/');
  return segments.length >= 3 && segments[0] === userId && segments.every(Boolean);
}

export default function VehicleDetailsScreen({
  vehicleId,
  colorScheme,
  onBack,
  onDeleted,
  onOpenMaintenance,
  onOpenFuel,
  onOpenServiceHistory,
  onOpenExpenses,
  onOpenTires,
  onOpenDocuments,
}: Props) {
  const colors = palette[colorScheme];
  const text = copy[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';
  const { height, width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [status, setStatus] = useState<ScreenStatus>(
    supabase ? 'loading' : 'unconfigured',
  );
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const makeRef = useRef<TextInput>(null);
  const modelRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const mileageRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);

  const loadVehicle = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setStatus('unconfigured');
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setErrorMessage('');

    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setUser(null);
        setVehicle(null);
        setStatus('signedOut');
        return;
      }

      setUser(authData.user);
      const { data, error } = await client
        .from('vehicles')
        .select('id, user_id, type, make, model, year, mileage, image_path, created_at, updated_at')
        .eq('id', vehicleId)
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (error) throw error;
      if (requestId !== requestIdRef.current) return;
      if (!data || data.user_id !== authData.user.id) {
        setVehicle(null);
        setImageUri(null);
        setStatus('notFound');
        return;
      }
      if (!isVehicleType(data.type)) {
        throw new Error(`Unsupported vehicle type: ${data.type}`);
      }

      let signedImageUri: string | null = null;
      if (data.image_path && isOwnedImagePath(data.image_path, authData.user.id)) {
        const { data: signedImage, error: imageError } = await client.storage
          .from('vehicle-images')
          .createSignedUrl(data.image_path, 60 * 60);
        if (imageError) {
          logError(`Unable to load private image for vehicle ${data.id}`, imageError);
        } else {
          signedImageUri = signedImage.signedUrl;
        }
      } else if (data.image_path) {
        logError(
          'Vehicle photo path is outside its owner folder',
          new Error('Private vehicle image path ownership check failed'),
        );
      }
      if (requestId !== requestIdRef.current) return;

      setVehicle(data);
      setImageUri(signedImageUri);
      setStatus('ready');
    } catch (error) {
      logError('Unable to load the authenticated user’s vehicle', error);
      if (requestId === requestIdRef.current) setStatus('error');
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadVehicle();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadVehicle]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return true;
      }
      if (activeAction) {
        setActiveAction(null);
        return true;
      }
      if (isEditing && !isSaving) {
        setIsEditing(false);
        setErrorMessage('');
        return true;
      }
      if (isSaving || isDeleting) return true;
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [activeAction, isDeleting, isEditing, isSaving, onBack, showDeleteConfirm]);

  const openEditor = useCallback(() => {
    if (!vehicle) return;
    setDraft(createDraft(vehicle));
    setErrorMessage('');
    setIsEditing(true);
  }, [vehicle]);

  const closeEditor = useCallback(() => {
    if (isSaving) return;
    setIsEditing(false);
    setErrorMessage('');
  }, [isSaving]);

  const choosePhoto = useCallback(async () => {
    if (!draft) return;
    setErrorMessage('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(text.photoPermission);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.75,
        exif: false,
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      const { extension } = getImageInfo(selected);
      if (!extension) {
        setErrorMessage(text.photoType);
        return;
      }
      if (selected.fileSize !== undefined && selected.fileSize > 10 * 1024 * 1024) {
        setErrorMessage(text.photoTooLarge);
        return;
      }
      setDraft((current) =>
        current ? { ...current, photo: selected, removePhoto: false } : current,
      );
    } catch (error) {
      logError('Unable to choose a replacement vehicle photo', error);
      setErrorMessage(text.photoPickerError);
    }
  }, [draft, text]);

  const removePhoto = useCallback(() => {
    setDraft((current) =>
      current ? { ...current, photo: null, removePhoto: true } : current,
    );
    setErrorMessage('');
  }, []);

  const saveChanges = useCallback(async () => {
    if (!vehicle || !user || !draft || !supabase) return;
    setErrorMessage('');
    if (!draft.type) {
      setErrorMessage(text.invalidType);
      return;
    }
    if (!draft.make.trim()) {
      setErrorMessage(text.invalidMake);
      return;
    }
    if (!draft.model.trim()) {
      setErrorMessage(text.invalidModel);
      return;
    }

    const year = parseLocalizedInteger(draft.year);
    if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1) {
      setErrorMessage(text.invalidYear);
      return;
    }
    const mileage = parseLocalizedInteger(draft.mileage);
    if (
      draft.mileage.trim().length === 0 ||
      !Number.isSafeInteger(mileage) ||
      mileage < 0 ||
      mileage > 2_147_483_647
    ) {
      setErrorMessage(text.invalidMileage);
      return;
    }

    setIsSaving(true);
    let uploadedImagePath: string | null = null;
    let uploadedImage = false;
    let vehicleWasUpdated = false;
    let completionWarning = '';
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setStatus('signedOut');
        setIsEditing(false);
        return;
      }

      let imagePath = vehicle.image_path;
      if (draft.photo) {
        const imageInfo = getImageInfo(draft.photo);
        if (!imageInfo.extension) throw new Error('Unsupported vehicle photo type');
        const imageFile = new File(draft.photo.uri);
        if (!imageFile.exists) throw new Error('Selected vehicle photo is not available');
        const imageData = await imageFile.arrayBuffer();
        if (imageData.byteLength === 0 || imageData.byteLength > 10 * 1024 * 1024) {
          throw new Error('Selected vehicle photo is empty or exceeds the Storage limit');
        }

        uploadedImagePath =
          `${user.id}/${vehicle.id}/${Date.now()}.${imageInfo.extension}`;
        const { error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(uploadedImagePath, imageData, {
            contentType: imageInfo.mimeType,
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) throw uploadError;
        uploadedImage = true;
        imagePath = uploadedImagePath;
      } else if (draft.removePhoto) {
        imagePath = null;
      }

      const { data: updatedVehicle, error: updateError } = await supabase
        .from('vehicles')
        .update({
          type: draft.type,
          make: draft.make.trim(),
          model: draft.model.trim(),
          year,
          mileage,
          image_path: imagePath,
        })
        .eq('id', vehicle.id)
        .eq('user_id', user.id)
        .select('id, user_id, type, make, model, year, mileage, image_path, created_at, updated_at')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updatedVehicle || updatedVehicle.user_id !== user.id) {
        throw new Error('Vehicle was not updated; it may no longer belong to this user');
      }
      vehicleWasUpdated = true;

      let updatedImageUri =
        imagePath && !draft.removePhoto && !uploadedImagePath ? imageUri : null;
      if (imagePath && uploadedImagePath) {
        try {
          const { data: signedImage, error: signedUrlError } = await supabase.storage
            .from('vehicle-images')
            .createSignedUrl(imagePath, 60 * 60);
          if (signedUrlError) {
            logError('Vehicle updated but its replacement photo could not be signed', signedUrlError);
            completionWarning = text.imageDisplayWarning;
          } else {
            updatedImageUri = signedImage.signedUrl;
          }
        } catch (signedUrlError) {
          logError('Vehicle updated but its replacement photo could not be signed', signedUrlError);
          completionWarning = text.imageDisplayWarning;
        }
      }

      setVehicle(updatedVehicle);
      setImageUri(updatedImageUri);
      setDraft(createDraft(updatedVehicle));
      setIsEditing(false);

      if (
        vehicle.image_path &&
        vehicle.image_path !== imagePath &&
        isOwnedImagePath(vehicle.image_path, user.id)
      ) {
        try {
          const { error: removeOldImageError } = await supabase.storage
            .from('vehicle-images')
            .remove([vehicle.image_path]);
          if (removeOldImageError) {
            logError('Vehicle updated but the old private image could not be removed', removeOldImageError);
            completionWarning ||= text.imageCleanupWarning;
          }
        } catch (removeOldImageError) {
          logError('Vehicle updated but the old private image could not be removed', removeOldImageError);
          completionWarning ||= text.imageCleanupWarning;
        }
      }
      setErrorMessage(completionWarning);
    } catch (error) {
      logError('Unable to update vehicle details', error);

      if (!vehicleWasUpdated) {
        if (uploadedImage && uploadedImagePath) {
          try {
            const { error: cleanupError } = await supabase.storage
              .from('vehicle-images')
              .remove([uploadedImagePath]);
            if (cleanupError) {
              logError('Unable to clean up the replacement vehicle photo', cleanupError);
            }
          } catch (cleanupError) {
            logError('Unable to clean up the replacement vehicle photo', cleanupError);
          }
        }
        setErrorMessage(uploadedImagePath ? text.photoSaveError : text.saveError);
      } else {
        void loadVehicle();
      }
    } finally {
      setIsSaving(false);
    }
  }, [draft, imageUri, loadVehicle, text, user, vehicle]);

  const deleteVehicle = useCallback(async () => {
    if (!vehicle || !user || !supabase) return;
    setErrorMessage('');
    setIsDeleting(true);
    let removedImagePath: string | null = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== user.id) {
        setStatus('signedOut');
        setShowDeleteConfirm(false);
        return;
      }

      if (vehicle.image_path && isOwnedImagePath(vehicle.image_path, user.id)) {
        const { error: imageError } = await supabase.storage
          .from('vehicle-images')
          .remove([vehicle.image_path]);
        if (imageError) throw imageError;
        removedImagePath = vehicle.image_path;
      }

      const { data: deletedVehicle, error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!deletedVehicle) {
        throw new Error('Vehicle was not deleted; it may no longer belong to this user');
      }

      setShowDeleteConfirm(false);
      onDeleted();
    } catch (error) {
      logError('Unable to delete vehicle', error);
      if (removedImagePath) {
        const { error: clearImagePathError } = await supabase
          .from('vehicles')
          .update({ image_path: null })
          .eq('id', vehicle.id)
          .eq('user_id', user.id);
        if (clearImagePathError) {
          logError('Unable to clear the removed vehicle image path after delete failed', clearImagePathError);
        } else {
          setVehicle((current) => current ? { ...current, image_path: null } : current);
          setImageUri(null);
        }
      }
      setShowDeleteConfirm(false);
      setErrorMessage(text.deleteError);
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleted, text.deleteError, user, vehicle]);

  const cardWidth = Math.min(width, 430);
  const gaugeSize = Math.min(cardWidth - 40, 290);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <CockpitBackdrop colors={colors} />

      {status === 'loading' ? (
        <StateView
          colors={colors}
          styles={styles}
          title={text.loading}
          loading
          onBack={onBack}
          isArabic={isArabic}
        />
      ) : status === 'error' || status === 'notFound' || status === 'signedOut' || status === 'unconfigured' ? (
        <StateView
          colors={colors}
          styles={styles}
          title={
            status === 'error'
              ? text.loadError
              : status === 'notFound'
                ? text.notFound
                : status === 'signedOut'
                  ? text.signedOut
                  : text.unconfigured
          }
          action={status === 'error' ? text.retry : undefined}
          onAction={status === 'error' ? () => void loadVehicle() : undefined}
          onBack={onBack}
          isArabic={isArabic}
          isError={status === 'error'}
        />
      ) : vehicle ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { width: cardWidth }]}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={[styles.header, isArabic && sharedStyles.rowReverse]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.back}
              onPress={onBack}
              style={styles.iconButton}
            >
              <View style={[styles.arrowIcon, isArabic && sharedStyles.flip]}>
                <View style={styles.arrowStem} />
                <View style={styles.arrowHeadTop} />
                <View style={styles.arrowHeadBottom} />
              </View>
            </Pressable>
            <View style={styles.headerTitle}>
              <Text
                numberOfLines={1}
                style={[styles.headerVehicleName, { writingDirection: direction }]}
              >
                {vehicle.make} {vehicle.model}
              </Text>
              <Text style={[styles.headerSubtitle, isArabic && styles.arabicHeaderSubtitle]}>
                {text.healthDetails}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.edit}
              onPress={openEditor}
              style={styles.iconButton}
            >
              <View style={styles.editIcon}>
                <View style={styles.editPencil} />
                <View style={styles.editPencilTip} />
              </View>
            </Pressable>
          </View>

          <View style={styles.instrument}>
            <HealthIndexInstrument
              score={null}
              gaugeSize={gaugeSize}
              styles={styles}
              healthLabel={text.healthIndex}
              notScoredLabel={text.notScored}
              isArabic={isArabic}
            />
          </View>
          <Text style={[styles.instrumentMeta, isArabic && styles.arabicMetadata]}>
            {vehicle.year}
            {'  ·  '}
            {vehicle.type === 'motorcycle' ? text.motorcycle : text.car}
          </Text>

          <View style={[styles.odometerCard, isArabic && sharedStyles.rowReverse]}>
            <Text style={[styles.odoEyebrow, isArabic && styles.arabicEyebrow]}>
              {isArabic ? text.odometer : 'ODO'}
            </Text>
            <View style={[styles.odoReading, isArabic && sharedStyles.rowReverse]}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.odoNumber}>
                {formatMileage(vehicle.mileage)}
              </Text>
              <Text style={styles.odoUnit}>{isArabic ? 'كم' : 'KM'}</Text>
            </View>
          </View>

          <View style={[styles.infoModules, isArabic && sharedStyles.rowReverse]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenMaintenance(vehicle.id)}
              style={[styles.infoModule, styles.nextServiceModule]}
            >
              <Text style={styles.moduleEyebrow}>
                {isArabic ? text.nextService : 'NEXT SERVICE'}
              </Text>
              <Text style={[styles.moduleMetric, styles.moduleEmpty]}>
                {text.noServiceData}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.moduleDetail, { writingDirection: direction }]}
              >
                {text.noUpcomingService}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenDocuments(vehicle.id)}
              style={[styles.infoModule, styles.documentModule]}
            >
              <Text style={styles.moduleEyebrow}>
                {isArabic ? 'الرخصة' : 'LICENSE'}
              </Text>
              <Text style={[styles.moduleMetric, styles.moduleEmpty]}>
                {text.noLicenseRecord}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.moduleDetail, { writingDirection: direction }]}
              >
                {text.noLicenseData}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.featureGrid, isArabic && sharedStyles.rowReverse]}>
            <FeatureCard
              icon="body"
              title={text.bodyScan}
              detail={text.scanVehicle}
              styles={styles}
              onPress={() => setActiveAction('body')}
            />
            <FeatureCard
              icon="invoice"
              title={text.invoices}
              detail={text.noFiles}
              styles={styles}
              onPress={() => setActiveAction('invoices')}
            />
            <FeatureCard
              icon="warning"
              title={text.scanWarning}
              detail={text.comingSoon}
              styles={styles}
              onPress={() => setActiveAction('scanWarning')}
              accent
            />
          </View>

          <View style={[styles.recordShortcuts, isArabic && sharedStyles.rowReverse]}>
            <RecordShortcut label={text.fuel} onPress={() => onOpenFuel(vehicle.id)} styles={styles} />
            <RecordShortcut label={text.expenses} onPress={() => onOpenExpenses(vehicle.id)} styles={styles} />
            <RecordShortcut label={text.tires} onPress={() => onOpenTires(vehicle.id)} styles={styles} />
          </View>

          <View style={[styles.secondaryActions, isArabic && sharedStyles.rowReverse]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenServiceHistory(vehicle.id)}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>{text.history}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isDeleting}
              onPress={() => setShowDeleteConfirm(true)}
              style={styles.deleteAction}
            >
              <Text style={styles.deleteIcon}>×</Text>
              <Text style={[styles.deleteLabel, { writingDirection: direction }]}>
                {text.delete}
              </Text>
            </Pressable>
          </View>

          {!!errorMessage && (
            <InlineFeedback
              styles={styles}
              message={errorMessage}
              isArabic={isArabic}
            />
          )}
        </ScrollView>
      ) : null}

      {vehicle && draft && (
        <EditVehicleModal
          visible={isEditing}
          draft={draft}
          vehicle={vehicle}
          imageUri={imageUri}
          colors={colors}
          styles={styles}
          text={text}
          direction={direction}
          isArabic={isArabic}
          isSaving={isSaving}
          errorMessage={errorMessage}
          width={width}
          height={height}
          onCancel={closeEditor}
          onSave={() => void saveChanges()}
          onChoosePhoto={() => void choosePhoto()}
          onRemovePhoto={removePhoto}
          onChange={setDraft}
          makeRef={makeRef}
          modelRef={modelRef}
          yearRef={yearRef}
          mileageRef={mileageRef}
        />
      )}

      <ConfirmationModal
        visible={showDeleteConfirm}
        title={text.deleteTitle}
        body={text.deleteBody}
        confirmLabel={isDeleting ? text.deleting : text.confirmDelete}
        cancelLabel={text.cancel}
        styles={styles}
        direction={direction}
        isBusy={isDeleting}
        destructive
        onCancel={() => {
          if (!isDeleting) setShowDeleteConfirm(false);
        }}
        onConfirm={() => void deleteVehicle()}
      />

      <ConfirmationModal
        visible={activeAction !== null}
        title={
          activeAction
            ? text[activeAction === 'maintenance'
              ? 'maintenance'
              : activeAction === 'fuel'
                ? 'fuel'
              : activeAction === 'history'
                ? 'history'
                : activeAction === 'documents'
                  ? 'documents'
                  : activeAction === 'invoices'
                    ? 'invoices'
                          : activeAction === 'scanWarning'
                            ? 'scanWarning'
                            : 'body']
            : ''
        }
        body={text.actionUnavailable}
        confirmLabel={text.back}
        cancelLabel={text.cancel}
        styles={styles}
        direction={direction}
        onCancel={() => setActiveAction(null)}
        onConfirm={() => setActiveAction(null)}
        hideCancel
      />
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
          <Pressable accessibilityRole="button" onPress={onAction} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{action}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function HealthIndexInstrument({
  score,
  gaugeSize,
  styles,
  healthLabel,
  notScoredLabel,
  isArabic: arabic,
}: {
  score: number | null;
  gaugeSize: number;
  styles: ScreenStyles;
  healthLabel: string;
  notScoredLabel: string;
  isArabic: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const previousScoreRef = useRef<number | null | undefined>(undefined);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const validScore =
    typeof score === 'number' && Number.isFinite(score)
      ? Math.min(100, Math.max(0, Math.round(score)))
      : null;
  const motionReduced = reduceMotion !== false;

  useEffect(() => {
    let isMounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('[Car Care] Unable to read reduced-motion setting', error);
        if (isMounted) setReduceMotion(false);
      });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    animationRef.current?.stop();
    const previousScore = previousScoreRef.current;
    previousScoreRef.current = validScore;

    if (reduceMotion) {
      progress.setValue(validScore === null ? 0 : validScore / 100);
      setIsAnimating(false);
      return;
    }

    if (previousScore === undefined || previousScore === null || validScore === null) {
      progress.setValue(0);
    }

    const animation = Animated.timing(progress, {
      toValue: validScore === null ? 1 : validScore / 100,
      duration: 1450,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    });
    animationRef.current = animation;
    setIsAnimating(true);
    animation.start(({ finished }) => {
      if (finished) setIsAnimating(false);
      if (animationRef.current === animation) animationRef.current = null;
    });

    return () => {
      animation.stop();
      if (animationRef.current === animation) animationRef.current = null;
    };
  }, [progress, reduceMotion, validScore]);

  const segmentCount = 36;
  const digitalFontSize = gaugeSize * 0.29;
  const digitHeight = Math.round(gaugeSize * 0.31);
  const digitWidth = digitalFontSize * 0.64;
  const digitPlaces = [100, 10, 1] as const;
  const digitRows = [2, 11, 101] as const;
  const valueText = validScore === null ? '—' : instrumentIntegerFormat.format(validScore);
  const scanRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-135deg', '135deg'],
    extrapolate: 'clamp',
  });
  const glowOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.035, 0.095, 0.035],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.instrumentGlow,
          {
            width: gaugeSize * 0.82,
            height: gaugeSize * 0.82,
            opacity: reduceMotion ? 0.035 : glowOpacity,
          },
        ]}
      />
      <View style={[styles.dial, { width: gaugeSize, height: gaugeSize }]}>
        <View style={styles.dialOuter} />
        <View style={styles.dialTrack} />
        <View style={styles.dialTrackAccent} />
        <View style={styles.dialInner} />
        {Array.from({ length: 48 }, (_, index) => (
          <View
            key={`tick-${index}`}
            style={[
              styles.dialTick,
              index % 4 === 0 && styles.dialMajorTick,
              {
                transform: [
                  { rotate: `${index * 7.5}deg` },
                  { translateY: -(gaugeSize * 0.455) },
                ],
              },
            ]}
          />
        ))}
        {Array.from({ length: segmentCount }, (_, index) => {
          const threshold =
            (index + (validScore === null ? 0.5 : 1)) / segmentCount;
          const segmentOpacity = progress.interpolate({
            inputRange:
              validScore === null
                ? [
                    Math.max(0, threshold - 0.06),
                    threshold,
                    Math.min(1, threshold + 0.06),
                  ]
                : [0, Math.max(0, threshold - 0.025), threshold],
            outputRange:
              validScore === null
                ? [0.08, 0.9, 0.08]
                : [0.12, 0.12, 0.95],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`segment-${index}`}
              pointerEvents="none"
              style={[
                styles.dialActiveSegment,
                {
                  opacity: motionReduced
                    ? validScore === null || index >= Math.ceil((validScore / 100) * segmentCount)
                      ? 0.12
                      : 0.95
                    : segmentOpacity,
                  transform: [
                    { rotate: `${-135 + index * 7.5}deg` },
                    { translateY: -(gaugeSize * 0.455) },
                  ],
                },
              ]}
            />
          );
        })}
        {isAnimating && !motionReduced && (
          <Animated.View
            pointerEvents="none"
            style={[styles.scanHeadOrbit, { transform: [{ rotate: scanRotation }] }]}
          >
            <View style={styles.scanHead} />
          </Animated.View>
        )}
        <View style={styles.dialContent}>
          <Text style={[styles.dialEyebrow, arabic && styles.arabicEyebrow]}>
            {healthLabel}
          </Text>
          {validScore === null ? (
            <Text
              style={[
                styles.dialValue,
                { fontSize: digitalFontSize, lineHeight: digitHeight },
              ]}
            >
              —
            </Text>
          ) : (
            <View
              accessibilityLabel={`${valueText}% ${healthLabel}`}
              style={[styles.digitalValueRow, { height: digitHeight }]}
            >
              {motionReduced ? (
                <Text
                  style={[
                    styles.dialValue,
                    { fontSize: digitalFontSize, lineHeight: digitHeight },
                  ]}
                >
                  {valueText}
                </Text>
              ) : (
                digitPlaces.map((place, placeIndex) => {
                  const opacity =
                    place === 100
                      ? progress.interpolate({
                          inputRange: [0.99, 1],
                          outputRange: [0, 1],
                          extrapolate: 'clamp',
                        })
                      : place === 10
                        ? progress.interpolate({
                            inputRange: [0.08, 0.1],
                            outputRange: [0, 1],
                            extrapolate: 'clamp',
                          })
                        : 1;
                  const translateY = progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(100 / place) * digitHeight],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={place}
                      style={[
                        styles.digitViewport,
                        { width: digitWidth, height: digitHeight, opacity },
                      ]}
                    >
                      <Animated.View style={{ transform: [{ translateY }] }}>
                        {Array.from({ length: digitRows[placeIndex] }, (_, row) => (
                          <Text
                            key={`${place}-${row}`}
                            style={[
                              styles.dialValue,
                              {
                                width: digitWidth,
                                height: digitHeight,
                                fontSize: digitalFontSize,
                                lineHeight: digitHeight,
                              },
                            ]}
                          >
                            {instrumentIntegerFormat.format(row % 10)}
                          </Text>
                        ))}
                      </Animated.View>
                    </Animated.View>
                  );
                })
              )}
              <Text style={[styles.digitalPercent, { fontSize: digitalFontSize * 0.22 }]}>
                %
              </Text>
            </View>
          )}
          {validScore === null && (
            <View style={styles.unscoredBadge}>
              <View style={styles.unscoredDot} />
              <Text style={[styles.unscoredText, arabic && styles.arabicEyebrow]}>
                {notScoredLabel}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  detail,
  styles,
  onPress,
  accent = false,
}: {
  icon: 'body' | 'invoice' | 'warning';
  title: string;
  detail: string;
  styles: ScreenStyles;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        accent && styles.featureCardAccent,
        pressed && styles.featureCardPressed,
      ]}
    >
      <FeatureIcon icon={icon} styles={styles} accent={accent} />
      <View style={styles.featureCopy}>
        <Text numberOfLines={1} style={styles.featureTitle}>{title}</Text>
        <Text numberOfLines={1} style={[styles.featureDetail, accent && styles.featureDetailAccent]}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

function FeatureIcon({
  icon,
  styles,
  accent,
}: {
  icon: 'body' | 'invoice' | 'warning';
  styles: ScreenStyles;
  accent: boolean;
}) {
  return (
    <View style={[styles.featureIcon, accent && styles.featureIconAccent]}>
      {icon === 'body' && (
        <View style={styles.scanFrame}>
          <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
          <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
          <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
          <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
          <View style={styles.scanCarRoof} />
          <View style={styles.scanCarBody} />
        </View>
      )}
      {icon === 'invoice' && (
        <View style={styles.invoiceIcon}>
          <View style={styles.invoiceLineLong} />
          <View style={styles.invoiceLineShort} />
          <View style={styles.invoiceLineLong} />
        </View>
      )}
      {icon === 'warning' && (
        <View style={styles.warningIcon}>
          <View style={styles.warningExclamation} />
          <View style={styles.warningDot} />
        </View>
      )}
    </View>
  );
}

function RecordShortcut({
  label,
  onPress,
  styles,
}: {
  label: string;
  onPress: () => void;
  styles: ScreenStyles;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.recordShortcut, pressed && styles.recordShortcutPressed]}
    >
      <Text numberOfLines={1} style={styles.recordShortcutText}>{label}</Text>
      <View style={styles.shortcutArrow} />
    </Pressable>
  );
}

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

function EditVehicleModal({
  visible,
  draft,
  vehicle,
  imageUri,
  colors,
  styles,
  text,
  direction,
  isArabic: arabic,
  isSaving,
  errorMessage,
  width,
  height,
  onCancel,
  onSave,
  onChoosePhoto,
  onRemovePhoto,
  onChange,
  makeRef,
  modelRef,
  yearRef,
  mileageRef,
}: {
  visible: boolean;
  draft: EditDraft;
  vehicle: Vehicle;
  imageUri: string | null;
  colors: ScreenColors;
  styles: ScreenStyles;
  text: Copy;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  isSaving: boolean;
  errorMessage: string;
  width: number;
  height: number;
  onCancel: () => void;
  onSave: () => void;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  onChange: React.Dispatch<React.SetStateAction<EditDraft | null>>;
  makeRef: React.RefObject<TextInput | null>;
  modelRef: React.RefObject<TextInput | null>;
  yearRef: React.RefObject<TextInput | null>;
  mileageRef: React.RefObject<TextInput | null>;
}) {
  const source = draft.photo?.uri ?? (draft.removePhoto ? null : imageUri);
  const focusedField = (ref: React.RefObject<TextInput | null>) => () => ref.current?.focus();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {!visible && !draft && null}
      <View style={[styles.modalBackdrop, { paddingTop: Math.max(14, height * 0.04) }]}>
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { maxWidth: Math.min(width - 28, 480) }]}>
            <View style={[styles.modalHeader, arabic && sharedStyles.rowReverse]}>
              <View>
                <Text style={styles.modalEyebrow}>{text.editTitle}</Text>
                <Text style={[styles.modalTitle, { writingDirection: direction }]}>
                  {vehicle.make} {vehicle.model}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
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
              <Text style={[styles.fieldLabel, { textAlign: arabic ? 'right' : 'left' }]}>
                {text.typeLabel}
              </Text>
              <View style={[styles.typeChoices, arabic && sharedStyles.rowReverse]}>
                {(['car', 'motorcycle'] as const).map((type) => (
                  <Pressable
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: draft.type === type }}
                    disabled={isSaving}
                    onPress={() => onChange((current) => current ? { ...current, type } : current)}
                    style={[styles.typeChoice, draft.type === type && styles.typeChoiceSelected]}
                  >
                    <Text style={[styles.typeChoiceText, draft.type === type && styles.typeChoiceTextSelected]}>
                      {type === 'car' ? text.car : text.motorcycle}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <EditField
                ref={makeRef}
                label={text.make}
                value={draft.make}
                placeholder={text.make}
                styles={styles}
                colors={colors}
                direction={direction}
                editable={!isSaving}
                onChangeText={(make) => onChange((current) => current ? { ...current, make } : current)}
                returnKeyType="next"
                onSubmitEditing={focusedField(modelRef)}
              />
              <EditField
                ref={modelRef}
                label={text.model}
                value={draft.model}
                placeholder={text.model}
                styles={styles}
                colors={colors}
                direction={direction}
                editable={!isSaving}
                onChangeText={(model) => onChange((current) => current ? { ...current, model } : current)}
                returnKeyType="next"
                onSubmitEditing={focusedField(yearRef)}
              />
              <View style={[styles.numberFields, arabic && sharedStyles.rowReverse]}>
                <View style={styles.numberField}>
                  <EditField
                    ref={yearRef}
                    label={text.year}
                    value={draft.year}
                    placeholder={text.year}
                    styles={styles}
                    colors={colors}
                    direction={direction}
                    editable={!isSaving}
                    keyboardType="number-pad"
                    onChangeText={(year) => onChange((current) => current ? { ...current, year } : current)}
                    returnKeyType="next"
                    onSubmitEditing={focusedField(mileageRef)}
                  />
                </View>
                <View style={styles.numberField}>
                  <EditField
                    ref={mileageRef}
                    label={text.mileage}
                    value={draft.mileage}
                    placeholder={text.mileagePlaceholder}
                    suffix="KM"
                    styles={styles}
                    colors={colors}
                    direction={direction}
                    editable={!isSaving}
                    keyboardType="number-pad"
                    onChangeText={(mileage) => onChange((current) => current ? { ...current, mileage } : current)}
                    returnKeyType="done"
                    onSubmitEditing={onSave}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { textAlign: arabic ? 'right' : 'left' }]}>
                {text.photo}
              </Text>
              {source ? (
                <>
                  <Image source={{ uri: source }} style={styles.editPhoto} resizeMode="cover" />
                  <View style={[styles.photoButtons, arabic && sharedStyles.rowReverse]}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={onChoosePhoto}
                      style={styles.photoButton}
                    >
                      <Text style={styles.photoButtonText}>{text.changePhoto}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={onRemovePhoto}
                      style={[styles.photoButton, styles.removePhotoButton]}
                    >
                      <Text style={[styles.photoButtonText, styles.removePhotoText]}>
                        {text.removePhoto}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={onChoosePhoto}
                  style={styles.addPhoto}
                >
                  <Text style={styles.addPhotoPlus}>+</Text>
                  <Text style={[styles.addPhotoText, { writingDirection: direction }]}>
                    {text.addPhoto}
                  </Text>
                </Pressable>
              )}

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
                  <Text style={styles.primaryButtonText}>{text.save}</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>{text.cancel}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const EditField = forwardRef<TextInput, {
  label: string;
  value: string;
  placeholder: string;
  styles: ScreenStyles;
  colors: ScreenColors;
  direction: 'ltr' | 'rtl';
  editable: boolean;
  keyboardType?: 'default' | 'number-pad';
  suffix?: string;
  returnKeyType?: 'next' | 'done';
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
}>(function EditField(
  {
    label,
    value,
    placeholder,
    styles,
    colors,
    direction,
    editable,
    keyboardType = 'default',
    suffix,
    returnKeyType,
    onChangeText,
    onSubmitEditing,
  },
  ref,
) {
  return (
    <View style={styles.editField}>
      <Text style={[styles.fieldLabel, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}>
        {label}
      </Text>
      <View style={[styles.inputWrap, direction === 'rtl' && sharedStyles.rowReverse]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
          autoCorrect={false}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={returnKeyType !== 'next'}
          style={[styles.input, { textAlign: direction === 'rtl' ? 'right' : 'left', writingDirection: direction }]}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
});

function ConfirmationModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  styles,
  direction,
  onCancel,
  onConfirm,
  isBusy = false,
  destructive = false,
  hideCancel = false,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  styles: ScreenStyles;
  direction: 'ltr' | 'rtl';
  onCancel: () => void;
  onConfirm: () => void;
  isBusy?: boolean;
  destructive?: boolean;
  hideCancel?: boolean;
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
          <Text style={[styles.confirmTitle, { writingDirection: direction }]}>{title}</Text>
          <Text style={[styles.confirmBody, { writingDirection: direction }]}>{body}</Text>
          <View style={[styles.confirmActions, direction === 'rtl' && sharedStyles.rowReverse]}>
            {!hideCancel && (
              <Pressable accessibilityRole="button" disabled={isBusy} onPress={onCancel} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>{cancelLabel}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onConfirm}
              style={[styles.confirmButton, destructive && styles.confirmDestructive]}
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.confirmButtonText,
                    destructive && styles.confirmDestructiveText,
                  ]}
                >
                  {confirmLabel}
                </Text>
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

function createStyles(colors: ScreenColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: { alignSelf: 'center', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 30 },
    header: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    arrowIcon: { width: 20, height: 20, position: 'relative', alignItems: 'center', justifyContent: 'center' },
    arrowStem: { position: 'absolute', width: 13, height: 1.5, left: 3, backgroundColor: colors.foreground },
    arrowHeadTop: { position: 'absolute', left: 3, top: 4, width: 8, height: 8, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.foreground, transform: [{ rotate: '45deg' }] },
    arrowHeadBottom: { position: 'absolute', left: 3, bottom: 4, width: 8, height: 8, borderLeftWidth: 1.5, borderTopWidth: 1.5, borderColor: colors.foreground, transform: [{ rotate: '-45deg' }] },
    headerTitle: { flex: 1, alignItems: 'center', minWidth: 0 },
    headerVehicleName: { maxWidth: '100%', color: colors.foreground, fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2 },
    headerSubtitle: { color: colors.muted, fontFamily: 'monospace', fontSize: 8, fontWeight: '500', letterSpacing: 1.3, marginTop: 4 },
    arabicHeaderSubtitle: { fontFamily: undefined, fontSize: 10, letterSpacing: 0 },
    editIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    editPencil: { width: 12, height: 3, borderWidth: 1.2, borderColor: colors.accent, borderRadius: 1, transform: [{ rotate: '-45deg' }] },
    editPencilTip: { position: 'absolute', width: 3, height: 3, right: 2, top: 2, borderTopWidth: 1.2, borderRightWidth: 1.2, borderColor: colors.accent, transform: [{ rotate: '45deg' }] },
    instrumentMeta: { color: colors.muted, fontFamily: 'monospace', fontSize: 8, lineHeight: 12, fontWeight: '500', letterSpacing: 1, textAlign: 'center', marginTop: -3, marginBottom: 10 },
    arabicMetadata: { fontFamily: undefined, fontSize: 10, letterSpacing: 0 },
    instrument: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 300,
      marginTop: 10,
    },
    instrumentGlow: {
      position: 'absolute',
      top: '7%',
      borderRadius: 999,
      backgroundColor: colors.accent,
      opacity: colors.background === '#05070A' ? 0.075 : 0.045,
    },
    dial: { alignItems: 'center', justifyContent: 'center' },
    dialOuter: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dialTrack: {
      position: 'absolute',
      width: '88%',
      height: '88%',
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.surfaceStrong,
      borderTopColor: 'transparent',
      transform: [{ rotate: '45deg' }],
    },
    dialTrackAccent: {
      position: 'absolute',
      width: '88%',
      height: '88%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${colors.accent}30`,
      borderTopColor: 'transparent',
      transform: [{ rotate: '45deg' }],
    },
    dialInner: {
      position: 'absolute',
      width: '72%',
      height: '72%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: `${colors.background}30`,
    },
    dialTick: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 1,
      height: 5,
      marginLeft: -0.5,
      marginTop: -2.5,
      backgroundColor: colors.borderStrong,
    },
    dialMajorTick: { width: 1.5, height: 9, marginLeft: -0.75, marginTop: -4.5, backgroundColor: colors.borderStrong },
    dialActiveSegment: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 2,
      height: 8,
      marginLeft: -1,
      marginTop: -4,
      borderRadius: 1,
      backgroundColor: colors.accent,
    },
    scanHeadOrbit: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
    },
    scanHead: {
      width: 2,
      height: '12%',
      backgroundColor: colors.accent,
      opacity: 0.68,
      shadowColor: colors.accent,
      shadowOpacity: 0.65,
      shadowRadius: 5,
      elevation: 2,
    },
    dialContent: { alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 60, left: 0, right: 0 },
    dialEyebrow: { color: colors.muted, fontFamily: 'monospace', fontSize: 9, fontWeight: '500', letterSpacing: 2.4 },
    dialValue: { color: colors.foreground, fontFamily: 'monospace', fontSize: 84, fontWeight: '500', letterSpacing: -4, marginTop: 6, fontVariant: ['tabular-nums'], textAlign: 'center' },
    digitalValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, overflow: 'hidden' },
    digitViewport: { overflow: 'hidden', alignItems: 'center' },
    digitalPercent: { color: colors.accent, fontFamily: 'monospace', fontWeight: '500', marginLeft: 2, marginTop: 17 },
    unscoredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 9,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    unscoredDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, opacity: 0.8 },
    unscoredText: { color: colors.muted, fontFamily: 'monospace', fontSize: 8, fontWeight: '500', letterSpacing: 1.1 },
    odometerCard: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 4,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    odoEyebrow: { color: colors.muted, fontFamily: 'monospace', fontSize: 9, fontWeight: '500', letterSpacing: 2 },
    odoReading: { flexDirection: 'row', alignItems: 'baseline', gap: 7, maxWidth: '76%' },
    odoNumber: {
      flexShrink: 1,
      color: colors.foreground,
      fontFamily: 'monospace',
      fontSize: 31,
      fontWeight: '300',
      letterSpacing: 0.6,
      fontVariant: ['tabular-nums'],
    },
    odoUnit: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
    infoModules: { flexDirection: 'row', gap: 10, marginTop: 10 },
    infoModule: {
      minHeight: 106,
      flex: 1,
      justifyContent: 'center',
      padding: 13,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    nextServiceModule: {},
    documentModule: {},
    moduleEyebrow: { color: colors.muted, fontFamily: 'monospace', fontSize: 8, fontWeight: '500', letterSpacing: 1.15 },
    arabicEyebrow: { fontFamily: undefined, fontSize: 10, letterSpacing: 0 },
    moduleMetric: { color: colors.foreground, fontFamily: 'monospace', fontSize: 22, lineHeight: 27, fontWeight: '400', letterSpacing: -0.6, marginTop: 10 },
    moduleEmpty: { color: colors.foreground, fontSize: 9, lineHeight: 12, letterSpacing: 0.7 },
    arabicMetric: { fontFamily: undefined, letterSpacing: 0 },
    moduleDetail: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 5 },
    featureGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
    featureCard: { flex: 1, minWidth: 0, minHeight: 92, justifyContent: 'space-between', padding: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    featureCardAccent: { borderColor: `${colors.accent}55`, backgroundColor: `${colors.accent}12` },
    featureCardPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
    featureIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    featureIconAccent: {},
    featureCopy: { gap: 4 },
    featureTitle: { color: colors.foreground, fontSize: 9, lineHeight: 12, fontWeight: '600' },
    featureDetail: { color: colors.muted, fontFamily: 'monospace', fontSize: 7, lineHeight: 10, fontWeight: '500', letterSpacing: 0.5 },
    featureDetailAccent: { color: colors.accent },
    scanFrame: { width: 19, height: 19, position: 'relative', alignItems: 'center', justifyContent: 'center' },
    scanCorner: { position: 'absolute', width: 6, height: 6, borderColor: colors.accent },
    scanCornerTopLeft: { top: 0, left: 0, borderTopWidth: 1.3, borderLeftWidth: 1.3 },
    scanCornerTopRight: { top: 0, right: 0, borderTopWidth: 1.3, borderRightWidth: 1.3 },
    scanCornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 1.3, borderLeftWidth: 1.3 },
    scanCornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 1.3, borderRightWidth: 1.3 },
    scanCarRoof: { position: 'absolute', top: 6, width: 8, height: 4, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    scanCarBody: { position: 'absolute', top: 10, width: 12, height: 4, borderWidth: 1, borderColor: colors.accent, borderRadius: 2 },
    invoiceIcon: { width: 15, height: 19, borderWidth: 1.3, borderColor: colors.accent, borderRadius: 2, justifyContent: 'center', alignItems: 'center', gap: 3 },
    invoiceLineLong: { width: 8, height: 1, backgroundColor: colors.accent },
    invoiceLineShort: { width: 5, height: 1, backgroundColor: colors.accent, alignSelf: 'flex-start', marginLeft: 3 },
    warningIcon: { width: 19, height: 18, borderTopWidth: 1.4, borderLeftWidth: 1.4, borderRightWidth: 1.4, borderColor: colors.accent, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' },
    warningExclamation: { width: 1.5, height: 6, backgroundColor: colors.accent, transform: [{ rotate: '-45deg' }], marginTop: -3 },
    warningDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: colors.accent, transform: [{ rotate: '-45deg' }], marginTop: 1 },
    recordShortcuts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 8 },
    recordShortcut: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 5 },
    recordShortcutPressed: { opacity: 0.6 },
    recordShortcutText: { color: colors.muted, fontSize: 9, fontWeight: '500' },
    shortcutArrow: { width: 5, height: 5, borderTopWidth: 1, borderRightWidth: 1, borderColor: colors.accent, transform: [{ rotate: '45deg' }] },
    secondaryActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 12 },
    secondaryAction: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 2 },
    secondaryActionText: { color: colors.muted, fontSize: 9, fontWeight: '500' },
    deleteAction: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
    deleteIcon: { color: colors.error, fontSize: 17, lineHeight: 20 },
    deleteLabel: { color: colors.error, fontSize: 9, fontWeight: '500' },
    feedback: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginTop: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: `${colors.error}55`,
      borderRadius: 14,
      backgroundColor: `${colors.error}12`,
    },
    feedbackDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.error, marginTop: 5 },
    feedbackText: { flex: 1, color: colors.error, fontSize: 11, lineHeight: 17 },
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
    stateTitle: { color: colors.foreground, textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: '600' },
    primaryButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: 15,
      backgroundColor: colors.accent,
    },
    primaryButtonText: { color: colors.accentInk, fontSize: 13, fontWeight: '700' },
    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 14,
      paddingBottom: 10,
      backgroundColor: 'rgba(0,0,0,0.72)',
    },
    modalKeyboard: { width: '100%', maxHeight: '100%', alignItems: 'center', justifyContent: 'flex-end' },
    modalCard: {
      width: '100%',
      maxHeight: '96%',
      paddingHorizontal: 18,
      paddingTop: 19,
      paddingBottom: 12,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    modalEyebrow: { color: colors.accent, fontSize: 8, fontWeight: '600', letterSpacing: 1.6 },
    modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 5 },
    modalClose: { color: colors.muted, fontSize: 25, lineHeight: 29 },
    fieldLabel: { color: colors.muted, fontSize: 8, fontWeight: '600', letterSpacing: 1.2, marginTop: 13, marginBottom: 6 },
    typeChoices: { flexDirection: 'row', gap: 8, marginBottom: 2 },
    typeChoice: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    typeChoiceSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceStrong },
    typeChoiceText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
    typeChoiceTextSelected: { color: colors.accent },
    editField: { marginTop: 2 },
    inputWrap: {
      minHeight: 45,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: { flex: 1, minHeight: 43, paddingVertical: 0, color: colors.foreground, fontSize: 12, fontWeight: '500' },
    inputSuffix: { color: colors.accent, fontSize: 9, fontWeight: '700' },
    numberFields: { flexDirection: 'row', gap: 9 },
    numberField: { flex: 1 },
    editPhoto: { width: '100%', height: 118, borderRadius: 14, backgroundColor: colors.panel },
    photoButtons: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
    photoButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: colors.surfaceStrong },
    photoButtonText: { color: colors.accent, fontSize: 10, fontWeight: '600' },
    removePhotoButton: { backgroundColor: `${colors.error}14` },
    removePhotoText: { color: colors.error },
    addPhoto: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
    },
    addPhotoPlus: { color: colors.accent, fontSize: 20 },
    addPhotoText: { color: colors.muted, fontSize: 11, fontWeight: '500' },
    buttonDisabled: { opacity: 0.55 },
    cancelButton: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
    confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 23, backgroundColor: 'rgba(0,0,0,0.74)' },
    confirmCard: {
      width: '100%',
      maxWidth: 390,
      overflow: 'hidden',
      paddingHorizontal: 21,
      paddingTop: 21,
      paddingBottom: 18,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.panel,
    },
    confirmTopRule: { height: 2, width: 36, borderRadius: 1, backgroundColor: colors.accent, marginBottom: 18 },
    confirmTitle: { color: colors.foreground, fontSize: 19, lineHeight: 25, fontWeight: '700' },
    confirmBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 21 },
    confirmCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 13, borderWidth: 1, borderColor: colors.border },
    confirmCancelText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
    confirmButton: { minHeight: 44, minWidth: 104, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 13, backgroundColor: colors.accent },
    confirmDestructive: { backgroundColor: colors.error },
    confirmButtonText: { color: colors.accentInk, fontSize: 11, fontWeight: '700' },
    confirmDestructiveText: { color: '#FFFFFF' },
  });
}
