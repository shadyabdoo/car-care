
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

type ThemeName = 'dark' | 'light';
type AuthMode = 'login' | 'register';

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');

const strings = {
  en: {
    access: 'ACCESS · 01',
    loginTitle: 'Start your engine.',
    registerTitle: 'Join the garage.',
    loginSubtitle: 'Good to have you back.',
    registerSubtitle: 'One home for everything your vehicle needs.',
    loginTab: 'Sign in',
    registerTab: 'Register',
    fullName: 'FULL NAME',
    namePlaceholder: 'Your full name',
    email: 'EMAIL',
    emailPlaceholder: 'you@domain.com',
    password: 'PASSWORD',
    loginPasswordPlaceholder: 'Your password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPassword: 'CONFIRM PASSWORD',
    confirmPlaceholder: 'Repeat your password',
    showPassword: 'Show',
    hidePassword: 'Hide',
    loginAction: 'Sign in',
    registerAction: 'Create account',
    noAccount: 'New to Car Care?',
    hasAccount: 'Already have an account?',
    goRegister: 'Create an account',
    goLogin: 'Sign in',
    secureNote: 'Your account is secured by Supabase Auth.',
    missingName: 'Enter your full name.',
    missingEmail: 'Enter your email address.',
    invalidEmail: 'Enter a valid email address.',
    missingPassword: 'Enter your password.',
    weakPassword: 'Use at least 8 characters, including a letter and a number.',
    mismatch: 'Your passwords do not match.',
    wrongCredentials: 'Email or password is incorrect.',
    existingEmail: 'An account with this email already exists. Try signing in.',
    signupSuccess: 'Your account is ready. You’re signed in.',
    verifyEmail:
      'Your account was created. Check your email for a confirmation link, then sign in.',
    unexpectedError: 'We could not complete that request. Please try again.',
    passwordRejected: 'Choose a stronger password and try again.',
    setupTitle: 'Connect your garage',
    setupBody: 'Add your Supabase URL and public key to .env, then restart Expo.',
    sessionError:
      'We could not restore your session. Sign in again; your vehicle data remains protected.',
    appName: 'Car Care',
  },

  ar: {
    access: 'الدخول · ٠١',
    loginTitle: 'ابدأ رحلتك.',
    registerTitle: 'انضم إلى المرآب.',
    loginSubtitle: 'سعداء بعودتك.',
    registerSubtitle: 'كل ما تحتاجه مركبتك في مكان واحد.',
    loginTab: 'تسجيل الدخول',
    registerTab: 'حساب جديد',
    fullName: 'الاسم بالكامل',
    namePlaceholder: 'اسمك بالكامل',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'you@domain.com',
    password: 'كلمة المرور',
    loginPasswordPlaceholder: 'كلمة المرور',
    passwordPlaceholder: '٨ أحرف على الأقل',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPlaceholder: 'أعد كتابة كلمة المرور',
    showPassword: 'إظهار',
    hidePassword: 'إخفاء',
    loginAction: 'تسجيل الدخول',
    registerAction: 'إنشاء حساب',
    noAccount: 'جديد في Car Care؟',
    hasAccount: 'لديك حساب بالفعل؟',
    goRegister: 'أنشئ حسابًا',
    goLogin: 'سجّل الدخول',
    secureNote: 'حسابك محمي عبر Supabase Auth.',
    missingName: 'أدخل اسمك بالكامل.',
    missingEmail: 'أدخل بريدك الإلكتروني.',
    invalidEmail: 'أدخل بريدًا إلكترونيًا صحيحًا.',
    missingPassword: 'أدخل كلمة المرور.',
    weakPassword: 'استخدم ٨ أحرف على الأقل، مع حرف ورقم.',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    wrongCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    existingEmail: 'يوجد حساب بهذا البريد بالفعل. جرّب تسجيل الدخول.',
    signupSuccess: 'أصبح حسابك جاهزًا وتم تسجيل دخولك.',
    verifyEmail: 'تم إنشاء الحساب. أكّد بريدك من الرسالة ثم سجّل الدخول.',
    unexpectedError: 'تعذّر إكمال الطلب. حاول مرة أخرى.',
    passwordRejected: 'اختر كلمة مرور أقوى ثم حاول مرة أخرى.',
    setupTitle: 'اربط مرآبك',
    setupBody: 'أضف رابط Supabase والمفتاح العام إلى .env ثم أعد تشغيل Expo.',
    sessionError: 'تعذّر استعادة الجلسة. سجّل الدخول مجددًا لحماية بيانات مركباتك.',
    appName: 'Car Care',
  },
} as const;

