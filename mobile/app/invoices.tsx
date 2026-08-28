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
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Receipt,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  Building2,
  Search,
  Filter,
  Plus,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { payments, Payment } from '@/lib/api';
import { EmptyState, ListSkeleton } from '@/components/states';

function formatNaira(kobo: number): string {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}


export default function InvoicesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => payments.list(),
  });

  const allPayments: Payment[] = data?.data ?? [];

  const filteredInvoices = allPayments.filter((p) => {
    if (activeFilter === 'paid') return p.status === 'paid';
    if (activeFilter === 'pending') return p.status !== 'paid';
    return true;
  });

  const totalKobo = allPayments.reduce((s, p) => s + (p.amountKobo ?? 0), 0);
  const paidKobo = allPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amountKobo ?? 0), 0);
  const pendingKobo = totalKobo - paidKobo;

  const handleDownload = (p: Payment) => {
    Alert.alert(
      'Receipt Downloaded',
      `Receipt for ${p.description ?? 'payment'} has been saved to your downloads.`
    );
  };

  const handleShare = async (p: Payment) => {
    try {
      await Share.share({
        message: `Health Hub Africa Payment: ${p.description ?? '—'} — ${formatNaira(p.amountKobo)} (${p.status.toUpperCase()}).`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Invoices & Receipts</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/make-payment')}
          style={styles.backBtn}>
          <Plus size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'paid', 'pending'] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            const label = filter === 'all' ? 'All Invoices' : filter === 'paid' ? 'Paid & Settled' : 'Pending Claim';
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    { color: isSelected ? '#FFFFFF' : theme.text },
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Total Spending Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.summaryTop}>
            <Receipt size={24} color={theme.primary} />
            <Text style={[styles.summaryYear, { color: theme.textMuted }]}>YTD MEDICAL EXPENSES</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 8 }} />
          ) : (
            <>
              <Text style={[styles.summaryTotal, { color: theme.text }]}>{formatNaira(totalKobo)}</Text>
              <View style={styles.summarySplitRow}>
                <View>
                  <Text style={[styles.splitLabel, { color: theme.textMuted }]}>Paid</Text>
                  <Text style={[styles.splitValue, { color: '#137333' }]}>{formatNaira(paidKobo)}</Text>
                </View>
                <View>
                  <Text style={[styles.splitLabel, { color: theme.textMuted }]}>Pending</Text>
                  <Text style={[styles.splitValue, { color: theme.text }]}>{formatNaira(pendingKobo)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Invoices List */}
        <View style={styles.listContainer}>
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={activeFilter === 'all' ? 'No payments yet' : `No ${activeFilter} payments`}
              description="Your payment history and receipts will appear here once you make a payment."
              primaryActionLabel="Make a Payment"
              onPrimaryAction={() => router.push('/make-payment')}
            />
          ) : filteredInvoices.map((p) => {
            const isPaid = p.status === 'paid';
            return (
              <View
                key={p.id}
                style={[styles.invoiceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Header Row */}
                <View style={styles.invoiceHeader}>
                  <View>
                    <Text style={[styles.invNumber, { color: theme.primary }]}>#{p.id.slice(-8).toUpperCase()}</Text>
                    <Text style={[styles.invDate, { color: theme.textMuted }]}>{new Date(p.createdAt).toLocaleDateString('en-NG')}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: isPaid ? '#EAF5E2' : '#FEF3F2' },
                    ]}>
                    {isPaid ? (
                      <CheckCircle2 size={12} color="#006022" />
                    ) : (
                      <Clock size={12} color="#B42318" />
                    )}
                    <Text style={[styles.statusPillText, { color: isPaid ? '#006022' : '#B42318' }]}>
                      {isPaid ? 'PAID' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                {/* Service Details */}
                <Text style={[styles.serviceTitle, { color: theme.text }]}>{p.description || 'Payment'}</Text>
                <Text style={[styles.providerName, { color: theme.textMuted }]}>
                  {p.hhaRef ? `Ref: ${p.hhaRef}` : 'Health Hub Africa'}
                </Text>

                {/* Amount Breakdown */}
                <View style={[styles.breakdownBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.textMuted }]}>Total Amount</Text>
                    <Text style={[styles.breakdownAmount, { color: theme.text }]}>{formatNaira(p.amountKobo)}</Text>
                  </View>
                  <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownTotalLabel, { color: theme.text }]}>Status</Text>
                    <Text style={[styles.breakdownTotalValue, { color: theme.primary }]}>{p.status.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={styles.invoiceActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDownload(p)}
                    style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]}>
                    <Download size={14} color={theme.primary} />
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>Download Receipt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleShare(p)}
                    style={[styles.shareBtn, { borderColor: theme.border }]}>
                    <Share2 size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryYear: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryTotal: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
  },
  summarySplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  splitValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContainer: {
    gap: 14,
  },
  invoiceCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  invNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  invDate: {
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 12,
    marginBottom: 12,
  },
  breakdownBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 2,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownTotalValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
