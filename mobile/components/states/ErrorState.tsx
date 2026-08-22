import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RefreshCw, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Raw error text (e.g. an ApiError's message/stack) shown behind a "Technical Details" toggle. */
  errorDetails?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'Something went wrong while communicating with the server. Please try again.',
  errorDetails,
  onRetry,
  isRetrying = false,
}: ErrorStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.status.error.border + '33' }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.status.error.background }]}>
        <ShieldAlert size={26} color={theme.status.error.text} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>

      {onRetry && (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isRetrying}
          onPress={onRetry}
          style={[styles.retryBtn, { backgroundColor: theme.status.error.solid, opacity: isRetrying ? 0.7 : 1 }]}>
          <RefreshCw size={14} color="#FFFFFF" />
          <Text style={styles.retryBtnText}>{isRetrying ? 'Retrying…' : 'Try Again'}</Text>
        </TouchableOpacity>
      )}

      {errorDetails && (
        <View style={styles.detailsSection}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDetails(!showDetails)} style={styles.detailsToggle}>
            <Text style={[styles.detailsToggleText, { color: theme.textMuted }]}>Technical details</Text>
            {showDetails ? <ChevronUp size={14} color={theme.textMuted} /> : <ChevronDown size={14} color={theme.textMuted} />}
          </TouchableOpacity>
          {showDetails && (
            <View style={[styles.detailsBox, { backgroundColor: colorScheme === 'dark' ? '#000000' : '#1A1A1A' }]}>
              <Text selectable style={styles.detailsText}>{errorDetails}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 280,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  detailsSection: {
    width: '100%',
    marginTop: 16,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    maxHeight: 120,
  },
  detailsText: {
    color: '#8AE659',
    fontSize: 10,
    fontFamily: 'SpaceMono',
  },
});
