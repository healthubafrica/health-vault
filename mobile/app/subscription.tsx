import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Crown, CheckCircle2, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { subscriptions, SubscriptionPlan, ApiError } from '@/lib/api';
import { ListSkeleton, ErrorState } from '@/components/states';

function formatNaira(kobo: number): string {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const { data: myData, isLoading: isLoadingMy } = useQuery({
    queryKey: ['subscription-me'],
    queryFn: () => subscriptions.getMy(),
  });
  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
    isRefetching,
  } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptions.listPlans(),
  });

  const current = myData?.data ?? null;
  const plans = plansData?.data ?? [];

  const upgradeMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) => subscriptions.upgrade(plan.id, billingCycle),
    onSuccess: async (result) => {
      await WebBrowser.openBrowserAsync(result.authorizationUrl);
      qc.invalidateQueries({ queryKey: ['subscription-me'] });
    },
    onError: (err: unknown) =>
      Alert.alert('Could not start upgrade', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => subscriptions.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription-me'] }),
    onError: (err: unknown) =>
      Alert.alert('Could not cancel', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const handleCancel = () => {
    if (!current) return;
    Alert.alert('Cancel Subscription', `Cancel your ${current.plan.name} plan?`, [
      { text: 'Keep Plan', style: 'cancel' },
      { text: 'Cancel Plan', style: 'destructive', onPress: () => cancelMutation.mutate(current.id) },
    ]);
  };

  const priceForCycle = (plan: SubscriptionPlan) =>
    billingCycle === 'annually' && plan.annualPriceKobo ? plan.annualPriceKobo : plan.priceKobo;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Subscription Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Current Plan */}
        {isLoadingMy ? (
          <ListSkeleton rows={1} />
        ) : current ? (
          <View style={[styles.currentCard, { backgroundColor: theme.primaryDark }]}>
            <View style={styles.currentTopRow}>
              <Crown size={20} color="#FFD700" />
              <Text style={styles.currentBadge}>CURRENT PLAN</Text>
            </View>
            <Text style={styles.currentPlanName}>{current.plan.name}</Text>
            <Text style={styles.currentPlanPrice}>
              {formatNaira(current.plan.priceKobo)} / {current.plan.billingPeriod}
            </Text>
            <Text style={styles.currentPlanMeta}>
              {current.expiresAt
                ? `Renews ${new Date(current.expiresAt).toLocaleDateString()}`
                : 'Never expires'}
            </Text>
            {current.plan.tier !== 'free' && (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={cancelMutation.isPending}
                onPress={handleCancel}
                style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Subscription'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Billing Cycle Toggle */}
        <View style={styles.cycleRow}>
          {(['monthly', 'annually'] as const).map((cycle) => {
            const isSelected = billingCycle === cycle;
            return (
              <TouchableOpacity
                key={cycle}
                activeOpacity={0.85}
                onPress={() => setBillingCycle(cycle)}
                style={[
                  styles.cyclePill,
                  { backgroundColor: isSelected ? theme.primary : theme.surface, borderColor: isSelected ? theme.primary : theme.border },
                ]}>
                <Text style={[styles.cyclePillText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                  {cycle === 'monthly' ? 'Monthly' : 'Annually'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Available Plans */}
        {isLoadingPlans ? (
          <ListSkeleton rows={3} />
        ) : plansError ? (
          <ErrorState onRetry={refetchPlans} isRetrying={isRefetching} />
        ) : (
          <View style={styles.plansList}>
            {plans.map((plan) => {
              const isCurrent = current?.plan.id === plan.id;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { backgroundColor: theme.surface, borderColor: plan.isMostPopular ? theme.primary : theme.border },
                  ]}>
                  {plan.isMostPopular && (
                    <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                      <Sparkles size={11} color="#FFFFFF" />
                      <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                    </View>
                  )}
                  <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color: theme.primary }]}>
                    {plan.priceKobo === 0 ? 'Free' : `${formatNaira(priceForCycle(plan))} / ${billingCycle === 'annually' ? 'yr' : 'mo'}`}
                  </Text>
                  {plan.bestFor && <Text style={[styles.planBestFor, { color: theme.textMuted }]}>{plan.bestFor}</Text>}

                  <View style={styles.featuresList}>
                    {plan.features.slice(0, 5).map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <CheckCircle2 size={14} color={theme.primary} />
                        <Text style={[styles.featureText, { color: theme.text }]}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {isCurrent ? (
                    <View style={[styles.currentPlanTag, { borderColor: theme.border }]}>
                      <Text style={[styles.currentPlanTagText, { color: theme.textMuted }]}>Your Current Plan</Text>
                    </View>
                  ) : plan.priceKobo === 0 ? null : (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={upgradeMutation.isPending}
                      onPress={() => upgradeMutation.mutate(plan)}
                      style={[styles.upgradeBtn, { backgroundColor: theme.primary, opacity: upgradeMutation.isPending ? 0.6 : 1 }]}>
                      <Text style={styles.upgradeBtnText}>
                        {upgradeMutation.isPending ? 'Starting…' : 'Upgrade'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
  title: { fontSize: 17, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  currentCard: { borderRadius: 20, padding: 20 },
  currentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  currentBadge: { color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  currentPlanName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  currentPlanPrice: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  currentPlanMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cycleRow: { flexDirection: 'row', gap: 10 },
  cyclePill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cyclePillText: { fontSize: 13, fontWeight: '700' },
  plansList: { gap: 14 },
  planCard: { borderRadius: 20, borderWidth: 1.5, padding: 18 },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  planName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  planPrice: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  planBestFor: { fontSize: 12, marginBottom: 12 },
  featuresList: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { fontSize: 12, flex: 1, lineHeight: 17 },
  upgradeBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upgradeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  currentPlanTag: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  currentPlanTagText: { fontSize: 12, fontWeight: '700' },
});
