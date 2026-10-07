import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';

import CockpitBackdrop from '../components/CockpitBackdrop';
import { supabase } from '../lib/supabase';



type ThemeName = 'dark' | 'light';
type VehicleType = 'car' | 'motorcycle';

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');

const strings = {
  en: {
    eyebrow: 'YOUR GARAGE · 01',
    title: 'Add a vehicle.',
    subtitle: 'A few details are all it takes to get started.',
    vehicleType: 'VEHICLE TYPE',
    car: 'Car',
    motorcycle: 'Motorcycle',
    vehiclePhoto: 'VEHICLE PHOTO',
    choosePhoto: 'Choose a photo from your library',
    replacePhoto: 'Replace photo',
    removePhoto: 'Remove',
    photoTooLarge: 'Choose an image smaller than 10 MB.',
    photoUnsupported: 'Choose a JPEG, PNG, WebP, or HEIC image.',
    make: 'MAKE / BRAND',
    makePlaceholder: 'e.g. Toyota',
    model: 'MODEL',
    modelPlaceholder: 'e.g. Land Cruiser',
    year: 'YEAR',
    yearPlaceholder: 'e.g. 2023',
    mileage: 'CURRENT ODOMETER',
    mileagePlaceholder: 'e.g. 45000',
    km: 'KM',
    add: 'Add vehicle',
    saving: 'Saving vehicle…',
    cancel: 'Cancel',
    loadError: 'Unable to verify your account. Please try again.',
    retry: 'Try again',
    noUser: 'Sign in again to add a vehicle to your garage.',
    notConfigured: 'Connect Supabase before adding a vehicle.',
    permission: 'Allow photo library access to choose a vehicle photo.',
    pickerError: 'Unable to open your photo library. Please try again.',
    invalidType: 'Choose a vehicle type.',
    invalidMake: 'Enter the vehicle make or brand.',
    invalidModel: 'Enter the vehicle model.',
    invalidYear: 'Enter a valid year between 1886 and next year.',
    invalidMileage: 'Enter a valid mileage of zero or more kilometres.',
    insertError: 'Unable to save your vehicle. Check your connection and try again.',
    imageSaveError:
      'The photo could not be uploaded. Your vehicle was not added. Choose another photo or try again.',
    rollbackError:
      'We could not finish saving the photo or safely remove the pending vehicle. Retry to continue without creating a duplicate.',
    success: 'Vehicle added. Your garage is up to date.',
    name: 'Car Care',
  },

  ar: {
    eyebrow: 'مرآبك · ٠١',
    title: 'أضف مركبة.',
    subtitle: 'ابدأ بإضافة بعض التفاصيل الأساسية.',
    vehicleType: 'نوع المركبة',
    car: 'سيارة',
    motorcycle: 'موتوسيكل',
    vehiclePhoto: 'صورة المركبة',
    choosePhoto: 'اختر صورة من مكتبة الصور',
    replacePhoto: 'استبدال الصورة',
    removePhoto: 'إزالة',
    photoTooLarge: 'اختر صورة يقل حجمها عن ١٠ ميجابايت.',
    photoUnsupported: 'اختر صورة بصيغة JPEG أو PNG أو WebP أو HEIC.',
    make: 'الماركة',
    makePlaceholder: 'مثال: تويوتا',
    model: 'الموديل',
    modelPlaceholder: 'مثال: لاند كروزر',
    year: 'سنة الصنع',
    yearPlaceholder: 'مثال: ٢٠٢٣',
    mileage: 'قراءة العداد الحالية',
    mileagePlaceholder: 'مثال: ٤٥٠٠٠',
    km: 'كم',
    add: 'إضافة المركبة',
    saving: 'جارٍ حفظ المركبة…',
    cancel: 'إلغاء',
    loadError: 'تعذّر التحقق من حسابك. حاول مرة أخرى.',
    retry: 'حاول مرة أخرى',
    noUser: 'سجّل الدخول مجددًا لإضافة مركبة إلى مرآبك.',
    notConfigured: 'اربط Supabase قبل إضافة مركبة.',
    permission: 'اسمح بالوصول إلى مكتبة الصور لاختيار صورة المركبة.',
    pickerError: 'تعذّر فتح مكتبة الصور. حاول مرة أخرى.',
    invalidType: 'اختر نوع المركبة.',
    invalidMake: 'أدخل ماركة المركبة.',
    invalidModel: 'أدخل موديل المركبة.',
    invalidYear: 'أدخل سنة صحيحة بين ١٨٨٦ والسنة القادمة.',
    invalidMileage: 'أدخل قراءة عداد صحيحة، صفر أو أكثر.',
    insertError: 'تعذّر حفظ المركبة. تحقق من الاتصال وحاول مرة أخرى.',
    imageSaveError:
      'تعذّر رفع الصورة، ولم تتم إضافة المركبة. اختر صورة أخرى أو حاول مرة أخرى.',
    rollbackError:
      'تعذّر حفظ الصورة أو حذف المركبة المعلّقة بأمان. أعد المحاولة دون إنشاء نسخة مكررة.',
    success: 'تمت إضافة المركبة وتحديث مرآبك.',
    name: 'Car Care',
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
    success: '#0B9A63',
  },
} satisfies Record<ThemeName, Record<string, string>>;

