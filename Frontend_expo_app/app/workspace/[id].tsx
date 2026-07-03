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
  BarChart2,
  Settings,
  Users,
  Bell,
  Bot,
  Activity
} from 'lucide-react-native';
import Svg, { Line, Circle, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop, Path, G } from 'react-native-svg';
import api from '../../lib/api';
import { Colors, CategoryColors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Custom SVG Area Chart for publication trends
function AreaChart({ data, theme }: { data: { year: number; count: number }[]; theme: any }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <Activity size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.mutedForeground }]}>
          No historical trend data available.
        </Text>
      </View>
    );
  }

  const chartHeight = 130;
  const chartWidth = width - 72;
  const paddingX = 16;
  const paddingY = 16;

  const counts = data.map((d) => d.count);
  const years = data.map((d) => d.year);
  const maxCount = Math.max(...counts, 5);
  const minCount = Math.min(...counts, 0);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);

  const countRange = maxCount - minCount;
  const yearRange = maxYear - minYear || 1;

  const points = data.map((d) => {
    const x = paddingX + ((d.year - minYear) / yearRange) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.count - minCount) / countRange) * (chartHeight - paddingY * 2);
    return { x, y };
  });

  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, idx) => {
      if (idx > 0) linePath += ` L ${p.x} ${p.y}`;
    });
    areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  return (
    <View style={styles.chartContainer}>
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <SvgLinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>

        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingY + ratio * (chartHeight - paddingY * 2);
          return (
            <Path
              key={idx}
              d={`M ${paddingX} ${y} L ${chartWidth - paddingX} ${y}`}
              stroke={theme.border}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {areaPath ? <Path d={areaPath} fill="url(#gradient)" /> : null}
        {linePath ? <Path d={linePath} fill="none" stroke={theme.primary} strokeWidth="2" /> : null}
        {points.map((p, idx) => (
          <Circle key={idx} cx={p.x} cy={p.y} r={3.5} fill={theme.primary} />
        ))}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: chartWidth, marginTop: 4, paddingHorizontal: 8 }}>
        <Text style={[styles.chartLabelText, { color: theme.mutedForeground }]}>{minYear}</Text>
        <Text style={[styles.chartLabelText, { color: theme.mutedForeground }]}>{maxYear}</Text>
      </View>
    </View>
  );
}

// Custom SVG Node Network Graph for Workspace keyword co-occurrence
function NodeGraph({ nodes, centerKeyword, theme }: { nodes: any[]; centerKeyword: string; theme: any }) {
  const chartSize = 260;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  if (!nodes || nodes.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <GitBranch size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.mutedForeground }]}>
          No keyword relationships found. Add papers or run corpus collection to build graph.
        </Text>
      </View>
    );
  }

  const visibleNodes = nodes.slice(0, 8);
  const radius = 80;

  const points = visibleNodes.map((node, i) => {
    const angle = (i * 2 * Math.PI) / visibleNodes.length;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { ...node, x, y };
  });

  return (
    <View style={styles.graphContainer}>
      <Svg height={chartSize} width={chartSize}>
        {/* Draw connection lines */}
        {points.map((p, idx) => (
          <Line
            key={`line-${idx}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={theme.border}
            strokeWidth="1.5"
          />
        ))}

        {/* Draw satellite nodes */}
        {points.map((p, idx) => {
          const color = CategoryColors[p.category || 'general'] || '#8b5cf6';
          return (
            <G key={`node-${idx}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill={color}
                opacity={0.8}
              />
              <SvgText
                x={p.x}
                y={p.y + 20}
                fill={theme.text}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.label || p.name || p.id}
              </SvgText>
            </G>
          );
        })}

        {/* Draw center node */}
        <Circle cx={cx} cy={cy} r={18} fill={theme.primary} />
        <SvgText
          x={cx}
          y={cy + 3}
          fill="#ffffff"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
        >
          {centerKeyword.length > 8 ? `${centerKeyword.slice(0, 7)}.` : centerKeyword}
        </SvgText>
      </Svg>
    </View>
  );
}

