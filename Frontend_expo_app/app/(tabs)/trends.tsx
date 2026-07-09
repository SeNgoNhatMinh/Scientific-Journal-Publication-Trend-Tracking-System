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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingUp,
  Activity,
  Sparkles,
  Zap,
  Minus,
  TrendingDown,
  Search,
  Bookmark,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, G } from 'react-native-svg';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TREND_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  exploding: { label: 'Exploding', icon: Zap, color: '#f97316', bg: '#f9731620' },
  growing: { label: 'Growing', icon: TrendingUp, color: '#10b981', bg: '#10b98120' },
  stable: { label: 'Stable', icon: Minus, color: '#eab308', bg: '#eab30820' },
  declining: { label: 'Declining', icon: TrendingDown, color: '#64748b', bg: '#64748b20' },
};

const CHART_COLORS = ['#a855f7', '#22d5e6', '#10b981', '#f97316', '#3b82f6'];

// SVG Area Chart
function AreaChart({ data, theme }: { data: { year: number; count: number }[]; theme: any }) {
  if (!data || data.length === 0) return null;

  const chartHeight = 160;
  const chartWidth = width - 72;
  const paddingX = 16;
  const paddingY = 20;

  const counts = data.map((d) => d.count);
  const years = data.map((d) => d.year);
  const maxCount = Math.max(...counts, 10);
  const minCount = Math.min(...counts, 0);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);

  const countRange = maxCount - minCount;
  const yearRange = maxYear - minYear || 1;

  const points = data.map((d) => {
    const x = paddingX + ((d.year - minYear) / yearRange) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.count - minCount) / countRange) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
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
        {linePath ? <Path d={linePath} fill="none" stroke={theme.primary} strokeWidth="3" /> : null}
        {points.map((p, idx) => (
          <Circle key={idx} cx={p.x} cy={p.y} r={4} fill={theme.primary} />
        ))}
      </Svg>

      <View style={{ position: 'relative', height: 16, width: chartWidth, marginTop: 4 }}>
        {(() => {
          const step = points.length > 12 ? 4 : points.length > 8 ? 3 : points.length > 5 ? 2 : 1;
          return points.map((p, idx) => {
            const isLast = idx === points.length - 1;
            if (idx % step !== 0 && !isLast) return null;
            return (
              <Text
                key={idx}
                style={[
                  styles.chartLabelText,
                  {
                    color: theme.mutedForeground,
                    position: 'absolute',
                    left: p.x - 14,
                    top: 0,
                    width: 28,
                    textAlign: 'center',
                  },
                ]}
              >
                {p.year}
              </Text>
            );
          });
        })()}
      </View>
    </View>
  );
}