type ScreenColors = (typeof palette)[ThemeName];
type ScreenStyles = ReturnType<typeof createStyles>;
type Copy = { [Key in keyof typeof strings.en]: string };

type Props = {
  colorScheme: ThemeName;
  onCancel: () => void;
  onAdded: (message: string) => void;
};

function logError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`[Car Care] ${context}`, error);
  }
}

function parseLocalizedInteger(value: string) {
  const westernDigits = value
    .replace(/[٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    );

  const normalized = westernDigits.replace(/[,\u066c\s]/g, '');

  return /^\d+$/.test(normalized)
    ? Number(normalized)
    : Number.NaN;
}

function getImageInfo(asset: ImagePicker.ImagePickerAsset) {
  const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();

  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };

  return {
    mimeType,
    extension: extensions[mimeType],
  };
}

export default function AddVehicleScreen({
  colorScheme,
  onCancel,
  onAdded,
}: Props) {
  const colors = palette[colorScheme];
  const copy = strings[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';

  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const [type, setType] = useState<VehicleType | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [yearText, setYearText] = useState('');
  const [mileageText, setMileageText] = useState('');

  const [photo, setPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [vehicleTypeError, setVehicleTypeError] = useState(false);

  const makeInputRef = useRef<TextInput>(null);
  const modelInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);
  const mileageInputRef = useRef<TextInput>(null);

  const pendingVehicleIdRef = useRef<string | null>(null);
  const pendingOwnerIdRef = useRef<string | null>(null);
  const pendingImagePathRef = useRef<string | null>(null);

  const imageUploadedRef = useRef(false);

  const hasPendingVehicle =
    pendingVehicleIdRef.current !== null;

  const choosePhoto = useCallback(async () => {
    setErrorMessage('');

    try {
      if (pendingVehicleIdRef.current) {
        setErrorMessage(copy.rollbackError);
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setErrorMessage(copy.permission);
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.75,
          exif: false,
        });

      if (result.canceled) {
        return;
      }

      const selected = result.assets[0];

      const { extension } = getImageInfo(selected);

      if (!extension) {
        setErrorMessage(copy.photoUnsupported);
        return;
      }

      if (
        selected.fileSize !== undefined &&
        selected.fileSize > 10 * 1024 * 1024
      ) {
        setErrorMessage(copy.photoTooLarge);
        return;
      }

      setPhoto(selected);
    } catch (error) {
      logError('Unable to choose a vehicle photo', error);
      setErrorMessage(copy.pickerError);
    }
  }, [copy]);

  const removePhoto = useCallback(() => {
    if (pendingVehicleIdRef.current) {
      setErrorMessage(copy.rollbackError);
      return;
    }

    setPhoto(null);
    setErrorMessage('');
  }, [copy.rollbackError]);

  const validateForm = useCallback(() => {
    if (!type) {
      return copy.invalidType;
    }

    if (!make.trim()) {
      return copy.invalidMake;
    }

    if (!model.trim()) {
      return copy.invalidModel;
    }

    const year = parseLocalizedInteger(yearText);

    if (
      !Number.isInteger(year) ||
      year < 1886 ||
      year > new Date().getFullYear() + 1
    ) {
      return copy.invalidYear;
    }

    const mileage = parseLocalizedInteger(mileageText);

    if (
      mileageText.trim().length === 0 ||
      !Number.isSafeInteger(mileage) ||
      mileage < 0 ||
      mileage > 2_147_483_647
    ) {
      return copy.invalidMileage;
    }

    return null;
  }, [
    copy,
    make,
    mileageText,
    model,
    type,
    yearText,
  ]);

  const submit = useCallback(async () => {
    setErrorMessage('');

    const validationError = validateForm();

    if (validationError) {
      setVehicleTypeError(
        validationError === copy.invalidType,
      );

      setErrorMessage(validationError);
      return;
    }

    if (!supabase) {
      setErrorMessage(copy.notConfigured);
      return;
    }

    setIsSaving(true);

    let imageStage = false;
    let rollbackFailed = false;

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        setErrorMessage(copy.noUser);
        return;
      }

      let vehicleId =
        pendingVehicleIdRef.current;

      if (
        vehicleId &&
        pendingOwnerIdRef.current !== user.id
      ) {
        pendingVehicleIdRef.current = null;
        pendingOwnerIdRef.current = null;
        pendingImagePathRef.current = null;
        imageUploadedRef.current = false;

        vehicleId = null;
      }

      const year = parseLocalizedInteger(yearText);
      const mileage = parseLocalizedInteger(mileageText);
      const selectedType = type;

      if (!selectedType) {
        setErrorMessage(copy.invalidType);
        return;
      }

      if (!vehicleId) {
        const {
          data: vehicle,
          error: insertError,
        } = await supabase
          .from('vehicles')
          .insert({
            user_id: user.id,
            type: selectedType,
            make: make.trim(),
            model: model.trim(),
            year,
            mileage,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        vehicleId = vehicle.id;

        pendingVehicleIdRef.current = vehicleId;
        pendingOwnerIdRef.current = user.id;
      } else {
        const {
          error: updateVehicleError,
        } = await supabase
          .from('vehicles')
          .update({
            type: selectedType,
            make: make.trim(),
            model: model.trim(),
            year,
            mileage,
          })
          .eq('id', vehicleId)
          .eq('user_id', user.id);

        if (updateVehicleError) {
          throw updateVehicleError;
        }
      }

      /*
       * PHOTO UPLOAD
       *
       * Important:
       * Do not use fetch(photo.uri) here.
       *
       * On Android, ImagePicker can return a local/content URI
       * that fetch() cannot read correctly and may return 404.
       *
       * Expo File gives us direct access to the local file.
       */
      if (photo) {
        const imageInfo = getImageInfo(photo);

        if (!imageInfo.extension) {
          throw new Error(
            'Unsupported vehicle image type',
          );
        }

        const imagePath =
          pendingImagePathRef.current ??
          `${user.id}/${vehicleId}/image.${imageInfo.extension}`;

        pendingImagePathRef.current = imagePath;

        if (
          !imageUploadedRef.current &&
          !rollbackFailed
        ) {
          imageStage = true;

          const imageFile = new File(photo.uri);

          if (!imageFile.exists) {
            throw new Error(
              'Unable to read selected vehicle photo',
            );
          }

          const imageData =
            await imageFile.arrayBuffer();

          if (imageData.byteLength === 0) {
            throw new Error(
              'Selected vehicle photo is empty',
            );
          }

          if (
            imageData.byteLength >
            10 * 1024 * 1024
          ) {
            throw new Error(
              'Vehicle image exceeds the Storage file size limit',
            );
          }

          const {
            error: uploadError,
          } = await supabase.storage
            .from('vehicle-images')
            .upload(
              imagePath,
              imageData,
              {
                contentType:
                  imageInfo.mimeType,
                cacheControl: '3600',
                upsert: true,
              },
            );

          if (uploadError) {
            throw uploadError;
          }

          imageUploadedRef.current = true;
        }

        imageStage = true;

        const {
          error: updateError,
        } = await supabase
          .from('vehicles')
          .update({
            image_path: imagePath,
          })
          .eq('id', vehicleId)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }
      }

      pendingVehicleIdRef.current = null;
      pendingOwnerIdRef.current = null;
      pendingImagePathRef.current = null;
      imageUploadedRef.current = false;

      onAdded(copy.success);
    } catch (error) {
      logError('Unable to add vehicle', error);

      const vehicleId =
        pendingVehicleIdRef.current;

      const ownerId =
        pendingOwnerIdRef.current;

      if (vehicleId && ownerId) {
        if (pendingImagePathRef.current) {
          try {
            const {
              error: removeError,
            } = await supabase.storage
              .from('vehicle-images')
              .remove([
                pendingImagePathRef.current,
              ]);

            if (removeError) {
              logError(
                'Unable to clean up the incomplete vehicle photo',
                removeError,
              );

              rollbackFailed = true;
            } else {
              imageUploadedRef.current = false;
            }
          } catch (removeError) {
            logError(
              'Unable to clean up the incomplete vehicle photo',
              removeError,
            );

            rollbackFailed = true;
          }
        }

        if (!imageUploadedRef.current) {
          try {
            const {
              error: deleteError,
            } = await supabase
              .from('vehicles')
              .delete()
              .eq('id', vehicleId)
              .eq('user_id', ownerId);

            if (deleteError) {
              logError(
                'Unable to roll back the incomplete vehicle',
                deleteError,
              );

              rollbackFailed = true;
            } else {
              pendingVehicleIdRef.current = null;
              pendingOwnerIdRef.current = null;
              pendingImagePathRef.current = null;
              imageUploadedRef.current = false;
            }
          } catch (deleteError) {
            logError(
              'Unable to roll back the incomplete vehicle',
              deleteError,
            );

            rollbackFailed = true;
          }
        }
      }

      if (rollbackFailed) {
        setErrorMessage(copy.rollbackError);
      } else {
        setErrorMessage(
          imageStage
            ? copy.imageSaveError
            : copy.insertError,
        );
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    copy,
    make,
    mileageText,
    model,
    onAdded,
    photo,
    type,
    validateForm,
    yearText,
  ]);

  const focusedField = useCallback(
    (
      ref: React.RefObject<TextInput | null>,
    ) => () => ref.current?.focus(),
    [],
  );

  const canUseSupabase =
    supabase !== null;

  useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (
            isSaving ||
            hasPendingVehicle
          ) {
            return true;
          }

          onCancel();

          return true;
        },
      );

    return () =>
      subscription.remove();
  }, [
    hasPendingVehicle,
    isSaving,
    onCancel,
  ]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'bottom',
        'left',
        'right',
      ]}
    >
      <CockpitBackdrop colors={colors} />

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View
            style={[
              styles.header,
              isArabic &&
                sharedStyles.rowReverse,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                copy.cancel
              }
              disabled={
                isSaving ||
                hasPendingVehicle
              }
              onPress={onCancel}
              style={styles.backButton}
            >
              <Text
                style={[
                  styles.backIcon,
                  isArabic &&
                    sharedStyles.flip,
                ]}
              >
                ‹
              </Text>
            </Pressable>

            <View
              style={[
                styles.brand,
                isArabic &&
                  sharedStyles.rowReverse,
              ]}
            >
              <View
                style={styles.logoMark}
              >
                <View
                  style={[
                    styles.corner,
                    styles.cornerTopLeft,
                  ]}
                />
                <View
                  style={[
                    styles.corner,
                    styles.cornerTopRight,
                  ]}
                />
                <View
                  style={[
                    styles.corner,
                    styles.cornerBottomLeft,
                  ]}
                />
                <View
                  style={[
                    styles.corner,
                    styles.cornerBottomRight,
                  ]}
                />
                <View
                  style={styles.logoBar}
                />
              </View>

              <Text
                style={[
                  styles.brandName,
                  {
                    writingDirection:
                      direction,
                  },
                ]}
              >
                {copy.name}
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text
              style={[
                styles.eyebrow,
                {
                  textAlign: isArabic
                    ? 'right'
                    : 'left',
                },
              ]}
            >
              {copy.eyebrow}
            </Text>

            <Text
              style={[
                styles.title,
                {
                  textAlign: isArabic
                    ? 'right'
                    : 'left',
                  writingDirection:
                    direction,
                },
              ]}
            >
              {copy.title}
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  textAlign: isArabic
                    ? 'right'
                    : 'left',
                  writingDirection:
                    direction,
                },
              ]}
            >
              {copy.subtitle}
            </Text>

            <Text
              style={[
                styles.sectionLabel,
                {
                  textAlign: isArabic
                    ? 'right'
                    : 'left',
                },
              ]}
            >
              {copy.vehicleType}
            </Text>

            <View
              style={[
                styles.typeChoices,
                isArabic &&
                  sharedStyles.rowReverse,
              ]}
            >
              {(
                ['car', 'motorcycle'] as const
              ).map((vehicleType) => {
                const selected =
                  type === vehicleType;

                return (
                  <Pressable
                    key={vehicleType}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() => {
                      setType(
                        vehicleType,
                      );
                      setVehicleTypeError(
                        false,
                      );
                      setErrorMessage('');
                    }}
                    style={[
                      styles.typeChoice,
                      selected &&
                        styles.typeChoiceSelected,
                      vehicleTypeError &&
                        styles.typeChoiceError,
                    ]}
                  >
                    <Text
                      style={
                        styles.typeIcon
                      }
                    >
                      {vehicleType ===
                      'car'
                        ? '▰'
                        : '↗'}
                    </Text>

                    <Text
                      style={[
                        styles.typeChoiceText,
                        selected &&
                          styles.typeChoiceTextSelected,
                      ]}
                    >
                      {vehicleType ===
                      'car'
                        ? copy.car
                        : copy.motorcycle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.sectionLabel,
                {
                  textAlign: isArabic
                    ? 'right'
                    : 'left',
                },
              ]}
            >
              {copy.vehiclePhoto}
            </Text>

            <View
              style={styles.photoCard}
            >
              {photo ? (
                <>
                  <Image
                    source={{
                      uri: photo.uri,
                    }}
                    style={
                      styles.photoPreview
                    }
                    resizeMode="cover"
                    accessibilityLabel={
                      copy.vehiclePhoto
                    }
                  />

                  <View
                    style={[
                      styles.photoActions,
                      isArabic &&
                        sharedStyles.rowReverse,
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        isSaving ||
                        hasPendingVehicle
                      }
                      onPress={() =>
                        void choosePhoto()
                      }
                      style={
                        styles.photoAction
                      }
                    >
                      <Text
                        style={
                          styles.photoActionText
                        }
                      >
                        {
                          copy.replacePhoto
                        }
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        isSaving ||
                        hasPendingVehicle
                      }
                      onPress={
                        removePhoto
                      }
                      style={[
                        styles.photoAction,
                        styles.removePhotoAction,
                      ]}
                    >
                      <Text
                        style={[
                          styles.photoActionText,
                          styles.removePhotoText,
                        ]}
                      >
                        {
                          copy.removePhoto
                        }
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    isSaving ||
                    hasPendingVehicle
                  }
                  onPress={() =>
                    void choosePhoto()
                  }
                  style={
                    styles.photoEmpty
                  }
                >
                  <View
                    style={
                      styles.photoEmptyIcon
                    }
                  >
                    <Text
                      style={
                        styles.photoPlus
                      }
                    >
                      +
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.photoEmptyTitle,
                      {
                        writingDirection:
                          direction,
                      },
                    ]}
                  >
                    {
                      copy.choosePhoto
                    }
                  </Text>

                  <Text
                    style={
                      styles.photoEmptyHint
                    }
                  >
                    JPEG · PNG · WEBP · HEIC
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.fields}>
              <VehicleField
                ref={makeInputRef}
                label={copy.make}
                value={make}
                onChangeText={(value) => {
                  setMake(value);
                  setErrorMessage('');
                }}
                placeholder={
                  copy.makePlaceholder
                }
                colors={colors}
                styles={styles}
                direction={direction}
                editable={!isSaving}
                returnKeyType="next"
                onSubmitEditing={focusedField(
                  modelInputRef,
                )}
              />

              <VehicleField
                ref={modelInputRef}
                label={copy.model}
                value={model}
                onChangeText={(value) => {
                  setModel(value);
                  setErrorMessage('');
                }}
                placeholder={
                  copy.modelPlaceholder
                }
                colors={colors}
                styles={styles}
                direction={direction}
                editable={!isSaving}
                returnKeyType="next"
                onSubmitEditing={focusedField(
                  yearInputRef,
                )}
              />

              <View
                style={[
                  styles.numberFields,
                  isArabic &&
                    sharedStyles.rowReverse,
                ]}
              >
                <View
                  style={styles.numberField}
                >
                  <VehicleField
                    ref={yearInputRef}
                    label={copy.year}
                    value={yearText}
                    onChangeText={(value) => {
                      setYearText(
                        value,
                      );
                      setErrorMessage('');
                    }}
                    placeholder={
                      copy.yearPlaceholder
                    }
                    keyboardType="number-pad"
                    colors={colors}
                    styles={styles}
                    direction={
                      direction
                    }
                    editable={!isSaving}
                    returnKeyType="next"
                    onSubmitEditing={focusedField(
                      mileageInputRef,
                    )}
                  />
                </View>

                <View
                  style={styles.numberField}
                >
                  <VehicleField
                    ref={
                      mileageInputRef
                    }
                    label={copy.mileage}
                    value={
                      mileageText
                    }
                    onChangeText={(
                      value,
                    ) => {
                      setMileageText(
                        value,
                      );
                      setErrorMessage('');
                    }}
                    placeholder={
                      copy.mileagePlaceholder
                    }
                    keyboardType="number-pad"
                    suffix={copy.km}
                    colors={colors}
                    styles={styles}
                    direction={
                      direction
                    }
                    editable={!isSaving}
                    returnKeyType="done"
                    onSubmitEditing={() =>
                      void submit()
                    }
                  />
                </View>
              </View>
            </View>

            {!canUseSupabase && (
              <FeedbackMessage
                colors={colors}
                styles={styles}
                message={
                  copy.notConfigured
                }
              />
            )}

            {!!errorMessage && (
              <FeedbackMessage
                colors={colors}
                styles={styles}
                message={
                  errorMessage
                }
              />
            )}

            <Pressable
              accessibilityRole="button"
              disabled={
                isSaving ||
                !canUseSupabase
              }
              onPress={() =>
                void submit()
              }
              style={[
                styles.submitButton,
                (isSaving ||
                  !canUseSupabase) &&
                  styles.submitDisabled,
                isArabic &&
                  sharedStyles.rowReverse,
              ]}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator
                    color={
                      colors.accentInk
                    }
                  />

                  <Text
                    style={
                      styles.submitText
                    }
                  >
                    {copy.saving}
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.submitText
                    }
                  >
                    {copy.add}
                  </Text>

                  <Text
                    style={
                      styles.submitArrow
                    }
                  >
                    {isArabic
                      ? '←'
                      : '→'}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onCancel}
              style={
                styles.cancelButton
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                {copy.cancel}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type VehicleFieldProps = {
  label: string;
  value: string;
  onChangeText: (
    value: string,
  ) => void;
  placeholder: string;
  keyboardType?:
    | 'default'
    | 'number-pad';
  suffix?: string;
  colors: ScreenColors;
  styles: ScreenStyles;
  direction:
    | 'ltr'
    | 'rtl';
  editable: boolean;
  returnKeyType?:
    | 'next'
    | 'done';
  onSubmitEditing?: () => void;
};

const VehicleField =
  forwardRef<
    TextInput,
    VehicleFieldProps
  >(function VehicleField(
    {
      label,
      value,
      onChangeText,
      placeholder,
      keyboardType = 'default',
      suffix,
      colors,
      styles,
      direction,
      editable,
      returnKeyType,
      onSubmitEditing,
    },
    ref,
  ) {
    return (
      <View>
        <Text
          style={[
            styles.fieldLabel,
            {
              textAlign:
                direction ===
                'rtl'
                  ? 'right'
                  : 'left',
            },
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.inputWrap,
            direction === 'rtl' &&
              sharedStyles.rowReverse,
          ]}
        >
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            value={value}
            onChangeText={
              onChangeText
            }
            placeholder={
              placeholder
            }
            placeholderTextColor={
              colors.muted
            }
            keyboardType={
              keyboardType
            }
            autoCapitalize={
              keyboardType ===
              'default'
                ? 'words'
                : 'none'
            }
            autoCorrect={false}
            editable={editable}
            returnKeyType={
              returnKeyType
            }
            onSubmitEditing={
              onSubmitEditing
            }
            blurOnSubmit={
              returnKeyType !==
              'next'
            }
            style={[
              styles.input,
              {
                textAlign:
                  direction ===
                  'rtl'
                    ? 'right'
                    : 'left',
                writingDirection:
                  direction,
              },
            ]}
          />

          {suffix && (
            <Text
              style={
                styles.inputSuffix
              }
            >
              {suffix}
            </Text>
          )}
        </View>
      </View>
    );
  });

function FeedbackMessage({
  colors,
  styles,
  message,
}: {
  colors: ScreenColors;
  styles: ScreenStyles;
  message: string;
}) {
  const tone = colors.error;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.feedback,
        {
          borderColor:
            `${tone}55`,
          backgroundColor:
            `${tone}12`,
        },
      ]}
    >
      <View
        style={[
          styles.feedbackDot,
          {
            backgroundColor:
              tone,
          },
        ]}
      />

      <Text
        style={[
          styles.feedbackText,
          {
            color: tone,
            writingDirection:
              isArabic
                ? 'rtl'
                : 'ltr',
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const sharedStyles =
  StyleSheet.create({
    rowReverse: {
      flexDirection:
        'row-reverse',
    },

    flip: {
      transform: [
        {
          scaleX: -1,
        },
      ],
    },
  });

function createStyles(
  colors: ScreenColors,
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    keyboardArea: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 32,
    },

    header: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 2,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    backIcon: {
      color:
        colors.foreground,
      fontSize: 28,
      lineHeight: 31,
      marginTop: -3,
    },

    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    logoMark: {
      width: 24,
      height: 24,
      position: 'relative',
    },

    corner: {
      position: 'absolute',
      width: 7,
      height: 7,
      borderColor:
        colors.accent,
    },

    cornerTopLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 2,
      borderLeftWidth: 2,
    },

    cornerTopRight: {
      top: 0,
      right: 0,
      borderTopWidth: 2,
      borderRightWidth: 2,
    },

    cornerBottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 2,
      borderLeftWidth: 2,
    },

    cornerBottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 2,
      borderRightWidth: 2,
    },

    logoBar: {
      position: 'absolute',
      left: 7,
      right: 7,
      top: 11,
      height: 2,
      backgroundColor:
        colors.accent,
    },

    brandName: {
      color:
        colors.foreground,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.4,
    },

    form: {
      width: '100%',
      maxWidth: 410,
      alignSelf: 'center',
      paddingTop: 18,
    },

    eyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2.2,
    },

    title: {
      color:
        colors.foreground,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '700',
      letterSpacing: -1,
      marginTop: 10,
    },

    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 7,
    },

    sectionLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.9,
      marginTop: 24,
      marginBottom: 10,
    },

    typeChoices: {
      flexDirection: 'row',
      gap: 10,
    },

    typeChoice: {
      flex: 1,
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 9,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    typeChoiceSelected: {
      borderColor:
        colors.accent,
      backgroundColor:
        colors.surfaceStrong,
    },

    typeChoiceError: {
      borderColor:
        colors.error,
    },

    typeIcon: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: '600',
    },

    typeChoiceText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },

    typeChoiceTextSelected: {
      color:
        colors.foreground,
    },

    photoCard: {
      overflow: 'hidden',
      minHeight: 120,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    photoEmpty: {
      minHeight: 116,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 14,
      paddingVertical: 13,
    },

    photoEmptyIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius: 13,
      backgroundColor:
        colors.surfaceStrong,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    photoPlus: {
      color: colors.accent,
      fontSize: 24,
      fontWeight: '300',
      marginTop: -2,
    },

    photoEmptyTitle: {
      color:
        colors.foreground,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 8,
    },

    photoEmptyHint: {
      color: colors.muted,
      fontSize: 8,
      fontWeight: '600',
      letterSpacing: 1.1,
      marginTop: 5,
    },

    photoPreview: {
      width: '100%',
      height: 156,
      backgroundColor:
        colors.panel,
    },

    photoActions: {
      minHeight: 44,
      flexDirection: 'row',
      justifyContent:
        'center',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
    },

    photoAction: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor:
        colors.surfaceStrong,
    },

    removePhotoAction: {
      backgroundColor:
        `${colors.error}12`,
    },

    photoActionText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '600',
    },

    removePhotoText: {
      color: colors.error,
    },

    fields: {
      gap: 13,
      marginTop: 18,
    },

    fieldLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.4,
      marginBottom: 7,
    },

    inputWrap: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    input: {
      flex: 1,
      minHeight: 50,
      paddingVertical: 0,
      color:
        colors.foreground,
      fontSize: 14,
      fontWeight: '500',
    },

    inputSuffix: {
      color: colors.accent,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1,
    },

    numberFields: {
      flexDirection: 'row',
      gap: 10,
    },

    numberField: {
      flex: 1,
    },

    feedback: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 9,
      padding: 11,
      marginTop: 13,
      borderWidth: 1,
      borderRadius: 14,
    },

    feedbackDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginTop: 5,
    },

    feedbackText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '500',
    },

    submitButton: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 11,
      marginTop: 20,
      borderRadius: 18,
      backgroundColor:
        colors.accent,
      shadowColor:
        colors.accent,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity:
        colors.background ===
        '#05070A'
          ? 0.18
          : 0.1,
      shadowRadius: 16,
      elevation: 2,
    },

    submitDisabled: {
      opacity: 0.55,
    },

    submitText: {
      color:
        colors.accentInk,
      fontSize: 14,
      fontWeight: '700',
    },

    submitArrow: {
      color:
        colors.accentInk,
      fontSize: 18,
      lineHeight: 20,
    },

    cancelButton: {
      alignItems: 'center',
      paddingVertical: 13,
    },

    cancelText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}