const palette = {
  dark: {
    background: '#05070A',
    panel: '#0B1016',
    surface: 'rgba(255,255,255,0.045)',
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
    surface: 'rgba(255,255,255,0.66)',
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

type AuthCopy = { [Key in keyof typeof strings.en]: string };
type AuthColors = (typeof palette)[ThemeName];

type Props = {
  colorScheme: ThemeName;
  sessionError: boolean;
  onSessionRetry: () => void;
};

function logAuthError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`[Car Care] ${context}`, error);
  }
}

function mapAuthError(message: string, copy: AuthCopy) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return copy.wrongCredentials;
  }

  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already exists')
  ) {
    return copy.existingEmail;
  }

  if (
    normalized.includes('password should be at least') ||
    normalized.includes('password is too weak') ||
    normalized.includes('weak password')
  ) {
    return copy.passwordRejected;
  }

  return copy.unexpectedError;
}

export default function AuthScreen({
  colorScheme,
  sessionError,
  onSessionRetry,
}: Props) {
  const colors = palette[colorScheme];
  const copy = strings[isArabic ? 'ar' : 'en'];
  const direction = isArabic ? 'rtl' : 'ltr';

  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const changeMode = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
    setPasswordVisible(false);
    setConfirmVisible(false);
  }, []);

  const submit = useCallback(async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'register' && !cleanName) {
      setErrorMessage(copy.missingName);
      return;
    }

    if (!cleanEmail) {
      setErrorMessage(copy.missingEmail);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage(copy.invalidEmail);
      return;
    }

    if (!password) {
      setErrorMessage(copy.missingPassword);
      return;
    }

    if (
      mode === 'register' &&
      (password.length < 8 ||
        !/\p{L}/u.test(password) ||
        !/\p{N}/u.test(password))
    ) {
      setErrorMessage(copy.weakPassword);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMessage(copy.mismatch);
      return;
    }

    if (!supabase) {
      setErrorMessage(copy.setupBody);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
            },
            emailRedirectTo: 'carcare://auth/callback',
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage(copy.signupSuccess);
        } else {
          setSuccessMessage(copy.verifyEmail);
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (error) {
      logAuthError(`Supabase ${mode} failed`, error);

      setErrorMessage(
        mapAuthError(
          error instanceof Error ? error.message : '',
          copy,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmPassword, copy, email, fullName, mode, password]);

  const emailField = (
    <AuthField
      colors={colors}
      styles={styles}
      direction={direction}
      label={copy.email}
      value={email}
      onChangeText={(value) => {
        setEmail(value);
        setErrorMessage('');
        setSuccessMessage('');
      }}
      placeholder={copy.emailPlaceholder}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      editable={!isSubmitting}
      returnKeyType="next"
      onSubmitEditing={() => passwordInputRef.current?.focus()}
    />
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.backgroundGlow} />

      <View style={styles.gridLines} pointerEvents="none">
        {Array.from({ length: 19 }, (_, index) => (
          <View
            key={index}
            style={[styles.gridLine, { top: index * 28 }]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: Math.max(0, height - 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View
            style={[
              styles.brand,
              isArabic && sharedStyles.rowReverse,
            ]}
          >
            <View style={styles.logoMark}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              <View style={styles.logoBar} />
            </View>

            <Text
              style={[
                styles.brandName,
                { writingDirection: direction },
              ]}
            >
              {copy.appName}
            </Text>
          </View>

          <View style={styles.content}>
            <Text
              style={[
                styles.accessLabel,
                {
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            >
              {copy.access}
            </Text>

            <Text
              style={[
                styles.title,
                {
                  textAlign: isArabic ? 'right' : 'left',
                  writingDirection: direction,
                },
              ]}
            >
              {mode === 'login'
                ? copy.loginTitle
                : copy.registerTitle}
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  textAlign: isArabic ? 'right' : 'left',
                  writingDirection: direction,
                },
              ]}
            >
              {mode === 'login'
                ? copy.loginSubtitle
                : copy.registerSubtitle}
            </Text>

            <View
              accessibilityRole="tablist"
              style={[
                styles.modeSwitch,
                isArabic && sharedStyles.rowReverse,
              ]}
            >
              <ModeButton
                label={copy.loginTab}
                selected={mode === 'login'}
                disabled={isSubmitting}
                onPress={() => changeMode('login')}
                styles={styles}
              />

              <ModeButton
                label={copy.registerTab}
                selected={mode === 'register'}
                disabled={isSubmitting}
                onPress={() => changeMode('register')}
                styles={styles}
              />
            </View>

            <View style={styles.fields}>
              {mode === 'register' && (
                <AuthField
                  colors={colors}
                  styles={styles}
                  direction={direction}
                  label={copy.fullName}
                  value={fullName}
                  onChangeText={(value) => {
                    setFullName(value);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  placeholder={copy.namePlaceholder}
                  autoComplete="name"
                  editable={!isSubmitting}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    passwordInputRef.current?.focus()
                  }
                />
              )}

              {emailField}

              <AuthField
                ref={passwordInputRef}
                colors={colors}
                styles={styles}
                direction={direction}
                label={copy.password}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                placeholder={
                  mode === 'login'
                    ? copy.loginPasswordPlaceholder
                    : copy.passwordPlaceholder
                }
                autoCapitalize="none"
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                editable={!isSubmitting}
                secure={!passwordVisible}
                returnKeyType={
                  mode === 'register' ? 'next' : 'go'
                }
                onSubmitEditing={() => {
                  if (mode === 'register') {
                    confirmInputRef.current?.focus();
                  } else {
                    void submit();
                  }
                }}
                visibilityLabel={
                  passwordVisible
                    ? copy.hidePassword
                    : copy.showPassword
                }
                onToggleVisibility={() =>
                  setPasswordVisible((visible) => !visible)
                }
              />

              {mode === 'register' && (
                <AuthField
                  ref={confirmInputRef}
                  colors={colors}
                  styles={styles}
                  direction={direction}
                  label={copy.confirmPassword}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  placeholder={copy.confirmPlaceholder}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!isSubmitting}
                  secure={!confirmVisible}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  visibilityLabel={
                    confirmVisible
                      ? copy.hidePassword
                      : copy.showPassword
                  }
                  onToggleVisibility={() =>
                    setConfirmVisible((visible) => !visible)
                  }
                />
              )}
            </View>

            {(!!errorMessage ||
              sessionError ||
              !isSupabaseConfigured) && (
              <FeedbackMessage
                colors={colors}
                styles={styles}
                direction={direction}
                message={
                  !isSupabaseConfigured
                    ? copy.setupBody
                    : errorMessage ||
                      (sessionError
                        ? copy.sessionError
                        : '')
                }
              />
            )}

            {!!successMessage && (
              <FeedbackMessage
                colors={colors}
                styles={styles}
                direction={direction}
                message={successMessage}
                success
              />
            )}

            {sessionError && (
              <Pressable
                accessibilityRole="button"
                onPress={onSessionRetry}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>
                  {copy.goLogin}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={
                isSubmitting || !isSupabaseConfigured
              }
              onPress={() => void submit()}
              style={[
                styles.submitButton,
                (isSubmitting ||
                  !isSupabaseConfigured) &&
                  styles.submitDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color={colors.accentInk}
                />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login'
                    ? copy.loginAction
                    : copy.registerAction}
                </Text>
              )}
            </Pressable>

            <View
              style={[
                styles.switchPrompt,
                isArabic && sharedStyles.rowReverse,
              ]}
            >
              <Text
                style={[
                  styles.switchPromptText,
                  { writingDirection: direction },
                ]}
              >
                {mode === 'login'
                  ? copy.noAccount
                  : copy.hasAccount}
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() =>
                  changeMode(
                    mode === 'login'
                      ? 'register'
                      : 'login',
                  )
                }
              >
                <Text style={styles.switchLink}>
                  {mode === 'login'
                    ? copy.goRegister
                    : copy.goLogin}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRule} />

            <Text
              style={[
                styles.footerText,
                { writingDirection: direction },
              ]}
            >
              {copy.secureNote}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeButton({
  label,
  selected,
  disabled,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  styles: AuthStyles;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.modeButton,
        selected && styles.modeButtonSelected,
      ]}
    >
      <Text
        style={[
          styles.modeButtonText,
          selected && styles.modeButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type AuthStyles = ReturnType<typeof createStyles>;

type AuthFieldProps = {
  colors: AuthColors;
  styles: AuthStyles;
  direction: 'ltr' | 'rtl';
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  autoComplete?:
    | 'name'
    | 'email'
    | 'current-password'
    | 'new-password';
  editable: boolean;
  secure?: boolean;
  returnKeyType?: 'next' | 'go';
  onSubmitEditing?: () => void;
  visibilityLabel?: string;
  onToggleVisibility?: () => void;
};

const AuthField = forwardRef<TextInput, AuthFieldProps>(
  function AuthField(
    {
      colors,
      styles,
      direction,
      label,
      value,
      onChangeText,
      placeholder,
      keyboardType = 'default',
      autoCapitalize = 'words',
      autoComplete,
      editable,
      secure = false,
      returnKeyType,
      onSubmitEditing,
      visibilityLabel,
      onToggleVisibility,
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
                direction === 'rtl' ? 'right' : 'left',
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
            !editable && styles.inputDisabled,
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
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            autoCorrect={false}
            editable={editable}
            secureTextEntry={secure}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={returnKeyType !== 'next'}
            style={[
              styles.input,
              {
                textAlign:
                  direction === 'rtl' ? 'right' : 'left',
                writingDirection: direction,
              },
            ]}
          />

          {visibilityLabel && onToggleVisibility && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visibilityLabel}
              disabled={!editable}
              onPress={onToggleVisibility}
              style={styles.visibilityButton}
            >
              <Text style={styles.visibilityText}>
                {visibilityLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  },
);

function FeedbackMessage({
  colors,
  styles,
  direction,
  message,
  success = false,
}: {
  colors: AuthColors;
  styles: AuthStyles;
  direction: 'rtl' | 'ltr';
  message: string;
  success?: boolean;
}) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.feedback,
        {
          borderColor: success
            ? colors.success
            : colors.error,
          backgroundColor: success
            ? `${colors.success}12`
            : `${colors.error}12`,
        },
      ]}
    >
      <View
        style={[
          styles.feedbackDot,
          {
            backgroundColor: success
              ? colors.success
              : colors.error,
          },
        ]}
      />

      <Text
        style={[
          styles.feedbackText,
          {
            color: success
              ? colors.success
              : colors.error,
            textAlign:
              direction === 'rtl' ? 'right' : 'left',
            writingDirection: direction,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const sharedStyles = StyleSheet.create({
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});

function createStyles(colors: AuthColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    backgroundGlow: {
      position: 'absolute',
      top: -210,
      left: '9%',
      width: '82%',
      height: 360,
      borderRadius: 200,
      backgroundColor: colors.accent,
      opacity:
        colors.background === '#05070A'
          ? 0.055
          : 0.09,
    },

    gridLines: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
    },

    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.grid,
    },

    keyboardArea: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: 13,
      paddingBottom: 20,
    },

    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 34,
    },

    logoMark: {
      width: 26,
      height: 26,
      position: 'relative',
    },

    corner: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderColor: colors.accent,
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
      left: 8,
      right: 8,
      top: 12,
      height: 2,
      backgroundColor: colors.accent,
    },

    brandName: {
      color: colors.foreground,
      fontSize: 21,
      fontWeight: '700',
      letterSpacing: -0.6,
    },

    content: {
      width: '100%',
      maxWidth: 390,
      alignSelf: 'center',
      paddingTop: 27,
    },

    accessLabel: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2,
    },

    title: {
      color: colors.foreground,
      fontSize: 34,
      lineHeight: 39,
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

    modeSwitch: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      marginTop: 24,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    modeButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },

    modeButtonSelected: {
      backgroundColor: colors.accent,
    },

    modeButtonText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '600',
    },

    modeButtonTextSelected: {
      color: colors.accentInk,
    },

    fields: {
      gap: 13,
      marginTop: 19,
    },

    fieldLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.6,
      marginBottom: 8,
    },

    inputWrap: {
      minHeight: 61,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    inputDisabled: {
      opacity: 0.65,
    },

    input: {
      flex: 1,
      minHeight: 58,
      paddingVertical: 0,
      color: colors.foreground,
      fontSize: 15,
      fontWeight: '500',
    },

    visibilityButton: {
      paddingVertical: 10,
      paddingLeft: 10,
    },

    visibilityText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '600',
    },

    feedback: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      padding: 12,
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
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },

    retryButton: {
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 2,
    },

    retryText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },

    submitButton: {
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 19,
      borderRadius: 18,
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity:
        colors.background === '#05070A'
          ? 0.21
          : 0.12,
      shadowRadius: 17,
      elevation: 2,
    },

    submitDisabled: {
      opacity: 0.55,
    },

    submitText: {
      color: colors.accentInk,
      fontSize: 15,
      fontWeight: '700',
    },

    switchPrompt: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
      marginTop: 17,
    },

    switchPromptText: {
      color: colors.muted,
      fontSize: 12,
    },

    switchLink: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },

    footer: {
      width: '100%',
      maxWidth: 390,
      alignSelf: 'center',
      marginTop: 'auto',
      paddingTop: 26,
    },

    footerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginBottom: 13,
    },

    footerText: {
      color: colors.muted,
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 17,
    },
  });
}
