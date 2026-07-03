import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Brain,
  Search,
  Sparkles,
  GitBranch,
  Target,
  FileText,
  ArrowRight,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Building2,
  Users,
  LayoutList,
  Zap,
  Flame,
  CalendarRange,
} from 'lucide-react-native';
import Svg, { Line, Circle, Text as SvgText, G, Path } from 'react-native-svg';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CHART_COLORS = ['#a855f7', '#22d5e6', '#ec4899', '#10b981', '#f97316', '#3b82f6'];

const CATEGORY_COLORS: Record<string, string> = {
  domain: '#3b82f6',
  algorithm: '#ef4444',
  application: '#22c55e',
  method: '#a855f7',
  dataset: '#f97316',
  tool: '#06b6d4',
  general: '#6b7280',
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

// SVG Node Network Diagram (Opportunity Finder)
function NodeGraph({ nodes, centerKeyword, theme, onNodePress }: { nodes: any[]; centerKeyword: string; theme: any; onNodePress: (node: any) => void }) {
  const chartSize = 300;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  if (!nodes || nodes.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <GitBranch size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.mutedForeground }]}>
          No co-occurrence relationships found. Build a corpus to generate graph.
        </Text>
      </View>
    );
  }

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

        {points.map((p, idx) => {
          const color = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.general;
          return (
            <G key={`node-${idx}`}>
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
            </G>
          );
        })}

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

