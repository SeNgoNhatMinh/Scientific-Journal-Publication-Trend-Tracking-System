import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search as SearchIcon,
  Filter,
  Bookmark,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const SOURCE_META: Record<string, { label: string; bg: string; text: string }> = {
  openalex: { label: 'OpenAlex', bg: '#8B2CE515', text: '#a855f7' },
  semanticscholar: { label: 'Semantic Scholar', bg: '#06b6d415', text: '#22d5e6' },
  crossref: { label: 'Crossref', bg: '#f9731615', text: '#fb923c' },
  ieee: { label: 'IEEE Xplore', bg: '#10b98115', text: '#34d399' },
  exa: { label: 'Exa Research', bg: '#ec489915', text: '#f472b6' },
};

export default function ExploreScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const initialKeyword = (searchParams.searchKeyword as string) || '';
  const [keyword, setKeyword] = useState(initialKeyword);
  const [source, setSource] = useState('openalex');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);

  const [papers, setPapers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [savingPaperId, setSavingPaperId] = useState<string | null>(null);
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sync route param
  useEffect(() => {
    if (initialKeyword) {
      setKeyword(initialKeyword);
      fetchResults(initialKeyword, source, 1);
    }
  }, [initialKeyword]);

  const fetchResults = async (query: string, sourceOverride = source, pageNum = 1) => {
    if (!query) return;
    setIsLoading(true);
    setError('');
    try {
      const params: any = { keyword: query, source: sourceOverride, page: pageNum };
      if (year) params.year = parseInt(year);
      const res = await api.get('/sources/search', { params });
      setPapers(res.data.papers || []);
      setTotal(res.data.total || 0);
      setPage(pageNum);
      fetchSuggestions(query);
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 429) {
        setError('Rate limit exceeded. Please wait a moment.');
      } else if (status === 504) {
        setError('API request timeout. Please refine keyword.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch results.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!query) return;
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const res = await api.get('/sources/suggest', { params: { keyword: query } });
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.warn('Gemini suggestions failed:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSearch = () => {
    if (keyword.trim()) {
      fetchResults(keyword, source, 1);
    }
  };

  const isMongoObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

  const buildSavablePaper = (p: any) => {
    const paperSource = p.source === 'semanticscholar' ? 'semantic_scholar' : p.source;
    const externalIds: Record<string, string> = {};
    if (p.id) {
      if (p.source === 'openalex') externalIds.openalex = p.id;
      if (p.source === 'semanticscholar') externalIds.semanticScholar = p.id;
      if (p.source === 'crossref') externalIds.crossref = p.id;
      if (p.source === 'ieee') externalIds.ieee = p.id;
      if (p.source === 'exa') externalIds.exa = p.id;
    }
    return {
      title: p.title || 'Untitled Paper',
      abstract: p.abstract || '',
      doi: p.doi || undefined,
      publishedDate: p.publishedDate || undefined,
      publicationYear: p.publicationYear || undefined,
      citationCount: p.citationCount || 0,
      authors: (p.authors || []).map((a: any, idx: number) => ({
        name: a.name || 'Unknown',
        externalId: a.authorId || undefined,
        order: idx + 1,
      })),
      journalName: p.journalName || undefined,
      source: paperSource,
      url: p.url || undefined,
      externalIds,
    };
  };

  const ensurePaperInDatabase = async (paper: any) => {
    if (paper.id && isMongoObjectId(paper.id)) return paper.id;
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return null;
    }
    setSavingPaperId(paper.id);
    try {
      const res = await api.post('/papers', { paper: buildSavablePaper(paper) });
      const dbId = res.data.paper?._id || res.data.paper?.id;
      if (dbId) {
        setSavedPaperIds((current) => new Set(current).add(paper.id));
      }
      return dbId;
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
        return null;
      }
      if (err.response?.status === 409 && err.response?.data?.paper?._id) {
        return err.response.data.paper._id;
      }
      setError(err.response?.data?.message || 'Could not save paper to database.');
      return null;
    } finally {
      setSavingPaperId(null);
    }
  };

  const openPaperDetails = async (paper: any) => {
    const dbId = await ensurePaperInDatabase(paper);
    if (dbId) {
      router.push(`/paper/${dbId}`);
    }
  };

  const handleBookmark = async (paper: any) => {
    try {
      const dbId = await ensurePaperInDatabase(paper);
      if (!dbId) return;
      await api.post(`/papers/${dbId}/bookmark`);
      setSavedPaperIds((current) => new Set(current).add(paper.id));
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/login');
      else setError('Failed to save paper bookmark.');
    }
  };

  const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown Authors';
    return authors.slice(0, 3).map((a) => a.name).join(', ') + (authors.length > 3 ? ' et al.' : '');
  };

  const handleOpenLink = (url: string) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header & Search Bar */}
      <View style={styles.header}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SearchIcon size={18} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            placeholder="Search papers, DOI, topic..."
            placeholderTextColor={theme.muted}
            value={keyword}
            onChangeText={setKeyword}
            style={[styles.searchInput, { color: theme.text }]}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterBtn, showFilters && { backgroundColor: theme.primary + '20' }]}
          >
            <Filter size={18} color={showFilters ? theme.primary : theme.icon} />
          </TouchableOpacity>
        </View>

        {/* Dynamic Filters Panel */}
        {showFilters && (
          <View style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={[styles.filterLabel, { color: theme.muted }]}>SOURCE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                  {Object.keys(SOURCE_META).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSource(s)}
                      style={[
                        styles.choiceChip,
                        { borderColor: theme.border },
                        source === s && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                    >
                      <Text style={[styles.choiceChipText, { color: theme.text }, source === s && { color: '#fff' }]}>
                        {SOURCE_META[s].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={[styles.filterLabel, { color: theme.muted }]}>YEAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                  <TouchableOpacity
                    onPress={() => setYear('')}
                    style={[
                      styles.choiceChip,
                      { borderColor: theme.border },
                      year === '' && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                  >
                    <Text style={[styles.choiceChipText, { color: theme.text }, year === '' && { color: '#fff' }]}>
                      All Years
                    </Text>
                  </TouchableOpacity>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setYear(y.toString())}
                      style={[
                        styles.choiceChip,
                        { borderColor: theme.border },
                        year === y.toString() && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                    >
                      <Text style={[styles.choiceChipText, { color: theme.text }, year === y.toString() && { color: '#fff' }]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowFilters(false);
                fetchResults(keyword, source, 1);
              }}
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Suggested Topics Panel */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionTitleRow}>
            <Sparkles size={13} color={theme.primary} />
            <Text style={[styles.suggestionTitle, { color: theme.muted }]}>Related Topics:</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionList}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setKeyword(s);
                  fetchResults(s, source, 1);
                }}
                style={[styles.suggestionChip, { backgroundColor: theme.primary + '10' }]}
              >
                <Text style={[styles.suggestionText, { color: theme.primary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Searching millions of academic papers...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme.destructive }]}>{error}</Text>
          {source !== 'openalex' && (
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: theme.primary }]}
              onPress={() => {
                setSource('openalex');
                fetchResults(keyword, 'openalex', 1);
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>Try OpenAlex</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : papers.length === 0 ? (
        <View style={styles.centerContainer}>
          <SearchIcon size={48} color={theme.icon} style={{ opacity: 0.3, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {keyword ? 'No papers found. Try adjusting keywords.' : 'Enter keyword to find papers.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={papers}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const meta = SOURCE_META[item.source] || { label: item.source, bg: '#eaeaea', text: '#333' };
            const isBookmarked = savedPaperIds.has(item.id);

            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <TouchableOpacity onPress={() => openPaperDetails(item)} style={{ flex: 1 }}>
                    <Text style={[styles.paperTitle, { color: theme.text }]} numberOfLines={2}>
                      {item.title || 'Untitled paper'}
                    </Text>
                  </TouchableOpacity>
                  <View style={[styles.sourceBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.sourceText, { color: meta.text }]}>{meta.label}</Text>
                  </View>
                </View>

                {/* Author / Date */}
                <Text style={[styles.paperAuthors, { color: theme.muted }]}>
                  {formatAuthors(item.authors)} · {item.publicationYear || 'N/A'}
                  {item.citationCount > 0 && ` · ${item.citationCount} citations`}
                </Text>

                {/* Snippet abstract */}
                <Text style={[styles.paperAbstract, { color: theme.muted }]} numberOfLines={3}>
                  {item.abstract || 'No abstract available.'}
                </Text>

                {/* Card Actions */}
                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <View style={styles.footerLeft}>
                    <TouchableOpacity
                      onPress={() => handleBookmark(item)}
                      disabled={savingPaperId === item.id}
                      style={styles.footerActionBtn}
                    >
                      {savingPaperId === item.id ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Bookmark size={15} color={isBookmarked ? theme.primary : theme.icon} fill={isBookmarked ? theme.primary : 'none'} />
                      )}
                      <Text style={[styles.actionBtnText, { color: isBookmarked ? theme.primary : theme.icon }]}>
                        {isBookmarked ? 'Saved' : 'Save'}
                      </Text>
                    </TouchableOpacity>

                    {item.url && (
                      <TouchableOpacity
                        onPress={() => handleOpenLink(item.url)}
                        style={styles.footerActionBtn}
                      >
                        <ExternalLink size={15} color={theme.icon} />
                        <Text style={[styles.actionBtnText, { color: theme.icon }]}>Source</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => openPaperDetails(item)}
                    style={styles.detailsBtn}
                  >
                    <Text style={[styles.detailsBtnText, { color: theme.primary }]}>View Details</Text>
                    <ArrowRight size={14} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListFooterComponent={() => (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                onPress={() => fetchResults(keyword, source, page - 1)}
                disabled={page <= 1 || isLoading}
                style={[styles.pageBtn, { borderColor: theme.border }, page <= 1 && { opacity: 0.5 }]}
              >
                <Text style={[styles.pageBtnText, { color: theme.text }]}>Prev</Text>
              </TouchableOpacity>
              <Text style={[styles.pageIndicator, { color: theme.text }]}>Page {page}</Text>
              <TouchableOpacity
                onPress={() => fetchResults(keyword, source, page + 1)}
                disabled={papers.length < 20 || isLoading}
                style={[styles.pageBtn, { borderColor: theme.border }, papers.length < 20 && { opacity: 0.5 }]}
              >
                <Text style={[styles.pageBtnText, { color: theme.text }]}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  filterBtn: {
    padding: 8,
    borderRadius: 8,
  },
  filtersPanel: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterCol: {},
  filterLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  choiceRow: {
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  applyBtn: {
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  suggestionList: {
    gap: 6,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  paperTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  paperAuthors: {
    fontSize: 12,
    marginBottom: 8,
  },
  paperAbstract: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
