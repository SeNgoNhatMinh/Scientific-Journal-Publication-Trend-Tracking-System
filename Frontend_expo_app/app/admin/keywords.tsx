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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Tag,
  TrendingUp,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const CATEGORY_COLORS: Record<string, string> = {
  domain: '#3b82f6',
  algorithm: '#8b5cf6',
  application: '#10b981',
  method: '#f97316',
  dataset: '#eab308',
  tool: '#ec4899',
  general: '#71717a',
};

export default function AdminKeywordsScreen() {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [keywords, setKeywords] = useState<any[]>([]);
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
  const [editingKeyword, setEditingKeyword] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [openalexId, setOpenalexId] = useState('');
  const [paperCount, setPaperCount] = useState('0');
  const [citationCount, setCitationCount] = useState('0');
  const [trendScore, setTrendScore] = useState('0');
  const [growthRate, setGrowthRate] = useState('0');

  const fetchKeywords = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      const res = await api.get('/keywords', { params });
      setKeywords(res.data.data || []);
    } catch (err) {
      console.error(err);
      showCustomAlert(
        'Network Error',
        'Could not load keywords. Please check that the server is running and accessible.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchKeywords, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setEditingKeyword(null);
    setName('');
    setCategory('general');
    setDescription('');
    setOpenalexId('');
    setPaperCount('0');
    setCitationCount('0');
    setTrendScore('0');
    setGrowthRate('0');
    setModalVisible(true);
  };

  const handleOpenEdit = (kw: any) => {
    setEditingKeyword(kw);
    setName(kw.name || '');
    setCategory(kw.category || 'general');
    setDescription(kw.description || '');
    setOpenalexId(kw.openalexId || '');
    setPaperCount(kw.paperCount?.toString() || '0');
    setCitationCount(kw.citationCount?.toString() || '0');
    setTrendScore(kw.trendScore?.toString() || '0');
    setGrowthRate(kw.growthRate?.toString() || '0');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showCustomAlert('Validation Error', 'Keyword Name is required');
      return;
    }

    const payload = {
      name: name.trim().toLowerCase(),
      category,
      description: description.trim() || undefined,
      openalexId: openalexId.trim() || undefined,
      paperCount: parseInt(paperCount, 10) || 0,
      citationCount: parseInt(citationCount, 10) || 0,
      trendScore: parseFloat(trendScore) || 0,
      growthRate: parseFloat(growthRate) || 0,
    };

    setIsLoading(true);
    setModalVisible(false);
    try {
      if (editingKeyword) {
        const res = await api.put(`/keywords/${editingKeyword._id}`, payload);
        if (res.data.success) {
          setKeywords((prev) =>
            prev.map((k) => (k._id === editingKeyword._id ? res.data.data : k))
          );
        }
      } else {
        await api.post('/keywords', payload);
        fetchKeywords();
      }
    } catch (e: any) {
      showCustomAlert('Error', e.response?.data?.message || 'Failed to save keyword');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (kwId: string, kwName: string) => {
    showCustomConfirm(
      'Delete Keyword',
      `Are you sure you want to permanently delete "#${kwName}"?`,
      async () => {
        setActionId(kwId);
        try {
          await api.delete(`/keywords/${kwId}`);
          setKeywords((prev) => prev.filter((k) => k._id !== kwId));
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
            placeholder="Search keywords..."
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

      {isLoading && keywords.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : keywords.length === 0 ? (
        <View style={styles.centerContainer}>
          <Tag size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No keywords found.</Text>
        </View>
      ) : (
        <FlatList
          data={keywords}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const catColor = CATEGORY_COLORS[item.category] || '#888';
            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>#{item.name}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                      Papers: {item.paperCount.toLocaleString()} | Citations: {item.citationCount.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.categoryBadge,
                      { borderColor: catColor + '30', backgroundColor: catColor + '10' },
                    ]}
                  >
                    <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={[styles.badge, { backgroundColor: '#f9731610', borderColor: '#f9731620' }]}>
                    <TrendingUp size={10} color="#f97316" style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#f97316' }]}>Trend: {item.trendScore.toFixed(1)}</Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: item.growthRate >= 0 ? '#10b98110' : '#ef444410',
                        borderColor: item.growthRate >= 0 ? '#10b98120' : '#ef444420',
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: item.growthRate >= 0 ? '#10b981' : '#ef4444' }]}>
                      Growth: {item.growthRate >= 0 ? '+' : ''}{(item.growthRate * 100).toFixed(0)}%
                    </Text>
                  </View>
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
                    onPress={() => handleDelete(item._id, item.name)}
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
            );
          }}
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
              {editingKeyword ? 'Edit Keyword' : 'Add New Keyword'}
            </Text>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Keyword Name *</Text>
                <TextInput
                  placeholder="e.g. machine learning"
                  placeholderTextColor={theme.muted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catSelectorRow}>
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.catSelectBadge,
                        {
                          borderColor: category === cat ? CATEGORY_COLORS[cat] : theme.border,
                          backgroundColor: category === cat ? CATEGORY_COLORS[cat] + '15' : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.catSelectText, { color: category === cat ? CATEGORY_COLORS[cat] : theme.muted }]}>
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>OpenAlex ID</Text>
                <TextInput
                  placeholder="e.g. C119302"
                  placeholderTextColor={theme.muted}
                  value={openalexId}
                  onChangeText={setOpenalexId}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Description</Text>
                <TextInput
                  placeholder="Define the keyword topic..."
                  placeholderTextColor={theme.muted}
                  multiline
                  numberOfLines={2}
                  value={description}
                  onChangeText={setDescription}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      height: 60,
                      textAlignVertical: 'top',
                      paddingTop: 8,
                    },
                  ]}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Paper Count</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={paperCount}
                    onChangeText={setPaperCount}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Citation Count</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={citationCount}
                    onChangeText={setCitationCount}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Trend Score</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={trendScore}
                    onChangeText={setTrendScore}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Growth Rate (0-1)</Text>
                  <TextInput
                    placeholder="e.g. 0.25"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={growthRate}
                    onChangeText={setGrowthRate}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
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
  catSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catSelectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  catSelectText: {
    fontSize: 10,
    fontWeight: 'bold',
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
