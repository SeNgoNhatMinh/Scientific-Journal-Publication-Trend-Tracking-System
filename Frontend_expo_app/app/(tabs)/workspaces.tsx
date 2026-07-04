import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  FlatList,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FolderKanban,
  Plus,
  FileText,
  StickyNote,
  Users,
  X,
  ChevronRight,
  Lock,
  Globe,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import NotificationBell from '../../components/ui/NotificationBell';

export default function WorkspacesScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Create Workspace Modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState('private');
  const [isCreating, setIsCreating] = useState(false);

  const checkUserStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setIsLoggedIn(true);
        fetchWorkspaces();
      } else {
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkUserStatus();
    }, [])
  );

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data.workspaces || []);
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchWorkspaces();
  };

  const handleCreateWorkspace = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await api.post('/workspaces', {
        name: newName,
        description: newDesc,
        visibility: newVisibility,
        plan: 'free',
      });
      setModalVisible(false);
      setNewName('');
      setNewDesc('');
      fetchWorkspaces();
    } catch (err) {
      console.error('Failed to create workspace', err);
    } finally {
      setIsCreating(false);
    }
  };

  const renderWorkspace = ({ item }: { item: any }) => {
    const isPending = item.status === 'pending';

    const handlePress = () => {
      if (isPending) {
        Alert.alert(
          'Invitation Pending',
          'You have a pending invitation to this workspace. Please accept it from the web interface or ask the owner.'
        );
      } else {
        router.push(`/workspace/${item._id}` as any);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: isPending ? 0.7 : 1 }]}
        onPress={handlePress}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            {item.visibility === 'public' ? (
              <Globe size={16} color={theme.mutedForeground} style={{ marginRight: 6 }} />
            ) : (
              <Lock size={16} color={theme.mutedForeground} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          {isPending ? (
            <View style={[styles.badge, { backgroundColor: '#f59e0b20' }]}>
              <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '600' }}>Pending</Text>
            </View>
          ) : (
            <ChevronRight size={20} color={theme.mutedForeground} />
          )}
        </View>
        
        {item.description ? (
          <Text style={[styles.cardDesc, { color: theme.mutedForeground }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <FileText size={14} color={theme.mutedForeground} />
            <Text style={[styles.statText, { color: theme.mutedForeground }]}>{item.stats?.paperCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <StickyNote size={14} color={theme.mutedForeground} />
            <Text style={[styles.statText, { color: theme.mutedForeground }]}>{item.stats?.noteCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={14} color={theme.mutedForeground} />
            <Text style={[styles.statText, { color: theme.mutedForeground }]}>{item.members?.length || 1}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <FolderKanban size={64} color={theme.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
        <Text style={[styles.title, { color: theme.text, textAlign: 'center', marginBottom: 8 }]}>Sign In to View Workspaces</Text>
        <Text style={{ color: theme.mutedForeground, textAlign: 'center', marginBottom: 24 }}>
          Organize your research papers, notes, and keyword trends in workspaces.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary, width: '100%' }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.primaryButtonText}>Sign In / Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <FolderKanban size={24} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.text }]}>My Workspaces</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            Organize papers and track trends
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {isLoggedIn && <NotificationBell />}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary + '20' }]}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={workspaces}
        keyExtractor={(item) => item._id}
        renderItem={renderWorkspace}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.mutedForeground, textAlign: 'center' }}>
              No workspaces found. Create one to get started!
            </Text>
          </View>
        }
      />

      {/* Create Workspace Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create Workspace</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Computer Vision Research"
                placeholderTextColor={theme.mutedForeground}
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, minHeight: 80 }]}
                placeholder="Optional description"
                placeholderTextColor={theme.mutedForeground}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.visibilityRow}>
              <TouchableOpacity
                style={[
                  styles.visibilityBtn,
                  { borderColor: theme.border },
                  newVisibility === 'private' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                ]}
                onPress={() => setNewVisibility('private')}
              >
                <Lock size={16} color={newVisibility === 'private' ? theme.primary : theme.mutedForeground} />
                <Text style={{ color: newVisibility === 'private' ? theme.primary : theme.text, marginLeft: 6, fontSize: 13, fontWeight: '500' }}>Private</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.visibilityBtn,
                  { borderColor: theme.border },
                  newVisibility === 'public' && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                ]}
                onPress={() => setNewVisibility('public')}
              >
                <Globe size={16} color={newVisibility === 'public' ? theme.primary : theme.mutedForeground} />
                <Text style={{ color: newVisibility === 'public' ? theme.primary : theme.text, marginLeft: 6, fontSize: 13, fontWeight: '500' }}>Public</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: (!newName || isCreating) ? 0.7 : 1 }]}
              onPress={handleCreateWorkspace}
              disabled={!newName || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Workspace</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardDesc: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  visibilityRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  visibilityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  
  primaryButton: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
