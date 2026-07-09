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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import api from '../lib/api';
import { Colors } from '../constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!password || password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/login')}>
        <ArrowLeft size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>New Password</Text>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          Please enter your new password below.
        </Text>

        {success ? (
          <View style={[styles.successBox, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}>
            <CheckCircle2 size={24} color={theme.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: theme.success }]}>Password Reset!</Text>
            <Text style={[styles.successDesc, { color: theme.success }]}>
              Your password has been successfully updated. You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 24 }]}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15' }]}>
                <Text style={{ color: theme.destructive, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: theme.mutedForeground }]}>New Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Lock size={18} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••"
                placeholderTextColor={theme.mutedForeground}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Text style={[styles.label, { color: theme.mutedForeground, marginTop: 16 }]}>Confirm Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Lock size={18} color={theme.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••"
                placeholderTextColor={theme.mutedForeground}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 24 }]}
              onPress={handleResetPassword}
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Reset Password</Text>
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
  
  primaryBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  successBox: { padding: 32, borderRadius: 24, borderWidth: 1, alignItems: 'center', textAlign: 'center' },
  successTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  successDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
