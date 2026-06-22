import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  TextInput,
  FlatList,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  GitBranch,
  FileText,
  StickyNote,
  Search,
  BookOpen,
  X,
  Trash2,
} from 'lucide-react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const CATEGORY_COLORS: Record<string, string> = {
  domain: '#3b82f6',
  algorithm: '#ef4444',
  application: '#22c55e',
  method: '#a855f7',
  dataset: '#f97316',
  general: '#6b7280',
};

export default function WorkspaceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [activeTab, setActiveTab] = useState<'map' | 'papers' | 'notes'>('map');
  const [workspace, setWorkspace] = useState<any>(null);
  const [role, setRole] = useState<string>('viewer');
  const [papers, setPapers] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search/Add Papers State
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [paperQuery, setPaperQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Add Note State
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchWorkspaceData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // 1. Fetch details
      const wsRes = await api.get(`/workspaces/${id}`);
      setWorkspace(wsRes.data.workspace || wsRes.data);
      if (wsRes.data.role) setRole(wsRes.data.role);

      // 2. Fetch papers
      const papersRes = await api.get(`/workspaces/${id}/papers`);
      setPapers(papersRes.data.papers || []);

      // 3. Fetch notes
      try {
        const notesRes = await api.get(`/workspaces/${id}/notes`);
        setNotes(notesRes.data.notes || []);
      } catch (e) {
        setNotes([]);
      }

      // 4. Fetch Graph
      try {
        const graphRes = await api.get(`/workspaces/${id}/keyword-graph`);
        setGraphNodes(graphRes.data.nodes || []);
      } catch (e) {
        setGraphNodes([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  const searchAcademicPapers = async () => {
    if (!paperQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.get('/sources/search', {
        params: { source: 'openalex', keyword: paperQuery.trim(), limit: 6 },
      });
      setSearchResults(res.data.papers || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addPaperToWorkspace = async (item: any) => {
    setAddingId(item.id || item.title);
    try {
      const paperSource = item.source === 'semanticscholar' ? 'semantic_scholar' : item.source;
      const externalIds: Record<string, string> = {};
      if (item.id) {
        if (item.source === 'openalex') externalIds.openalex = item.id;
        if (item.source === 'semanticscholar') externalIds.semanticScholar = item.id;
        if (item.source === 'crossref') externalIds.crossref = item.id;
      }

      const savablePaper = {
        title: item.title || 'Untitled',
        abstract: item.abstract || '',
        doi: item.doi || undefined,
        publicationYear: item.publicationYear || undefined,
        authors: (item.authors || []).map((a: any, idx: number) => ({
          name: a.name || 'Unknown',
          externalId: a.authorId || undefined,
          order: idx + 1,
        })),
        source: paperSource,
        url: item.url || undefined,
        externalIds,
      };

      await api.post(`/workspaces/${id}/papers`, {
        paper: savablePaper,
        source: 'search',
      });

      // Reload
      const papersRes = await api.get(`/workspaces/${id}/papers`);
      setPapers(papersRes.data.papers || []);
      try {
        const graphRes = await api.get(`/workspaces/${id}/keyword-graph`);
        setGraphNodes(graphRes.data.nodes || []);
      } catch (e) {}

      setShowAddPaper(false);
      setSearchResults([]);
      setPaperQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  const createNote = async () => {
    if (!noteTitle.trim()) return;
    setIsSavingNote(true);
    try {
      await api.post(`/workspaces/${id}/notes`, {
        title: noteTitle,
        content: noteContent,
      });

      // Reload
      const notesRes = await api.get(`/workspaces/${id}/notes`);
      setNotes(notesRes.data.notes || []);

      setShowAddNote(false);
      setNoteTitle('');
      setNoteContent('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteWorkspace = () => {
    Alert.alert(
      'Delete Workspace',
      'Are you sure you want to delete this workspace? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workspaces/${id}`);
              router.push('/(tabs)/library');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete workspace.');
            }
          },
        },
      ]
    );
  };

  const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown Authors';
    if (typeof authors[0] === 'string') return authors.join(', ');
    return authors.map((a) => a.name).join(', ');
  };

  const getUnwrappedPaperId = (p: any) => {
    return p.paper?._id || p.paper?.id || p._id || p.id;
  };

  // SVG network variables
  const chartSize = 300;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const graphRadius = 90;
  const visibleNodes = graphNodes.slice(0, 8);

  const points = visibleNodes.map((n, idx) => {
    const angle = (idx * 2 * Math.PI) / visibleNodes.length;
    const x = cx + graphRadius * Math.cos(angle);
    const y = cy + graphRadius * Math.sin(angle);
    return { ...n, x, y };
  });

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.wsName, { color: theme.text }]}>{workspace?.name}</Text>
          <Text style={[styles.wsDesc, { color: theme.muted }]}>
            {workspace?.description || 'No description provided.'}
          </Text>
        </View>
        {role === 'owner' && (
          <TouchableOpacity onPress={handleDeleteWorkspace} style={styles.deleteBtn}>
            <Trash2 size={16} color={theme.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs Selector */}
      <View style={[styles.tabsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[
          { id: 'map', label: 'Research Map', icon: GitBranch },
          { id: 'papers', label: `Papers (${papers.length})`, icon: FileText },
          { id: 'notes', label: `Notes (${notes.length})`, icon: StickyNote },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            style={[
              styles.tabBtn,
              activeTab === tab.id && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
            ]}
          >
            <tab.icon size={15} color={activeTab === tab.id ? theme.primary : theme.icon} />
            <Text
              style={[
                styles.tabText,
                { color: theme.text },
                activeTab === tab.id && { color: theme.primary, fontWeight: 'bold' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Research Map Tab */}
      {activeTab === 'map' && (
        <ScrollView contentContainerStyle={styles.mapTabContent}>
          <View style={[styles.mapCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.mapTitle, { color: theme.text }]}>Workspace Entity Map</Text>
            <Text style={[styles.mapSubtitle, { color: theme.muted }]}>
              Visualizes relationships extracted from workspace papers.
            </Text>

            {graphNodes.length === 0 ? (
              <View style={styles.emptyMap}>
                <GitBranch size={36} color={theme.icon} style={{ opacity: 0.2, marginBottom: 8 }} />
                <Text style={[styles.emptyMapText, { color: theme.muted }]}>
                  Add papers to populate this workspace research map.
                </Text>
              </View>
            ) : (
              <View style={styles.graphContainer}>
                <Svg height={chartSize} width={chartSize}>
                  {points.map((p, idx) => (
                    <Line
                      key={idx}
                      x1={cx}
                      y1={cy}
                      x2={p.x}
                      y2={p.y}
                      stroke={theme.border}
                      strokeWidth="1.5"
                    />
                  ))}
                  {points.map((p, idx) => {
                    const color = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.general;
                    return (
                      <React.Fragment key={idx}>
                        <Circle cx={p.x} cy={p.y} r={14} fill={color} opacity={0.8} />
                        <SvgText
                          x={p.x}
                          y={p.y + 20}
                          fill={theme.text}
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {p.label || p.id}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  <Circle cx={cx} cy={cy} r={18} fill={theme.primary} />
                  <BookOpen size={14} color="#fff" style={styles.centerLogo} />
                </Svg>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Papers Tab */}
      {activeTab === 'papers' && (
        <View style={{ flex: 1 }}>
          <View style={styles.actionRow}>
            <Text style={[styles.statsLabel, { color: theme.muted }]}>{papers.length} publications</Text>
            <TouchableOpacity
              onPress={() => setShowAddPaper(true)}
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
            >
              <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Paper</Text>
            </TouchableOpacity>
          </View>

          {papers.length === 0 ? (
            <View style={styles.centerContainer}>
              <FileText size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>No papers in this workspace.</Text>
            </View>
          ) : (
            <FlatList
              data={papers}
              keyExtractor={(item) => getUnwrappedPaperId(item).toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const p = item.paper || item;
                const pId = getUnwrappedPaperId(item);
                return (
                  <TouchableOpacity
                    onPress={() => router.push(`/paper/${pId}`)}
                    style={[styles.paperCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={[styles.paperTitle, { color: theme.text }]} numberOfLines={2}>
                      {p.title || 'Untitled Paper'}
                    </Text>
                    <Text style={[styles.paperAuthors, { color: theme.muted }]}>
                      {formatAuthors(p.authors)} · {p.publicationYear || 'N/A'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Add Paper Modal */}
          <Modal visible={showAddPaper} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Add Research Paper</Text>
                  <TouchableOpacity onPress={() => setShowAddPaper(false)}>
                    <X size={20} color={theme.icon} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalSearchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Search OpenAlex academic papers..."
                    placeholderTextColor={theme.muted}
                    value={paperQuery}
                    onChangeText={setPaperQuery}
                    style={[styles.searchInput, { color: theme.text }]}
                    onSubmitEditing={searchAcademicPapers}
                  />
                  <TouchableOpacity
                    onPress={searchAcademicPapers}
                    style={[styles.modalSearchBtn, { backgroundColor: theme.primary }]}
                  >
                    {isSearching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSearchBtnText}>Go</Text>}
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalResultsScroll}>
                  {searchResults.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.resultItem, { borderBottomColor: theme.border }]}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={[styles.resultMeta, { color: theme.muted }]}>
                          {formatAuthors(item.authors)} · {item.publicationYear || 'N/A'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => addPaperToWorkspace(item)}
                        disabled={addingId === (item.id || item.title)}
                        style={[styles.addResultBtn, { backgroundColor: theme.primary }]}
                      >
                        {addingId === (item.id || item.title) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.addResultBtnText}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                  {searchResults.length === 0 && !isSearching && (
                    <Text style={[styles.emptyModalResults, { color: theme.muted }]}>
                      Search above to display results.
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <View style={{ flex: 1 }}>
          <View style={styles.actionRow}>
            <Text style={[styles.statsLabel, { color: theme.muted }]}>{notes.length} research notes</Text>
            <TouchableOpacity
              onPress={() => setShowAddNote(true)}
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
            >
              <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>New Note</Text>
            </TouchableOpacity>
          </View>

          {notes.length === 0 ? (
            <View style={styles.centerContainer}>
              <StickyNote size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>No research notes written yet.</Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={(item) => (item._id || item.id).toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.noteTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.noteContentText, { color: theme.muted }]}>{item.content}</Text>
                </View>
              )}
            />
          )}

          {/* New Note Modal */}
          <Modal visible={showAddNote} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Add Research Note</Text>
                  <TouchableOpacity onPress={() => setShowAddNote(false)}>
                    <X size={20} color={theme.icon} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder="Note Title"
                  placeholderTextColor={theme.muted}
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Content details..."
                  placeholderTextColor={theme.muted}
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                  numberOfLines={6}
                  style={[
                    styles.modalInput,
                    { color: theme.text, borderColor: theme.border, height: 120, textAlignVertical: 'top' },
                  ]}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setShowAddNote(false)}
                    style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={createNote}
                    disabled={isSavingNote || !noteTitle.trim()}
                    style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  >
                    {isSavingNote ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.modalBtnText, { color: '#ffffff', fontWeight: 'bold' }]}>Save</Text>
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
  headerInfo: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  wsName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  wsDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ff000010',
    marginLeft: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: 1,
    paddingHorizontal: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: '100%',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mapTabContent: {
    padding: 20,
  },
  mapCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'stretch',
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapSubtitle: {
    fontSize: 11,
    marginBottom: 16,
  },
  emptyMap: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMapText: {
    fontSize: 12,
    textAlign: 'center',
  },
  graphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  centerLogo: {
    position: 'absolute',
    alignSelf: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statsLabel: {
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  paperCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  paperTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  paperAuthors: {
    fontSize: 11,
    marginTop: 4,
  },
  noteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noteContentText: {
    fontSize: 12,
    lineHeight: 16,
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 4,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  modalSearchBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalResultsScroll: {
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  addResultBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addResultBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyModalResults: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  modalDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 12,
  },
});
