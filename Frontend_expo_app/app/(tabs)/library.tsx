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
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Library as LibraryIcon,
  FolderKanban,
  Search,
  Plus,
  FileText,
  StickyNote,
  ArrowRight,
  BookmarkX,
  ExternalLink,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const WORKSPACE_COLORS = [
  '#8B2CE512',
  '#06b6d412',
  '#10b98112',
  '#f9731612',
  '#ec489912',
  '#3b82f612',
];

export default function LibraryScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeSegment, setActiveSegment] = useState<'bookmarks' | 'workspaces'>(
    tab === 'workspaces' ? 'workspaces' : 'bookmarks'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync segment when arriving with tab param
  useEffect(() => {
    if (tab === 'workspaces') setActiveSegment('workspaces');
    else if (tab === 'bookmarks') setActiveSegment('bookmarks');
  }, [tab]);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Workspaces State
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      // If not logged in, we can direct them to login
      router.push('/login');
      return;
    }

    try {
      if (activeSegment === 'bookmarks') {
        const res = await api.get('/papers/bookmarks');
        setBookmarks(res.data.papers || []);
      } else {
        const res = await api.get('/workspaces');
        setWorkspaces(res.data.workspaces || []);
      }
    } catch (e) {
      console.error('Failed to fetch library data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [activeSegment])
  );

  // Remove Bookmark
  const handleRemoveBookmark = async (id: string) => {
    try {
      await api.post(`/papers/${id}/bookmark`);
      setBookmarks(bookmarks.filter((b) => (b._id || b.id) !== id));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  // Create Workspace
  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setIsCreatingWs(true);
    try {
      await api.post('/workspaces', { name: newWsName, description: newWsDesc });
      setIsModalOpen(false);
      setNewWsName('');
      setNewWsDesc('');
      loadData(); // Reload workspaces list
    } catch (err) {
      console.error('Failed to create workspace', err);
    } finally {
      setIsCreatingWs(false);
    }
  };

  const filteredBookmarks = bookmarks.filter((b) => {
    const q = searchQuery.toLowerCase();
    const title = b.title || '';
    const abstract = b.abstract || '';
    return title.toLowerCase().includes(q) || abstract.toLowerCase().includes(q);
  });

  const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown';
    if (typeof authors[0] === 'string') return authors.join(', ');
    return authors.map((a) => a.name).join(', ');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with segment picker */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <LibraryIcon size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>My Library</Text>
        </View>

        {/* Segment selector */}
        <View style={[styles.segmentContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'bookmarks' && { backgroundColor: theme.primary }]}
            onPress={() => {
              setActiveSegment('bookmarks');
              setSearchQuery('');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: theme.text },
                activeSegment === 'bookmarks' && { color: '#ffffff', fontWeight: 'bold' },
              ]}
            >
              Bookmarks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'workspaces' && { backgroundColor: theme.primary }]}
            onPress={() => {
              setActiveSegment('workspaces');
              setSearchQuery('');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: theme.text },
                activeSegment === 'workspaces' && { color: '#ffffff', fontWeight: 'bold' },
              ]}
            >
              Workspaces
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bookmarks Section */}
      {activeSegment === 'bookmarks' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchSection}>
            <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Search size={18} color={theme.icon} style={styles.searchIcon} />
              <TextInput
                placeholder="Search saved papers..."
                placeholderTextColor={theme.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : filteredBookmarks.length === 0 ? (
            <View style={styles.centerContainer}>
              <FileText size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                {searchQuery ? 'No matching bookmarks found.' : 'Your reading list is empty.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredBookmarks}
              keyExtractor={(item) => (item._id || item.id).toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const paperId = item._id || item.id;
                return (
                  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity onPress={() => router.push(`/paper/${paperId}`)}>
                      <Text style={[styles.paperTitle, { color: theme.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.paperMeta, { color: theme.muted }]}>
                      {formatAuthors(item.authors)} · {item.publicationYear || 'N/A'}
                    </Text>
                    <Text style={[styles.paperDesc, { color: theme.muted }]} numberOfLines={2}>
                      {item.abstract || 'No abstract available.'}
                    </Text>

                    <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                      <TouchableOpacity
                        onPress={() => handleRemoveBookmark(paperId)}
                        style={styles.removeBtn}
                      >
                        <BookmarkX size={15} color={theme.destructive} />
                        <Text style={[styles.removeBtnText, { color: theme.destructive }]}>Remove</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => router.push(`/paper/${paperId}`)}
                        style={styles.readBtn}
                      >
                        <Text style={[styles.readBtnText, { color: theme.primary }]}>Read More</Text>
                        <ArrowRight size={14} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Workspaces Section */}
      {activeSegment === 'workspaces' && (
        <View style={{ flex: 1 }}>
          <View style={styles.actionHeader}>
            <Text style={[styles.actionLabel, { color: theme.muted }]}>
              {workspaces.length} research directories
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalOpen(true)}
              style={[styles.addWsBtn, { backgroundColor: theme.primary }]}
            >
              <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addWsBtnText}>New Workspace</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : workspaces.length === 0 ? (
            <View style={styles.centerContainer}>
              <FolderKanban size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>No workspaces found. Create one to organize.</Text>
            </View>
          ) : (
            <FlatList
              data={workspaces}
              keyExtractor={(item) => (item._id || item.id).toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => {
                const wsId = item._id || item.id;
                const bg = WORKSPACE_COLORS[index % WORKSPACE_COLORS.length];
                return (
                  <TouchableOpacity
                    onPress={() => router.push(`/workspace/${wsId}`)}
                    style={[styles.wsCard, { backgroundColor: bg, borderColor: theme.border }]}
                  >
                    <View style={styles.wsHeader}>
                      <FolderKanban size={20} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={[styles.wsTitle, { color: theme.text }]}>{item.name}</Text>
                    </View>
                    <Text style={[styles.wsDesc, { color: theme.muted }]} numberOfLines={2}>
                      {item.description || 'No description provided.'}
                    </Text>

                    {item.stats && (
                      <View style={styles.wsStatsRow}>
                        <View style={styles.wsStat}>
                          <FileText size={12} color={theme.icon} />
                          <Text style={[styles.wsStatText, { color: theme.text }]}>
                            {item.stats.papers || 0} Papers
                          </Text>
                        </View>
                        <View style={styles.wsStat}>
                          <StickyNote size={12} color={theme.icon} />
                          <Text style={[styles.wsStatText, { color: theme.text }]}>
                            {item.stats.notes || 0} Notes
                          </Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* New Workspace Modal */}
          <Modal visible={isModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create New Workspace</Text>
                <Text style={[styles.modalDesc, { color: theme.muted }]}>
                  Workspaces group related papers, notes, and map key-terms.
                </Text>

                <TextInput
                  placeholder="Workspace Name"
                  placeholderTextColor={theme.muted}
                  value={newWsName}
                  onChangeText={setNewWsName}
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Short Description (optional)"
                  placeholderTextColor={theme.muted}
                  value={newWsDesc}
                  onChangeText={setNewWsDesc}
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsModalOpen(false);
                      setNewWsName('');
                      setNewWsDesc('');
                    }}
                    style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateWorkspace}
                    disabled={isCreatingWs || !newWsName.trim()}
                    style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  >
                    {isCreatingWs ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.modalBtnText, { color: '#ffffff', fontWeight: 'bold' }]}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  paperTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
    marginBottom: 4,
  },
  paperMeta: {
    fontSize: 11,
    marginBottom: 8,
  },
  paperDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  actionLabel: {
    fontSize: 13,
  },
  addWsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
  },
  addWsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  wsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  wsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  wsDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  wsStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  wsStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wsStatText: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 16,
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 13,
  },
});
