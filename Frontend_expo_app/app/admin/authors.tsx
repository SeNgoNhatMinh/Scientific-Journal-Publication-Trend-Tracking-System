import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

export default function AdminAuthorsScreen() {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [authors, setAuthors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Form Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [orcid, setOrcid] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [openalexId, setOpenalexId] = useState('');
  const [worksCount, setWorksCount] = useState('');

  const fetchAuthors = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      const res = await api.get('/authors', { params });
      setAuthors(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchAuthors, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setEditingAuthor(null);
    setFullName('');
    setOrcid('');
    setAffiliation('');
    setOpenalexId('');
    setWorksCount('');
    setModalVisible(true);
  };

  const handleOpenEdit = (author: any) => {
    setEditingAuthor(author);
    setFullName(author.fullName || '');
    setOrcid(author.orcid || '');
    setAffiliation(author.affiliation || '');
    setOpenalexId(author.openalexId || '');
    setWorksCount(author.worksCount?.toString() || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required');
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      orcid: orcid.trim() || null,
      affiliation: affiliation.trim() || null,
      openalexId: openalexId.trim() || null,
      worksCount: worksCount ? parseInt(worksCount, 10) : null,
    };

    setIsLoading(true);
    setModalVisible(false);
    try {
      if (editingAuthor) {
        // Update
        const res = await api.put(`/authors/${editingAuthor._id}`, payload);
        if (res.data.success) {
          setAuthors((prev) =>
            prev.map((a) => (a._id === editingAuthor._id ? res.data.data : a))
          );
        }
      } else {
        // Create
        await api.post('/authors', payload);
        fetchAuthors();
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save author');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (authorId: string, name: string) => {
    Alert.alert(
      'Delete Author',
      `Are you sure you want to permanently delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(authorId);
            try {
              await api.delete(`/authors/${authorId}`);
              setAuthors((prev) => prev.filter((a) => a._id !== authorId));
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search and Add Row */}
      <View style={styles.topSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search authors by name..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
        <TouchableOpacity
          onPress={handleOpenCreate}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading && authors.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : authors.length === 0 ? (
        <View style={styles.centerContainer}>
          <Users size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No authors found.</Text>
        </View>
      ) : (
        <FlatList
          data={authors}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {item.fullName ? item.fullName[0].toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.fullName}</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.muted }]} numberOfLines={1}>
                    {item.affiliation || 'No Affiliation'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                {item.orcid ? (
                  <View style={[styles.badge, { backgroundColor: theme.border + '30', borderColor: theme.border }]}>
                    <Text style={[styles.badgeText, { color: theme.text }]}>ORCID: {item.orcid}</Text>
                  </View>
                ) : null}
                {item.worksCount !== null ? (
                  <View style={[styles.badge, { backgroundColor: '#3b82f620', borderColor: '#3b82f630' }]}>
                    <BookOpen size={10} color="#3b82f6" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#3b82f6' }]}>{item.worksCount} works</Text>
                  </View>
                ) : null}
              </View>

              <View style={[styles.cardActions, { borderTopColor: theme.border + '30' }]}>
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item)}
                  style={styles.actionBtn}
                >
                  <Edit2 size={14} color={theme.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item._id, item.fullName)}
                  style={styles.actionBtn}
                  disabled={actionId === item._id}
                >
                  {actionId === item._id ? (
                    <ActivityIndicator size="small" color={theme.destructive} />
                  ) : (
                    <>
                      <Trash2 size={14} color={theme.destructive} />
                      <Text style={[styles.actionBtnText, { color: theme.destructive }]}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingAuthor ? 'Edit Author' : 'Add New Author'}
            </Text>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Full Name *</Text>
                <TextInput
                  placeholder="e.g. John Doe"
                  placeholderTextColor={theme.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>ORCID ID</Text>
                <TextInput
                  placeholder="e.g. 0000-0002-1825-0097"
                  placeholderTextColor={theme.muted}
                  value={orcid}
                  onChangeText={setOrcid}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Affiliation</Text>
                <TextInput
                  placeholder="e.g. Stanford University"
                  placeholderTextColor={theme.muted}
                  value={affiliation}
                  onChangeText={setAffiliation}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>OpenAlex ID</Text>
                <TextInput
                  placeholder="e.g. A5012345678"
                  placeholderTextColor={theme.muted}
                  value={openalexId}
                  onChangeText={setOpenalexId}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Works Count</Text>
                <TextInput
                  placeholder="e.g. 45"
                  placeholderTextColor={theme.muted}
                  keyboardType="numeric"
                  value={worksCount}
                  onChangeText={setWorksCount}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 12,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
