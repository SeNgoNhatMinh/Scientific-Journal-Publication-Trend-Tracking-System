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
  Settings,
  ChevronLeft,
  ChevronRight,
  Library,
  Database
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
        setTimeout(() => setProfileSuccess(''), 3000);
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
        setTimeout(() => {
          setShowPasswordForm(false);
          setPasswordSuccess('');
        }, 2000);
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
        <Text style={{ color: theme.text }}>Please login to view your profile.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 16 }]} onPress={() => router.push('/login')}>
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings & Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.profileHeaderRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
              <Text style={[styles.userEmail, { color: theme.mutedForeground }]}>{user.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                <Shield size={12} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.roleText, { color: theme.primary }]}>{user.role.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Features */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Features</Text>
          
          <TouchableOpacity 
            style={[styles.featureRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
            onPress={() => router.push('/library')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Library size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>My Library (Bookmarks)</Text>
            </View>
            <ChevronRight size={20} color={theme.icon} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureRow, user.role === 'admin' ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : {}]}
            onPress={() => router.push('/corpus')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Database size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>Corpus Management</Text>
            </View>
            <ChevronRight size={20} color={theme.icon} />
          </TouchableOpacity>

          {user.role === 'admin' && (
            <TouchableOpacity 
              style={styles.featureRow}
              onPress={() => router.push('/admin/dashboard')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Shield size={20} color={theme.destructive} style={{ marginRight: 12 }} />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>Admin Dashboard</Text>
              </View>
              <ChevronRight size={20} color={theme.icon} />
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Profile Details */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Details</Text>
          
          <Text style={[styles.label, { color: theme.mutedForeground }]}>Full Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <UserIcon size={16} color={theme.icon} style={styles.inputIcon} />
            <TextInput value={name} onChangeText={setName} style={[styles.input, { color: theme.text }]} placeholderTextColor={theme.mutedForeground} />
          </View>

          <Text style={[styles.label, { color: theme.mutedForeground }]}>Institution</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Building size={16} color={theme.icon} style={styles.inputIcon} />
            <TextInput value={institution} onChangeText={setInstitution} style={[styles.input, { color: theme.text }]} placeholder="University / Organization" placeholderTextColor={theme.mutedForeground} />
          </View>

          <Text style={[styles.label, { color: theme.mutedForeground }]}>Bio</Text>
          <TextInput value={bio} onChangeText={setBio} multiline style={[styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} placeholder="Tell us about your research..." placeholderTextColor={theme.mutedForeground} />

          <Text style={[styles.label, { color: theme.mutedForeground }]}>Interests (comma separated)</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Activity size={16} color={theme.icon} style={styles.inputIcon} />
            <TextInput value={interests} onChangeText={setInterests} style={[styles.input, { color: theme.text }]} placeholder="Machine Learning, NLP..." placeholderTextColor={theme.mutedForeground} />
          </View>

          {profileSuccess ? (
            <View style={[styles.successBox, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}>
              <CheckCircle size={16} color={theme.success} style={{ marginRight: 6 }} />
              <Text style={{ color: theme.success, fontSize: 13 }}>{profileSuccess}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleSaveProfile} disabled={isSavingProfile} style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 12 }]}>
            {isSavingProfile ? <ActivityIndicator color="#fff" /> : (
              <>
                <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Security / Password */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowPasswordForm(!showPasswordForm)} style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Key size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Change Password</Text>
            </View>
            <Text style={{ color: theme.primary, fontSize: 24 }}>{showPasswordForm ? '-' : '+'}</Text>
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={{ marginTop: 16 }}>
              {passwordError ? <Text style={{ color: theme.destructive, fontSize: 13, marginBottom: 12 }}>{passwordError}</Text> : null}
              {passwordSuccess ? <Text style={{ color: theme.success, fontSize: 13, marginBottom: 12 }}>{passwordSuccess}</Text> : null}

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Current Password</Text>
              <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={[styles.simpleInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} />

              <Text style={[styles.label, { color: theme.mutedForeground }]}>New Password</Text>
              <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={[styles.simpleInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} />

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Confirm New Password</Text>
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={[styles.simpleInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} />

              <TouchableOpacity onPress={handleUpdatePassword} disabled={isSavingPassword} style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 12 }]}>
                {isSavingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '40' }]}>
          <LogOut size={20} color={theme.destructive} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.destructive }]}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 60 },
  
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 24, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  userEmail: { fontSize: 14, marginBottom: 8 },
  roleBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '800' },
  
  featureRow: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, height: 44, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14 },
  simpleInput: { borderWidth: 1, borderRadius: 12, height: 44, paddingHorizontal: 12, fontSize: 14 },
  textArea: { borderWidth: 1, borderRadius: 12, minHeight: 80, paddingHorizontal: 12, paddingTop: 12, fontSize: 14, textAlignVertical: 'top' },
  
  primaryBtn: { flexDirection: 'row', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  successBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  
  logoutBtn: { flexDirection: 'row', height: 50, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '600' },
});
