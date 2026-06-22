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
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Check,
  X,
  FileText,
  Activity,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export default function AdminJournalsScreen() {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [journals, setJournals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Custom Alert / Confirm Modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'alert' | 'confirm'>('alert');
  const [alertOnConfirm, setAlertOnConfirm] = useState<() => void>(() => {});
  const [alertIsDestructive, setAlertIsDestructive] = useState(false);

  const showCustomAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType('alert');
    setAlertOnConfirm(() => {});
    setAlertIsDestructive(false);
    setAlertVisible(true);
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType('confirm');
    setAlertOnConfirm(() => onConfirm);
    setAlertIsDestructive(isDestructive);
    setAlertVisible(true);
  };

  // Form Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJournal, setEditingJournal] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [issn, setIssn] = useState('');
  const [eissn, setEissn] = useState('');
  const [description, setDescription] = useState('');
  const [categoryRaw, setCategoryRaw] = useState('');
  const [publisher, setPublisher] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [impactFactor, setImpactFactor] = useState('');
  const [h5Index, setH5Index] = useState('');
  const [paperCount, setPaperCount] = useState('0');
  const [fieldDomain, setFieldDomain] = useState('');
  const [isTracked, setIsTracked] = useState(false);
  const [source, setSource] = useState('openalex');

  const fetchJournals = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      const res = await api.get('/journals', { params });
      setJournals(res.data.data || []);
    } catch (err) {
      console.error(err);
      showCustomAlert(
        'Network Error',
        'Could not load journals. Please check that the server is running and accessible.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchJournals, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setEditingJournal(null);
    setTitle('');
    setIssn('');
    setEissn('');
    setDescription('');
    setCategoryRaw('');
    setPublisher('');
    setWebsiteUrl('');
    setImpactFactor('');
    setH5Index('');
    setPaperCount('0');
    setFieldDomain('');
    setIsTracked(false);
    setSource('openalex');
    setModalVisible(true);
  };

  const handleOpenEdit = (journal: any) => {
    setEditingJournal(journal);
    setTitle(journal.title || '');
    setIssn(journal.issn || '');
    setEissn(journal.eissn || '');
    setDescription(journal.description || '');
    setCategoryRaw(journal.category ? journal.category.join(', ') : '');
    setPublisher(journal.publisher || '');
    setWebsiteUrl(journal.websiteUrl || '');
    setImpactFactor(journal.impactFactor?.toString() || '');
    setH5Index(journal.h5Index?.toString() || '');
    setPaperCount(journal.paperCount?.toString() || '0');
    setFieldDomain(journal.fieldDomain || '');
    setIsTracked(journal.isTracked ?? false);
    setSource(journal.source || 'openalex');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showCustomAlert('Validation Error', 'Journal Title is required');
      return;
    }

    const payload = {
      title: title.trim(),
      issn: issn.trim() || null,
      eissn: eissn.trim() || null,
      description: description.trim() || null,
      category: categoryRaw ? categoryRaw.split(',').map((c) => c.trim()).filter(Boolean) : [],
      publisher: publisher.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      impactFactor: impactFactor ? parseFloat(impactFactor) : null,
      h5Index: h5Index ? parseInt(h5Index, 10) : null,
      paperCount: paperCount ? parseInt(paperCount, 10) : 0,
      fieldDomain: fieldDomain.trim() || null,
      isTracked,
      source,
    };

    setIsLoading(true);
    setModalVisible(false);
    try {
      if (editingJournal) {
        const res = await api.put(`/journals/${editingJournal._id}`, payload);
        if (res.data.success) {
          setJournals((prev) =>
            prev.map((j) => (j._id === editingJournal._id ? res.data.data : j))
          );
        }
      } else {
        await api.post('/journals', payload);
        fetchJournals();
      }
    } catch (e: any) {
      showCustomAlert('Error', e.response?.data?.message || 'Failed to save journal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTracked = async (journal: any) => {
    setActionId(journal._id + '-track');
    try {
      const res = await api.put(`/journals/${journal._id}`, {
        isTracked: !journal.isTracked,
      });
      if (res.data.success) {
        setJournals((prev) =>
          prev.map((j) => (j._id === journal._id ? { ...j, isTracked: res.data.data.isTracked } : j))
        );
      }
    } catch (e: any) {
      showCustomAlert('Error', 'Failed to toggle tracking status');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = (journalId: string, titleStr: string) => {
    showCustomConfirm(
      'Delete Journal',
      `Are you sure you want to permanently delete "${titleStr}"?`,
      async () => {
        setActionId(journalId + '-delete');
        try {
          await api.delete(`/journals/${journalId}`);
          setJournals((prev) => prev.filter((j) => j._id !== journalId));
        } catch (e: any) {
          showCustomAlert('Error', e.response?.data?.message || 'Failed to delete');
        } finally {
          setActionId(null);
        }
      },
      true
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search and Add Row */}
      <View style={styles.topSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search journals by title..."
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

      {isLoading && journals.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : journals.length === 0 ? (
        <View style={styles.centerContainer}>
          <BookOpen size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No journals found.</Text>
        </View>
      ) : (
        <FlatList
          data={journals}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                    {item.publisher || 'No Publisher'} {item.issn ? `| ISSN: ${item.issn}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                {item.impactFactor !== null ? (
                  <View style={[styles.badge, { backgroundColor: '#10b98115', borderColor: '#10b98130' }]}>
                    <Text style={[styles.badgeText, { color: '#10b981' }]}>IF: {item.impactFactor}</Text>
                  </View>
                ) : null}
                {item.h5Index !== null ? (
                  <View style={[styles.badge, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }]}>
                    <Text style={[styles.badgeText, { color: '#8b5cf6' }]}>h5: {item.h5Index}</Text>
                  </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: theme.border + '30', borderColor: theme.border }]}>
                  <FileText size={10} color={theme.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: theme.text }]}>{item.paperCount} papers</Text>
                </View>
              </View>

              <View style={[styles.cardActions, { borderTopColor: theme.border + '30' }]}>
                <TouchableOpacity
                  onPress={() => handleToggleTracked(item)}
                  style={styles.actionBtn}
                  disabled={actionId === item._id + '-track'}
                >
                  {actionId === item._id + '-track' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : item.isTracked ? (
                    <>
                      <Check size={14} color="#10b981" />
                      <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Tracked</Text>
                    </>
                  ) : (
                    <>
                      <X size={14} color={theme.muted} />
                      <Text style={[styles.actionBtnText, { color: theme.muted }]}>Not Tracked</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <TouchableOpacity
                    onPress={() => handleOpenEdit(item)}
                    style={styles.actionBtn}
                  >
                    <Edit2 size={14} color={theme.primary} />
                    <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item._id, item.title)}
                    style={styles.actionBtn}
                    disabled={actionId === item._id + '-delete'}
                  >
                    {actionId === item._id + '-delete' ? (
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
              {editingJournal ? 'Edit Journal' : 'Add New Journal'}
            </Text>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Journal Title *</Text>
                <TextInput
                  placeholder="e.g. Journal of Machine Learning Research"
                  placeholderTextColor={theme.muted}
                  value={title}
                  onChangeText={setTitle}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>ISSN</Text>
                  <TextInput
                    placeholder="e.g. 1532-4435"
                    placeholderTextColor={theme.muted}
                    value={issn}
                    onChangeText={setIssn}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>E-ISSN</Text>
                  <TextInput
                    placeholder="e.g. 1533-5435"
                    placeholderTextColor={theme.muted}
                    value={eissn}
                    onChangeText={setEissn}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Description</Text>
                <TextInput
                  placeholder="Journal scope and overview..."
                  placeholderTextColor={theme.muted}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      height: 80,
                      textAlignVertical: 'top',
                      paddingTop: 8,
                    },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Categories (Comma-separated)</Text>
                <TextInput
                  placeholder="e.g. Computer Science, AI"
                  placeholderTextColor={theme.muted}
                  value={categoryRaw}
                  onChangeText={setCategoryRaw}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Publisher</Text>
                  <TextInput
                    placeholder="e.g. JMLR"
                    placeholderTextColor={theme.muted}
                    value={publisher}
                    onChangeText={setPublisher}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Field Domain</Text>
                  <TextInput
                    placeholder="e.g. Computer Science"
                    placeholderTextColor={theme.muted}
                    value={fieldDomain}
                    onChangeText={setFieldDomain}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Website URL</Text>
                <TextInput
                  placeholder="e.g. https://www.jmlr.org/"
                  placeholderTextColor={theme.muted}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Impact Factor</Text>
                  <TextInput
                    placeholder="e.g. 5.6"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={impactFactor}
                    onChangeText={setImpactFactor}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>h5 Index</Text>
                  <TextInput
                    placeholder="e.g. 84"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={h5Index}
                    onChangeText={setH5Index}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Paper Count</Text>
                  <TextInput
                    placeholder="e.g. 1420"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={paperCount}
                    onChangeText={setPaperCount}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
              </View>

              <View style={[styles.row, { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Track for Trends</Text>
                <Switch
                  value={isTracked}
                  onValueChange={setIsTracked}
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Data Source</Text>
                <View style={styles.sourceSelectContainer}>
                  {['openalex', 'crossref', 'semantic_scholar'].map((src) => (
                    <TouchableOpacity
                      key={src}
                      onPress={() => setSource(src)}
                      style={[
                        styles.sourceOption,
                        {
                          borderColor: source === src ? theme.primary : theme.border,
                          backgroundColor: source === src ? theme.primary + '15' : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceOptionText,
                          { color: source === src ? theme.primary : theme.muted, textTransform: 'capitalize' },
                        ]}
                      >
                        {src.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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

      <ConfirmModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        onConfirm={alertOnConfirm}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        isDestructive={alertIsDestructive}
      />
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
    marginBottom: 8,
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
  row: {
    flexDirection: 'row',
    gap: 10,
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
  sourceSelectContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceOption: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceOptionText: {
    fontSize: 11,
    fontWeight: '600',
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
