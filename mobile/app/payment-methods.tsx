import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  CreditCard,
  Trash2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { paymentMethods, PaymentMethod, ApiError } from '@/lib/api';
import { EmptyState, ListSkeleton } from '@/components/states';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethods.list(),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => paymentMethods.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
    onError: (err: unknown) =>
      Alert.alert('Could not update', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => paymentMethods.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
    onError: (err: unknown) =>
      Alert.alert('Could not remove', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const handleDeleteCard = (card: PaymentMethod) => {
    Alert.alert('Remove Card', `Remove the card ending in ${card.last4 ?? '····'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(card.id) },
    ]);
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
        <Text style={[styles.title, { color: theme.text }]}>Payment Methods</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Security Badge */}
        <View style={[styles.securityPill, { backgroundColor: '#EAF5E2', borderColor: '#B7E0A5' }]}>
          <ShieldCheck size={16} color="#006022" />
          <Text style={styles.securityPillText}>Cards are tokenized by our payment gateway — we never store your card number</Text>
        </View>

        {/* Saved Cards */}
        <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved Cards</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/make-payment')}>
            <Text style={[styles.addCardLink, { color: theme.primary }]}>+ Make a Payment</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ListSkeleton rows={2} />
        ) : (cards ?? []).length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No saved cards yet"
            description="A card is saved automatically the next time you pay and choose &quot;Save this card&quot; at checkout."
            primaryActionLabel="Make a Payment"
            onPrimaryAction={() => router.push('/make-payment')}
          />
        ) : (
          (cards ?? []).map((card) => (
            <View
              key={card.id}
              style={[
                styles.cardContainer,
                {
                  backgroundColor: '#1D2939',
                  borderColor: card.isDefault ? theme.primary : 'transparent',
                },
              ]}>
              {/* Card Top */}
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={styles.cardBrand}>{(card.cardBrand ?? 'CARD').toUpperCase()}</Text>
                  <Text style={styles.cardType}>Tokenized card on file</Text>
                </View>
                {card.isDefault && (
                  <View style={styles.defaultBadge}>
                    <CheckCircle2 size={12} color="#FFFFFF" />
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>

              {/* Card Number */}
              <Text style={styles.cardNumber}>•••• •••• •••• {card.last4 ?? '····'}</Text>

              {/* Card Bottom */}
              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.cardSmallLabel}>EXPIRES</Text>
                  <Text style={styles.cardValue}>
                    {card.expiryMonth && card.expiryYear ? `${card.expiryMonth}/${card.expiryYear}` : '—'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.cardSmallLabel}>ADDED</Text>
                  <Text style={styles.cardValue}>{new Date(card.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>

              {/* Action Toolbar */}
              <View style={styles.cardActionRow}>
                {!card.isDefault && (
                  <TouchableOpacity
                    disabled={setDefaultMutation.isPending}
                    onPress={() => setDefaultMutation.mutate(card.id)}
                    style={styles.cardActionBtn}>
                    <Text style={styles.cardActionText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  disabled={removeMutation.isPending}
                  onPress={() => handleDeleteCard(card)}
                  style={[styles.cardActionBtn, { marginLeft: 'auto' }]}>
                  <Trash2 size={14} color="#FDA29B" />
                  <Text style={[styles.cardActionText, { color: '#FDA29B' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityPillText: {
    color: '#006022',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
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
  addCardLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardContainer: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBrand: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardType: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#137333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    marginVertical: 24,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardSmallLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  cardActionText: {
    color: '#D0E8D0',
    fontSize: 12,
    fontWeight: '700',
  },
});
