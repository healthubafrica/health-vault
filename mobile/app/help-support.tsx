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
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { support, ApiError } from '@/lib/api';

const FAQS = [
  {
    q: 'How do I share my medical records with a new doctor?',
    a: 'Go to Profile ➔ Share My Records. You will generate a live single-use QR code and a 6-digit emergency PIN with granular permissions and a 15-minute expiration timer.',
  },
  {
    q: 'Is my clinical data and diagnostic history encrypted?',
    a: 'Yes. All personal health data in MyHealth Vault+ is encrypted at rest and in transit using military-grade 256-bit AES cryptographic protocols compliant with POPIA and HIPAA standards.',
  },
  {
    q: 'How does the 24/7 Paramedic SOS button work?',
    a: 'Tapping the SOS beacon triggers a high-priority geo-located paramedic dispatch broadcast and automatically reveals your critical allergy/blood type profile to first responders.',
  },
  {
    q: 'Can I claim prescription and doctor fees from Discovery Health?',
    a: 'Yes. Health Hub Africa supports direct electronic real-time billing with major medical aid schemes across South Africa.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

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
        <View style={styles.channelsGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/telecare-call')}
            style={[styles.channelCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.channelIcon, { backgroundColor: theme.primaryLight }]}>
              <MessageSquare size={20} color={theme.primary} />
            </View>
            <Text style={[styles.channelTitle, { color: theme.text }]}>Clinician Chat</Text>
            <Text style={[styles.channelSub, { color: theme.textMuted }]}>Average response: 3 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('tel:+27800044243')}
            style={[styles.channelCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.channelIcon, { backgroundColor: '#E0F2FE' }]}>
              <PhoneCall size={20} color="#0284C7" />
            </View>
            <Text style={[styles.channelTitle, { color: theme.text }]}>Toll-Free Helpline</Text>
            <Text style={[styles.channelSub, { color: theme.textMuted }]}>0800 044 243 (24/7)</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency SOS Helpline */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/emergency')}
          style={[styles.emergencyBanner, { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' }]}>
          <ShieldAlert size={22} color="#B42318" />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Life-Threatening Emergency?</Text>
            <Text style={styles.emergencyDesc}>Tap for instant GPS paramedic ambulance dispatch & triage.</Text>
          </View>
        </TouchableOpacity>

        {/* FAQs Accordion */}
        <View style={styles.sectionHeader}>
          <FileQuestion size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
        </View>

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