// Multi Line Chart for Related Keywords
function MultiLineChart({ data, keywords, theme }: { data: any[]; keywords: string[]; theme: any }) {
  if (!data || data.length === 0 || !keywords || keywords.length === 0) return null;

  const chartHeight = 160;
  const chartWidth = width - 72;
  const paddingX = 16;
  const paddingY = 20;

  const years = data.map((d) => d.year);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);
  const yearRange = maxYear - minYear || 1;

  // Find max count across all selected keywords
  let maxCount = 10;
  data.forEach((d) => {
    keywords.forEach((kw) => {
      if (d[kw] && d[kw] > maxCount) maxCount = d[kw];
    });
  });

  return (
    <View style={styles.chartContainer}>
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

        {keywords.map((kw, kwIdx) => {
          const color = CHART_COLORS[kwIdx % CHART_COLORS.length];
          const points = data.map((d) => {
            const val = d[kw] || 0;
            const x = paddingX + ((d.year - minYear) / yearRange) * (chartWidth - paddingX * 2);
            const y = chartHeight - paddingY - (val / maxCount) * (chartHeight - paddingY * 2);
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
            <G key={`${kw}-${kwIdx}`}>
              {linePath ? <Path d={linePath} fill="none" stroke={color} strokeWidth="2" /> : null}
              {points.map((p, idx) => (
                <Circle key={idx} cx={p.x} cy={p.y} r={3} fill={color} />
              ))}
            </G>
          );
        })}
      </Svg>

      {/* Year Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: chartWidth, marginTop: 4, paddingHorizontal: 12 }}>
        <Text style={[styles.chartLabelText, { color: theme.mutedForeground }]}>{minYear}</Text>
        <Text style={[styles.chartLabelText, { color: theme.mutedForeground }]}>{maxYear}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        {keywords.map((kw, idx) => (
          <View key={`${kw}-${idx}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }]} />
            <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>{kw}</Text>
          </View>
        ))}
      </View>

    </View>
  );
}

export default function TrendsScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'volume' | 'related'>('volume');
  
  // Volume & Growth state
  const [keyword, setKeyword] = useState('');
  const [trendData, setTrendData] = useState<any>(null);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Related state
  const [relKeyword, setRelKeyword] = useState('');
  const [relSource, setRelSource] = useState<'openalex' | 'local'>('openalex');
  const [relStartYear, setRelStartYear] = useState('2010');
  const [relData, setRelData] = useState<any>(null);
  const [relIsLoading, setRelIsLoading] = useState(false);
  const [relError, setRelError] = useState('');

  // AI directions state
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiDirections, setAiDirections] = useState<any[]>([]);
  const [aiError, setAiError] = useState('');
  const [savedEvidenceIds, setSavedEvidenceIds] = useState<Set<string>>(new Set());
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);

  // Fetch trending
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get('/trends/trending');
        setTrendingTopics(res.data.topics || []);
      } catch (err) {
        console.error('Failed to fetch trending topics', err);
      }
    };
    fetchTrending();
  }, []);

  const analyzeTrend = async (kw: string) => {
    if (!kw) return;
    setIsLoading(true);
    setError('');
    setTrendData(null);
    setAiDirections([]);
    setAiError('');
    try {
      const res = await api.get(`/trends/keyword`, { params: { keyword: kw } });
      setTrendData(res.data);
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 504) {
        setError('API request timeout. The external database took too long to respond. Please try again or try a more specific keyword.');
      } else if (status === 503) {
        setError('Service temporarily unavailable. Please make sure the backend is active.');
      } else if (status === 429) {
        setError('Rate limit exceeded. Please wait a moment before searching again.');
      } else {
        setError(err.response?.data?.message || 'Failed to analyze keyword trend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeRelatedTrend = async (kw: string) => {
    if (!kw) return;
    setRelIsLoading(true);
    setRelError('');
    setRelData(null);
    try {
      const res = await api.get(`/trends/related-keywords`, {
        params: {
          keyword: kw,
          source: relSource,
          startYear: parseInt(relStartYear, 10) || 2010,
        },
      });
      setRelData(res.data);
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 504) {
        setRelError('API request timeout. The external database took too long to respond. Please try again or try a more specific keyword.');
      } else if (status === 503) {
        setRelError('Service temporarily unavailable. Please make sure the backend is active.');
      } else if (status === 429) {
        setRelError('Rate limit exceeded. Please wait a moment before searching again.');
      } else {
        setRelError(err.response?.data?.message || 'Failed to analyze related keywords trend.');
      }
    } finally {
      setRelIsLoading(false);
    }
  };

  const isMongoObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

  const cleanDoi = (doi?: string | null) =>
    String(doi || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');

  const buildSavablePaper = (paper: any) => {
    const source = String(paper.source || 'openalex');
    const externalIds: Record<string, string> = {};
    if (paper.id) {
      if (source === 'openalex') externalIds.openalex = paper.id;
      if (source === 'semanticscholar') externalIds.semanticScholar = paper.id;
      if (source === 'crossref') externalIds.crossref = paper.id;
    }
    return {
      title: paper.title || 'Untitled paper',
      abstract: paper.abstract || '',
      doi: cleanDoi(paper.doi) || undefined,
      publicationYear: paper.year || paper.publicationYear || undefined,
      citationCount: paper.citationCount || 0,
      url: paper.url || undefined,
      externalIds,
    };
  };

  const ensureEvidencePaperInDatabase = async (paper: any, evidenceId: string) => {
    const paperId = String(paper?._id || paper?.id || '');
    if (paperId && isMongoObjectId(paperId)) {
      return paperId;
    }
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return null;
    }
    try {
      const res = await api.post('/papers', { paper: buildSavablePaper(paper) });
      return res.data.paper?._id || res.data.paper?.id;
    } catch (err: any) {
      console.error(err);
      return null;
    }
  };

  const toggleBookmark = async (paper: any) => {
    const evidenceId = String(paper._id || paper.id || paper.title);
    setSavingBookmarkId(evidenceId);
    try {
      const dbId = await ensureEvidencePaperInDatabase(paper, evidenceId);
      if (!dbId) return;
      await api.post(`/papers/${dbId}/bookmark`);
      
      setSavedEvidenceIds((prev) => {
        const next = new Set(prev);
        if (next.has(evidenceId)) {
          next.delete(evidenceId);
        } else {
          next.add(evidenceId);
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBookmarkId(null);
    }
  };

  const explainTrend = async () => {
    if (!trendData?.keyword) return;
    setIsExplaining(true);
    setAiError('');
    setAiDirections([]);
    try {
      const res = await api.post('/trends/research-directions', {
        keyword: trendData.keyword,
        trendContext: {
          keyword: trendData.keyword,
          trendStatus: trendData.trendStatus,
          averageGrowthRate: trendData.averageGrowthRate,
          trends: trendData.trends || trendData.yearlyData || [],
        },
        limit: 5,
      });
      setAiDirections(res.data.directions || []);
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Could not generate research directions.');
    } finally {
      setIsExplaining(false);
    }
  };

  const formatAuthors = (authors: any) => {
    if (!authors || authors.length === 0) return 'Unknown';
    if (typeof authors[0] === 'string') return authors.join(', ');
    return authors.map((a: any) => a.name).join(', ');
  };

  const trendConfig = TREND_CONFIG[trendData?.trendStatus] || null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <View style={styles.titleRow}>
          <TrendingUp size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Global Research Trends</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          Analyze publication velocity and track emerging research topics.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('volume')}
          style={[styles.tabBtn, activeTab === 'volume' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'volume' ? theme.primary : theme.mutedForeground }]}>Volume & Growth</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('related')}
          style={[styles.tabBtn, activeTab === 'related' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'related' ? theme.primary : theme.mutedForeground }]}>Related Keywords</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content: Volume & Growth */}
      {activeTab === 'volume' && (
        <View>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Activity size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Keyword Growth Analysis</Text>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Search size={18} color={theme.icon} style={styles.searchIcon} />
              <TextInput
                placeholder="e.g. Transformer, CRISPR, Quantum"
                placeholderTextColor={theme.mutedForeground}
                value={keyword}
                onChangeText={setKeyword}
                style={[styles.searchInput, { color: theme.text }]}
                onSubmitEditing={() => analyzeTrend(keyword)}
              />
              <TouchableOpacity
                onPress={() => analyzeTrend(keyword)}
                disabled={isLoading}
                style={[styles.analyzeBtn, { backgroundColor: theme.primary }]}
              >
                {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.analyzeBtnText}>Analyze</Text>}
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
                <Text style={[styles.errorText, { color: theme.destructive }]}>{error}</Text>
              </View>
            ) : null}

            {trendData ? (
              <View style={styles.resultsContainer}>
                <View style={[styles.statsSummaryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View>
                    <Text style={[styles.resultKeyword, { color: theme.text }]}>{trendData.keyword}</Text>
                    <Text style={[styles.resultSource, { color: theme.mutedForeground }]}>Source: {trendData.source}</Text>
                  </View>
                  <View style={styles.growthBadgeRow}>
                    {trendConfig && (
                      <View style={[styles.statusBadge, { backgroundColor: trendConfig.bg }]}>
                        <trendConfig.icon size={12} color={trendConfig.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusBadgeText, { color: trendConfig.color }]}>{trendConfig.label}</Text>
                      </View>
                    )}
                    <Text style={[styles.growthPercent, { color: trendConfig?.color || theme.text }]}>
                      {trendData.averageGrowthRate}%
                    </Text>
                  </View>
                </View>

                <AreaChart data={trendData.trends} theme={theme} />

                {/* AI Research Directions */}
                <View style={[styles.aiSection, { borderColor: theme.border }]}>
                  <View style={styles.aiHeader}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={[styles.aiTitle, { color: theme.text }]}>AI Research Directions</Text>
                      <Text style={[styles.aiSubtitle, { color: theme.mutedForeground }]}>Generate research suggestions from this trend.</Text>
                    </View>
                    <TouchableOpacity
                      onPress={explainTrend}
                      disabled={isExplaining}
                      style={[styles.explainBtn, { backgroundColor: theme.primary }]}
                    >
                      {isExplaining ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.explainBtnText}>Explain</Text>}
                    </TouchableOpacity>
                  </View>

                  {aiError ? <Text style={[styles.aiErrorText, { color: theme.destructive }]}>{aiError}</Text> : null}

                  {aiDirections.length > 0 && (
                    <View style={styles.directionsList}>
                      {aiDirections.map((dir, idx) => (
                        <View key={idx} style={[styles.directionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                          <View style={styles.dirHeader}>
                            <Text style={[styles.dirTitle, { color: theme.text }]}>{dir.title}</Text>
                            <View style={[styles.priorityBadge, { backgroundColor: theme.primary + '20' }]}>
                              <Text style={[styles.priorityBadgeText, { color: theme.primary }]}>{dir.opportunityLevel}</Text>
                            </View>
                          </View>
                          <Text style={[styles.dirRationale, { color: theme.mutedForeground }]}>{dir.why}</Text>

                          {/* Evidence Papers */}
                          {dir.evidencePapers && dir.evidencePapers.length > 0 && (
                            <View style={styles.evidenceContainer}>
                              <Text style={[styles.evidenceHeader, { color: theme.text }]}>Evidence publications:</Text>
                              {dir.evidencePapers.map((paper: any, pIdx: number) => {
                                const paperKey = String(paper._id || paper.id || paper.title);
                                const isBookmarked = savedEvidenceIds.has(paperKey);
                                return (
                                  <View key={pIdx} style={[styles.evidenceItem, { borderBottomColor: theme.border }]}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.evidenceTitle, { color: theme.text }]} numberOfLines={1}>{paper.title}</Text>
                                      <Text style={[styles.evidenceMeta, { color: theme.mutedForeground }]}>
                                        {formatAuthors(paper.authors)} · {paper.publicationYear || paper.year || 'N/A'}
                                      </Text>
                                    </View>
                                    <TouchableOpacity
                                      style={[styles.bookmarkBtn, { backgroundColor: isBookmarked ? theme.primary + '20' : theme.background }]}
                                      onPress={() => toggleBookmark(paper)}
                                      disabled={savingBookmarkId === paperKey}
                                    >
                                      {savingBookmarkId === paperKey ? (
                                        <ActivityIndicator size="small" color={theme.primary} />
                                      ) : (
                                        <Bookmark size={14} color={isBookmarked ? theme.primary : theme.icon} />
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : !isLoading && (
              <View style={[styles.placeholderBox, { borderColor: theme.border }]}>
                <Activity size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
                <Text style={[styles.placeholderText, { color: theme.mutedForeground }]}>Analyze a keyword to view its trends.</Text>
              </View>
            )}
          </View>

          {/* Hot Topics */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 40 }]}>
            <View style={styles.cardHeader}>
              <TrendingUp size={18} color="#f97316" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Hot Topics Now</Text>
            </View>
            {trendingTopics.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No trending topics loaded yet.</Text>
            ) : (
              <View style={styles.hotTopicsGrid}>
                {trendingTopics.map((topic, i) => {
                  const conf = TREND_CONFIG[topic.trendStatus] || null;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setKeyword(topic.name || topic);
                        analyzeTrend(topic.name || topic);
                      }}
                      style={[styles.hotTopicChip, { backgroundColor: theme.background, borderColor: theme.border }, conf && { borderColor: conf.color + '40' }]}
                    >
                      <Text style={[styles.hotTopicText, { color: theme.text }]}>{topic.name || topic}</Text>
                      {topic.trendStatus && (
                        <Text style={[styles.hotTopicSubText, { color: conf ? conf.color : theme.muted }]}>{topic.trendStatus}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tab Content: Related Keywords */}
      {activeTab === 'related' && (
        <View style={styles.relatedContainer}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Activity size={18} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Related Keywords Trend</Text>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Search size={18} color={theme.icon} style={styles.searchIcon} />
              <TextInput
                placeholder="e.g. Deep Learning"
                placeholderTextColor={theme.mutedForeground}
                value={relKeyword}
                onChangeText={setRelKeyword}
                style={[styles.searchInput, { color: theme.text }]}
                onSubmitEditing={() => analyzeRelatedTrend(relKeyword)}
              />
              <TouchableOpacity
                onPress={() => analyzeRelatedTrend(relKeyword)}
                disabled={relIsLoading}
                style={[styles.analyzeBtn, { backgroundColor: theme.primary }]}
              >
                {relIsLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.analyzeBtnText}>Analyze</Text>}
              </TouchableOpacity>
            </View>

            {/* Filter selectors for related search */}
            <View style={styles.relFilterRow}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: theme.mutedForeground }]}>Source:</Text>
                <View style={styles.sourceSelector}>
                  {(['openalex', 'local'] as const).map((src) => (
                    <TouchableOpacity
                      key={src}
                      onPress={() => setRelSource(src)}
                      style={[styles.sourceBtn, relSource === src && { backgroundColor: theme.primary }]}
                    >
                      <Text style={[styles.sourceText, { color: relSource === src ? '#fff' : theme.text }]}>
                        {src === 'openalex' ? 'OpenAlex' : 'Local'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: theme.mutedForeground }]}>Start Year:</Text>
                <TextInput
                  value={relStartYear}
                  onChangeText={setRelStartYear}
                  keyboardType="numeric"
                  style={[styles.yearInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                />
              </View>
            </View>

            {relError ? (
              <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
                <Text style={[styles.errorText, { color: theme.destructive }]}>{relError}</Text>
              </View>
            ) : null}

            {relData ? (
              <View style={styles.resultsContainer}>
                <View style={[styles.statsSummaryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View>
                    <Text style={[styles.resultKeyword, { color: theme.text }]}>{relData.keyword}</Text>
                    <Text style={[styles.resultSource, { color: theme.mutedForeground }]}>
                      Found {relData.totalPapers} publications
                    </Text>
                  </View>
                </View>

                {/* Multi line chart of trends */}
                {relData.trends && relData.trends.length > 0 && relData.topKeywords && (
                  <View>
                    <Text style={[styles.chartSectionTitle, { color: theme.text }]}>Keyword Co-trend Comparison</Text>
                    <MultiLineChart
                      data={relData.trends}
                      keywords={relData.topKeywords.slice(0, 3).map((k: any) => k.keyword)}
                      theme={theme}
                    />
                  </View>
                )}

                {/* Top Keywords frequencies */}
                {relData.topKeywords && relData.topKeywords.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[styles.chartSectionTitle, { color: theme.text }]}>Top Co-occurring Keywords</Text>
                    {relData.topKeywords.slice(0, 8).map((item: any, i: number) => {
                      const maxVal = relData.topKeywords[0]?.count || 1;
                      const percentage = (item.count / maxVal) * 100;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={styles.barItem}
                          onPress={() => {
                            setRelKeyword(item.keyword);
                            analyzeRelatedTrend(item.keyword);
                          }}
                        >
                          <View style={styles.barHeader}>
                            <Text style={[styles.barText, { color: theme.text }]}>{item.keyword}</Text>
                            <Text style={[styles.barCount, { color: theme.mutedForeground }]}>{item.count} papers</Text>
                          </View>
                          <View style={[styles.barTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: theme.primary }]} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Publications list */}
                {relData.papers && relData.papers.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={[styles.chartSectionTitle, { color: theme.text }]}>Publications Sample</Text>
                    {relData.papers.slice(0, 5).map((paper: any, idx: number) => (
                      <View key={idx} style={[styles.pubCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Text style={[styles.pubTitle, { color: theme.text }]} numberOfLines={2}>{paper.title}</Text>
                        <Text style={[styles.pubMeta, { color: theme.mutedForeground }]}>
                          Year: {paper.year} · Citations: {paper.citationCount}
                        </Text>
                        {paper.keywords && paper.keywords.length > 0 && (
                          <View style={styles.tagContainer}>
                            {paper.keywords.slice(0, 3).map((kwItem: string) => (
                              <View key={kwItem} style={[styles.tag, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Text style={[styles.tagText, { color: theme.text }]}>{kwItem}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : !relIsLoading && (
              <View style={[styles.placeholderBox, { borderColor: theme.border }]}>
                <Activity size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
                <Text style={[styles.placeholderText, { color: theme.mutedForeground }]}>Analyze a topic to view co-occurring keywords.</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13 },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ffffff15', marginBottom: 16, marginHorizontal: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },

  card: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, marginBottom: 16 },

  searchBox: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, marginBottom: 14 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  analyzeBtn: { paddingHorizontal: 14, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  errorBox: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 14 },
  errorText: { fontSize: 12 },

  placeholderBox: { height: 180, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 20 },
  placeholderText: { fontSize: 13 },

  resultsContainer: { marginTop: 10 },
  statsSummaryBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  resultKeyword: { fontSize: 16, fontWeight: 'bold' },
  resultSource: { fontSize: 11, marginTop: 2 },
  growthBadgeRow: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText: { fontSize: 9, fontWeight: 'bold' },
  growthPercent: { fontSize: 20, fontWeight: 'bold' },

  chartContainer: { alignItems: 'center', marginVertical: 10 },
  chartLabelText: { fontSize: 9 },

  // AI directions styles
  aiSection: { marginTop: 20, borderTopWidth: 1, paddingTop: 16 },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  aiTitle: { fontSize: 14, fontWeight: 'bold' },
  aiSubtitle: { fontSize: 11, marginTop: 2 },
  explainBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8 },
  explainBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  aiErrorText: { fontSize: 12, marginBottom: 12 },
  directionsList: { gap: 12 },
  directionCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  dirHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dirTitle: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityBadgeText: { fontSize: 9, fontWeight: 'bold' },
  dirRationale: { fontSize: 12, lineHeight: 17, marginBottom: 12 },

  evidenceContainer: { borderTopWidth: 1, borderTopColor: '#ffffff10', paddingTop: 10, marginTop: 8 },
  evidenceHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  evidenceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  evidenceTitle: { fontSize: 13, fontWeight: '500' },
  evidenceMeta: { fontSize: 11, marginTop: 2 },
  bookmarkBtn: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 9 },

  emptyText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 10 },
  hotTopicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hotTopicChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotTopicText: { fontSize: 12, fontWeight: '500' },
  hotTopicSubText: { fontSize: 9, fontWeight: 'bold', opacity: 0.8 },

  // Related keywords layout
  relatedContainer: { paddingBottom: 20 },
  relFilterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  filterGroup: { flex: 1 },
  filterLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  sourceSelector: { flexDirection: 'row', height: 32, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff20' },
  sourceBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sourceText: { fontSize: 11, fontWeight: '600' },
  yearInput: { height: 32, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, fontSize: 12 },

  chartSectionTitle: { fontSize: 14, fontWeight: '700', marginVertical: 12 },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '500' },

  barItem: { marginBottom: 12 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barText: { fontSize: 12, fontWeight: '600' },
  barCount: { fontSize: 11 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  pubCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  pubTitle: { fontSize: 13, fontWeight: '600' },
  pubMeta: { fontSize: 11, marginTop: 2 },
});
