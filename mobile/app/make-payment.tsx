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
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, CreditCard, Building2, BadgeCheck } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { payments, ApiError } from '@/lib/api';
import { SuccessState } from '@/components/states';

const BANK_DETAILS = {
  bank: 'United Bank for Africa (UBA)',
  account: '1028358485',
  name: 'Health Hub Africa',
};

type Gateway = 'Flutterwave' | 'manual';

export default function MakePaymentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [description, setDescription] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [gateway, setGateway] = useState<Gateway>('Flutterwave');
  const [saveCard, setSaveCard] = useState(true);
  const [transferConfirm, setTransferConfirm] = useState<{ ref: string; amount: string } | null>(null);

  const initiateMutation = useMutation({
    mutationFn: () => {
      const parsed = parseFloat(amountNaira);
      return payments.initiate({
        gateway,
        purpose: 'other',
        description: description.trim(),
        amountKobo: Math.round(parsed * 100),
        currency: 'NGN',
        savePaymentMethod: gateway === 'Flutterwave' ? saveCard : undefined,
      });
    },
    onSuccess: async (result) => {
      if (result.authorizationUrl) {
        await WebBrowser.openBrowserAsync(result.authorizationUrl);
        // The gateway confirms via webhook — refresh so a completed charge
        // (and any newly tokenized card) shows up as soon as it lands.
        qc.invalidateQueries({ queryKey: ['payments'] });
        qc.invalidateQueries({ queryKey: ['payment-methods'] });
      } else {
        setTransferConfirm({
          ref: result.paymentId,
          amount: `₦${parseFloat(amountNaira).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        });
        qc.invalidateQueries({ queryKey: ['payments'] });
      }
    },
    onError: (err: unknown) =>
      Alert.alert('Could not start payment', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const handleSubmit = () => {
    const parsed = parseFloat(amountNaira);
    if (!description.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Incomplete Form', 'Please enter a description and a valid amount.');
      return;
    }
    initiateMutation.mutate();
  };

  if (transferConfirm) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Bank Transfer</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SuccessState
            title="Reference Generated"
            message="Complete the transfer using the details below. Your payment will be marked as paid once we confirm receipt."
            referenceId={transferConfirm.ref}
            details={[
              { label: 'Amount', value: transferConfirm.amount },
              { label: 'Bank', value: BANK_DETAILS.bank },
              { label: 'Account Number', value: BANK_DETAILS.account },
              { label: 'Account Name', value: BANK_DETAILS.name },
            ]}
            primaryActionLabel="Done"
            onPrimaryAction={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Make a Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.securityPill, { backgroundColor: '#EAF5E2', borderColor: '#B7E0A5' }]}>
          <ShieldCheck size={16} color="#006022" />
          <Text style={styles.securityPillText}>Card payments are handled by our PCI-compliant gateway</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>What's this for?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Consultation fee, lab test"
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Amount (NGN)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            value={amountNaira}
            onChangeText={setAmountNaira}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Payment Method</Text>
          <View style={styles.gatewayRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setGateway('Flutterwave')}
              style={[
                styles.gatewayCard,
                {
                  backgroundColor: gateway === 'Flutterwave' ? theme.primaryLight : theme.surface,
                  borderColor: gateway === 'Flutterwave' ? theme.primary : theme.border,
                },
              ]}>
              <CreditCard size={18} color={gateway === 'Flutterwave' ? theme.primary : theme.textMuted} />
              <Text style={[styles.gatewayText, { color: gateway === 'Flutterwave' ? theme.primary : theme.text }]}>
                Card / Flutterwave
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setGateway('manual')}
              style={[
                styles.gatewayCard,
                {
                  backgroundColor: gateway === 'manual' ? theme.primaryLight : theme.surface,
                  borderColor: gateway === 'manual' ? theme.primary : theme.border,
                },
              ]}>
              <Building2 size={18} color={gateway === 'manual' ? theme.primary : theme.textMuted} />
              <Text style={[styles.gatewayText, { color: gateway === 'manual' ? theme.primary : theme.text }]}>
                Bank Transfer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {gateway === 'Flutterwave' && (
          <View style={[styles.saveCardRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <BadgeCheck size={20} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.saveCardTitle, { color: theme.text }]}>Save this card</Text>
              <Text style={[styles.saveCardDesc, { color: theme.textMuted }]}>
                Tokenize this card for faster checkout next time. We never store your card number.
              </Text>
            </View>
            <Switch
              value={saveCard}
              onValueChange={setSaveCard}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={saveCard ? theme.primary : '#F2F4F7'}
            />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={initiateMutation.isPending}
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: initiateMutation.isPending ? 0.6 : 1 }]}>
          <Text style={styles.submitBtnText}>
            {initiateMutation.isPending ? 'Starting…' : gateway === 'Flutterwave' ? 'Continue to Checkout' : 'Generate Bank Reference'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityPillText: { color: '#006022', fontSize: 11, fontWeight: '700', flex: 1 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700' },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  gatewayRow: { flexDirection: 'row', gap: 10 },
  gatewayCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  gatewayText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  saveCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  saveCardTitle: { fontSize: 13, fontWeight: '700' },
  saveCardDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
