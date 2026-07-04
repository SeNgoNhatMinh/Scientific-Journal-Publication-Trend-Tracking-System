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
import { ArrowLeft, Trash2, LogOut } from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

// Import newly separated components
import WorkspaceMap from '../../components/workspace/WorkspaceMap';
import WorkspacePapers from '../../components/workspace/WorkspacePapers';
import WorkspaceTrends from '../../components/workspace/WorkspaceTrends';
import WorkspaceMembers from '../../components/workspace/WorkspaceMembers';
import WorkspaceAlerts from '../../components/workspace/WorkspaceAlerts';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function WorkspaceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [activeTab, setActiveTab] = useState<'map' | 'papers' | 'trends' | 'members' | 'alerts'>('map');
  const [workspace, setWorkspace] = useState<any>(null);
  const [role, setRole] = useState<string>('viewer');
  const [papers, setPapers] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [trends, setTrends] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search/Add Papers State
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [paperQuery, setPaperQuery] = useState('');
  const [searchSource, setSearchSource] = useState('openalex');
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Confirm Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Corpus Run State
  const [corpusKeyword, setCorpusKeyword] = useState('');
  const [isRunningCorpus, setIsRunningCorpus] = useState(false);

  const fetchWorkspaceData = async (showLoading = true) => {
    if (!id) return;
    if (showLoading) setIsLoading(true);
    try {
      // 1. Fetch details
      const wsRes = await api.get(`/workspaces/${id}`);
      setWorkspace(wsRes.data.workspace || wsRes.data);
      if (wsRes.data.role) setRole(wsRes.data.role);

      // 2. Fetch papers
      const papersRes = await api.get(`/workspaces/${id}/papers`);
      setPapers(papersRes.data.papers || []);

      // 4. Fetch Graph
      try {
        const graphRes = await api.get(`/workspaces/${id}/keyword-graph`);
        
        // buildGraph logic
        const rawNodes = graphRes.data.nodes || [];
        const nodes: any[] = [];
        const links: any[] = [];
        
        if (rawNodes.length > 0) {
          const rootId = "root_workspace";
          const wsName = wsRes.data.workspace?.name || wsRes.data.name || "Workspace";
          
          nodes.push({
            id: rootId,
            label: wsName,
            type: "root",
            val: 5,
            color: "#334155",
          });

          const categories = Array.from(new Set(rawNodes.map((n: any) => n.category || "general")));
          categories.forEach((cat: any) => {
            const catId = `cat_${cat}`;
            nodes.push({
              id: catId,
              label: (cat as string).charAt(0).toUpperCase() + (cat as string).slice(1),
              type: "category",
              category: cat,
              val: 3,
              color: '#8b5cf6', // general category color fallback
            });
            links.push({ source: rootId, target: catId, value: 2 });
          });

          rawNodes.forEach((n: any) => {
            const catId = `cat_${n.category || "general"}`;
            nodes.push({
              ...n,
              type: "keyword",
              val: n.paperCount || 1,
              color: '#10b981', // general keyword color fallback
            });
            links.push({ source: catId, target: n.id, value: 1 });
          });
        }
        
        setGraphData({ nodes, links });
      } catch (e) {
        setGraphData({ nodes: [], links: [] });
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

      // 7. Fetch Members
      try {
        const membersRes = await api.get(`/workspaces/${id}/members`);
        setMembers(membersRes.data.members || []);
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

  const searchAcademicPapers = async (loadMore = false) => {
    if (!paperQuery.trim() || isSearching) return;
    
    // If we're loading more but already have all results, don't fetch
    if (loadMore && searchResults.length >= searchTotal && searchTotal > 0) return;

    setIsSearching(true);
    try {
      const nextPage = loadMore ? searchPage + 1 : 1;
      const res = await api.get('/sources/search', {
        params: { source: searchSource, keyword: paperQuery.trim(), limit: 20, page: nextPage },
      });
      
      const newPapers = res.data.papers || [];
      if (loadMore) {
        setSearchResults((prev) => [...prev, ...newPapers]);
      } else {
        setSearchResults(newPapers);
      }
      setSearchPage(nextPage);
      setSearchTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
      if (!loadMore) setSearchResults([]);
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

      // Reload all data (silently)
      await fetchWorkspaceData(false);
      
      // Just clear the addingId to stop the spinner, don't clear the search!
      setAddingId(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to add paper to workspace.');
      setAddingId(null);
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

  const removePaperFromWorkspace = async (paperId: string) => {
    try {
      await api.delete(`/workspaces/${id}/papers/${paperId}`);
      // Update graph and trends silently
      await fetchWorkspaceData(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to remove paper');
    }
  };

  const confirmDeleteWorkspace = async () => {
    try {
      await api.delete(`/workspaces/${id}`);
      router.replace('/(tabs)/workspaces');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete workspace.');
    }
  };

  const confirmLeaveWorkspace = async () => {
    try {
      await api.delete(`/workspaces/${id}/members/me`);
      router.replace('/(tabs)/workspaces');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not leave workspace.');
    }
  };

  const formatAuthors = (authors: any[], paperSource?: string) => {
    if (!authors || authors.length === 0) {
      return paperSource === 'exa' ? 'Authors not available from Exa' : 'Unknown Authors';
    }
    if (typeof authors[0] === 'string') return authors.join(', ');
    return authors.map((a: any) => a.name || a.author?.display_name || a.display_name || a).join(', ');
  };

  const getUnwrappedPaperId = (p: any) => {
    return p?.paperId?._id || p?.paperId?.id || p?.paper?._id || p?.paper?.id || p?._id || p?.id || '';
  };

  // Render Functions

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.wsName, { color: theme.text }]} numberOfLines={1}>
              {workspace?.name || 'Loading...'}
            </Text>
            {workspace && (
              <View style={[styles.roleBadge, { borderColor: theme.border }]}>
                <Text style={[styles.roleBadgeText, { color: theme.text }]}>{role.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.wsDesc, { color: theme.mutedForeground }]} numberOfLines={2}>
            {workspace?.description || 'No description provided'}
          </Text>
        </View>
        
        {role === 'owner' ? (
          <TouchableOpacity style={[styles.backBtn, { marginLeft: 8 }]} onPress={() => setShowDeleteConfirm(true)}>
            <Trash2 size={20} color={theme.destructive} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.backBtn, { marginLeft: 8 }]} onPress={() => setShowLeaveConfirm(true)}>
            <LogOut size={20} color={theme.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabsScroll, { borderBottomColor: theme.border }]}>
          {[
            { id: 'map', label: 'Research Map' },
            { id: 'papers', label: 'Papers' },
            { id: 'trends', label: 'Trends' },
            { id: 'members', label: 'Members' },
            { id: 'alerts', label: 'Alerts' },
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
          graphData={graphData}
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
          searchSource={searchSource}
          setSearchSource={setSearchSource}
          searchAcademicPapers={() => searchAcademicPapers(false)}
          loadMorePapers={() => searchAcademicPapers(true)}
          isSearching={isSearching}
          searchResults={searchResults}
          searchTotal={searchTotal}
          addPaperToWorkspace={addPaperToWorkspace}
          removePaperFromWorkspace={removePaperFromWorkspace}
          addingId={addingId}
          formatAuthors={formatAuthors}
          getUnwrappedPaperId={getUnwrappedPaperId}
          router={router}
        />
      )}

      {activeTab === 'trends' && (
        <WorkspaceTrends theme={theme} trends={trends} papers={papers} />
      )}

      {activeTab === 'members' && (
        <WorkspaceMembers
          theme={theme}
          members={members}
          workspaceId={id as string}
          role={role}
          onMembersUpdated={() => fetchWorkspaceData(false)}
        />
      )}

      {activeTab === 'alerts' && (
        <WorkspaceAlerts theme={theme} alerts={alerts} />
      )}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteWorkspace}
        title="Delete Workspace"
        description="Are you sure you want to delete this workspace? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={confirmLeaveWorkspace}
        title="Leave Workspace"
        description="Are you sure you want to leave this workspace?"
        confirmText="Leave"
        isDanger={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60 },
  backBtn: { padding: 8, marginRight: 8 },
  wsName: { fontSize: 20, fontWeight: '700' },
  wsDesc: { fontSize: 13, marginTop: 4 },
  roleBadge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  roleBadgeText: { fontSize: 10, fontWeight: '600' },
  tabsWrapper: { borderBottomWidth: 1 },
  tabsScroll: { paddingHorizontal: 16 },
  tabBtn: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  tabText: { fontSize: 14, fontWeight: '600' },
});
