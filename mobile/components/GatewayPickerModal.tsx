import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CARD_GATEWAYS, DEFAULT_GATEWAY, type CardGateway } from '@/lib/gateway';

interface GatewayPickerModalProps {
  visible: boolean;
  /** What is being paid for, e.g. "SilverCare (monthly)". */
  summary: string;
  /** True while the checkout is being created — locks the popup. */
  busy?: boolean;
  onClose: () => void;
  onConfirm: (gateway: CardGateway) => void;
}

/**
 * Asks the patient which card gateway to pay with. Paystack is preselected
 * every time it opens. Mirrors the web portal's GatewayPickerDialog.
 */
export default function GatewayPickerModal({ visible, summary, busy = false, onClose, onConfirm }: GatewayPickerModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [selected, setSelected] = useState<CardGateway>(DEFAULT_GATEWAY);

  useEffect(() => {
    if (visible) setSelected(DEFAULT_GATEWAY);
  }, [visible]);

  const dismiss = () => {
    if (!busy) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        {/* Inner Pressable swallows taps so only the backdrop dismisses. */}
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => {}} accessibilityViewIsModal>
          <Text style={[styles.title, { color: theme.text }]}>Choose how to pay</Text>
          <Text style={[styles.summary, { color: theme.textMuted }]}>{summary}</Text>

          <View accessibilityRole="radiogroup" style={styles.options}>
            {CARD_GATEWAYS.map((g) => {
              const checked = selected === g;
              return (
                <TouchableOpacity
                  key={g}
                  accessibilityRole="radio"
                  accessibilityState={{ checked, disabled: busy }}
                  activeOpacity={0.85}
                  disabled={busy}
                  onPress={() => setSelected(g)}
                  style={[
                    styles.option,
                    {
                      borderColor: checked ? theme.primary : theme.border,
                      backgroundColor: checked ? theme.primaryLight : theme.background,
                    },
                  ]}>
                  <View style={[styles.radio, { borderColor: checked ? theme.primary : theme.border }]}>
                    {checked ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionName, { color: theme.text }]}>{g}</Text>
                    <Text style={[styles.optionHint, { color: theme.textMuted }]}>Pay securely with {g}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={busy}
            onPress={() => onConfirm(selected)}
            style={[styles.confirm, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}>
            <Text style={styles.confirmText}>{busy ? 'Redirecting…' : `Continue with ${selected}`}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 20, padding: 20, gap: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  summary: { fontSize: 13, marginTop: -8 },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionName: { fontSize: 15, fontWeight: '700' },
  optionHint: { fontSize: 12, marginTop: 2 },
  confirm: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
