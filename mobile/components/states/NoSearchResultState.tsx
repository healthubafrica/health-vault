import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SearchX, FilterX, X, Tag } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface NoSearchResultStateProps {
  searchTerm: string;
  suggestions?: string[];
  onSelectSuggestion?: (term: string) => void;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
}

export function NoSearchResultState({
  searchTerm,
  suggestions = [],
  onSelectSuggestion,
  onClearSearch,
  onResetFilters,
}: NoSearchResultStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
        <SearchX size={26} color={theme.primary} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>No results found</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>
        We couldn't find any matches for{' '}
        <Text style={[styles.termChip, { color: theme.text, backgroundColor: theme.background }]}>"{searchTerm}"</Text>
      </Text>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={[styles.suggestionsLabel, { color: theme.textFaint }]}>SUGGESTED SEARCHES</Text>
          <View style={styles.suggestionsRow}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                activeOpacity={0.75}
                onPress={() => onSelectSuggestion?.(s)}
                style={[styles.suggestionChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Tag size={10} color={theme.primary} />
                <Text style={[styles.suggestionText, { color: theme.textMuted }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionsRow}>
        {onResetFilters && (
          <TouchableOpacity activeOpacity={0.8} onPress={onResetFilters} style={[styles.btn, styles.secondaryBtn, { borderColor: theme.border }]}>
            <FilterX size={13} color={theme.text} />
            <Text style={[styles.btnText, { color: theme.text }]}>Reset Filters</Text>
          </TouchableOpacity>
        )}
        {onClearSearch && (
          <TouchableOpacity activeOpacity={0.8} onPress={onClearSearch} style={[styles.btn, { backgroundColor: theme.primary }]}>
            <X size={13} color="#FFFFFF" />
            <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
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
    marginBottom: 6,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 260,
  },
  termChip: {
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  suggestionsSection: {
    width: '100%',
    marginBottom: 18,
  },
  suggestionsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
