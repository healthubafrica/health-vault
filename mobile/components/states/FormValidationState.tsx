import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

// Reference implementation of the app's validation-feedback patterns
// (inline field errors, password-strength meter, char-limit counter) — the
// same scope as the web portal's FormValidationState, which is also a
// self-contained demo rather than wired into a specific real form.
export function FormValidationState() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordStrength: 'Weak' | 'Medium' | 'Strong' =
    password.length > 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
      ? 'Strong'
      : password.length > 5
      ? 'Medium'
      : 'Weak';
  const strengthColor =
    passwordStrength === 'Strong' ? theme.status.success.solid : passwordStrength === 'Medium' ? theme.status.warning.solid : theme.status.error.solid;

  const charLimit = 120;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Form Validation</Text>

      {/* Email */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Email address</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={email}
            onChangeText={(v) => { setEmail(v); setTouched(true); }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor={theme.textFaint}
            style={[
              styles.input,
              {
                borderColor: touched ? (isEmailValid ? theme.status.success.solid : theme.status.error.solid) : theme.border,
                color: theme.text,
                backgroundColor: theme.background,
              },
            ]}
          />
          {touched && email.length > 0 && (
            <View style={styles.inputIcon}>
              {isEmailValid ? <CheckCircle2 size={16} color={theme.status.success.solid} /> : <AlertCircle size={16} color={theme.status.error.solid} />}
            </View>
          )}
        </View>
        {touched && email.length > 0 && !isEmailValid && (
          <Text style={[styles.errorText, { color: theme.status.error.text }]}>Enter a valid email address</Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={theme.textFaint}
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background, paddingRight: 40 }]}
          />
          <TouchableOpacity style={styles.inputIcon} onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={16} color={theme.textMuted} /> : <Eye size={16} color={theme.textMuted} />}
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthBars}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        (passwordStrength === 'Weak' && i === 0) ||
                        (passwordStrength === 'Medium' && i <= 1) ||
                        passwordStrength === 'Strong'
                          ? strengthColor
                          : theme.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: strengthColor }]}>{passwordStrength}</Text>
          </View>
        )}
      </View>

      {/* Notes with char counter */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.charCount, { color: notes.length > charLimit ? theme.status.error.solid : theme.textFaint }]}>
            {notes.length}/{charLimit}
          </Text>
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Optional notes…"
          placeholderTextColor={theme.textFaint}
          style={[styles.textarea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  charCount: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
