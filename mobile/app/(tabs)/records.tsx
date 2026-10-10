import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  Upload,
  FileText,
  ChevronRight,
  Pill,
  FlaskConical,
  ClipboardList,
  Search,
  Trash2,
  Lock,
  Pencil,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { EmptyState, NoSearchResultState, ListSkeleton } from '@/components/states';
import DocumentEditSheet, { DOCUMENT_CATEGORY_LABELS, DocumentFormValues } from '@/components/DocumentEditSheet';
import {
  records,
  labs,
  documents,
  analytics,
  ApiError,
  ClinicalRecord,
  PrescriptionItem,
  LabOrder,
  VaultDocument,
  DocumentCategory,
} from '@/lib/api';

type TabType = 'documents' | 'prescriptions' | 'results' | 'visits';

const CATEGORY_LABELS = DOCUMENT_CATEGORY_LABELS;

// Matches DOCUMENT_MIME_TYPES on the backend — anything else is rejected
// server-side anyway, so keep the picker in sync rather than letting a
// user pick a file that will 400 on upload.
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'text/csv',
];

const TABS: { id: TabType; label: string }[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'results', label: 'Results' },
  { id: 'visits', label: 'Visit Notes' },
];

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecordsHubScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  // A picked file waits here while the title/category prompt is open.
  const [pendingFile, setPendingFile] = useState<{ name: string; uri: string; size?: number; mimeType: string } | null>(null);
  const [editingDoc, setEditingDoc] = useState<VaultDocument | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // ── Data queries ──────────────────────────────────────────────────────────

  // Same underlying ClinicalRecord rows records.list('document') reads, but
  // through the richer endpoint built for the Vault — category, tags,
  // search/sort, and the presigned-upload flow below, none of which
  // records.list() exposes.
  const { data: docsData, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', searchQuery, categoryFilter],
    queryFn: () => documents.list({ q: searchQuery || undefined, category: categoryFilter, sort: 'createdAt', order: 'desc' }),
    enabled: activeTab === 'documents',
  });

  const { data: storageRes } = useQuery({
    queryKey: ['storage-usage'],
    queryFn: () => records.getStorageUsage(),
    enabled: activeTab === 'documents',
  });
  const storage = storageRes?.data;
  const storagePct = storage?.quotaBytes ? Math.min(100, (storage.usedBytes / storage.quotaBytes) * 100) : 0;
  const atFileLimit = storage?.maxFiles != null && storage.fileCount >= storage.maxFiles;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documents.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['storage-usage'] });
    },
    onError: (err: unknown) => Alert.alert('Could not delete', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const updateMutation = useMutation({
    mutationFn: (v: DocumentFormValues & { id: string }) =>
      documents.update(v.id, {
        title: v.title,
        category: v.category,
        description: v.description,
        providerVisibility: v.providerVisibility,
      }),
    onSuccess: () => {
      setEditingDoc(null);
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: unknown) => Alert.alert('Could not save changes', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const handleDeleteDoc = (doc: VaultDocument) => {
    Alert.alert('Delete Document', `"${doc.title}" will be permanently removed. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(doc.id) },
    ]);
  };

  const handleUpload = async () => {
    if (storagePct >= 100 || atFileLimit) {
      Alert.alert('Storage limit reached', "You've reached your plan's storage or file limit. Upgrade to add more documents.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_MIME_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    const mimeType = file.mimeType ?? 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      Alert.alert('Unsupported file type', 'Please choose a PDF, Word doc, image, or text file.');
      return;
    }

    // Ask for a title and category before anything is uploaded.
    setPendingFile({ name: file.name, uri: file.uri, size: file.size, mimeType });
  };

  const uploadPicked = async (values: DocumentFormValues) => {
    if (!pendingFile) return;
    const file = pendingFile;
    const mimeType = file.mimeType;
    setIsUploading(true);
    try {
      // Some pickers report no size; measure the file itself rather than sending 0 (the API rejects it).
      const fileBlob = await (await fetch(file.uri)).blob();
      const sizeBytes = file.size ?? fileBlob.size;
      if (!sizeBytes) {
        setPendingFile(null);
        Alert.alert('File appears empty', 'Please choose a different file.');
        return;
      }
      const ticketRes = await documents.getUploadUrl({ fileName: file.name, contentType: mimeType, sizeBytes });
      const ticket = ticketRes.data;

      const putRes = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: fileBlob,
      });
      if (!putRes.ok) throw new Error('Upload to storage failed');

      await documents.create({
        objectKey: ticket.objectKey,
        fileName: file.name,
        title: values.title,
        category: values.category,
      });
      analytics.track('upload_success', { category: values.category });
      setPendingFile(null);

      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['storage-usage'] });
    } catch (err) {
      analytics.track('upload_failure', { category: values.category });
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const { data: prescriptionsData, isLoading: loadingPrescriptions } = useQuery({
    queryKey: ['records', 'prescriptions'],
    queryFn: () => records.prescriptions(),
    enabled: activeTab === 'prescriptions',
  });

  const { data: labOrdersData, isLoading: loadingLabs } = useQuery({
    queryKey: ['labs', 'orders'],
    queryFn: () => labs.listOrders(),
    enabled: activeTab === 'results',
  });

  const { data: visitNotesData, isLoading: loadingVisits } = useQuery({
    queryKey: ['records', 'visits'],
    // 'visit_note' isn't a real RecordType (visit | prescription | lab |
    // imaging | document | referral | expert_review | visit_summary) —
    // Postgres rejects it outright, so this tab 500'd every time it opened.
    // visit_summary is the After-Visit Summary record this tab's UI (notes,
    // provider, date) is actually built to show.
    queryFn: () => records.list('visit_summary'),
    enabled: activeTab === 'visits',
  });

  const refillMutation = useMutation({
    mutationFn: (rx: { id: string; name: string }) => records.requestRefill(rx.id),
    onSuccess: (res, rx) => {
      Alert.alert(
        res.alreadyRequested ? 'Already requested' : 'Refill requested',
        res.alreadyRequested
          ? `Your care team already has a refill request for ${rx.name}.`
          : `Your care team will review the refill for ${rx.name} and get back to you.`,
      );
    },
    onError: (_err, rx) => {
      // Never claim a request was sent when it was not; offer the consultation route instead.
      Alert.alert('Could not send the request', `${rx.name} can also be renewed during a consultation.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Book a consultation', onPress: () => router.push('/book-appointment-step1') },
      ]);
    },
  });
  const handleRequestRefill = (rx: { id: string; name: string }) => refillMutation.mutate(rx);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Records</Text>
        <TopHeaderEmergency />
      </View>

      {/* Sub-navigation tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
                style={[
                  styles.tabItem,
                  isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                ]}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? theme.primary : theme.textMuted },
                    isActive && styles.tabLabelActive,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* DOCUMENTS TAB — the actual Vault: search, category filter,
            storage quota, upload, delete. Same underlying records as the
            portal's MyVault, via the same /documents endpoints. */}
        {activeTab === 'documents' && (
          <View>
            {storage?.quotaBytes != null && (
              <View style={[styles.storageBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.storageRow}>
                  <Text style={[styles.storageLabel, { color: theme.textMuted }]}>Storage Used</Text>
                  <Text style={[styles.storageValue, { color: theme.text }]}>
                    {formatBytes(storage.usedBytes)} of {formatBytes(storage.quotaBytes)}
                    {storage.maxFiles != null ? ` · ${storage.fileCount}/${storage.maxFiles} files` : ''}
                  </Text>
                </View>
                <View style={[styles.storageBarTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.storageBarFill, { width: `${storagePct}%`, backgroundColor: storagePct >= 90 ? theme.status.error.solid : theme.primary }]} />
                </View>
                {(storagePct >= 100 || atFileLimit) && (
                  <Text style={[styles.storageLimitText, { color: theme.status.error.solid }]}>
                    You've reached your plan's limit —{' '}
                    <Text style={{ fontWeight: '800' }} onPress={() => router.push('/subscription')}>upgrade to add more</Text>.
                  </Text>
                )}
              </View>
            )}

            <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Search size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search documents…"
                placeholderTextColor={theme.textFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              <TouchableOpacity
                onPress={() => setCategoryFilter(undefined)}
                style={[styles.categoryChip, { backgroundColor: !categoryFilter ? theme.primary : theme.surface, borderColor: !categoryFilter ? theme.primary : theme.border }]}>
                <Text style={[styles.categoryChipText, { color: !categoryFilter ? '#FFFFFF' : theme.textMuted }]}>All</Text>
              </TouchableOpacity>
              {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategoryFilter(cat)}
                  style={[styles.categoryChip, { backgroundColor: categoryFilter === cat ? theme.primary : theme.surface, borderColor: categoryFilter === cat ? theme.primary : theme.border }]}>
                  <Text style={[styles.categoryChipText, { color: categoryFilter === cat ? '#FFFFFF' : theme.textMuted }]}>{CATEGORY_LABELS[cat]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isUploading}
              onPress={handleUpload}
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary, opacity: isUploading ? 0.7 : 1, marginBottom: 20 }]}>
              {isUploading ? <ActivityIndicator color="#FFFFFF" /> : <Upload size={18} color="#FFFFFF" />}
              <Text style={styles.primaryActionText}>{isUploading ? 'Uploading…' : 'Upload Document'}</Text>
            </TouchableOpacity>

            {loadingDocs ? (
              <ListSkeleton rows={3} />
            ) : (docsData?.data?.length ?? 0) === 0 ? (
              searchQuery ? (
                <NoSearchResultState searchTerm={searchQuery} onClearSearch={() => setSearchQuery('')} onResetFilters={() => { setSearchQuery(''); setCategoryFilter(undefined); }} />
              ) : (
                <EmptyState
                  icon={Lock}
                  title="No vault documents found"
                  description="Upload your first clinical record, lab report, or discharge letter above."
                />
              )
            ) : (
              <View style={styles.listGroup}>
                {docsData?.data?.map((doc: VaultDocument) => (
                  <View key={doc.id} style={[styles.listItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={styles.docLeft}
                      onPress={() =>
                        router.push({
                          pathname: '/document-detail',
                          params: {
                            name: doc.title,
                            date: formatDate(doc.recordedAt),
                            type: doc.fileMimeType ?? 'PDF',
                            url: doc.fileUrl ?? '',
                          },
                        })
                      }>
                      <View style={[styles.docIconBox, { backgroundColor: theme.primaryLight }]}>
                        <FileText size={20} color={theme.primary} />
                      </View>
                      <View style={styles.docMeta}>
                        <Text numberOfLines={1} style={[styles.docName, { color: theme.text }]}>
                          {doc.title}
                        </Text>
                        <Text style={[styles.docDate, { color: theme.textMuted }]} numberOfLines={1}>
                          {doc.category ? `${CATEGORY_LABELS[doc.category]} · ` : ''}{formatDate(doc.recordedAt)}
                          {doc.fileSizeBytes ? ` · ${formatBytes(doc.fileSizeBytes)}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditingDoc(doc)}
                      accessibilityLabel="Edit document"
                      style={styles.deleteIconBtn}>
                      <Pencil size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteDoc(doc)}
                      disabled={deleteMutation.isPending}
                      style={styles.deleteIconBtn}>
                      <Trash2 size={16} color={theme.status.error.solid} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* PRESCRIPTIONS TAB */}
        {activeTab === 'prescriptions' && (
          <View>
            {loadingPrescriptions ? (
              <ListSkeleton rows={3} />
            ) : ((Array.isArray(prescriptionsData) ? prescriptionsData.length : (prescriptionsData as unknown as { data?: PrescriptionItem[] })?.data?.length ?? 0) === 0) ? (
              <EmptyState
                icon={Pill}
                title="No active prescriptions"
                description="Your prescriptions from clinician consultations will appear here."
              />
            ) : (
              <View style={styles.listGroup}>
                {(Array.isArray(prescriptionsData) ? prescriptionsData : (prescriptionsData as unknown as { data: PrescriptionItem[] })?.data ?? []).map((rx: PrescriptionItem) => {
                  const isExpired = !!rx.expiresAt && new Date(rx.expiresAt).getTime() < Date.now();
                  const isDue = !isExpired && rx.refillsRemaining === 0;
                  return (
                    <TouchableOpacity
                      key={rx.id}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: '/prescription-detail',
                          params: {
                            id: rx.id,
                            name: rx.drugName,
                            dosage: `${rx.dosage} · ${rx.frequency}`,
                            status: isExpired ? 'expired' : isDue ? 'due' : 'active',
                            refillsLeft: rx.refillsRemaining.toString(),
                            route: rx.route ?? '',
                            expiryDate: rx.expiresAt ? formatDate(rx.expiresAt) : '',
                            prescribedDate: formatDate(rx.createdAt),
                            notes: rx.notes ?? '',
                          },
                        })
                      }
                      style={[styles.cardItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.cardHeaderLeft}>
                          <Text style={[styles.cardTitle, { color: theme.text }]}>{rx.drugName}</Text>
                          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                            {rx.dosage} ({rx.frequency})
                          </Text>
                        </View>
                        <StatusPill
                          status={isDue ? 'amber' : 'green'}
                          label={isDue ? 'Refill Due' : 'Active'}
                        />
                      </View>

                      {rx.notes ? (
                        <Text style={[styles.providerText, { color: theme.textMuted }]}>{rx.notes}</Text>
                      ) : null}

                      {isDue ? (
                        <TouchableOpacity
                          onPress={() => handleRequestRefill({ id: rx.id, name: rx.drugName })}
                          activeOpacity={0.85}
                          style={[
                            styles.refillBtn,
                            {
                              backgroundColor: theme.status.warning.background,
                              borderColor: theme.status.warning.border,
                            },
                          ]}>
                          <Text style={[styles.refillBtnText, { color: theme.status.warning.text }]}>
                            Renew with a consultation
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.refillMeta, { color: theme.textMuted }]}>
                          {rx.refillsRemaining} refills remaining
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && (
          <View>
            {loadingLabs ? (
              <ListSkeleton rows={3} />
            ) : (labOrdersData?.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="No lab results found"
                description="Pathology and diagnostic lab orders will sync automatically here."
              />
            ) : (
              <View style={styles.listGroup}>
                {labOrdersData?.data?.map((labOrder: LabOrder) => {
                  // LabStatus is pending | normal | review | critical: anything but
                  // pending means results are in (the old check looked for
                  // 'completed'/'ready', values the backend never sends).
                  const isReady = labOrder.overallStatus !== 'pending';
                  const needsReview = labOrder.overallStatus === 'review' || labOrder.overallStatus === 'critical';
                  const title = labOrder.results?.[0]?.testName ?? 'Lab Order';
                  return (
                    <TouchableOpacity
                      key={labOrder.id}
                      activeOpacity={0.75}
                      onPress={() =>
                        router.push({
                          pathname: '/lab-result-detail',
                          params: {
                            orderId: labOrder.id,
                            name: title,
                            date: formatDate(labOrder.orderedAt),
                            lab: labOrder.labFacility ?? 'Diagnostic Lab',
                            status: isReady ? 'ready' : 'pending',
                          },
                        })
                      }
                      style={[styles.listItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.docMeta}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
                        <Text style={[styles.docDate, { color: theme.textMuted }]}>
                          {labOrder.labFacility ?? 'Lab'} · {formatDate(labOrder.orderedAt)}
                        </Text>
                      </View>
                      <View style={styles.statusWithChevron}>
                        <StatusPill
                          status={isReady && !needsReview ? 'green' : 'amber'}
                          label={!isReady ? 'Pending' : needsReview ? 'Review' : 'Ready'}
                        />
                        <ChevronRight size={18} color={theme.textMuted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* VISIT NOTES TAB */}
        {activeTab === 'visits' && (
          <View>
            {loadingVisits ? (
              <ListSkeleton rows={3} />
            ) : (visitNotesData?.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No visit summaries yet"
                description="Clinical encounter summaries and discharge instructions appear here."
              />
            ) : (
              <View style={styles.listGroup}>
                {visitNotesData?.data?.map((note: ClinicalRecord) => (
                  <TouchableOpacity
                    key={note.id}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: '/visit-note-detail',
                        params: {
                          type: note.title,
                          date: formatDate(note.recordedAt),
                          provider: note.provider ? `${note.provider.title} ${note.provider.lastName}` : 'Clinician',
                          summary: note.description ?? '',
                        },
                      })
                    }
                    style={[styles.cardItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>{note.title}</Text>
                        <Text style={[styles.docDate, { color: theme.textMuted }]}>
                          {note.provider ? `${note.provider.title} ${note.provider.lastName}` : 'Clinician'} · {formatDate(note.recordedAt)}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={theme.textMuted} />
                    </View>
                    {note.description ? (
                      <Text style={[styles.noteSummary, { color: theme.textMuted }]} numberOfLines={2}>
                        {note.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      <DocumentEditSheet
        visible={!!pendingFile}
        mode="upload"
        busy={isUploading}
        initial={{
          title: pendingFile?.name ?? '',
          category: categoryFilter ?? 'miscellaneous',
          description: '',
          providerVisibility: true,
        }}
        onCancel={() => !isUploading && setPendingFile(null)}
        onSubmit={uploadPicked}
      />
      <DocumentEditSheet
        visible={!!editingDoc}
        mode="edit"
        busy={updateMutation.isPending}
        initial={{
          title: editingDoc?.title ?? '',
          category: editingDoc?.category ?? 'miscellaneous',
          description: editingDoc?.description ?? '',
          providerVisibility: editingDoc?.providerVisibility ?? true,
        }}
        onCancel={() => setEditingDoc(null)}
        onSubmit={(v) => editingDoc && updateMutation.mutate({ ...v, id: editingDoc.id })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  docActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  storageBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageLabel: {
    fontSize: 12,
  },
  storageValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  storageBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  storageLimitText: {
    fontSize: 11,
    marginTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  categoryScroll: {
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteIconBtn: {
    padding: 8,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listGroup: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docMeta: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusWithChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  providerText: {
    fontSize: 13,
  },
  refillBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  refillBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  refillMeta: {
    fontSize: 12,
  },
  noteSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  loaderBox: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    marginTop: 30,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