// Custom Horizontal Bar Chart
function HorizontalBarChart({ data, theme }: { data: any[]; theme: any }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={styles.barChartContainer}>
      {data.slice(0, 6).map((item, idx) => {
        const percentage = (item.count / maxVal) * 100;
        return (
          <View key={idx} style={styles.barChartRow}>
            <View style={styles.barChartHeader}>
              <Text style={[styles.barChartLabel, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.barChartValue, { color: theme.mutedForeground }]}>
                {item.count.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.barChartTrack, { backgroundColor: theme.background }]}>
              <View style={[styles.barChartFill, { width: `${percentage}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Custom Line Chart for Emerging Trends
function SVGLineChart({ data, trendNames, theme }: { data: any[]; trendNames: string[]; theme: any }) {
  if (!data || data.length === 0 || !trendNames || trendNames.length === 0) {
    return (
      <View style={styles.emptyGraph}>
        <TrendingUp size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
        <Text style={[styles.emptyGraphText, { color: theme.mutedForeground }]}>
          No trend timeline data available.
        </Text>
      </View>
    );
  }

  const chartHeight = 160;
  const chartWidth = width - 72;
  const paddingX = 24;
  const paddingY = 20;

  const years = data.map((d) => d.year);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);
  const yearRange = maxYear - minYear || 1;

  let maxVal = 10;
  data.forEach((d) => {
    trendNames.forEach((name) => {
      if (d[name] && d[name] > maxVal) maxVal = d[name];
    });
  });

  return (
    <View style={styles.lineChartContainer}>
      <Svg height={chartHeight} width={chartWidth}>
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

        {trendNames.map((name, nameIdx) => {
          const color = CHART_COLORS[nameIdx % CHART_COLORS.length];
          const points = data.map((d) => {
            const val = d[name] || 0;
            const x = paddingX + ((d.year - minYear) / yearRange) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
            return { x, y };
          });

          let linePath = '';
          if (points.length > 0) {
            linePath = `M ${points[0].x} ${points[0].y}`;
            points.forEach((p, idx) => {
              if (idx > 0) linePath += ` L ${p.x} ${p.y}`;
            });
          }

          return (
            <G key={`${name}-${nameIdx}`}>
              {linePath ? <Path d={linePath} fill="none" stroke={color} strokeWidth="2" /> : null}
              {points.map((p, idx) => (
                <Circle key={idx} cx={p.x} cy={p.y} r={3} fill={color} />
              ))}
            </G>
          );
        })}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: chartWidth, marginTop: 4, paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 10, color: theme.mutedForeground }}>{minYear}</Text>
        <Text style={{ fontSize: 10, color: theme.mutedForeground }}>{maxYear}</Text>
      </View>

      <View style={styles.legendContainer}>
        {trendNames.map((name, idx) => (
          <View key={`${name}-${idx}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }]} />
            <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'collaborators' | 'opportunity'>('overview');

  // Filter States (Dashboard global)
  const [dashboardKeyword, setDashboardKeyword] = useState('');
  const [searchedDashboardKeyword, setSearchedDashboardKeyword] = useState('');
  const [startYear, setStartYear] = useState(currentYear - 5);
  const [endYear, setEndYear] = useState(currentYear);
  const [activeSource, setActiveSource] = useState<'openalex' | 'local'>('local');

  // Global Insights Data States
  const [topTopics, setTopTopics] = useState<any[]>([]);
  const [topKeywords, setTopKeywords] = useState<any[]>([]);
  const [globalTotalPapers, setGlobalTotalPapers] = useState(0);
  const [trends, setTrends] = useState<any[]>([]);
  const [affiliations, setAffiliations] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [insightsWarning, setInsightsWarning] = useState('');

  // Local Opportunity States
  const [opportunityKeyword, setOpportunityKeyword] = useState('mamba');
  const [searchedOpportunityKeyword, setSearchedOpportunityKeyword] = useState('');
  const [opportunityCategories, setOpportunityCategories] = useState<Record<string, any[]>>({});
  const [algorithmDomains, setAlgorithmDomains] = useState<any[]>([]);
  const [evidencePapers, setEvidencePapers] = useState<any[]>([]);
  const [isOppLoading, setIsOppLoading] = useState(false);
  const [isCreatingCorpus, setIsCreatingCorpus] = useState(false);
  const [oppError, setOppError] = useState('');
  const [oppMessage, setOppMessage] = useState('');
  const [graphData, setGraphData] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const keywordParam = (searchParams.keyword as string) || '';

  // 1. Fetch Global Insights
  const fetchDashboardInsights = async () => {
    setIsInsightsLoading(true);
    setInsightsError('');
    setInsightsWarning('');
    setSearchedDashboardKeyword(dashboardKeyword.trim());

    try {
      const params: any = {
        startYear,
        endYear,
      };
      if (dashboardKeyword.trim()) {
        params.keyword = dashboardKeyword.trim();
      }

      const [topTopicsRes, emergingRes, affiliationsRes] = await Promise.allSettled([
        api.get('/trends/insights/top-topics', { params }),
        api.get('/trends/insights/emerging-trends', { params }),
        api.get('/trends/insights/top-affiliations', { params }),
      ]);

      let resolvedSource: 'openalex' | 'local' = dashboardKeyword.trim() ? 'openalex' : 'local';

      if (topTopicsRes.status === 'fulfilled') {
        setTopTopics(topTopicsRes.value.data.topics || []);
        setTopKeywords(topTopicsRes.value.data.keywords || []);
        setGlobalTotalPapers(topTopicsRes.value.data.totalPapers || 0);
        if (topTopicsRes.value.data.source) resolvedSource = topTopicsRes.value.data.source;
        if (topTopicsRes.value.data.warning) setInsightsWarning(topTopicsRes.value.data.warning);
      }
      if (emergingRes.status === 'fulfilled') {
        setTrends(emergingRes.value.data.trends || []);
        if (emergingRes.value.data.source) resolvedSource = emergingRes.value.data.source;
      }
      if (affiliationsRes.status === 'fulfilled') {
        setAffiliations(affiliationsRes.value.data.affiliations || []);
        setAuthors(affiliationsRes.value.data.authors || []);
        if (affiliationsRes.value.data.source) resolvedSource = affiliationsRes.value.data.source;
      }

      setActiveSource(resolvedSource);
    } catch (e: any) {
      console.error(e);
      const status = e.response?.status;
      if (status === 504) {
        setInsightsError('API request timeout. Upstream database is slow. Please try again.');
      } else {
        setInsightsError(e.response?.data?.message || 'Failed to fetch global insights.');
      }
    } finally {
      setIsInsightsLoading(false);
    }
  };

  // 2. Local Opportunity Finder fetching logic
  const performOpportunityAnalysis = async (seedValue: string) => {
    if (!seedValue) return;

    setIsOppLoading(true);
    setOppError('');
    setOppMessage('');
    setSearchedOpportunityKeyword(seedValue);
    setSelectedNode(null);

    try {
      let activeRun = '';
      try {
        const runsRes = await api.get('/corpus/runs', { params: { limit: 100 } });
        const matchingRun = (runsRes.data.runs || []).find(
          (r: any) => r.seedKeyword && r.seedKeyword.toLowerCase() === seedValue.toLowerCase() && r.status === 'completed'
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

      setOpportunityCategories({
        algorithm: algorithmRes.status === 'fulfilled' ? algorithmRes.value.data.keywords || [] : [],
        domain: domainRes.status === 'fulfilled' ? domainRes.value.data.keywords || [] : [],
        application: applicationRes.status === 'fulfilled' ? applicationRes.value.data.keywords || [] : [],
        method: methodRes.status === 'fulfilled' ? methodRes.value.data.keywords || [] : [],
      });
      setAlgorithmDomains(pairRes.status === 'fulfilled' ? pairRes.value.data.pairs || [] : []);
      setEvidencePapers(paperRes.status === 'fulfilled' ? paperRes.value.data.papers || [] : []);

      if (graphRes.status === 'fulfilled') {
        setGraphData(graphRes.value.data.nodes || []);
      } else {
        setGraphData([]);
      }
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 504) {
        setOppError('API request timeout. Please try again.');
      } else {
        setOppError(err.response?.data?.message || 'An error occurred during analysis.');
      }
    } finally {
      setIsOppLoading(false);
    }
  };

  const createCorpus = async () => {
    const seed = opportunityKeyword.trim();
    if (!seed) return;
    setIsCreatingCorpus(true);
    setOppError('');
    setOppMessage('');
    try {
      await api.post('/corpus/runs', {
        seedKeyword: seed,
        source: 'openalex',
        startYear: new Date().getFullYear() - 5,
        endYear: new Date().getFullYear(),
        maxPages: 2,
        perPage: 25,
      });
      setOppMessage(
        `Corpus analysis run started for "${seed}". Track its status in Corpus Management, or click Analyze again when ready.`
      );
    } catch (err: any) {
      setOppError(err.response?.data?.message || 'Could not start corpus run.');
    } finally {
      setIsCreatingCorpus(false);
    }
  };

  // Mount/Params fetch trigger
  useEffect(() => {
    fetchDashboardInsights();
  }, [startYear, endYear]);

  useEffect(() => {
    if (keywordParam) {
      // If keyword passed, automatically go to Opportunity Finder tab
      setActiveTab('opportunity');
      setOpportunityKeyword(keywordParam);
      performOpportunityAnalysis(keywordParam);
    } else {
      performOpportunityAnalysis(opportunityKeyword);
    }
  }, [keywordParam]);

  // Line chart data formatting
  const lineChartData = useMemo(() => {
    if (!trends.length) return [];
    const allYears = new Set<number>();
    trends.forEach((t) => {
      if (t.yearlyData) {
        t.yearlyData.forEach((d: any) => allYears.add(d.year));
      }
    });
    const sortedYears = Array.from(allYears).sort();
    return sortedYears.map((year) => {
      const point: Record<string, any> = { year };
      trends.slice(0, 5).forEach((t) => {
        const found = t.yearlyData?.find((d: any) => d.year === year);
        point[t.name] = found ? found.count : 0;
      });
      return point;
    });
  }, [trends]);

  const trendNames = useMemo(() => trends.slice(0, 5).map((t) => t.name), [trends]);

  // Suggested Opportunity derived items
  const derivedOpportunities = useMemo(() => {
    const topAlgorithm = opportunityCategories.algorithm?.[0]?.name;
    const topDomain = opportunityCategories.domain?.[0]?.name;
    const topApplication = opportunityCategories.application?.[0]?.name;
    const topMethod = opportunityCategories.method?.[0]?.name;
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
  }, [algorithmDomains, opportunityCategories]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View style={styles.titleRow}>
          <Brain size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Research Insights</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          AI Research Insights dashboard & Opportunity finder.
        </Text>
      </View>

      {/* Tabs Selector */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'trends', label: 'Trends' },
          { id: 'collaborators', label: 'Partners' },
          { id: 'opportunity', label: 'Opportunity' },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tabItem,
              activeTab === tab.id && { borderBottomColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? theme.primary : theme.mutedForeground },
                activeTab === tab.id && { fontWeight: 'bold' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Render Search Filter box for dashboard tabs */}
        {activeTab !== 'opportunity' && (
          <View style={[styles.controlCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Search size={18} color={theme.icon} style={styles.searchIcon} />
              <TextInput
                placeholder="Global keyword (leave blank for corpus data)"
                placeholderTextColor={theme.mutedForeground}
                value={dashboardKeyword}
                onChangeText={setDashboardKeyword}
                style={[styles.searchInput, { color: theme.text }]}
                onSubmitEditing={fetchDashboardInsights}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.yearCol}>
                <CalendarRange size={14} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.filterLabel, { color: theme.mutedForeground }]}>Years:</Text>
                <TextInput
                  style={[styles.yearInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  keyboardType="numeric"
                  value={String(startYear)}
                  onChangeText={(val) => setStartYear(parseInt(val, 10) || currentYear - 5)}
                  maxLength={4}
                />
                <Text style={{ color: theme.mutedForeground }}>—</Text>
                <TextInput
                  style={[styles.yearInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  keyboardType="numeric"
                  value={String(endYear)}
                  onChangeText={(val) => setEndYear(parseInt(val, 10) || currentYear)}
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                onPress={fetchDashboardInsights}
                disabled={isInsightsLoading}
                style={[styles.analyzeBtn, { backgroundColor: theme.primary }]}
              >
                {isInsightsLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Sparkles size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.analyzeBtnText}>Analyze</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
              <View style={[styles.badge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                {activeSource === 'openalex' ? (
                  <Text style={[styles.badgeText, { color: theme.primary }]}>
                    <Zap size={10} color={theme.primary} /> Live OpenAlex {searchedDashboardKeyword ? `· "${searchedDashboardKeyword}"` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.badgeText, { color: theme.primary }]}>
                    <LayoutList size={10} color={theme.primary} /> Saved Corpus Data
                  </Text>
                )}
              </View>
            </View>

            {insightsError ? (
              <View style={[styles.alertBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30', marginTop: 10 }]}>
                <Text style={[styles.alertText, { color: theme.destructive }]}>{insightsError}</Text>
              </View>
            ) : null}

            {insightsWarning ? (
              <View style={[styles.alertBox, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30', marginTop: 10 }]}>
                <Text style={[styles.alertText, { color: theme.primary }]}>{insightsWarning}</Text>
              </View>
            ) : null}
          </View>
        )}

        {isInsightsLoading && activeTab !== 'opportunity' ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>Generating research insights...</Text>
          </View>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <View style={styles.tabContent}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statCardLabel, { color: theme.mutedForeground }]}>Papers Analyzed</Text>
                    <Text style={[styles.statCardValue, { color: theme.text }]}>
                      {globalTotalPapers ? globalTotalPapers.toLocaleString() : '0'}
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statCardLabel, { color: theme.mutedForeground }]}>Emerging Topics</Text>
                    <Text style={[styles.statCardValue, { color: theme.text }]}>
                      {trends.filter((t) => t.isEmerging).length}
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statCardLabel, { color: theme.mutedForeground }]}>Keywords Tracked</Text>
                    <Text style={[styles.statCardValue, { color: theme.text }]}>
                      {topKeywords.length}
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statCardLabel, { color: theme.mutedForeground }]}>Leading Institute</Text>
                    <Text style={[styles.statCardValue, { color: theme.text }]} numberOfLines={1}>
                      {affiliations[0]?.affiliation || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Top Topics Chart */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <Award size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Top Categories & Topics</Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                    Research fields ranking by paper volumes ({startYear} - {endYear}).
                  </Text>
                  <HorizontalBarChart data={topTopics} theme={theme} />
                </View>

                {/* Topics Table List */}
                {topTopics.length > 0 && (
                  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.subSectionTitle, { color: theme.text }]}>Topic Rankings</Text>
                    {topTopics.slice(0, 5).map((topic, i) => (
                      <View key={topic.name} style={[styles.listItemRow, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.listRank, { color: theme.primary }]}>#{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>{topic.name}</Text>
                          <Text style={[styles.listSubText, { color: theme.mutedForeground }]}>{topic.category}</Text>
                        </View>
                        <Text style={[styles.listCount, { color: theme.text }]}>{topic.count.toLocaleString()} papers</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TRENDS TAB */}
            {activeTab === 'trends' && (
              <View style={styles.tabContent}>
                {/* Line Chart */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <TrendingUp size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Emerging Trends Velocity</Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                    Yearly publication count dynamics of leading keywords.
                  </Text>
                  <SVGLineChart data={lineChartData} trendNames={trendNames} theme={theme} />
                </View>

                {/* Trend cards list */}
                <View style={styles.gridContainer}>
                  {trends.slice(0, 8).map((trend) => {
                    const isUp = trend.growthRate > 0;
                    const isDown = trend.growthRate < 0;
                    return (
                      <View key={trend.name} style={[styles.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.gridCardHeader}>
                          <Text style={[styles.gridCardTitle, { color: theme.text }]} numberOfLines={1}>{trend.name}</Text>
                          {trend.isEmerging && (
                            <View style={[styles.emergingBadge, { backgroundColor: '#f59e0b20' }]}>
                              <Flame size={12} color="#f59e0b" />
                              <Text style={styles.emergingBadgeText}>Emerging</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.gridCardContent}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isUp ? (
                              <TrendingUp size={16} color="#10b981" />
                            ) : isDown ? (
                              <TrendingDown size={16} color="#ef4444" />
                            ) : (
                              <Minus size={16} color="#eab308" />
                            )}
                            <Text
                              style={[
                                styles.growthRateVal,
                                { color: isUp ? '#10b981' : isDown ? '#ef4444' : '#eab308' },
                              ]}
                            >
                              {isUp ? '+' : ''}
                              {trend.growthRate}%
                            </Text>
                          </View>
                          <Text style={[styles.totalPapersText, { color: theme.mutedForeground }]}>
                            {trend.totalCount} papers total
                          </Text>
                        </View>
                        <Text style={[styles.avgGrowthText, { color: theme.mutedForeground }]}>
                          Avg Growth: {trend.avgGrowthRate > 0 ? '+' : ''}{trend.avgGrowthRate}%/yr
                        </Text>
                      </View>
                    );
                  })}
                  {trends.length === 0 && (
                    <Text style={{ color: theme.mutedForeground, fontStyle: 'italic', paddingHorizontal: 20 }}>No trends data found.</Text>
                  )}
                </View>
              </View>
            )}

            {/* COLLABORATORS TAB */}
            {activeTab === 'collaborators' && (
              <View style={styles.tabContent}>
                {/* Institutions Card */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <Building2 size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Top Institutions</Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                    Academic centers of excellence publishing in this domain.
                  </Text>

                  {affiliations.slice(0, 6).map((aff, i) => (
                    <View key={aff.affiliation + i} style={[styles.listItemRow, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.listRank, { color: theme.primary }]}>#{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>{aff.affiliation}</Text>
                        <Text style={[styles.listSubText, { color: theme.mutedForeground }]}>
                          {aff.country ? aff.country.toUpperCase() : 'N/A'} · {aff.authorCount || 0} authors
                        </Text>
                      </View>
                      <Text style={[styles.listCount, { color: theme.text }]}>{aff.paperCount} papers</Text>
                    </View>
                  ))}
                  {affiliations.length === 0 && (
                    <Text style={{ color: theme.mutedForeground, fontStyle: 'italic', paddingVertical: 10 }}>No institutions data.</Text>
                  )}
                </View>

                {/* Authors Card */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <Users size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Top Authors</Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                    Leading researchers with highest publication volume.
                  </Text>

                  {authors.slice(0, 6).map((author, i) => (
                    <View key={author.name + i} style={[styles.listItemRow, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.listRank, { color: theme.primary }]}>#{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>{author.name}</Text>
                        <Text style={[styles.listSubText, { color: theme.mutedForeground }]} numberOfLines={1}>
                          {author.affiliation || 'Unknown institution'}
                        </Text>
                      </View>
                      <Text style={[styles.listCount, { color: theme.text }]}>{author.paperCount} papers</Text>
                    </View>
                  ))}
                  {authors.length === 0 && (
                    <Text style={{ color: theme.mutedForeground, fontStyle: 'italic', paddingVertical: 10 }}>No authors data.</Text>
                  )}
                </View>
              </View>
            )}

            {/* OPPORTUNITY TAB (Original Search Opportunity Finder) */}
            {activeTab === 'opportunity' && (
              <View style={styles.tabContent}>
                {/* Control card */}
                <View style={[styles.controlCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Search size={18} color={theme.icon} style={styles.searchIcon} />
                    <TextInput
                      placeholder="Local corpus keyword (e.g. mamba)"
                      placeholderTextColor={theme.mutedForeground}
                      value={opportunityKeyword}
                      onChangeText={setOpportunityKeyword}
                      style={[styles.searchInput, { color: theme.text }]}
                      onSubmitEditing={() => performOpportunityAnalysis(opportunityKeyword)}
                    />
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => performOpportunityAnalysis(opportunityKeyword)}
                      disabled={isOppLoading || !opportunityKeyword.trim()}
                      style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                    >
                      {isOppLoading ? (
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
                      disabled={isCreatingCorpus || !opportunityKeyword.trim()}
                      style={[styles.actionBtnOutline, { borderColor: theme.primary }]}
                    >
                      {isCreatingCorpus ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text style={[styles.actionBtnOutlineText, { color: theme.primary }]}>Build Corpus</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {oppError ? (
                    <View style={[styles.alertBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
                      <Text style={[styles.alertText, { color: theme.destructive }]}>{oppError}</Text>
                    </View>
                  ) : null}

                  {oppMessage ? (
                    <View style={[styles.alertBox, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30', alignItems: 'center' }]}>
                      <Text style={[styles.alertText, { color: theme.primary, textAlign: 'center' }]}>{oppMessage}</Text>
                      <TouchableOpacity
                        style={{
                          marginTop: 10,
                          backgroundColor: theme.primary,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                        }}
                        onPress={() => router.push('/corpus')}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Go to Corpus Management</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {isOppLoading ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>Extracting research entities & co-occurrences...</Text>
                  </View>
                ) : searchedOpportunityKeyword ? (
                  <View style={styles.resultsWrapper}>
                    {/* Node Graph Card */}
                    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={styles.cardHeader}>
                        <GitBranch size={18} color={theme.primary} />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Keyword Co-occurrence Graph</Text>
                      </View>
                      <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                        Satellite nodes reflect terms that frequently appear alongside &quot;{searchedOpportunityKeyword}&quot;.
                      </Text>

                      <NodeGraph
                        nodes={graphData}
                        centerKeyword={searchedOpportunityKeyword}
                        theme={theme}
                        onNodePress={(n) => setSelectedNode(n)}
                      />

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
                          <Text style={[styles.nodeDetailsCount, { color: theme.mutedForeground }]}>
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
                            {opportunityCategories[cat]?.slice(0, 6).map((c, i) => (
                              <View
                                key={i}
                                style={[styles.entityBadge, { backgroundColor: CATEGORY_BG[cat] || '#eee' }]}
                              >
                                <Text style={[styles.entityBadgeText, { color: CATEGORY_COLORS[cat] || '#333' }]}>
                                  {c.name}
                                </Text>
                              </View>
                            ))}
                            {(!opportunityCategories[cat] || opportunityCategories[cat].length === 0) && (
                              <Text style={[styles.emptyItemText, { color: theme.mutedForeground }]}>No terms stored.</Text>
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
                      <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                        Topic directions derived from co-occurrence pairs.
                      </Text>

                      {derivedOpportunities.length > 0 ? (
                        <View style={styles.opportunitiesList}>
                          {derivedOpportunities.map((opp, idx) => (
                            <View key={idx} style={[styles.oppCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                              <View style={styles.oppHeader}>
                                <View style={[styles.oppTypeBadge, { backgroundColor: theme.primary + '15' }]}>
                                  <Text style={[styles.oppTypeBadgeText, { color: theme.primary }]}>{opp.type}</Text>
                                </View>
                                <Text style={[styles.oppTitle, { color: theme.text }]}>{opp.title}</Text>
                              </View>
                              <Text style={[styles.oppWhy, { color: theme.mutedForeground }]}>{opp.why}</Text>
                              <View style={styles.oppActionBox}>
                                <ArrowRight size={14} color={theme.primary} style={{ marginRight: 6 }} />
                                <Text style={[styles.oppActionText, { color: theme.mutedForeground }]}>{opp.next}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={[styles.emptyItemText, { color: theme.mutedForeground }]}>
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
                      <Text style={[styles.cardDesc, { color: theme.mutedForeground }]}>
                        Recent papers loaded from the databases.
                      </Text>

                      <View style={styles.papersList}>
                        {evidencePapers.slice(0, 5).map((p, idx) => (
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
                            <Text style={[styles.paperItemMeta, { color: theme.mutedForeground }]}>
                              {p.publicationYear || 'N/A'} · {p.citationCount || 0} citations
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {evidencePapers.length === 0 && (
                          <Text style={[styles.emptyItemText, { color: theme.mutedForeground }]}>No evidence papers found.</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 40 }]}>
                    <Info size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <Text style={[styles.emptyStateText, { color: theme.mutedForeground }]}>
                      Enter a research keyword above to find insights.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  resultsWrapper: {
    gap: 16,
  },
  controlCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  yearCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearInput: {
    width: 52,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 12,
    padding: 0,
  },
  analyzeBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  alertBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    gap: 8,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statCardLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
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
  subSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  listRank: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 32,
  },
  listLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  listSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  listCount: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  barChartContainer: {
    gap: 12,
    marginTop: 8,
  },
  barChartRow: {
    gap: 6,
  },
  barChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barChartLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  barChartValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  barChartTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barChartFill: {
    height: '100%',
    borderRadius: 4,
  },
  lineChartContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    maxWidth: 90,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  gridCard: {
    width: (width - 40) / 2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 4,
  },
  emergingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emergingBadgeText: {
    fontSize: 8,
    color: '#f59e0b',
    fontWeight: '700',
  },
  gridCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  growthRateVal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalPapersText: {
    fontSize: 10,
  },
  avgGrowthText: {
    fontSize: 9,
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
