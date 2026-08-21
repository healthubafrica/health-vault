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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Camera,
  Upload,
  FileText,
  File,
  ChevronRight,
  Pill,
  FlaskConical,
  ClipboardList,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { records, labs, ClinicalRecord, PrescriptionItem, LabOrder } from '@/lib/api';

type TabType = 'documents' | 'prescriptions' | 'results' | 'visits';

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

export default function RecordsHubScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: docsData, isLoading: loadingDocs } = useQuery({
    queryKey: ['records', 'documents'],
    queryFn: () => records.list('document'),
    enabled: activeTab === 'documents',
  });

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
    queryFn: () => records.list('visit_note'),
    enabled: activeTab === 'visits',
  });

  const handleRequestRefill = (medication: string) => {
    Alert.alert('Refill Requested', `Your refill request for ${medication} has been sent to your clinician.`);
  };

  const handleUploadPlaceholder = () => {
    Alert.alert('Upload Document', 'Select a file or photo from your device to upload to your secure vault.');
  };

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

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <View>
            {/* Scan / Upload Actions */}
            <View style={styles.docActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleUploadPlaceholder}
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}>
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Scan Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleUploadPlaceholder}
                style={[styles.secondaryActionBtn, { backgroundColor: theme.primaryLight }]}>
                <Upload size={18} color={theme.primary} />
                <Text style={[styles.secondaryActionText, { color: theme.primaryDark }]}>Upload</Text>
              </TouchableOpacity>
            </View>

            {loadingDocs ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (docsData?.data?.length ?? 0) === 0 ? (
              <View style={[styles.emptyBox, { borderColor: theme.border }]}>
                <FileText size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No documents uploaded</Text>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  Scan or upload discharge letters, certificates, and records to your vault.
                </Text>
              </View>
            ) : (
              <View style={styles.listGroup}>
                {docsData?.data?.map((doc: ClinicalRecord) => (
                  <TouchableOpacity
                    key={doc.id}
                    activeOpacity={0.75}
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
                    }
                    style={[styles.listItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.docLeft}>
                      <View style={[styles.docIconBox, { backgroundColor: 'rgba(39, 126, 255, 0.1)' }]}>
                        <FileText size={20} color={theme.primary} />
                      </View>
                      <View style={styles.docMeta}>
                        <Text numberOfLines={1} style={[styles.docName, { color: theme.text }]}>
                          {doc.title}
                        </Text>
                        <Text style={[styles.docDate, { color: theme.textMuted }]}>
                          {formatDate(doc.recordedAt)}
                          {doc.provider ? ` · ${doc.provider.title} ${doc.provider.lastName}` : ''}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* PRESCRIPTIONS TAB */}
        {activeTab === 'prescriptions' && (
          <View>
            {loadingPrescriptions ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : ((Array.isArray(prescriptionsData) ? prescriptionsData.length : (prescriptionsData as unknown as { data?: PrescriptionItem[] })?.data?.length ?? 0) === 0) ? (
              <View style={[styles.emptyBox, { borderColor: theme.border }]}>
                <Pill size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No active prescriptions</Text>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  Your prescriptions from clinician consultations will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.listGroup}>
                {(Array.isArray(prescriptionsData) ? prescriptionsData : (prescriptionsData as unknown as { data: PrescriptionItem[] })?.data ?? []).map((rx: PrescriptionItem) => {
                  const isDue = rx.refillsRemaining === 0;
                  return (
                    <TouchableOpacity
                      key={rx.id}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: '/prescription-detail',
                          params: {
                            name: rx.drugName,
                            dosage: `${rx.dosage} · ${rx.frequency}`,
                            status: isDue ? 'due' : 'active',
                            refillsLeft: rx.refillsRemaining.toString(),
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
                          onPress={() => handleRequestRefill(rx.drugName)}
                          activeOpacity={0.85}
                          style={[
                            styles.refillBtn,
                            {
                              backgroundColor: theme.status.warning.background,
                              borderColor: theme.status.warning.border,
                            },
                          ]}>
                          <Text style={[styles.refillBtnText, { color: theme.status.warning.text }]}>
                            Request Refill
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
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (labOrdersData?.data?.length ?? 0) === 0 ? (
              <View style={[styles.emptyBox, { borderColor: theme.border }]}>
                <FlaskConical size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No lab results found</Text>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  Pathology and diagnostic lab orders will sync automatically here.
                </Text>
              </View>
            ) : (
              <View style={styles.listGroup}>
                {labOrdersData?.data?.map((labOrder: LabOrder) => {
                  const isReady = labOrder.overallStatus === 'completed' || labOrder.overallStatus === 'ready';
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
                          status={isReady ? 'green' : 'amber'}
                          label={isReady ? 'Ready' : 'Pending'}
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
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (visitNotesData?.data?.length ?? 0) === 0 ? (
              <View style={[styles.emptyBox, { borderColor: theme.border }]}>
                <ClipboardList size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No visit notes</Text>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  Clinical encounter summaries and discharge instructions appear here.
                </Text>
              </View>
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
