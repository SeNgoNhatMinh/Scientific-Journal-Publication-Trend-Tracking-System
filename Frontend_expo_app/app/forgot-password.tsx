import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import api from '../lib/api';
import { Colors } from '../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSendLink = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          Enter your email address and we will send you a link to reset your password.
        </Text>

        {success ? (
          <View style={[styles.successBox, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}>
            <CheckCircle2 size={24} color={theme.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: theme.success }]}>Check your email</Text>
            <Text style={[styles.successDesc, { color: theme.success }]}>
              We've sent password reset instructions to your email address.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 24 }]}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.primaryBtnText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15' }]}>
                <Text style={{ color: theme.destructive, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: theme.mutedForeground }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Mail size={18} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="you@university.edu"
                placeholderTextColor={theme.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 24 }]}
              onPress={handleSendLink}
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 20 },
  content: { flex: 1, justifyContent: 'center', paddingBottom: 100 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  
  card: { padding: 24, borderRadius: 24, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  
  errorBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  
  primaryBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  successBox: { padding: 32, borderRadius: 24, borderWidth: 1, alignItems: 'center', textAlign: 'center' },
  successTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  successDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
