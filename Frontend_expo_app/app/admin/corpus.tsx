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
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Trash2,
  StopCircle,
  Database,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const { width } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  completed: {
    label: 'Completed',
    color: '#10b981',
    bg: '#10b98115',
    border: '#10b98130',
  },
  ingesting: {
    label: 'Ingesting',
    color: '#3b82f6',
    bg: '#3b82f615',
    border: '#3b82f630',
  },
  analyzing: {
    label: 'Analyzing',
    color: '#8b5cf6',
    bg: '#8b5cf615',
    border: '#8b5cf630',
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    bg: '#ef444415',
    border: '#ef444430',
  },
  pending: {
    label: 'Pending',
    color: '#f97316',
    bg: '#f9731615',
    border: '#f9731630',
  },
};

export default function AdminCorpusScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Form Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [seedKeyword, setSeedKeyword] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [maxPages, setMaxPages] = useState('4');
  const [perPage, setPerPage] = useState('25');

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

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/corpus/runs');
      const data = res.data.runs ?? res.data ?? [];
      setRuns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showCustomAlert(
        'Network Error',
        'Could not load corpus runs. Please check that the server is running and accessible.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRefresh = () => {
    fetchRuns();
  };

  const handleOpenCreate = () => {
    const currentYear = new Date().getFullYear();
    setSeedKeyword('');
    setStartYear((currentYear - 5).toString());
    setEndYear(currentYear.toString());
    setMaxPages('4');
    setPerPage('25');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!seedKeyword.trim()) {
      showCustomAlert('Validation Error', 'Seed Keyword is required');
      return;
    }

    const payload = {
      seedKeyword: seedKeyword.trim(),
      startYear: startYear ? parseInt(startYear, 10) : undefined,
      endYear: endYear ? parseInt(endYear, 10) : undefined,
      maxPages: maxPages ? parseInt(maxPages, 10) : 4,
      perPage: perPage ? parseInt(perPage, 10) : 25,
      source: 'openalex',
    };

    setIsLoading(true);
    setModalVisible(false);
    try {
      await api.post('/corpus/runs', payload);
      showCustomAlert('Success', 'Corpus Ingestion started in the background.');
      fetchRuns();
    } catch (e: any) {
      showCustomAlert('Error', e.response?.data?.message || 'Failed to start corpus run');
      setIsLoading(false);
    }
  };

  const handleStop = (runId: string) => {
    showCustomConfirm(
      'Stop Ingestion',
      'Are you sure you want to stop this ingestion process?',
      async () => {
        setActionId(runId + '-stop');
        try {
          const res = await api.post(`/corpus/runs/${runId}/stop`);
          if (res.data.success) {
            setRuns((prev) =>
              prev.map((r) =>
                r._id === runId
                  ? { ...r, status: 'failed', errorMessage: 'Stopped by administrator' }
                  : r
              )
            );
          }
        } catch (e: any) {
          showCustomAlert('Error', e.response?.data?.message || 'Failed to stop run');
        } finally {
          setActionId(null);
        }
      },
      false
    );
  };

  const handleDelete = (runId: string, keyword: string) => {
    showCustomConfirm(
      'Delete Corpus Run',
      `Are you sure you want to permanently delete run "${keyword}"? This will delete all collected papers and trend data associated with it.`,
      async () => {
        setActionId(runId + '-delete');
        try {
          await api.delete(`/corpus/runs/${runId}`);
          setRuns((prev) => prev.filter((r) => r._id !== runId));
        } catch (e: any) {
          showCustomAlert('Error', e.response?.data?.message || 'Failed to delete run');
        } finally {
          setActionId(null);
        }
      },
      true
    );
  };

  const filteredRuns = runs.filter((r) =>
    !search || (r.keyword || r.seedKeyword || r.query || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: runs.length,
    active: runs.filter((r) => r.status === 'ingesting' || r.status === 'analyzing').length,
    completed: runs.filter((r) => r.status === 'completed').length,
    failed: runs.filter((r) => r.status === 'failed').length,
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Corpus Management',
          headerLeft: ({ tintColor }) => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16, marginLeft: 8 }}>
              <ArrowLeft size={24} color={tintColor || theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Summary Stats */}
        <View style={styles.statsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            {[
              { label: 'Total Runs', value: stats.total, icon: Database, color: '#a855f7' },
              { label: 'Active', value: stats.active, icon: Activity, color: '#3b82f6' },
              { label: 'Completed', value: stats.completed, icon: CheckCircle, color: '#10b981' },
              { label: 'Failed', value: stats.failed, icon: AlertCircle, color: '#ef4444' },
            ].map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: s.color + '15' }]}>
                  <s.icon size={16} color={s.color} />
                </View>
                <View>
                  <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.muted }]}>{s.label}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Search and Add Row */}
        <View style={styles.topSection}>
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Search by keyword..."
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

        {isLoading && runs.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filteredRuns.length === 0 ? (
          <View style={styles.centerContainer}>
            <Database size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: theme.muted }]}>No corpus runs found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRuns}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            onRefresh={handleRefresh}
            refreshing={isLoading}
            renderItem={({ item }) => {
              const statusCfg = STATUS_CONFIG[item.status?.toLowerCase()] || {
                label: item.status || 'Unknown',
                color: theme.text,
                bg: theme.border + '30',
                border: theme.border,
              };

              return (
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>
                        {item.seedKeyword || item.keyword || item.query || 'Unnamed'}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: theme.muted }]}>
                        Range: {item.startYear} - {item.endYear} • Max: {item.maxPages} pgs
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusCfg.bg,
                          borderColor: statusCfg.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: theme.border + '20', borderColor: theme.border }]}>
                      <Database size={10} color={theme.icon} style={{ marginRight: 4 }} />
                      <Text style={[styles.badgeText, { color: theme.text }]}>
                        {item.paperCount ?? 0} papers
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.border + '20', borderColor: theme.border }]}>
                      <Calendar size={10} color={theme.icon} style={{ marginRight: 4 }} />
                      <Text style={[styles.badgeText, { color: theme.text }]}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>

                  {item.errorMessage ? (
                    <Text style={styles.errorText} numberOfLines={2}>
                      Error: {item.errorMessage}
                    </Text>
                  ) : null}

                  <View style={[styles.cardActions, { borderTopColor: theme.border + '30' }]}>
                    {(item.status === 'ingesting' || item.status === 'analyzing') ? (
                      <TouchableOpacity
                        onPress={() => handleStop(item._id)}
                        style={styles.actionBtn}
                        disabled={actionId === item._id + '-stop'}
                      >
                        {actionId === item._id + '-stop' ? (
                          <ActivityIndicator size="small" color="#f97316" />
                        ) : (
                          <>
                            <StopCircle size={14} color="#f97316" />
                            <Text style={[styles.actionBtnText, { color: '#f97316' }]}>Stop Ingestion</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}

                    <TouchableOpacity
                      onPress={() => handleDelete(item._id, item.seedKeyword || item.keyword || '')}
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
              );
            }}
          />
        )}

        {/* Create Modal */}
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Start Analysis Ingestion</Text>

              <ScrollView contentContainerStyle={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.muted }]}>Seed Keyword *</Text>
                  <TextInput
                    placeholder="e.g. machine learning"
                    placeholderTextColor={theme.muted}
                    value={seedKeyword}
                    onChangeText={setSeedKeyword}
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: theme.muted }]}>Start Year</Text>
                    <TextInput
                      placeholder="e.g. 2018"
                      placeholderTextColor={theme.muted}
                      keyboardType="numeric"
                      value={startYear}
                      onChangeText={setStartYear}
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: theme.muted }]}>End Year</Text>
                    <TextInput
                      placeholder="e.g. 2024"
                      placeholderTextColor={theme.muted}
                      keyboardType="numeric"
                      value={endYear}
                      onChangeText={setEndYear}
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: theme.muted }]}>Max Pages (25 works/pg)</Text>
                    <TextInput
                      placeholder="e.g. 4"
                      placeholderTextColor={theme.muted}
                      keyboardType="numeric"
                      value={maxPages}
                      onChangeText={setMaxPages}
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: theme.muted }]}>Per Page</Text>
                    <TextInput
                      placeholder="e.g. 25"
                      placeholderTextColor={theme.muted}
                      keyboardType="numeric"
                      value={perPage}
                      onChangeText={setPerPage}
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
                  <Text style={styles.saveBtnText}>Start Run</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsSection: {
    paddingTop: 12,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  statsRow: {
    gap: 10,
    paddingRight: 20,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    minWidth: 120,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 10,
    marginBottom: 12,
    backgroundColor: '#ef444410',
    padding: 6,
    borderRadius: 6,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
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
