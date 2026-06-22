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
  const [role, setRole] = useState('student'); // student, researcher, lecturer
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

      // If user is admin, redirect to admin dashboard (or can let them go to main dashboard with admin access)
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: Math.max(insets.top + 10, 30), 
            paddingBottom: Math.max(insets.bottom + 20, 40) 
          }
        ]} 
        keyboardShouldPersistTaps="handled"
      >
        {/* Back to Home Button */}
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <ArrowLeft size={18} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back to Home</Text>
        </TouchableOpacity>

        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoBg, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <BookOpen size={32} color={theme.primary} />
          </View>
          <Text style={[styles.brandText, { color: theme.text }]}>SciTrend</Text>
          <Text style={[styles.subBrandText, { color: theme.muted }]}>
            {isLogin ? 'Sign in to track publication trends' : 'Join SciTrend to discover emerging research'}
          </Text>
        </View>

        {/* Card Form */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
              <Text style={[styles.errorText, { color: theme.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* Registration Extra Fields */}
          {!isLogin && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <User size={18} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={theme.muted}
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
                      { borderColor: theme.border },
                      role === r && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        { color: theme.text },
                        role === r && { color: '#ffffff', fontWeight: 'bold' },
                      ]}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Institution / University</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Building size={18} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  value={institution}
                  onChangeText={setInstitution}
                  placeholder="FPT University (Optional)"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text }]}
                  autoCapitalize="words"
                />
              </View>
            </>
          )}

          {/* Email */}
          <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Mail size={18} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@domain.com"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text }]}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Lock size={18} color={theme.icon} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <EyeOff size={18} color={theme.icon} /> : <Eye size={18} color={theme.icon} />}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Switch Links */}
        <View style={styles.switchContainer}>
          <Text style={[styles.switchText, { color: theme.muted }]}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <TouchableOpacity onPress={toggleMode}>
            <Text style={[styles.switchLink, { color: theme.primary }]}>
              {isLogin ? 'Sign up free' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Temporary Bypass Option (for testing ease) */}
        <TouchableOpacity 
          style={styles.bypassBtn} 
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.bypassText, { color: theme.primary }]}>Explore without logging in →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'stretch',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subBrandText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  roleButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButtonText: {
    fontSize: 12,
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bypassBtn: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
  },
  bypassText: {
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
