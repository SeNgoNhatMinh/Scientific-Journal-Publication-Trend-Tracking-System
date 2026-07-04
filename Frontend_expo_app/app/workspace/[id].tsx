import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

// Import newly separated components
import WorkspaceMap from '../../components/workspace/WorkspaceMap';
import WorkspacePapers from '../../components/workspace/WorkspacePapers';
import WorkspaceNotes from '../../components/workspace/WorkspaceNotes';
import WorkspaceInsights from '../../components/workspace/WorkspaceInsights';
import WorkspaceSettings from '../../components/workspace/WorkspaceSettings';

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

  // SVG network variables for Map
  const chartSize = 300;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const graphRadius = 90;
  const visibleNodes = graphNodes.slice(0, 8);

  const points = visibleNodes.map((n, idx) => {
    const angle = (idx * 2 * Math.PI) / visibleNodes.length;
    const px = cx + graphRadius * Math.cos(angle);
    const py = cy + graphRadius * Math.sin(angle);
    return { ...n, x: px, y: py };
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.wsName, { color: theme.text }]} numberOfLines={1}>
            {workspace?.name || 'Loading...'}
          </Text>
          <Text style={[styles.wsDesc, { color: theme.mutedForeground }]} numberOfLines={2}>
            {workspace?.description || 'No description provided'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabsScroll, { borderBottomColor: theme.border }]}>
          {[
            { id: 'map', label: 'Map' },
            { id: 'papers', label: 'Papers' },
            { id: 'notes', label: 'Notes' },
            { id: 'insights', label: 'Insights' },
            { id: 'settings', label: 'Settings' },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, activeTab === t.id && { borderBottomWidth: 2, borderBottomColor: theme.primary }]}
              onPress={() => setActiveTab(t.id as any)}
            >
              <Text style={[styles.tabText, { color: activeTab === t.id ? theme.primary : theme.mutedForeground }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Extracted Tab Contents */}
      {activeTab === 'map' && (
        <WorkspaceMap
          theme={theme}
          graphNodes={graphNodes}
          chartSize={chartSize}
          points={points}
          cx={cx}
          cy={cy}
        />
      )}

      {activeTab === 'papers' && (
        <WorkspacePapers
          theme={theme}
          papers={papers}
          showAddPaper={showAddPaper}
          setShowAddPaper={setShowAddPaper}
          paperQuery={paperQuery}
          setPaperQuery={setPaperQuery}
          searchAcademicPapers={searchAcademicPapers}
          isSearching={isSearching}
          searchResults={searchResults}
          addPaperToWorkspace={addPaperToWorkspace}
          addingId={addingId}
          formatAuthors={formatAuthors}
          getUnwrappedPaperId={getUnwrappedPaperId}
          router={router}
        />
      )}

      {activeTab === 'notes' && (
        <WorkspaceNotes
          theme={theme}
          notes={notes}
          showAddNote={showAddNote}
          setShowAddNote={setShowAddNote}
          noteTitle={noteTitle}
          setNoteTitle={setNoteTitle}
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          isSavingNote={isSavingNote}
          createNote={createNote}
        />
      )}

      {activeTab === 'insights' && (
        <WorkspaceInsights
          theme={theme}
          trends={trends}
          papers={papers}
          graphNodes={graphNodes}
          workspace={workspace}
        />
      )}

      {activeTab === 'settings' && (
        <WorkspaceSettings
          theme={theme}
          workspace={workspace}
          role={role}
          alerts={alerts}
          corpusKeyword={corpusKeyword}
          setCorpusKeyword={setCorpusKeyword}
          isRunningCorpus={isRunningCorpus}
          runCorpus={runCorpus}
          handleDeleteWorkspace={handleDeleteWorkspace}
        />
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
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
});