export default function WorkspaceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [activeTab, setActiveTab] = useState<'map' | 'papers' | 'notes' | 'insights' | 'settings'>('map');
  const [workspace, setWorkspace] = useState<any>(null);
  const [role, setRole] = useState<string>('viewer');
  const [papers, setPapers] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
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

  // Corpus Run State
  const [corpusKeyword, setCorpusKeyword] = useState('');
  const [isRunningCorpus, setIsRunningCorpus] = useState(false);

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

      // 5. Fetch Trends
      try {
        const trendsRes = await api.get(`/workspaces/${id}/trends`);
        setTrends(trendsRes.data);
      } catch (e) {}

      // 6. Fetch Alerts
      try {
        const alertsRes = await api.get(`/workspaces/${id}/alerts`);
        setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : alertsRes.data.alerts || []);
      } catch (e) {}

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

  const runCorpus = async () => {
    if (!corpusKeyword.trim()) return;
    setIsRunningCorpus(true);
    try {
      await api.post(`/workspaces/${id}/corpus/runs`, {
        seedKeyword: corpusKeyword,
        source: 'openalex',
        maxPages: 2,
      });
      Alert.alert('Success', 'Corpus run started! Papers will be added automatically.');
      setCorpusKeyword('');
    } catch (e) {
      Alert.alert('Error', 'Failed to run corpus');
    } finally {
      setIsRunningCorpus(false);
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
              router.back();
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.wsName, { color: theme.text }]} numberOfLines={1}>{workspace?.name}</Text>
          <Text style={[styles.wsDesc, { color: theme.mutedForeground }]} numberOfLines={1}>
            {workspace?.description || 'No description provided.'}
          </Text>
        </View>
      </View>

      {/* Tabs Selector */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsScroll, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          {[
            { id: 'map', label: 'Map', icon: GitBranch },
            { id: 'papers', label: `Papers (${papers.length})`, icon: FileText },
            { id: 'notes', label: `Notes (${notes.length})`, icon: StickyNote },
            { id: 'insights', label: 'Insights', icon: BarChart2 },
            { id: 'settings', label: 'Settings', icon: Settings },
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
        </ScrollView>
      </View>

      {/* Research Map Tab */}
      {activeTab === 'map' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Workspace Entity Map</Text>
            <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
              Visualizes relationships extracted from workspace papers.
            </Text>

            {graphNodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <GitBranch size={36} color={theme.icon} style={{ opacity: 0.2, marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
                  Add papers to populate this workspace research map.
                </Text>
              </View>
            ) : (
              <View style={styles.graphContainer}>
                <Svg height={chartSize} width={chartSize}>
                  {points.map((p, idx) => (
                    <Line key={idx} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.border} strokeWidth="1.5" />
                  ))}
                  {points.map((p, idx) => {
                    const color = CategoryColors[p.category] || CategoryColors.general;
                    return (
                      <React.Fragment key={idx}>
                        <Circle cx={p.x} cy={p.y} r={14} fill={color} opacity={0.8} />
                        <SvgText x={p.x} y={p.y + 20} fill={theme.text} fontSize="8" fontWeight="bold" textAnchor="middle">
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
            <Text style={[styles.statsLabel, { color: theme.text }]}>{papers.length} publications</Text>
            <TouchableOpacity onPress={() => setShowAddPaper(true)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
              <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.primaryBtnText}>Add Paper</Text>
            </TouchableOpacity>
          </View>

          {papers.length === 0 ? (
            <View style={styles.centerContainer}>
              <FileText size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No papers in this workspace.</Text>
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
                    style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>{p.title || 'Untitled Paper'}</Text>
                    <Text style={[styles.itemMeta, { color: theme.mutedForeground }]}>
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

                <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Search OpenAlex..."
                    placeholderTextColor={theme.mutedForeground}
                    value={paperQuery}
                    onChangeText={setPaperQuery}
                    style={[styles.searchInput, { color: theme.text }]}
                    onSubmitEditing={searchAcademicPapers}
                  />
                  <TouchableOpacity onPress={searchAcademicPapers} style={[styles.searchBtn, { backgroundColor: theme.primary }]}>
                    {isSearching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Go</Text>}
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalResultsScroll}>
                  {searchResults.map((item) => (
                    <View key={item.id} style={[styles.resultItem, { borderBottomColor: theme.border }]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.resultMeta, { color: theme.mutedForeground }]}>{formatAuthors(item.authors)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => addPaperToWorkspace(item)}
                        disabled={addingId === (item.id || item.title)}
                        style={[styles.addResultBtn, { backgroundColor: theme.primary }]}
                      >
                        {addingId === (item.id || item.title) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addResultBtnText}>Add</Text>}
                      </TouchableOpacity>
                    </View>
                  ))}
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
            <Text style={[styles.statsLabel, { color: theme.text }]}>{notes.length} research notes</Text>
            <TouchableOpacity onPress={() => setShowAddNote(true)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
              <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.primaryBtnText}>New Note</Text>
            </TouchableOpacity>
          </View>

          {notes.length === 0 ? (
            <View style={styles.centerContainer}>
              <StickyNote size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No research notes written yet.</Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={(item) => (item._id || item.id).toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.itemContent, { color: theme.mutedForeground }]}>{item.content}</Text>
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
                  placeholderTextColor={theme.mutedForeground}
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Content details..."
                  placeholderTextColor={theme.mutedForeground}
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                  style={[styles.input, { color: theme.text, borderColor: theme.border, height: 120, textAlignVertical: 'top' }]}
                />

                <TouchableOpacity
                  onPress={createNote}
                  disabled={isSavingNote || !noteTitle.trim()}
                  style={[styles.fullBtn, { backgroundColor: theme.primary, opacity: isSavingNote || !noteTitle.trim() ? 0.7 : 1 }]}
                >
                  {isSavingNote ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.fullBtnText}>Save Note</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {/* Publication Trends Chart */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Activity size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Publication Volume Trend</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
              Yearly breakdown of {trends?.paperCount || papers.length} papers in this workspace.
            </Text>
            <AreaChart data={trends?.yearlyData || []} theme={theme} />
          </View>

          {/* Keyword Co-occurrence Network Graph */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <GitBranch size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Semantic Keyword Network</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
              Visual representation of keyword relationships inside this workspace.
            </Text>
            <NodeGraph nodes={graphNodes} centerKeyword={workspace?.name || 'Workspace'} theme={theme} />
          </View>

          {/* Top Keywords */}
          {trends?.topKeywords && trends.topKeywords.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <BarChart2 size={20} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Top Workspace Keywords</Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
                Most frequent terms classified across all ingested publications.
              </Text>
              <View style={{ gap: 12, marginTop: 8 }}>
                {trends.topKeywords.slice(0, 8).map((item: any, i: number) => {
                  const maxVal = trends.topKeywords[0]?.paperCount || 1;
                  const percentage = (item.paperCount / maxVal) * 100;
                  return (
                    <View key={i} style={styles.barItem}>
                      <View style={styles.barHeader}>
                        <Text style={[styles.barText, { color: theme.text }]}>{item.name}</Text>
                        <Text style={[styles.barCount, { color: theme.mutedForeground }]}>{item.paperCount} papers</Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: theme.background }]}>
                        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: theme.primary }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {/* Corpus Run */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Bot size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Automated Corpus Collection</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
              Automatically pull papers matching a seed keyword.
            </Text>
            <TextInput
              placeholder="Seed Keyword (e.g., federated learning)"
              placeholderTextColor={theme.mutedForeground}
              value={corpusKeyword}
              onChangeText={setCorpusKeyword}
              style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 8 }]}
            />
            <TouchableOpacity onPress={runCorpus} disabled={isRunningCorpus} style={[styles.fullBtn, { backgroundColor: theme.primary, marginTop: 12 }]}>
              {isRunningCorpus ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.fullBtnText}>Run Corpus</Text>}
            </TouchableOpacity>
          </View>

          {/* Members */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Users size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Members</Text>
            </View>
            {(workspace?.members || []).map((m: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text }}>{m.user?.email || 'User'}</Text>
                <Text style={{ color: theme.mutedForeground }}>{m.role}</Text>
              </View>
            ))}
          </View>

          {/* Alerts */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Bell size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Alerts</Text>
            </View>
            {alerts.length === 0 ? (
              <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>No alerts configured.</Text>
            ) : (
              alerts.map((a: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <Text style={{ color: theme.text }}>{a.keyword}</Text>
                  <Text style={{ color: theme.mutedForeground }}>{a.notifyEnabled ? 'Enabled' : 'Disabled'}</Text>
                </View>
              ))
            )}
          </View>

          {/* Danger Zone */}
          {role === 'owner' && (
            <View style={[styles.card, { backgroundColor: '#ff000010', borderColor: theme.destructive }]}>
              <Text style={[styles.cardTitle, { color: theme.destructive }]}>Danger Zone</Text>
              <Text style={{ color: theme.text, marginTop: 4, marginBottom: 12, fontSize: 13 }}>
                Once you delete a workspace, there is no going back.
              </Text>
              <TouchableOpacity onPress={handleDeleteWorkspace} style={[styles.fullBtn, { backgroundColor: theme.destructive }]}>
                <Text style={styles.fullBtnText}>Delete Workspace</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerInfo: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 8, marginLeft: -8 },
  wsName: { fontSize: 22, fontWeight: '700' },
  wsDesc: { fontSize: 13, marginTop: 2 },
  tabsWrapper: { paddingBottom: 4 },
  tabsScroll: { borderBottomWidth: 1, paddingHorizontal: 10 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabContent: { padding: 20, gap: 16 },
  
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 12 },
  
  emptyContainer: { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  
  emptyGraph: { height: 160, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyGraphText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  chartContainer: { alignItems: 'center', marginVertical: 10 },
  chartLabelText: { fontSize: 9 },
  
  barItem: { marginBottom: 4 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barText: { fontSize: 13, fontWeight: '600' },
  barCount: { fontSize: 11 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  
  graphContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  centerLogo: { position: 'absolute', alignSelf: 'center' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  statsLabel: { fontSize: 14, fontWeight: '500' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  itemMeta: { fontSize: 12, marginTop: 6 },
  itemContent: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, borderWidth: 1, paddingLeft: 12, paddingRight: 4, marginBottom: 16 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  searchBtn: { paddingHorizontal: 14, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  modalResultsScroll: { gap: 12 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  resultTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  resultMeta: { fontSize: 12 },
  addResultBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addResultBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  fullBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  fullBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
