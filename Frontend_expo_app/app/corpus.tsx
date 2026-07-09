import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Database,
  Plus,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import api from '../lib/api';
import { Colors } from '../constants/theme';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, color: '#10b981' },
  failed: { label: 'Failed', icon: AlertCircle, color: '#ef4444' },
  pending: { label: 'Pending', icon: Clock, color: '#06b6d4' },
  ingesting: { label: 'Ingesting Papers', icon: Loader2, color: '#06b6d4' },
  analyzing: { label: 'AI Analyzing', icon: Loader2, color: '#06b6d4' },
};

export default function CorpusScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRunKeyword, setNewRunKeyword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await api.get('/corpus/runs');
      setRuns(res.data.runs || []);
    } catch (err) {
      console.error('Failed to fetch corpus runs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Poll active runs every 5s
  useEffect(() => {
    const hasActive = runs.some((r) => ['pending', 'ingesting', 'analyzing'].includes(r.status));
    if (!hasActive) return;
    
    const interval = setInterval(() => {
      fetchRuns();
    }, 5000);
    return () => clearInterval(interval);
  }, [runs]);

  const handleCreateRun = async () => {
    if (!newRunKeyword.trim()) return;
    setIsCreating(true);
    try {
      await api.post('/corpus/runs', { seedKeyword: newRunKeyword });
      setIsModalOpen(false);
      setNewRunKeyword('');
      fetchRuns();
    } catch (err) {
      console.error(err);
      alert('Failed to create run');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <ChevronLeft size={28} color={theme.text} />
          </TouchableOpacity>
          <Database size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Corpus Management</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          Start topic tracking runs to ingest and analyze academic papers at scale.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={[styles.newRunBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
          onPress={() => setIsModalOpen(true)}
        >
          <Plus size={20} color={theme.primary} />
          <Text style={[styles.newRunText, { color: theme.primary }]}>New Tracking Run</Text>
        </TouchableOpacity>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : runs.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Database size={40} color={theme.icon} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Tracking Runs</Text>
            <Text style={[styles.emptyDesc, { color: theme.mutedForeground }]}>
              Create your first tracking run to start analyzing topics.
            </Text>
          </View>
        ) : (
          runs.map((run) => {
            const statusCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            return (
              <TouchableOpacity
                key={run._id}
                style={[styles.runCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  if (run.status === 'completed') {
                    router.push(`/insights?keyword=${encodeURIComponent(run.seedKeyword)}`);
                  }
                }}
              >
                <View style={styles.runHeader}>
                  <Text style={[styles.runKeyword, { color: theme.text }]}>{run.seedKeyword}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15', borderColor: statusCfg.color + '30' }]}>
                    <StatusIcon size={12} color={statusCfg.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                </View>

                <View style={styles.runMeta}>
                  <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                    Papers: <Text style={{ color: theme.text, fontWeight: '600' }}>{run.paperCount || 0}</Text>
                  </Text>
                  <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                    Started: {new Date(run.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {run.status === 'failed' && run.errorMessage && (
                  <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
                    <Text style={[styles.errorText, { color: theme.destructive }]}>
                      Error: {run.errorMessage}
                    </Text>
                  </View>
                )}

                {run.status === 'completed' && (
                  <View style={styles.viewInsightsRow}>
                    <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>View Insights</Text>
                    <ArrowRight size={14} color={theme.primary} style={{ marginLeft: 4 }} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Run Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Tracking Run</Text>
            <Text style={[styles.modalDesc, { color: theme.mutedForeground }]}>
              Enter a research topic, keyword, or domain to begin ingesting and analyzing papers.
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g., Quantum Computing"
              placeholderTextColor={theme.mutedForeground}
              value={newRunKeyword}
              onChangeText={setNewRunKeyword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.createBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreateRun}
                disabled={isCreating || !newRunKeyword.trim()}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Start Run</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', marginLeft: 8 },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  
  content: { padding: 20, paddingBottom: 60 },
  
  newRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  newRunText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  
  runCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  runKeyword: { fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  
  runMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 13 },
  
  viewInsightsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff10' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 32, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalDesc: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { borderWidth: 1 },
  createBtn: {},
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
