import React, { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { welcome as c } from './WelcomeUI';

type Props = TextInputProps & { label: string; hint?: string; password?: boolean };

export const AuthField = forwardRef<TextInput, Props>(function AuthField({ label, hint, password, style, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.wrapper, focused && styles.focused]}>
      <TextInput {...props} ref={ref} accessibilityLabel={label} placeholderTextColor="#7A877E"
        secureTextEntry={password ? !visible : props.secureTextEntry}
        autoCapitalize={password ? 'none' : props.autoCapitalize} autoCorrect={password ? false : props.autoCorrect}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        style={[styles.input, style]} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        disabled={props.editable === false} onPress={() => setVisible(value => !value)} style={styles.eye}>
        {visible ? <EyeOff size={20} color={c.green} /> : <Eye size={20} color={c.green} />}
      </Pressable>}
    </View>
    {!!hint && <Text style={styles.hint}>{hint}</Text>}
  </View>;
});

const styles = StyleSheet.create({
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: 9 },
  wrapper: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 15, backgroundColor: '#FDFCF7', paddingLeft: 16 },
  focused: { borderColor: c.green, backgroundColor: c.white },
  input: { flex: 1, minWidth: 0, height: 56, fontSize: 15, color: c.ink, paddingRight: 16,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  eye: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
});
