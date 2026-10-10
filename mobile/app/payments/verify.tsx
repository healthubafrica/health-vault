import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { payments } from '@/lib/api';
import { settlePayment, outcomeMessage, type PaymentOutcome } from '@/lib/paymentResult';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Landing screen for the myhealthvault://payments/verify deep link. */
export default function PaymentVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reference?: string; trxref?: string; tx_ref?: string }>();
  const reference = first(params.reference) || first(params.trxref) || first(params.tx_ref);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);

  useEffect(() => {
    if (!reference) return;
    let live = true;
    settlePayment(payments.verify, reference).then((o) => {
      if (!live) return;
      setOutcome(o);
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['subscription-me'] });
    });
    return () => {
      live = false;
    };
  }, [reference, qc]);

  const missing = !reference;
  const msg = outcome ? outcomeMessage(outcome) : null;
  const Icon = outcome === 'paid' ? CheckCircle2 : outcome === 'failed' ? XCircle : Clock;
  const tint = outcome === 'paid' ? theme.primary : outcome === 'failed' ? '#B42318' : theme.textMuted;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.body}>
        {missing ? (
          <>
            <Clock size={48} color={theme.textMuted} />
            <Text style={[styles.title, { color: theme.text }]}>Nothing to confirm</Text>
            <Text style={[styles.text, { color: theme.textMuted }]}>
              This payment link did not include a reference. Check Invoices for the latest status.
            </Text>
          </>
        ) : !msg ? (
          <>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>Confirming your payment…</Text>
          </>
        ) : (
          <>
            <Icon size={48} color={tint} />
            <Text style={[styles.title, { color: theme.text }]}>{msg.title}</Text>
            <Text style={[styles.text, { color: theme.textMuted }]}>{msg.body}</Text>
          </>
        )}
        {(missing || msg) && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/invoices' as never)}
            style={[styles.btn, { backgroundColor: theme.primary }]}>
            <Text style={styles.btnText}>View invoices</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  text: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
