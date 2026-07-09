import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, Building, ArrowLeft } from 'lucide-react-native';
import api from '../lib/api';
import { Colors } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [institution, setInstitution] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill out all required fields.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email, password }
        : { email, password, name, role, institution };

      const res = await api.post(endpoint, payload);

      if (res.data.token) {
        await AsyncStorage.setItem('token', res.data.token);
      }
      if (res.data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      }

      if (res.data.user?.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Network Error' || !err.response) {
        setError('Network error. Cannot connect to backend server. Please verify the server is running and accessible.');
      } else {
        setError(err.response.data?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 10, 30), paddingBottom: Math.max(insets.bottom + 20, 40) }]} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <ArrowLeft size={18} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back to Home</Text>
        </TouchableOpacity>

        <View style={styles.brandContainer}>
          <View style={[styles.logoBg, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40', borderWidth: 1 }]}>
            <BookOpen size={36} color={theme.primary} />
          </View>
          <Text style={[styles.brandText, { color: theme.text }]}>SciTrend</Text>
          <Text style={[styles.subBrandText, { color: theme.mutedForeground }]}>
            {isLogin ? 'Sign in to track publication trends' : 'Join SciTrend to discover emerging research'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
              <Text style={[styles.errorText, { color: theme.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {!isLogin && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <User size={18} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { color: theme.text }]}
                  autoCapitalize="words"
                />
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Role</Text>
              <View style={styles.roleContainer}>
                {['student', 'researcher', 'lecturer'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.roleButton,
                      { borderColor: theme.border, backgroundColor: theme.background },
                      role === r && { borderColor: theme.primary, backgroundColor: theme.primary + '15' },
                    ]}
                  >
                    <Text style={[styles.roleText, { color: role === r ? theme.primary : theme.mutedForeground }]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Institution</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Building size={18} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  value={institution}
                  onChangeText={setInstitution}
                  placeholder="University / Organization"
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { color: theme.text }]}
                  autoCapitalize="words"
                />
              </View>
            </>
          )}

          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Mail size={18} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor={theme.mutedForeground}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Lock size={18} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.mutedForeground}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <EyeOff size={18} color={theme.icon} /> : <Eye size={18} color={theme.icon} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={toggleMode} style={styles.toggleContainer}>
          <Text style={[styles.toggleText, { color: theme.mutedForeground }]}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  backText: { fontSize: 14, marginLeft: 6, fontWeight: '500' },
  brandContainer: { alignItems: 'center', marginBottom: 32 },
  logoBg: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  brandText: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  subBrandText: { fontSize: 14, textAlign: 'center' },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: '100%', fontSize: 15 },
  eyeIcon: { padding: 8 },
  roleContainer: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleButton: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  roleText: { fontSize: 12, fontWeight: '600' },
  submitButton: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleContainer: { marginTop: 24, alignItems: 'center' },
  toggleText: { fontSize: 14 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, textAlign: 'center' },
});
