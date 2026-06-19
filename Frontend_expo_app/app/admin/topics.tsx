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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Compass,
  TrendingUp,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const STATUS_COLORS: Record<string, string> = {
  exploding: '#ef4444',
  growing: '#10b981',
  stable: '#3b82f6',
  declining: '#71717a',
};

export default function AdminTopicsScreen() {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Form Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [seedKeyword, setSeedKeyword] = useState('');
  const [description, setDescription] = useState('');
  const [paperCount, setPaperCount] = useState('0');
  const [trendStatus, setTrendStatus] = useState('stable');
  const [growthRate, setGrowthRate] = useState('0');
  const [accelerationFactor, setAccelerationFactor] = useState('0');
  const [isEmerging, setIsEmerging] = useState(false);
  const [emergenceScore, setEmergenceScore] = useState('0');

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      const res = await api.get('/topics', { params });
      setTopics(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchTopics, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenCreate = () => {
    setEditingTopic(null);
    setName('');
    setSeedKeyword('');
    setDescription('');
    setPaperCount('0');
    setTrendStatus('stable');
    setGrowthRate('0');
    setAccelerationFactor('0');
    setIsEmerging(false);
    setEmergenceScore('0');
    setModalVisible(true);
  };

  const handleOpenEdit = (topic: any) => {
    setEditingTopic(topic);
    setName(topic.name || '');
    setSeedKeyword(topic.seedKeyword || '');
    setDescription(topic.description || '');
    setPaperCount(topic.paperCount?.toString() || '0');
    setTrendStatus(topic.trendStatus || 'stable');
    setGrowthRate(topic.growthRate?.toString() || '0');
    setAccelerationFactor(topic.accelerationFactor?.toString() || '0');
    setIsEmerging(topic.isEmerging ?? false);
    setEmergenceScore(topic.emergenceScore?.toString() || '0');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Topic Name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      seedKeyword: seedKeyword.trim() || undefined,
      description: description.trim() || undefined,
      paperCount: parseInt(paperCount, 10) || 0,
      trendStatus,
      growthRate: parseFloat(growthRate) || 0,
      accelerationFactor: parseFloat(accelerationFactor) || 0,
      isEmerging,
      emergenceScore: parseFloat(emergenceScore) || 0,
    };

    setIsLoading(true);
    setModalVisible(false);
    try {
      if (editingTopic) {
        const res = await api.put(`/topics/${editingTopic._id}`, payload);
        if (res.data.success) {
          setTopics((prev) =>
            prev.map((t) => (t._id === editingTopic._id ? res.data.data : t))
          );
        }
      } else {
        await api.post('/topics', payload);
        fetchTopics();
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save topic');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (topicId: string, topicName: string) => {
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to permanently delete topic "${topicName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(topicId);
            try {
              await api.delete(`/topics/${topicId}`);
              setTopics((prev) => prev.filter((t) => t._id !== topicId));
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
            placeholder="Search AI topics..."
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

      {isLoading && topics.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : topics.length === 0 ? (
        <View style={styles.centerContainer}>
          <Compass size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>No topics found.</Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.trendStatus] || '#888';
            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                      Seed: {item.seedKeyword || 'None'} | Papers: {item.paperCount.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: statusColor + '30', backgroundColor: statusColor + '10' },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {item.trendStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={[styles.badge, { backgroundColor: theme.border + '30', borderColor: theme.border }]}>
                    <Text style={[styles.badgeText, { color: theme.text }]}>
                      Growth: {(item.growthRate * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.border + '30', borderColor: theme.border }]}>
                    <Text style={[styles.badgeText, { color: theme.text }]}>
                      Accel: {item.accelerationFactor.toFixed(1)}x
                    </Text>
                  </View>
                  {item.isEmerging ? (
                    <View style={[styles.badge, { backgroundColor: '#f9731615', borderColor: '#f9731630' }]}>
                      <Text style={[styles.badgeText, { color: '#f97316' }]}>
                        🔥 EMERGING ({item.emergenceScore.toFixed(2)})
                      </Text>
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
              {editingTopic ? 'Edit Topic' : 'Add New Topic'}
            </Text>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Topic Name *</Text>
                <TextInput
                  placeholder="e.g. LLM Reasoning Techniques"
                  placeholderTextColor={theme.muted}
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Seed Keyword</Text>
                <TextInput
                  placeholder="e.g. large language models"
                  placeholderTextColor={theme.muted}
                  value={seedKeyword}
                  onChangeText={setSeedKeyword}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.muted }]}>Description</Text>
                <TextInput
                  placeholder="Describe the research topic cluster..."
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
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Trend Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusSelectorRow}>
                    {Object.keys(STATUS_COLORS).map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setTrendStatus(status)}
                        style={[
                          styles.statusSelectBadge,
                          {
                            borderColor: trendStatus === status ? STATUS_COLORS[status] : theme.border,
                            backgroundColor: trendStatus === status ? STATUS_COLORS[status] + '15' : 'transparent',
                          },
                        ]}
                      >
                        <Text style={[styles.statusSelectText, { color: trendStatus === status ? STATUS_COLORS[status] : theme.muted }]}>
                          {status.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Growth Rate</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={growthRate}
                    onChangeText={setGrowthRate}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Acceleration Factor</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={accelerationFactor}
                    onChangeText={setAccelerationFactor}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
              </View>

              <View style={[styles.row, { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Is Emerging Topic</Text>
                <Switch
                  value={isEmerging}
                  onValueChange={setIsEmerging}
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>

              {isEmerging ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Emergence Score (0-1)</Text>
                  <TextInput
                    placeholder="e.g. 0.85"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={emergenceScore}
                    onChangeText={setEmergenceScore}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>
              ) : null}
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
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
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
  statusSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  statusSelectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSelectText: {
    fontSize: 9,
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
