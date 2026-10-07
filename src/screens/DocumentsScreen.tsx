import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import CockpitBackdrop from '../components/CockpitBackdrop';
import { supabase } from '../lib/supabase';

type ThemeName = 'dark' | 'light';
type DocumentType =
  | 'vehicle_registration'
  | 'insurance'
  | 'inspection'
  | 'driving_license'
  | 'warranty'
  | 'service_contract'
  | 'road_assistance'
  | 'other';
type DocumentStatus = 'EXPIRED' | 'EXPIRING_SOON' | 'VALID' | 'NO_EXPIRY';
type DocumentFilter = 'all' | DocumentStatus;
type ScreenStatus = 'loading' | 'ready' | 'error' | 'signedOut' | 'unconfigured';

type DocumentRecord = {
  id: string;
  vehicle_id: string;
  user_id: string;
  document_type: DocumentType;
  title: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  provider: string | null;
  notes: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentDraft = {
  documentType: DocumentType;
  title: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  provider: string;
  notes: string;
  filePath: string;
};

type Props = {
  vehicleId: string;
  colorScheme: ThemeName;
  onBack: () => void;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
const isArabic = locale.toLowerCase().startsWith('ar');
const oneDayMs = 24 * 60 * 60 * 1000;
const documentTypes: DocumentType[] = [
  'vehicle_registration',
  'insurance',
  'inspection',
  'driving_license',
  'warranty',
  'service_contract',
  'road_assistance',
  'other',
];
const filterOptions: DocumentFilter[] = ['all', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'NO_EXPIRY'];

const copy = {
  en: {
    back: 'Back',
    title: 'Documents',
    summary: 'DOCUMENT SUMMARY',
    totalDocuments: 'Total documents',
    valid: 'Valid',
    expiringSoon: 'Expiring soon',
    expired: 'Expired',
    nextExpiry: 'NEXT EXPIRY',
    noUpcomingExpiry: 'No upcoming expiry',
    add: 'ADD DOCUMENT',
    addFirst: 'ADD YOUR FIRST DOCUMENT',
    emptyTitle: 'NO DOCUMENTS YET',
    emptyBody: 'Keep vehicle registrations, insurance, and service records organized in one place.',
    all: 'All',
    loading: 'Loading documents…',
    loadError: 'Unable to load documents right now.',
    retry: 'Retry',
    signedOut: 'Sign in again to view your documents.',
    unconfigured: 'Connect Supabase to view documents.',
    filterTitle: 'Filter',
    documentType: 'Document type',
    titleField: 'Title',
    documentNumber: 'Document number',
    issueDate: 'Issue date',
    expiryDate: 'Expiry date',
    provider: 'Provider',
    notes: 'Notes',
    filePath: 'Attachment',
    titlePlaceholder: 'e.g. Car Insurance',
    documentNumberPlaceholder: 'Policy, registration, or certificate number',
    providerPlaceholder: 'Insurance company, dealer, or provider',
    notesPlaceholder: 'Extra notes or reminders',
    filePathPlaceholder: 'Optional storage path or URL',
    save: 'Save document',
    saveChanges: 'Save changes',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteConfirm: 'Delete this document?',
    deleteBody: 'This file and record will be removed from this vehicle.',
    confirmDelete: 'Delete document',
    edit: 'Edit',
    view: 'View',
    validStatus: 'VALID',
    expiringSoonStatus: 'EXPIRING SOON',
    expiredStatus: 'EXPIRED',
    noExpiryStatus: 'NO EXPIRY',
    typeRequired: 'Choose a document type.',
    titleRequired: 'Enter a title.',
    expiryBeforeIssue: 'Expiration date cannot be before the issue date.',
    saveError: 'Unable to save this document. Please try again.',
    deleteError: 'Unable to delete this document. Please try again.',
    attachment: 'Attachment',
    issue: 'Issue date',
    expiry: 'Expiry date',
    noIssueDate: 'Issue date not recorded',
    noExpiryDate: 'Expiry date not recorded',
    noProvider: 'Provider not recorded',
    noDocumentNumber: 'Document number not recorded',
    close: 'Close',
    fileAttached: 'Attachment exists',
    saved: 'Document saved.',
    deleted: 'Document deleted.',
    noRecordsFiltered: 'No documents match this view.',
    noUpcomingDetail: 'No upcoming expiry dates on file.',
    noExpiry: 'No expiry date',
    daysSuffix: 'days',
    daySuffix: 'day',
    expiredShort: 'Expired',
    today: 'today',
    remaining: 'Remaining',
    allTypes: 'All document types',
    vehicleRegistration: 'Vehicle Registration',
    insurance: 'Insurance',
    inspection: 'Inspection',
    drivingLicense: 'Driving License',
    warranty: 'Warranty',
    serviceContract: 'Service Contract',
    roadAssistance: 'Road Assistance',
    other: 'Other',
  },
  ar: {
    back: 'رجوع',
    title: 'المستندات',
    summary: 'ملخص المستندات',
    totalDocuments: 'إجمالي المستندات',
    valid: 'صالح',
    expiringSoon: 'ينتهي قريبًا',
    expired: 'منتهي',
    nextExpiry: 'أقرب انتهاء',
    noUpcomingExpiry: 'لا يوجد انتهاء قادم',
    add: 'إضافة مستند',
    addFirst: 'أضف أول مستند',
    emptyTitle: 'لا توجد مستندات بعد',
    emptyBody: 'احتفظ بسجلات التراخيص والتأمين والصيانة في مكان واحد.',
    all: 'الكل',
    loading: 'جارٍ تحميل المستندات…',
    loadError: 'تعذّر تحميل المستندات الآن.',
    retry: 'إعادة المحاولة',
    signedOut: 'سجّل الدخول مجددًا لعرض مستنداتك.',
    unconfigured: 'اربط Supabase لعرض المستندات.',
    filterTitle: 'الفلاتر',
    documentType: 'نوع المستند',
    titleField: 'العنوان',
    documentNumber: 'رقم المستند',
    issueDate: 'تاريخ الإصدار',
    expiryDate: 'تاريخ الانتهاء',
    provider: 'المزود',
    notes: 'ملاحظات',
    filePath: 'المرفق',
    titlePlaceholder: 'مثل: تأمين السيارة',
    documentNumberPlaceholder: 'رقم السياسة أو التسجيل أو الشهادة',
    providerPlaceholder: 'شركة التأمين أو الوكيل أو المزود',
    notesPlaceholder: 'ملاحظات إضافية أو تذكيرات',
    filePathPlaceholder: 'مسار أو رابط اختياري',
    save: 'حفظ المستند',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    delete: 'حذف',
    deleteConfirm: 'حذف هذا المستند؟',
    deleteBody: 'سيتم حذف هذا المستند والسجل من هذه المركبة.',
    confirmDelete: 'حذف المستند',
    edit: 'تعديل',
    view: 'عرض',
    validStatus: 'صالح',
    expiringSoonStatus: 'ينتهي قريبًا',
    expiredStatus: 'منتهي',
    noExpiryStatus: 'لا يوجد تاريخ انتهاء',
    typeRequired: 'اختر نوع المستند.',
    titleRequired: 'أدخل عنوانًا.',
    expiryBeforeIssue: 'لا يمكن أن يكون تاريخ الانتهاء قبل تاريخ الإصدار.',
    saveError: 'تعذّر حفظ المستند. حاول مرة أخرى.',
    deleteError: 'تعذّر حذف المستند. حاول مرة أخرى.',
    attachment: 'المرفق',
    issue: 'تاريخ الإصدار',
    expiry: 'تاريخ الانتهاء',
    noIssueDate: 'لم يتم تسجيل تاريخ الإصدار',
    noExpiryDate: 'لم يتم تسجيل تاريخ الانتهاء',
    noProvider: 'لم يتم تسجيل المزود',
    noDocumentNumber: 'لم يتم تسجيل رقم المستند',
    close: 'إغلاق',
    fileAttached: 'يوجد مرفق',
    saved: 'تم حفظ المستند.',
    deleted: 'تم حذف المستند.',
    noRecordsFiltered: 'لا توجد مستندات في هذا العرض.',
    noUpcomingDetail: 'لا توجد تواريخ انتهاء قادمة.',
    noExpiry: 'لا يوجد تاريخ انتهاء',
    daysSuffix: 'أيام',
    daySuffix: 'يوم',
    expiredShort: 'منتهي',
    today: 'اليوم',
    remaining: 'المتبقي',
    allTypes: 'كل أنواع المستندات',
    vehicleRegistration: 'تسجيل المركبة',
    insurance: 'التأمين',
    inspection: 'الفحص',
    drivingLicense: 'رخصة القيادة',
    warranty: 'الضمان',
    serviceContract: 'عقد الخدمة',
    roadAssistance: 'مساعدة الطريق',
    other: 'أخرى',
  },
} as const;

const palette = {
  dark: {
    background: '#05070A',
    panel: '#0B1016',
    surface: 'rgba(255,255,255,0.045)',
    surfaceStrong: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.11)',
    foreground: '#E9F1F4',
    muted: '#8A98A2',
    accent: '#2EF2E2',
    accentInk: '#021614',
    error: '#FF4B6E',
    success: '#55D39E',
    warning: '#F3C969',
    grid: 'rgba(255,255,255,0.035)',
  },
  light: {
    background: '#E6EBEE',
    panel: '#F4F7F9',
    surface: 'rgba(255,255,255,0.82)',
    surfaceStrong: 'rgba(8,20,28,0.06)',
    border: 'rgba(8,20,28,0.12)',
    foreground: '#0A1218',
    muted: '#4F5D66',
    accent: '#00C2B3',
    accentInk: '#00201D',
    error: '#D9143A',
    success: '#1D9E64',
    warning: '#B77900',
    grid: 'rgba(8,20,28,0.05)',
  },
} satisfies Record<ThemeName, Record<string, string>>;

function getDocumentTypeLabel(type: DocumentType, language: 'en' | 'ar') {
  const labels = {
    en: {
      vehicle_registration: 'Vehicle Registration',
      insurance: 'Insurance',
      inspection: 'Inspection',
      driving_license: 'Driving License',
      warranty: 'Warranty',
      service_contract: 'Service Contract',
      road_assistance: 'Road Assistance',
      other: 'Other',
    },
    ar: {
      vehicle_registration: 'تسجيل المركبة',
      insurance: 'التأمين',
      inspection: 'الفحص',
      driving_license: 'رخصة القيادة',
      warranty: 'الضمان',
      service_contract: 'عقد الخدمة',
      road_assistance: 'مساعدة الطريق',
      other: 'أخرى',
    },
  } as const;

  return labels[language][type];
}

function getDocumentStatus(expiryDate: string | null): DocumentStatus {
  if (!expiryDate) return 'NO_EXPIRY';

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const expiryUtc = new Date(`${expiryDate}T00:00:00Z`);

  if (expiryUtc.getTime() < todayUtc.getTime()) return 'EXPIRED';
  if (expiryUtc.getTime() <= todayUtc.getTime() + 30 * oneDayMs) return 'EXPIRING_SOON';
  return 'VALID';
}

function getRemainingDaysLabel(expiryDate: string | null): string {
  if (!expiryDate) return 'No expiry';

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const expiryUtc = new Date(`${expiryDate}T00:00:00Z`);
  const diffMs = expiryUtc.getTime() - todayUtc.getTime();
  const remainingDays = Math.ceil(diffMs / oneDayMs);

  if (remainingDays < 0) return 'Expired';
  if (remainingDays === 0) return '0 days';
  return `${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
}

function formatShortDate(value: string | null, language: 'en' | 'ar') {
  if (!value) return language === 'ar' ? '—' : '—';
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function createEmptyDraft(): DocumentDraft {
  return {
    documentType: 'vehicle_registration',
    title: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    provider: '',
    notes: '',
    filePath: '',
  };
}

export default function DocumentsScreen({ vehicleId, colorScheme, onBack }: Props) {
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const language: 'en' | 'ar' = isArabic ? 'ar' : 'en';
  const text = copy[language];
  const [status, setStatus] = useState<ScreenStatus>(supabase ? 'loading' : 'unconfigured');
  const [errorMessage, setErrorMessage] = useState('');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<DocumentType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [draft, setDraft] = useState<DocumentDraft>(createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setStatus('signedOut');
        return;
      }

      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('user_id', userData.user.id)
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data ?? []);
      setStatus('ready');
    } catch (error) {
      console.error('[Car Care] Unable to load documents', error);
      setStatus('error');
      setErrorMessage(text.loadError);
    }
  }, [text.loadError, vehicleId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const summary = useMemo(() => {
    const valid = documents.filter((document) => getDocumentStatus(document.expiry_date) === 'VALID').length;
    const expiringSoon = documents.filter((document) => getDocumentStatus(document.expiry_date) === 'EXPIRING_SOON').length;
    const expired = documents.filter((document) => getDocumentStatus(document.expiry_date) === 'EXPIRED').length;

    return {
      total: documents.length,
      valid,
      expiringSoon,
      expired,
    };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const statusForDocument = getDocumentStatus(document.expiry_date);
      const matchesFilter = filter === 'all' || statusForDocument === filter;
      const matchesType = documentTypeFilter === 'all' || document.document_type === documentTypeFilter;
      return matchesFilter && matchesType;
    });
  }, [documentTypeFilter, documents, filter]);

  const nextExpiry = useMemo(() => {
    const upcoming = documents
      .filter((document) => document.expiry_date && getDocumentStatus(document.expiry_date) !== 'EXPIRED')
      .sort((left, right) => {
        const leftDate = new Date(`${left.expiry_date}T00:00:00Z`).getTime();
        const rightDate = new Date(`${right.expiry_date}T00:00:00Z`).getTime();
        return leftDate - rightDate;
      })[0];

    return upcoming ?? null;
  }, [documents]);

  const typeOptions = useMemo(
    () => [{ value: 'all' as const, label: text.all }, ...documentTypes.map((type) => ({ value: type, label: getDocumentTypeLabel(type, language) }))],
    [language, text.all],
  );

  const validateDraft = (nextDraft: DocumentDraft) => {
    if (!nextDraft.documentType) return text.typeRequired;
    if (!nextDraft.title.trim()) return text.titleRequired;
    if (nextDraft.issueDate && nextDraft.expiryDate) {
      const issue = new Date(`${nextDraft.issueDate}T00:00:00Z`); 
      const expiry = new Date(`${nextDraft.expiryDate}T00:00:00Z`);
      if (expiry.getTime() < issue.getTime()) return text.expiryBeforeIssue;
    }
    return '';
  };

  const openEditor = (value: DocumentRecord | null = null) => {
    if (value) {
      setEditingId(value.id);
      setDraft({
        documentType: value.document_type,
        title: value.title,
        documentNumber: value.document_number ?? '',
        issueDate: value.issue_date ?? '',
        expiryDate: value.expiry_date ?? '',
        provider: value.provider ?? '',
        notes: value.notes ?? '',
        filePath: value.file_path ?? '',
      });
    } else {
      setEditingId(null);
      setDraft(createEmptyDraft());
    }
    setShowForm(true);
  };

  const handleSaveDocument = useCallback(async () => {
    if (!supabase) return;

    const trimmedDraft = {
      ...draft,
      title: draft.title.trim(),
      documentNumber: draft.documentNumber.trim(),
      provider: draft.provider.trim(),
      notes: draft.notes.trim(),
      filePath: draft.filePath.trim(),
      issueDate: draft.issueDate.trim(),
      expiryDate: draft.expiryDate.trim(),
    };

    const validation = validateDraft(trimmedDraft);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setStatus('signedOut');
        return;
      }

      const insertPayload = {
        vehicle_id: vehicleId,
        user_id: userData.user.id,
        document_type: trimmedDraft.documentType,
        title: trimmedDraft.title,
        document_number: trimmedDraft.documentNumber || null,
        issue_date: trimmedDraft.issueDate || null,
        expiry_date: trimmedDraft.expiryDate || null,
        provider: trimmedDraft.provider || null,
        notes: trimmedDraft.notes || null,
        file_path: trimmedDraft.filePath || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('vehicle_documents')
          .update({
            document_type: trimmedDraft.documentType,
            title: trimmedDraft.title,
            document_number: trimmedDraft.documentNumber || null,
            issue_date: trimmedDraft.issueDate || null,
            expiry_date: trimmedDraft.expiryDate || null,
            provider: trimmedDraft.provider || null,
            notes: trimmedDraft.notes || null,
            file_path: trimmedDraft.filePath || null,
          })
          .eq('id', editingId)
          .eq('vehicle_id', vehicleId)
          .eq('user_id', userData.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_documents').insert(insertPayload);
        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      setDraft(createEmptyDraft());
      await loadDocuments();
    } catch (error) {
      console.error('[Car Care] Unable to save document', error);
      setErrorMessage(text.saveError);
    } finally {
      setSaving(false);
    }
  }, [draft, editingId, loadDocuments, text.saveError, vehicleId]);

  const handleDeleteDocument = useCallback(async () => {
    if (!supabase || !deleteTargetId) return;

    setErrorMessage('');

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setStatus('signedOut');
        return;
      }

      const { error } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', deleteTargetId)
        .eq('vehicle_id', vehicleId)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      await loadDocuments();
    } catch (error) {
      console.error('[Car Care] Unable to delete document', error);
      setErrorMessage(text.deleteError);
    }
  }, [deleteTargetId, loadDocuments, text.deleteError, vehicleId]);

  const renderSummaryCard = (label: string, value: string, tone: 'accent' | 'info' | 'warning' | 'danger' = 'info') => {
    const toneColors = {
      accent: colors.accent,
      warning: colors.warning,
      danger: colors.error,
      info: colors.accent,
    };
    const toneColor = toneColors[tone];

    return (
      <View
        key={label}
        style={[
          styles.summaryCard,
          {
            backgroundColor: tone === 'info' ? colors.surface : `${toneColor}14`,
            borderColor: `${toneColor}44`,
          },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  };

  const renderStatusBadge = (statusValue: DocumentStatus) => {
    const badgeColors = {
      VALID: { background: 'rgba(85, 211, 158, 0.15)', color: colors.success },
      EXPIRING_SOON: { background: 'rgba(243, 201, 105, 0.15)', color: colors.warning },
      EXPIRED: { background: 'rgba(255, 75, 110, 0.14)', color: colors.error },
      NO_EXPIRY: { background: colors.surfaceStrong, color: colors.muted },
    };
    const tone = badgeColors[statusValue];
    const label = {
      VALID: text.validStatus,
      EXPIRING_SOON: text.expiringSoonStatus,
      EXPIRED: text.expiredStatus,
      NO_EXPIRY: text.noExpiryStatus,
    }[statusValue];

    return (
      <View style={[styles.badge, { backgroundColor: tone.background }]}>
        <Text style={[styles.badgeText, { color: tone.color }]}>{label}</Text>
      </View>
    );
  };

  const renderDocumentCard = (document: DocumentRecord) => {
    const statusValue = getDocumentStatus(document.expiry_date);
    const isAttachment = !!document.file_path;

    return (
      <View
        key={document.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardType, { color: colors.muted }]}>{getDocumentTypeLabel(document.document_type, language)}</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{document.title}</Text>
          </View>
          <View style={styles.cardHeaderActions}>
            {renderStatusBadge(statusValue)}
          </View>
        </View>

        <View style={styles.cardMetaBlock}>
          {!!document.provider && <Text style={[styles.cardMeta, { color: colors.muted }]}>{document.provider}</Text>}
          {!!document.document_number && <Text style={[styles.cardMeta, { color: colors.muted }]}>{document.document_number}</Text>}
          {!!document.issue_date && <Text style={[styles.cardMeta, { color: colors.muted }]}>{`${text.issue}: ${formatShortDate(document.issue_date, language)}`}</Text>}
          {!!document.expiry_date && <Text style={[styles.cardMeta, { color: colors.muted }]}>{`${text.expiry}: ${formatShortDate(document.expiry_date, language)} • ${getRemainingDaysLabel(document.expiry_date)}`}</Text>}
          {!document.expiry_date && <Text style={[styles.cardMeta, { color: colors.muted }]}>{text.noExpiryDate}</Text>}
          {isAttachment && <Text style={[styles.cardMeta, styles.attachmentMeta, { color: colors.accent }]}>{`▤  ${text.fileAttached}`}</Text>}
        </View>

        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" onPress={() => { setSelectedDocument(document); setShowDetail(true); }} style={[styles.smallButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.smallButtonText, { color: colors.accentInk }]}>{text.view}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => openEditor(document)} style={[styles.smallButtonSecondary, { borderColor: colors.border }]}>
            <Text style={[styles.smallButtonTextSecondary, { color: colors.foreground }]}>{text.edit}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setDeleteTargetId(document.id); setShowDeleteConfirm(true); }} style={styles.smallButtonDanger}>
            <Text style={[styles.smallButtonTextDanger, { color: colors.error }]}>{text.delete}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <CockpitBackdrop colors={colors} />
        <View style={styles.stateScreen}>
          <Pressable accessibilityRole="button" onPress={onBack} style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.backText, { color: colors.foreground }, isArabic && styles.flipText]}>‹</Text>
          </Pressable>
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>{text.loading}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <CockpitBackdrop colors={colors} />
      <View style={[styles.headerRow, isArabic && styles.rowReverse]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.backText, { color: colors.foreground }, isArabic && styles.flipText]}>‹</Text>
        </Pressable>
        <View style={styles.headingBlock}>
          <Text style={[styles.headerEyebrow, { color: colors.muted }]}>{text.summary}</Text>
          <Text style={[styles.screenTitle, { color: colors.foreground, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{text.title}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => openEditor()} style={[styles.primaryAction, { backgroundColor: colors.accent }]}>
          <Text style={[styles.primaryActionText, { color: colors.accentInk }]}>{text.add}</Text>
        </Pressable>
      </View>

      {status === 'error' && (
        <View style={[styles.warnBox, { backgroundColor: colors.surfaceStrong }]}> 
          <Text style={[styles.warnText, { color: colors.foreground }]}>{errorMessage || text.loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadDocuments()} style={styles.retryButton}> 
            <Text style={[styles.retryText, { color: colors.accent }]}>{text.retry}</Text>
          </Pressable>
        </View>
      )}

      {status === 'signedOut' && (
        <View style={[styles.warnBox, { backgroundColor: colors.surfaceStrong }]}> 
          <Text style={[styles.warnText, { color: colors.foreground }]}>{text.signedOut}</Text>
        </View>
      )}

      {status === 'unconfigured' && (
        <View style={[styles.warnBox, { backgroundColor: colors.surfaceStrong }]}> 
          <Text style={[styles.warnText, { color: colors.foreground }]}>{text.unconfigured}</Text>
        </View>
      )}

      {status === 'ready' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryGrid}>
            {renderSummaryCard(text.totalDocuments, String(summary.total), 'accent')}
            {renderSummaryCard(text.valid, String(summary.valid), 'info')}
            {renderSummaryCard(text.expiringSoon, String(summary.expiringSoon), 'warning')}
            {renderSummaryCard(text.expired, String(summary.expired), 'danger')}
          </View>

          <View style={[styles.nextExpiryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{text.nextExpiry}</Text>
            {nextExpiry ? (
              <>
                <Text style={[styles.nextExpiryTitle, { color: colors.foreground }]}>{nextExpiry.title}</Text>
                <Text style={[styles.nextExpiryMeta, { color: colors.muted }]}>{getDocumentTypeLabel(nextExpiry.document_type, language)} • {formatShortDate(nextExpiry.expiry_date, language)}</Text>
                <Text style={[styles.nextExpiryMeta, { color: colors.accent }]}>{getRemainingDaysLabel(nextExpiry.expiry_date)}</Text>
              </>
            ) : (
              <Text style={[styles.nextExpiryMeta, { color: colors.muted }]}>{text.noUpcomingExpiry}</Text>
            )}
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{text.filterTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {filterOptions.map((option) => (
                <Pressable key={option} accessibilityRole="button" onPress={() => setFilter(option)} style={[styles.filterButton, filter === option && { backgroundColor: colors.accent }, { borderColor: colors.border }]}>
                  <Text style={[styles.filterText, { color: filter === option ? colors.accentInk : colors.foreground }]}>{option === 'all' ? text.all : option === 'VALID' ? text.validStatus : option === 'EXPIRING_SOON' ? text.expiringSoonStatus : option === 'EXPIRED' ? text.expiredStatus : text.noExpiryStatus}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {typeOptions.map((option) => (
                <Pressable key={option.value === 'all' ? 'all-types' : option.value} accessibilityRole="button" onPress={() => setDocumentTypeFilter(option.value)} style={[styles.filterButton, documentTypeFilter === option.value && { backgroundColor: colors.accent }, { borderColor: colors.border }]}>
                  <Text style={[styles.filterText, { color: documentTypeFilter === option.value ? colors.accentInk : colors.foreground }]}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {filteredDocuments.length > 0 ? (
            <View style={styles.listSection}>
              {filteredDocuments.map(renderDocumentCard)}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.emptyStateIcon}>▣</Text>
              <Text style={[styles.emptyStateTitle, { color: colors.foreground }]}>{text.emptyTitle}</Text>
              <Text style={[styles.emptyStateBody, { color: colors.muted }]}>{text.noRecordsFiltered}</Text>
              <Pressable accessibilityRole="button" onPress={() => openEditor()} style={[styles.primaryActionLarge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.primaryActionText, { color: colors.accentInk }]}>{text.addFirst}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      <Modal transparent animationType="slide" visible={showForm} onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalRoot, { paddingBottom: Math.max(8, insets.bottom + 8) }]}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingId ? text.edit : text.add}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.documentType}</Text>
                <View style={[styles.input, { borderColor: colors.border }]}> 
                  <TextInput
                    value={getDocumentTypeLabel(draft.documentType, language)}
                    editable={false}
                    style={[styles.readOnlyInput, { color: colors.foreground }]}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlinePickerRow}>
                  {documentTypes.map((type) => (
                    <Pressable
                      key={type}
                      accessibilityRole="button"
                      onPress={() => setDraft((current) => ({ ...current, documentType: type }))}
                      style={[styles.typeChip, draft.documentType === type && { backgroundColor: colors.accent }, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.typeChipText, draft.documentType === type && { color: colors.accentInk }]}>{getDocumentTypeLabel(type, language)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.titleField}</Text>
                <TextInput
                  value={draft.title}
                  onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
                  placeholder={text.titlePlaceholder}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.documentNumber}</Text>
                <TextInput
                  value={draft.documentNumber}
                  onChangeText={(value) => setDraft((current) => ({ ...current, documentNumber: value }))}
                  placeholder={text.documentNumberPlaceholder}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.issueDate}</Text>
                  <TextInput
                    value={draft.issueDate}
                    onChangeText={(value) => setDraft((current) => ({ ...current, issueDate: value }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.expiryDate}</Text>
                  <TextInput
                    value={draft.expiryDate}
                    onChangeText={(value) => setDraft((current) => ({ ...current, expiryDate: value }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.provider}</Text>
                <TextInput
                  value={draft.provider}
                  onChangeText={(value) => setDraft((current) => ({ ...current, provider: value }))}
                  placeholder={text.providerPlaceholder}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.notes}</Text>
                <TextInput
                  value={draft.notes}
                  onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))}
                  placeholder={text.notesPlaceholder}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[styles.textArea, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{text.filePath}</Text>
                <TextInput
                  value={draft.filePath}
                  onChangeText={(value) => setDraft((current) => ({ ...current, filePath: value }))}
                  placeholder={text.filePathPlaceholder}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              {!!errorMessage && (
                <View style={styles.inlineMessage}> 
                  <Text style={[styles.inlineMessageText, { color: colors.error }]}>{errorMessage}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setShowForm(false)} style={[styles.secondaryButton, { borderColor: colors.border }]}>
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{text.cancel}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void handleSaveDocument()} style={[styles.primaryButton, { backgroundColor: colors.accent }, saving && { opacity: 0.7 }]}>
                <Text style={[styles.primaryButtonText, { color: colors.accentInk }]}>{saving ? 'Saving…' : editingId ? text.saveChanges : text.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent animationType="slide" visible={showDetail} onRequestClose={() => setShowDetail(false)}>
        <View style={[styles.modalRoot, { paddingBottom: Math.max(8, insets.bottom + 8) }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            {selectedDocument && (
              <>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedDocument.title}</Text>
                <View style={styles.detailList}>
                  <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.documentType}: ${getDocumentTypeLabel(selectedDocument.document_type, language)}`}</Text>
                  <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.provider}: ${selectedDocument.provider || text.noProvider}`}</Text>
                  <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.documentNumber}: ${selectedDocument.document_number || text.noDocumentNumber}`}</Text>
                  <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.issueDate}: ${selectedDocument.issue_date ? formatShortDate(selectedDocument.issue_date, language) : text.noIssueDate}`}</Text>
                  <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.expiryDate}: ${selectedDocument.expiry_date ? formatShortDate(selectedDocument.expiry_date, language) : text.noExpiryDate}`}</Text>
                  <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.attachment}: ${selectedDocument.file_path || text.noExpiry}`}</Text>
                  {!!selectedDocument.notes && <Text style={[styles.detailRow, { color: colors.foreground }]}>{`${text.notes}: ${selectedDocument.notes}`}</Text>}
                </View>
                <Pressable accessibilityRole="button" onPress={() => setShowDetail(false)} style={[styles.primaryButton, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.primaryButtonText, { color: colors.accentInk }]}>{text.close}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={showDeleteConfirm} onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={[styles.modalRoot, { paddingBottom: Math.max(8, insets.bottom + 8) }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{text.deleteConfirm}</Text>
            <Text style={[styles.modalBody, { color: colors.muted }]}>{text.deleteBody}</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setShowDeleteConfirm(false)} style={[styles.secondaryButton, { borderColor: colors.border }]}>
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{text.cancel}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void handleDeleteDocument()} style={[styles.primaryButtonDanger, { backgroundColor: `${colors.error}18` }]}>
                <Text style={[styles.primaryButtonText, { color: colors.error }]}>{text.confirmDelete}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, overflow: 'hidden' },
  rowReverse: { flexDirection: 'row-reverse' },
  stateScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  stateCard: { borderRadius: 20, borderWidth: 1, padding: 22, width: '100%', maxWidth: 420, alignItems: 'center', gap: 12 },
  stateTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  headerRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  headingBlock: { flex: 1, minWidth: 0, alignItems: 'center' },
  headerEyebrow: { fontFamily: 'monospace', fontSize: 8, fontWeight: '600', letterSpacing: 1.4 },
  screenTitle: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 27, lineHeight: 30, marginTop: -3 },
  primaryAction: { minHeight: 40, borderRadius: 13, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  primaryActionLarge: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 16 },
  primaryActionText: { fontSize: 11, fontWeight: '700' },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 24 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 14 },
  summaryCard: { flexBasis: '48.5%', borderRadius: 17, borderWidth: 1, padding: 13, minHeight: 78 },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginBottom: 8 },
  summaryValue: { fontFamily: 'monospace', fontSize: 24, fontWeight: '500', fontVariant: ['tabular-nums'] },
  nextExpiryCard: { borderRadius: 20, borderWidth: 1, padding: 15, marginBottom: 16 },
  sectionLabel: { fontFamily: 'monospace', textTransform: 'uppercase', fontSize: 9, letterSpacing: 1.5, fontWeight: '600', marginBottom: 8 },
  nextExpiryTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700', marginBottom: 4 },
  nextExpiryMeta: { fontSize: 11, lineHeight: 16 },
  filterSection: { marginBottom: 14 },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  listSection: { marginTop: 6 },
  filterButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  filterText: { fontSize: 10, fontWeight: '600' },
  card: { borderRadius: 19, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderText: { flex: 1, paddingRight: 8 },
  cardType: { fontFamily: 'monospace', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 5 },
  cardTitle: { fontSize: 15, lineHeight: 19, fontWeight: '700' },
  cardHeaderActions: { alignItems: 'flex-end' },
  cardMetaBlock: { gap: 4 },
  cardMeta: { fontSize: 11, lineHeight: 16 },
  attachmentMeta: { fontWeight: '600', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: { flex: 1, minHeight: 38, borderRadius: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  smallButtonSecondary: { flex: 1, minHeight: 38, borderRadius: 12, borderWidth: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  smallButtonDanger: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: 'rgba(255, 75, 110, 0.12)', paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { fontSize: 10, fontWeight: '700' },
  smallButtonTextSecondary: { fontSize: 10, fontWeight: '600' },
  smallButtonTextDanger: { color: '#FF4B6E', fontSize: 10, fontWeight: '700' },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  emptyState: { borderWidth: 1, borderRadius: 21, padding: 22, alignItems: 'center' },
  emptyStateIcon: { fontSize: 30, marginBottom: 10 },
  emptyStateTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  emptyStateBody: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: 8 },
  warnBox: { marginHorizontal: 18, marginTop: 10, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  warnText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  retryButton: { marginTop: 8 },
  retryText: { fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8 },
  modalSheet: { width: '100%', maxWidth: 500, borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, padding: 16, maxHeight: '94%' },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  formSection: { marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  formHalf: { flex: 1 },
  fieldLabel: { fontFamily: 'monospace', fontSize: 8, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 },
  readOnlyInput: { fontSize: 12 },
  textArea: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, minHeight: 84, textAlignVertical: 'top' },
  inlinePickerRow: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  typeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  typeChipText: { fontSize: 10, fontWeight: '600' },
  inlineMessage: { marginTop: 4 },
  inlineMessageText: { fontSize: 13, fontWeight: '600' },
  modalBody: { fontSize: 15, lineHeight: 22 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontWeight: '700' },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 13, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  primaryButtonDanger: { flex: 1, minHeight: 44, borderRadius: 13, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 11, fontWeight: '700' },
  detailList: { gap: 8, marginBottom: 18 },
  detailRow: { fontSize: 14 },
  flipText: { transform: [{ scaleX: -1 }] },
});
