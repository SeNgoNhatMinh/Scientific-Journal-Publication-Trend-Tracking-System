import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User as UserIcon,
  Mail,
  Shield,
  Activity,
  Key,
  LogOut,
  Save,
  Building,
  CheckCircle,
} from 'lucide-react-native';
import api from '../lib/api';
import { Colors } from '../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Forms state
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const u = res.data.user;
        setUser(u);
        setName(u.name || '');
        setInstitution(u.institution || '');
        setBio(u.bio || '');
        setInterests(u.interests?.join(', ') || '');
        await AsyncStorage.setItem('user', JSON.stringify(u));
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
      const cached = await AsyncStorage.getItem('user');
      if (cached) {
        const u = JSON.parse(cached);
        setUser(u);
        setName(u.name || '');
        setInstitution(u.institution || '');
        setBio(u.bio || '');
        setInterests(u.interests?.join(', ') || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSuccess('');
    try {
      const res = await api.put('/auth/me', {
        name,
        institution,
        bio,
        interests,
      });
      if (res.data.success) {
        setUser(res.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        setProfileSuccess('Profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await api.put('/auth/me/password', {
        currentPassword,
        newPassword,
      });
      if (res.data.success) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    router.replace('/login');
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Profile not loaded.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) }]}>

      {/* Decorative Banner */}
      <View style={[styles.banner, { backgroundColor: theme.primary + '15' }]}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <UserIcon size={44} color={theme.primary} />
        </View>
        <Text style={[styles.profileName, { color: theme.text }]}>{user.name}</Text>
        <Text style={[styles.profileEmail, { color: theme.muted }]}>{user.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.primary + '20' }]}>
          <Shield size={12} color={theme.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.roleText, { color: theme.primary }]}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Account Information</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={[styles.statsLabel, { color: theme.muted }]}>Member Since</Text>
          <Text style={[styles.statsValue, { color: theme.text }]}>
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={[styles.statsLabel, { color: theme.muted }]}>Saved Bookmarks</Text>
          <Text style={[styles.statsValue, { color: theme.text }]}>{user.bookmarks?.length || 0}</Text>
        </View>
      </View>

      {/* General Settings */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <UserIcon size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>General Information</Text>
        </View>

        {profileSuccess ? (
          <View style={[styles.successBox, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}>
            <CheckCircle size={14} color={theme.success} style={{ marginRight: 6 }} />
            <Text style={[styles.successText, { color: theme.success }]}>{profileSuccess}</Text>
          </View>
        ) : null}

        <Text style={[styles.inputLabel, { color: theme.muted }]}>FULL NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />

        <Text style={[styles.inputLabel, { color: theme.muted }]}>INSTITUTION</Text>
        <TextInput
          value={institution}
          onChangeText={setInstitution}
          placeholder="FPT University"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />

        <Text style={[styles.inputLabel, { color: theme.muted }]}>BIO</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Research bio..."
          placeholderTextColor={theme.muted}
          multiline
          numberOfLines={4}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: theme.border,
              height: 80,
              textAlignVertical: 'top',
            },
          ]}
        />

        <Text style={[styles.inputLabel, { color: theme.muted }]}>RESEARCH INTERESTS</Text>
        <TextInput
          value={interests}
          onChangeText={setInterests}
          placeholder="LLM, Graph Networks, Bioinformatics"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />

        <TouchableOpacity
          onPress={handleSaveProfile}
          disabled={isSavingProfile}
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        >
          {isSavingProfile ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Security Settings */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => setShowPasswordForm(!showPasswordForm)}
          style={styles.securityHeaderToggle}
        >
          <Key size={18} color="#f97316" />
          <Text style={[styles.cardTitle, { color: theme.text, flex: 1, marginLeft: 8 }]}>
            Security Settings
          </Text>
          <Text style={{ color: theme.primary, fontSize: 13, fontWeight: 'bold' }}>
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </Text>
        </TouchableOpacity>

        {passwordSuccess ? (
          <Text style={[styles.successText, { color: theme.success, marginTop: 8 }]}>{passwordSuccess}</Text>
        ) : null}
        {passwordError ? (
          <Text style={[styles.errorText, { color: theme.destructive, marginTop: 8 }]}>{passwordError}</Text>
        ) : null}

        {showPasswordForm && (
          <View style={styles.passwordForm}>
            <Text style={[styles.inputLabel, { color: theme.muted }]}>CURRENT PASSWORD</Text>
            <TextInput
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            />
            <Text style={[styles.inputLabel, { color: theme.muted }]}>NEW PASSWORD</Text>
            <TextInput
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            />
            <Text style={[styles.inputLabel, { color: theme.muted }]}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            />

            <TouchableOpacity
              onPress={handleUpdatePassword}
              disabled={isSavingPassword}
              style={[styles.passwordSubmitBtn, { backgroundColor: '#f97316' }]}
            >
              {isSavingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[styles.logoutBtn, { borderColor: theme.destructive }]}
      >
        <LogOut size={18} color={theme.destructive} style={{ marginRight: 8 }} />
        <Text style={[styles.logoutText, { color: theme.destructive }]}>Logout Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderRadius: 20,
    paddingVertical: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea20',
  },
  statsLabel: {
    fontSize: 13,
  },
  statsValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  input: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  securityHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordForm: {
    marginTop: 10,
    gap: 4,
  },
  passwordSubmitBtn: {
    height: 40,
    borderRadius: 10,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
