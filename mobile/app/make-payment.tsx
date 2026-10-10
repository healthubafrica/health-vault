import React, { useEffect, useRef, useState } from 'react';
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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, CreditCard, Building2, BadgeCheck } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { payments, paymentMethods, analytics, generateIdempotencyKey, ApiError } from '@/lib/api';
import { SuccessState } from '@/components/states';
import GatewayPickerModal from '@/components/GatewayPickerModal';
import { openCheckout } from '@/lib/checkout';
import { settlePayment, outcomeMessage } from '@/lib/paymentResult';
import { parseNairaAmount } from '@/lib/validation';
import { useGatewayAvailability } from '@/lib/useGatewayAvailability';
import type { CardGateway } from '@/lib/gateway';

const BANK_DETAILS = {
  bank: 'United Bank for Africa (UBA)',
  account: '1028358485',
  name: 'Health Hub Africa',
};

type Method = 'card' | 'manual';

export default function MakePaymentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [description, setDescription] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [method, setMethod] = useState<Method>('card');
  const [saveCard, setSaveCard] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Saved Flutterwave card chosen for this payment (null = pay with a new card).
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [otpPrompt, setOtpPrompt] = useState<{ paymentId: string; flwRef: string; reference?: string } | null>(null);
  const [otp, setOtp] = useState('');

  // The popup only opens once the API reports Paystack live, so a missing or
  // misconfigured key never presents patients with an option that would fail.
  const { paystackActive, bank } = useGatewayAvailability();
  const [transferConfirm, setTransferConfirm] = useState<{ ref: string; amount: string } | null>(null);

  // One idempotency key per distinct (amount, description, gateway, save-card)
  // combination — the same across repeated taps for the same values (so a retry
  // after a dropped response replays instead of double-charging), and different
  // as soon as any of them changes (so an edited request is never mistaken for
  // a retry of the old one).
  const keys = useRef(new Map<string, string>());
  const keyFor = (gateway: string) => {
    const id = `${amountNaira}|${description}|${gateway}|${saveCard}|${savedCardId ?? ''}`;
    if (!keys.current.has(id)) keys.current.set(id, generateIdempotencyKey());
    return keys.current.get(id)!;
  };

  const { data: savedMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethods.list(),
    enabled: method === 'card',
  });
  // Only Flutterwave can charge a stored card token; Paystack always uses its checkout.
  const flwCards = (savedMethods ?? []).filter((m) => m.gateway === 'Flutterwave');
  useEffect(() => {
    if (flwCards.length > 0) {
      setSavedCardId((cur) => cur ?? (flwCards.find((m) => m.isDefault) ?? flwCards[0]).id);
    }
    // Preselect when cards first load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMethods]);

  const initiateMutation = useMutation({
    mutationFn: (gateway: CardGateway | 'manual') => {
      const parsed = parseNairaAmount(amountNaira) ?? 0;
      analytics.track('checkout_started', { gateway });
      return payments.initiate(
        {
          gateway,
          purpose: 'other',
          description: description.trim(),
          amountKobo: Math.round(parsed * 100),
          currency: 'NGN',
          savePaymentMethod: gateway === 'Flutterwave' && !savedCardId ? saveCard : undefined,
          paymentMethodId: gateway === 'Flutterwave' && savedCardId ? savedCardId : undefined,
          client: 'mobile',
        },
        keyFor(gateway),
      );
    },
    onSuccess: async (result, gateway) => {
      setPickerOpen(false);
      if (result.status === 'paid') {
        // A repeated request for a payment that already succeeded.
        keys.current.clear();
        const msg = outcomeMessage('paid');
        Alert.alert(msg.title, msg.body);
        qc.invalidateQueries({ queryKey: ['payments'] });
      } else if (result.requiresOtp && result.flwRef) {
        // The bank wants a one-time code before charging the saved card.
        setOtp('');
        setOtpPrompt({ paymentId: result.paymentId, flwRef: result.flwRef, reference: result.reference });
      } else if (result.authorizationUrl) {
        const returned = await openCheckout(result.authorizationUrl);
        // The browser closing (or the return link) says nothing about whether the card was charged.
        const reference = result.reference ?? returned.reference;
        const outcome = reference ? await settlePayment(payments.verify, reference) : 'pending';
        // A settled attempt (paid or failed) must never be replayed: the same key would
        // answer "already paid" or reopen a dead checkout link. Keep it only while
        // pending so a retry of an in-flight attempt still replays.
        if (outcome !== 'pending') keys.current.clear();
        analytics.track(outcome === 'paid' ? 'payment_success' : outcome === 'failed' ? 'payment_failure' : 'payment_pending', { gateway });
        qc.invalidateQueries({ queryKey: ['payments'] });
        qc.invalidateQueries({ queryKey: ['payment-methods'] });
        const msg = outcomeMessage(outcome);
        Alert.alert(msg.title, msg.body);
      } else if (gateway !== 'manual') {
        // A card payment with no checkout link must not fall through to the bank-transfer screen.
        Alert.alert('Could not start payment', 'The payment gateway did not return a checkout page. Please try again.');
      } else {
        analytics.track('payment_pending', { gateway });
        setTransferConfirm({
          ref: result.paymentId,
          amount: `₦${(parseNairaAmount(amountNaira) ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        });
        qc.invalidateQueries({ queryKey: ['payments'] });
      }
    },
    onError: (err: unknown, gateway) => {
      setPickerOpen(false);
      // A rejected request (4xx) is not an in-flight attempt, so don't replay its key.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) keys.current.clear();
      analytics.track('payment_failure', { gateway, reason: 'initiate_error' });
      Alert.alert('Could not start payment', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  const otpMutation = useMutation({
    mutationFn: async () => {
      if (!otpPrompt) throw new Error('No payment awaiting a code');
      await payments.validateCharge({ paymentId: otpPrompt.paymentId, flwRef: otpPrompt.flwRef, otp: otp.trim() });
      return otpPrompt.reference ? settlePayment(payments.verify, otpPrompt.reference) : ('pending' as const);
    },
    onSuccess: (outcome) => {
      setOtpPrompt(null);
      keys.current.clear();
      analytics.track(outcome === 'paid' ? 'payment_success' : outcome === 'failed' ? 'payment_failure' : 'payment_pending', { gateway: 'Flutterwave' });
      qc.invalidateQueries({ queryKey: ['payments'] });
      const msg = outcomeMessage(outcome);
      Alert.alert(msg.title, msg.body);
    },
    onError: (err: unknown) =>
      Alert.alert('Code not accepted', err instanceof ApiError ? err.message : 'Check the code and try again.'),
  });

  const handleSubmit = () => {
    analytics.track('ui_click', { element_id: 'make_payment_cta', feature_area: 'payments' });
    const parsed = parseNairaAmount(amountNaira);
    if (!description.trim() || parsed === null) {
      Alert.alert('Incomplete Form', 'Please enter a description and a valid amount (e.g. 1500 or 1,500.50).');
      return;
    }
    if (method === 'manual') initiateMutation.mutate('manual');
    else if (savedCardId) initiateMutation.mutate('Flutterwave');
    else if (paystackActive) setPickerOpen(true);
    else initiateMutation.mutate('Flutterwave');
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
              { label: 'Bank', value: bank?.bankName ?? BANK_DETAILS.bank },
              { label: 'Account Number', value: bank?.accountNumber ?? BANK_DETAILS.account },
              { label: 'Account Name', value: bank?.accountName ?? BANK_DETAILS.name },
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
              onPress={() => setMethod('card')}
              style={[
                styles.gatewayCard,
                {
                  backgroundColor: method === 'card' ? theme.primaryLight : theme.surface,
                  borderColor: method === 'card' ? theme.primary : theme.border,
                },
              ]}>
              <CreditCard size={18} color={method === 'card' ? theme.primary : theme.textMuted} />
              <Text style={[styles.gatewayText, { color: method === 'card' ? theme.primary : theme.text }]}>
                Card / Online
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMethod('manual')}
              style={[
                styles.gatewayCard,
                {
                  backgroundColor: method === 'manual' ? theme.primaryLight : theme.surface,
                  borderColor: method === 'manual' ? theme.primary : theme.border,
                },
              ]}>
              <Building2 size={18} color={method === 'manual' ? theme.primary : theme.textMuted} />
              <Text style={[styles.gatewayText, { color: method === 'manual' ? theme.primary : theme.text }]}>
                Bank Transfer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {method === 'card' && flwCards.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Pay with</Text>
            {flwCards.map((m) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.85}
                onPress={() => setSavedCardId(m.id)}
                style={[
                  styles.savedCard,
                  {
                    backgroundColor: savedCardId === m.id ? theme.primaryLight : theme.surface,
                    borderColor: savedCardId === m.id ? theme.primary : theme.border,
                  },
                ]}>
                <CreditCard size={18} color={savedCardId === m.id ? theme.primary : theme.textMuted} />
                <Text style={[styles.gatewayText, { color: theme.text }]}>
                  {`${m.cardBrand ?? 'Card'} ····${m.last4 ?? '····'}`}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSavedCardId(null)}
              style={[
                styles.savedCard,
                {
                  backgroundColor: savedCardId === null ? theme.primaryLight : theme.surface,
                  borderColor: savedCardId === null ? theme.primary : theme.border,
                },
              ]}>
              <Text style={[styles.gatewayText, { color: theme.text }]}>Use a new card</Text>
            </TouchableOpacity>
          </View>
        )}

        {method === 'card' && !savedCardId && (
          <View style={[styles.saveCardRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <BadgeCheck size={20} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.saveCardTitle, { color: theme.text }]}>Save this card</Text>
              <Text style={[styles.saveCardDesc, { color: theme.textMuted }]}>
                Tokenize this card for faster checkout next time (Flutterwave payments). We never store your card number.
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
            {initiateMutation.isPending ? 'Starting…' : method === 'manual' ? 'Generate Bank Reference' : 'Continue to Checkout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={!!otpPrompt} transparent animationType="fade" onRequestClose={() => setOtpPrompt(null)}>
        <View style={styles.otpBackdrop}>
          <View style={[styles.otpCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.label, { color: theme.text }]}>Enter the code from your bank</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="One-time code"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={8}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={otpMutation.isPending || otp.trim().length < 4}
              onPress={() => otpMutation.mutate()}
              style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: otpMutation.isPending || otp.trim().length < 4 ? 0.6 : 1 }]}>
              <Text style={styles.submitBtnText}>{otpMutation.isPending ? 'Confirming…' : 'Confirm payment'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOtpPrompt(null)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <GatewayPickerModal
        visible={pickerOpen}
        summary={`${description.trim() || 'Payment'} — ₦${(parseNairaAmount(amountNaira) ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
        busy={initiateMutation.isPending}
        onClose={() => setPickerOpen(false)}
        onConfirm={(g) => initiateMutation.mutate(g)}
      />
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
  gatewayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gatewayCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  gatewayText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  otpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  otpCard: { borderRadius: 16, padding: 18, gap: 12 },
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
