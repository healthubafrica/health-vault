import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { telecare, ApiError } from '@/lib/api';

// Shown after a TeleCare call ends. PATCH /telecare/sessions/:id/rate (CSAT)
// existed on the backend and the web portal but the app never asked.
export default function TelecareRatingScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const done = () => router.replace('/(tabs)/telecare');

  const submit = async () => {
    if (!sessionId || rating < 1) return;
    setSaving(true);
    try {
      await telecare.rate(sessionId, rating, feedback.trim() || undefined);
      done();
    } catch (err) {
      Alert.alert('Could not send your rating', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>How was your consultation?</Text>
        <Text style={[styles.sub, { color: theme.textMuted }]}>Your feedback helps us improve TeleCare.</Text>

        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
              accessibilityState={{ checked: rating === n }}
              onPress={() => setRating(n)}
              activeOpacity={0.8}>
              <Star size={40} color="#F5B041" fill={n <= rating ? '#F5B041' : 'transparent'} />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
          placeholder="Anything you'd like to add? (optional)"
          placeholderTextColor={theme.textMuted}
          multiline
          value={feedback}
          onChangeText={setFeedback}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={rating < 1 || saving}
          onPress={submit}
          style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: rating < 1 || saving ? 0.5 : 1 }]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Send rating</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={done} activeOpacity={0.7} style={styles.skip}>
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  body: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 90, textAlignVertical: 'top', fontSize: 14 },
  primaryBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  skip: { alignItems: 'center', padding: 8 },
  skipText: { fontSize: 14, fontWeight: '600' },
});
