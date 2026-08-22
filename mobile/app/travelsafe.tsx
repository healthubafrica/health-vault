import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plane, MapPin, Calendar, X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { travelsafe, TravelSafeStatus, ApiError } from '@/lib/api';
import { EmptyState, ListSkeleton, ErrorState } from '@/components/states';

const STATUS_LABEL: Record<TravelSafeStatus, string> = {
  preparing: 'Preparing',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

export default function TravelSafeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['travelsafe-trips'],
    queryFn: () => travelsafe.list(),
  });

  const trips = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      travelsafe.create({
        destinationCountry: destination.trim(),
        departureDate,
        returnDate: returnDate.trim() || undefined,
        purpose: purpose.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['travelsafe-trips'] });
      setDestination('');
      setDepartureDate('');
      setReturnDate('');
      setPurpose('');
      setShowForm(false);
    },
    onError: (err: unknown) =>
      Alert.alert('Could not save trip', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const handleSubmit = () => {
    if (!destination.trim() || !isValidDate(departureDate)) {
      Alert.alert('Incomplete Form', 'Please enter a destination and a departure date (YYYY-MM-DD).');
      return;
    }
    if (returnDate.trim() && !isValidDate(returnDate)) {
      Alert.alert('Invalid Return Date', 'Return date must be in YYYY-MM-DD format.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>TravelSafe</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowForm((v) => !v)} style={styles.backBtn}>
          {showForm ? <X size={22} color={theme.text} /> : <Plane size={20} color={theme.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Plan a Trip</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>Destination Country</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. United Kingdom"
                placeholderTextColor={theme.textMuted}
                value={destination}
                onChangeText={setDestination}
              />
            </View>

            <View style={styles.dateRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Departure Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textMuted}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Return Date (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textMuted}
                  value={returnDate}
                  onChangeText={setReturnDate}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>Purpose (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. Study, business, holiday"
                placeholderTextColor={theme.textMuted}
                value={purpose}
                onChangeText={setPurpose}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={createMutation.isPending}
              onPress={handleSubmit}
              style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: createMutation.isPending ? 0.6 : 1 }]}>
              <Text style={styles.submitBtnText}>{createMutation.isPending ? 'Saving…' : 'Save Trip'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : error ? (
          <ErrorState onRetry={refetch} isRetrying={isRefetching} />
        ) : trips.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No trips planned"
            description="Prepare a trip abroad with your health profile, allergies, and emergency contacts ready for international providers."
            primaryActionLabel="Plan a Trip"
            onPrimaryAction={() => setShowForm(true)}
          />
        ) : (
          <View style={styles.tripsList}>
            {trips.map((trip) => (
              <View key={trip.id} style={[styles.tripCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.tripTopRow}>
                  <View style={styles.tripDestRow}>
                    <MapPin size={16} color={theme.primary} />
                    <Text style={[styles.tripDest, { color: theme.text }]}>{trip.destinationCountry}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          trip.status === 'active' ? theme.status.success.background : theme.status.info.background,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: trip.status === 'active' ? theme.status.success.text : theme.status.info.text },
                      ]}>
                      {STATUS_LABEL[trip.status]}
                    </Text>
                  </View>
                </View>
                <View style={styles.tripDateRow}>
                  <Calendar size={13} color={theme.textMuted} />
                  <Text style={[styles.tripDateText, { color: theme.textMuted }]}>
                    {new Date(trip.departureDate).toLocaleDateString()}
                    {trip.returnDate ? ` – ${new Date(trip.returnDate).toLocaleDateString()}` : ''}
                  </Text>
                </View>
                {trip.purpose && <Text style={[styles.tripPurpose, { color: theme.textMuted }]}>{trip.purpose}</Text>}
              </View>
            ))}
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
  title: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  formCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  formTitle: { fontSize: 15, fontWeight: '800' },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700' },
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  dateRow: { flexDirection: 'row', gap: 10 },
  submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  tripsList: { gap: 12 },
  tripCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  tripTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripDestRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripDest: { fontSize: 14, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  tripDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripDateText: { fontSize: 12 },
  tripPurpose: { fontSize: 12 },
});
