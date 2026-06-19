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
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Brain,
  Search,
  Sparkles,
  GitBranch,
  Target,
  FileText,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const CATEGORY_COLORS: Record<string, string> = {
  domain: '#3b82f6', // blue
  algorithm: '#ef4444', // red
  application: '#22c55e', // green
  method: '#a855f7', // purple
  dataset: '#f97316', // orange
  tool: '#06b6d4', // cyan
  general: '#6b7280', // gray
};

const CATEGORY_BG: Record<string, string> = {
  domain: '#3b82f615',
  algorithm: '#ef444415',
  application: '#22c55e15',
  method: '#a855f715',
  dataset: '#f9731615',
  tool: '#06b6d415',
  general: '#6b728015',
};

// SVG Node Network Diagram
function NodeGraph({ nodes, centerKeyword, theme, onNodePress }: { nodes: any[]; centerKeyword: string; theme: any; onNodePress: (node: any) => void }) {
  const chartSize = 300;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  if (!nodes || nodes.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <GitBranch size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.muted }]}>
          No co-occurrence relationships found. Build a corpus to generate graph.
        </Text>
      </View>
    );
  }

  // Slice to max 10 satellite nodes for clear mobile rendering
  const visibleNodes = nodes.slice(0, 10);
  const radius = 95;

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
          const color = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.general;
          return (
            <React.Fragment key={`node-${idx}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill={color}
                opacity={0.8}
                onPress={() => onNodePress(p)}
              />
              <SvgText
                x={p.x}
                y={p.y + 24}
                fill={theme.text}
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                onPress={() => onNodePress(p)}
              >
                {p.label || p.id}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Draw center node */}
        <Circle cx={cx} cy={cy} r={22} fill={theme.primary} />
        <SvgText
          x={cx}
          y={cy + 4}
          fill="#ffffff"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          {centerKeyword.length > 8 ? `${centerKeyword.slice(0, 7)}.` : centerKeyword}
        </SvgText>
      </Svg>
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [keyword, setKeyword] = useState('mamba');
  const [searchedKeyword, setSearchedKeyword] = useState('');
  const [trendData, setTrendData] = useState<any>(null);
  const [categories, setCategories] = useState<Record<string, any[]>>({});
  const [algorithmDomains, setAlgorithmDomains] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCorpus, setIsCreatingCorpus] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [graphData, setGraphData] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const keywordParam = (searchParams.keyword as string) || '';

  const performAnalysis = async (seedValue: string) => {
    if (!seedValue) return;

    setIsLoading(true);
    setError('');
    setMessage('');
    setSearchedKeyword(seedValue);
    setSelectedNode(null);

    try {
      let activeRun = '';
      try {
        const runsRes = await api.get('/corpus/runs', { params: { limit: 100 } });
        const matchingRun = (runsRes.data.runs || []).find(
          (r: any) => r.seedKeyword.toLowerCase() === seedValue.toLowerCase() && r.status === 'completed'
        );
        if (matchingRun) activeRun = matchingRun._id;
      } catch (err) {
        console.error('Failed to check existing corpus runs', err);
      }

      const categoriesParams: any = { limit: 8 };
      const domainsParams: any = { limit: 8, paperLimit: 500 };
      const graphParams: any = { limit: 50, paperLimit: 300 };

      if (activeRun) {
        categoriesParams.analysisRunId = activeRun;
        domainsParams.analysisRunId = activeRun;
        graphParams.analysisRunId = activeRun;
      }

      const [trendRes, algorithmRes, domainRes, applicationRes, methodRes, pairRes, paperRes, graphRes] =
        await Promise.allSettled([
          api.get('/trends/keyword', { params: { keyword: seedValue } }),
          api.get('/trends/keyword-categories', { params: { category: 'algorithm', ...categoriesParams } }),
          api.get('/trends/keyword-categories', { params: { category: 'domain', ...categoriesParams } }),
          api.get('/trends/keyword-categories', { params: { category: 'application', ...categoriesParams } }),
          api.get('/trends/keyword-categories', { params: { category: 'method', ...categoriesParams } }),
          api.get('/trends/algorithm-domains', { params: domainsParams }),
          api.get('/sources/search', { params: { source: 'openalex', keyword: seedValue, limit: 5 } }),
          activeRun
            ? api.get('/trends/keyword-graph', { params: graphParams })
            : Promise.reject(new Error('No active run for graph')),
        ]);

      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data);
      else setTrendData(null);

      setCategories({
        algorithm: algorithmRes.status === 'fulfilled' ? algorithmRes.value.data.keywords || [] : [],
        domain: domainRes.status === 'fulfilled' ? domainRes.value.data.keywords || [] : [],
        application: applicationRes.status === 'fulfilled' ? applicationRes.value.data.keywords || [] : [],
        method: methodRes.status === 'fulfilled' ? methodRes.value.data.keywords || [] : [],
      });
      setAlgorithmDomains(pairRes.status === 'fulfilled' ? pairRes.value.data.pairs || [] : []);
      setPapers(paperRes.status === 'fulfilled' ? paperRes.value.data.papers || [] : []);

      if (graphRes.status === 'fulfilled') {
        setGraphData(graphRes.value.data.nodes || []);
      } else {
        setGraphData([]);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeKeyword = () => {
    performAnalysis(keyword.trim());
  };

  const createCorpus = async () => {
    const seed = keyword.trim();
    if (!seed) return;
    setIsCreatingCorpus(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/corpus/runs', {
        seedKeyword: seed,
        source: 'openalex',
        startYear: new Date().getFullYear() - 5,
        endYear: new Date().getFullYear(),
        maxPages: 2,
        perPage: 25,
      });
      setMessage(
        `Corpus analysis run started for "${seed}". Check status in admin/monitoring, or click Analyze again when ready.`
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start corpus run.');
    } finally {
      setIsCreatingCorpus(false);
    }
  };

  useEffect(() => {
    if (keywordParam) {
      setKeyword(keywordParam);
      performAnalysis(keywordParam);
    } else {
      performAnalysis(keyword);
    }
  }, [keywordParam]);

  // Derive suggested opportunities
  const opportunities = React.useMemo(() => {
    const topAlgorithm = categories.algorithm?.[0]?.name;
    const topDomain = categories.domain?.[0]?.name;
    const topApplication = categories.application?.[0]?.name;
    const topMethod = categories.method?.[0]?.name;
    const pair = algorithmDomains[0];
    const items = [];

    if (pair?.algorithm && pair?.domain) {
      items.push({
        title: `${pair.algorithm} in ${pair.domain}`,
        type: 'Algorithm-domain pair',
        why: `This pair co-occurs in ${pair.paperCount || 0} papers inside the analysis corpus.`,
        next: `Investigate accuracy & latency evaluations for ${pair.algorithm} on ${pair.domain} datasets.`,
      });
    }
    if (topAlgorithm && topApplication) {
      items.push({
        title: `${topAlgorithm} for ${topApplication}`,
        type: 'Technique application',
        why: `Combines a trending algorithm with a practical application domain.`,
        next: `Explore implementation frameworks for deploying ${topAlgorithm} to ${topApplication} use cases.`,
      });
    }
    if (topDomain && topMethod) {
      items.push({
        title: `${topMethod} on ${topDomain}`,
        type: 'Method-domain niche',
        why: `Methods show value when evaluated in concrete research domains.`,
        next: `Search for evaluation gaps of ${topMethod} on ${topDomain}.`,
      });
    }
    return items;
  }, [algorithmDomains, categories]);

  const hasResults = !!searchedKeyword;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Brain size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Research Opportunity Finder</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Enter a keyword or domain. Recommends research directions based on paper co-occurrences.
        </Text>
      </View>

      {/* Control Box */}
      <View style={[styles.controlCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Search size={18} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            placeholder="Search keyword (e.g. mamba, robotics)"
            placeholderTextColor={theme.muted}
            value={keyword}
            onChangeText={setKeyword}
            style={[styles.searchInput, { color: theme.text }]}
            onSubmitEditing={analyzeKeyword}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={analyzeKeyword}
            disabled={isLoading || !keyword.trim()}
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Sparkles size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Analyze</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={createCorpus}
            disabled={isCreatingCorpus || !keyword.trim()}
            style={[styles.actionBtnOutline, { borderColor: theme.primary }]}
          >
            {isCreatingCorpus ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.actionBtnOutlineText, { color: theme.primary }]}>Build Corpus</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[styles.alertBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
            <Text style={[styles.alertText, { color: theme.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {message ? (
          <View style={[styles.alertBox, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <Text style={[styles.alertText, { color: theme.primary }]}>{message}</Text>
          </View>
        ) : null}
      </View>

      {/* Results Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Extracting research entities & co-occurrences...</Text>
        </View>
      ) : hasResults ? (
        <View style={styles.resultsWrapper}>
          {/* Node Graph Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <GitBranch size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Keyword Co-occurrence Graph</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.muted }]}>
              Satellite nodes reflect terms that frequently appear alongside "{searchedKeyword}".
            </Text>

            <NodeGraph
              nodes={graphData}
              centerKeyword={searchedKeyword}
              theme={theme}
              onNodePress={(n) => setSelectedNode(n)}
            />

            {/* Display Node Details on Press */}
            {selectedNode && (
              <View style={[styles.nodeDetails, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={styles.nodeDetailsHeader}>
                  <Text style={[styles.nodeDetailsName, { color: theme.text }]}>
                    {selectedNode.label || selectedNode.id}
                  </Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: CATEGORY_BG[selectedNode.category] || '#eaeaea' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        { color: CATEGORY_COLORS[selectedNode.category] || '#333' },
                      ]}
                    >
                      {selectedNode.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.nodeDetailsCount, { color: theme.muted }]}>
                  Found in {selectedNode.paperCount || 1} papers.
                </Text>
              </View>
            )}
          </View>

          {/* Stats & Entity lists */}
          <View style={styles.categoriesRow}>
            {['algorithm', 'domain', 'application'].map((cat) => (
              <View
                key={cat}
                style={[
                  styles.categoryCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.categoryHeader, { color: theme.text }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}s
                </Text>
                <View style={styles.badgeRow}>
                  {categories[cat]?.slice(0, 6).map((c, i) => (
                    <View
                      key={i}
                      style={[styles.entityBadge, { backgroundColor: CATEGORY_BG[cat] || '#eee' }]}
                    >
                      <Text style={[styles.entityBadgeText, { color: CATEGORY_COLORS[cat] || '#333' }]}>
                        {c.name}
                      </Text>
                    </View>
                  ))}
                  {(!categories[cat] || categories[cat].length === 0) && (
                    <Text style={[styles.emptyItemText, { color: theme.muted }]}>No terms stored.</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Opportunities Section */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Target size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Suggested Research Opportunities</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.muted }]}>
              Topic directions derived from co-occurrence pairs.
            </Text>

            {opportunities.length > 0 ? (
              <View style={styles.opportunitiesList}>
                {opportunities.map((opp, idx) => (
                  <View key={idx} style={[styles.oppCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={styles.oppHeader}>
                      <View style={[styles.oppTypeBadge, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.oppTypeBadgeText, { color: theme.primary }]}>{opp.type}</Text>
                      </View>
                      <Text style={[styles.oppTitle, { color: theme.text }]}>{opp.title}</Text>
                    </View>
                    <Text style={[styles.oppWhy, { color: theme.muted }]}>{opp.why}</Text>
                    <View style={styles.oppActionBox}>
                      <ArrowRight size={14} color={theme.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.oppActionText, { color: theme.muted }]}>{opp.next}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyItemText, { color: theme.muted }]}>
                Not enough local data. Click Build Corpus to pull more papers.
              </Text>
            )}
          </View>

          {/* Evidence Papers */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 40 }]}>
            <View style={styles.cardHeader}>
              <FileText size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Evidence Papers</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.muted }]}>
              Recent papers loaded from the databases.
            </Text>

            <View style={styles.papersList}>
              {papers.slice(0, 5).map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    if (p.id) router.push({ pathname: '/explore', params: { searchKeyword: p.title } });
                  }}
                  style={[styles.paperItem, { borderBottomColor: theme.border }]}
                >
                  <Text style={[styles.paperItemTitle, { color: theme.text }]} numberOfLines={2}>
                    {p.title || 'Untitled Paper'}
                  </Text>
                  <Text style={[styles.paperItemMeta, { color: theme.muted }]}>
                    {p.publicationYear || 'N/A'} · {p.citationCount || 0} citations
                  </Text>
                </TouchableOpacity>
              ))}
              {papers.length === 0 && (
                <Text style={[styles.emptyItemText, { color: theme.muted }]}>No evidence papers found.</Text>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 40 }]}>
          <Info size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
          <Text style={[styles.emptyStateText, { color: theme.muted }]}>
            Enter a research keyword above to find insights.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  controlCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  actionBtnOutline: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  alertBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  alertText: {
    fontSize: 12,
    lineHeight: 16,
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  resultsWrapper: {
    gap: 16,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  emptyGraph: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyGraphText: {
    fontSize: 12,
    textAlign: 'center',
  },
  graphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  nodeDetails: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  nodeDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nodeDetailsName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  nodeDetailsCount: {
    fontSize: 11,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  badgeRow: {
    gap: 6,
  },
  entityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entityBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptyItemText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  opportunitiesList: {
    gap: 12,
  },
  oppCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  oppHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  oppTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  oppTypeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  oppTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  oppWhy: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  oppActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  oppActionText: {
    fontSize: 11,
    flex: 1,
  },
  papersList: {
    gap: 2,
  },
  paperItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  paperItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  paperItemMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyStateText: {
    fontSize: 13,
  },
});
