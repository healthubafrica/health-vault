import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  PhoneCall,
  Mail,
  HelpCircle,
  ShieldAlert,
  Send,
  FileQuestion,
  ChevronRight,
  Inbox,
} from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { support, ApiError } from '@/lib/api';
import { NoSearchResultState, EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import StatusPill from '@/components/StatusPill';
import { ticketStatusLabel, ticketStatusPill } from '@/lib/supportTickets';

const FAQS = [
  {
    q: 'How do I share my medical records with a new doctor?',
    a: 'Open the Records tab and use Share Records to create a time-limited share link. You choose which record types are included and when it expires, and you can revoke it at any time.',
  },
  {
    q: 'How is my data protected?',
    a: 'Your data travels over encrypted connections and is only visible to you and to the clinicians you are assigned to or choose to share with. You can review what you have consented to under Privacy & Security.',
  },
  {
    q: 'How does the SOS button work?',
    a: 'Tapping SOS sends a DispatchCare request with your phone number and, if you allow it, your location. A dispatcher then contacts you. If the request fails the app will tell you, and you should call 112 immediately.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const qc = useQueryClient();
  const ticketsQuery = useQuery({ queryKey: ['support-tickets'], queryFn: () => support.list() });
  const tickets = ticketsQuery.data ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const submitTicketMutation = useMutation({
    mutationFn: () => support.create({ subject: ticketSubject.trim(), description: ticketMessage.trim() }),
    onSuccess: (ticket) => {
      Alert.alert(
        'Ticket Submitted',
        `Your inquiry #${ticket.hhaRef} has been sent to our Clinical Support Operations team.`
      );
      setTicketSubject('');
      setTicketMessage('');
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (err: unknown) => {
      Alert.alert('Could not submit ticket', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Incomplete Form', 'Please enter a subject and describe your request.');
      return;
    }
    submitTicketMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search FAQs, guidelines, billing..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Contact Channels Grid */}
        {/* Emergency SOS Helpline */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/emergency')}
          style={[styles.emergencyBanner, { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' }]}>
          <ShieldAlert size={22} color="#B42318" />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Life-Threatening Emergency?</Text>
            <Text style={styles.emergencyDesc}>Tap to send a DispatchCare request.</Text>
          </View>
        </TouchableOpacity>

        {/* FAQs Accordion */}
        <View style={styles.sectionHeader}>
          <FileQuestion size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
        </View>

        {filteredFaqs.length === 0 && searchQuery.trim().length > 0 ? (
          <NoSearchResultState searchTerm={searchQuery} onClearSearch={() => setSearchQuery('')} />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {filteredFaqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                    style={styles.faqRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.q}</Text>
                      {isExpanded && (
                        <Text style={[styles.faqAnswer, { color: theme.textMuted }]}>{faq.a}</Text>
                      )}
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={18} color={theme.primary} />
                    ) : (
                      <ChevronDown size={18} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Submit Ticket Form */}
        <View style={styles.sectionHeader}>
          <Mail size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Send Message to Support</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="Subject (e.g. Lab report missing)"
            placeholderTextColor={theme.textMuted}
            value={ticketSubject}
            onChangeText={setTicketSubject}
          />
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
            ]}
            placeholder="Provide details about your query..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
            value={ticketMessage}
            onChangeText={setTicketMessage}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={submitTicketMutation.isPending}
            onPress={handleSubmitTicket}
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: submitTicketMutation.isPending ? 0.6 : 1 }]}>
            <Send size={16} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              {submitTicketMutation.isPending ? 'Submitting…' : 'Submit Support Ticket'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* My tickets */}
        <View style={styles.sectionHeader}>
          <Inbox size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>My Tickets</Text>
        </View>

        {ticketsQuery.isLoading ? (
          <ListSkeleton rows={2} />
        ) : ticketsQuery.isError ? (
          <ErrorState onRetry={() => ticketsQuery.refetch()} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tickets yet"
            description="Messages you send to support will show up here with their replies."
          />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {tickets.map((t, idx) => (
              <React.Fragment key={t.id}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/support-ticket', params: { id: t.id } } as never)}
                  style={styles.faqRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.faqQuestion, { color: theme.text }]} numberOfLines={2}>{t.subject}</Text>
                    <Text style={[styles.channelSub, { color: theme.textMuted }]}>
                      #{t.hhaRef} · {new Date(t.updatedAt ?? t.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <StatusPill status={ticketStatusPill(t.status)} label={ticketStatusLabel(t.status)} />
                  <ChevronRight size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  channelCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  channelTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  channelSub: {
    fontSize: 11,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  emergencyTitle: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  emergencyDesc: {
    color: '#7A271A',
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  faqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  divider: {
    height: 1,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
