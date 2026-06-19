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
import { useRouter } from 'expo-router';
import {
  TrendingUp,
  Activity,
  Sparkles,
  Zap,
  Minus,
  TrendingDown,
  Search,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TREND_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  exploding: { label: 'Exploding', icon: Zap, color: '#f97316', bg: '#f9731620' },
  growing: { label: 'Growing', icon: TrendingUp, color: '#10b981', bg: '#10b98120' },
  stable: { label: 'Stable', icon: Minus, color: '#eab308', bg: '#eab30820' },
  declining: { label: 'Declining', icon: TrendingDown, color: '#64748b', bg: '#64748b20' },
};

// Custom SVG Chart component
function AreaChart({ data, theme }: { data: { year: number; count: number }[]; theme: any }) {
  if (!data || data.length === 0) return null;

  const chartHeight = 160;
  const chartWidth = width - 72; // Padding constraints
  const paddingX = 16;
  const paddingY = 20;

  // Find Min/Max counts & years
  const counts = data.map((d) => d.count);
  const years = data.map((d) => d.year);
  const maxCount = Math.max(...counts, 10);
  const minCount = Math.min(...counts, 0);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);

  const countRange = maxCount - minCount;
  const yearRange = maxYear - minYear || 1;

  // Coordinate mapping
  const points = data.map((d, i) => {
    const x = paddingX + ((d.year - minYear) / yearRange) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.count - minCount) / countRange) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  // Build SVG Path
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

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingY + ratio * (chartHeight - paddingY * 2);
          const gridVal = Math.round(maxCount - ratio * countRange);
          return (
            <React.Fragment key={idx}>
              <Path
                d={`M ${paddingX} ${y} L ${chartWidth - paddingX} ${y}`}
                stroke={theme.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </React.Fragment>
          );
        })}

        {/* Area */}
        {areaPath ? <Path d={areaPath} fill="url(#gradient)" /> : null}

        {/* Line */}
        {linePath ? <Path d={linePath} fill="none" stroke={theme.primary} strokeWidth="3" /> : null}

        {/* Data points */}
        {points.map((p, idx) => (
          <Circle key={idx} cx={p.x} cy={p.y} r={4} fill={theme.primary} />
        ))}
      </Svg>

      {/* Year Labels - absolutely positioned to match data points */}
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
                    color: theme.muted,
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

export default function TrendsScreen() {
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [keyword, setKeyword] = useState('');
  const [trendData, setTrendData] = useState<any>(null);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiDirections, setAiDirections] = useState<any[]>([]);
  const [aiError, setAiError] = useState('');

  // Fetch hot trending topics
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
      setError(err.response?.data?.message || 'Failed to analyze keyword trend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (keyword.trim()) {
      analyzeTrend(keyword);
    }
  };

  const explainTrend = async () => {
    if (!trendData?.keyword) return;
    setIsExplaining(true);
    setAiError('');
    try {
      const relatedKeywords = [
        trendData.keyword,
        ...(trendingTopics || []).slice(0, 8).map((topic) => topic.name || topic),
      ].filter(Boolean);
      const res = await api.post('/ai/recommendations/research-directions', {
        keywords: Array.from(new Set(relatedKeywords)),
      });
      setAiDirections(res.data.directions || []);
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'AI research directions are currently unavailable.');
    } finally {
      setIsExplaining(false);
    }
  };

  const trendConfig = TREND_CONFIG[trendData?.trendStatus] || null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrendingUp size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Research Trends</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Analyze publication velocity and track emerging research topics.
        </Text>
      </View>

      {/* Main Analysis Card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Keyword Growth Analysis</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.muted }]}>
          Enter a research keyword to see publication volume over time.
        </Text>

        <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Search size={18} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            placeholder="e.g. Transformer, CRISPR, Quantum"
            placeholderTextColor={theme.muted}
            value={keyword}
            onChangeText={setKeyword}
            style={[styles.searchInput, { color: theme.text }]}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            onPress={handleSearch}
            disabled={isLoading}
            style={[styles.analyzeBtn, { backgroundColor: theme.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.analyzeBtnText}>Analyze</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]}>
            <Text style={[styles.errorText, { color: theme.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {trendData ? (
          <View style={styles.resultsContainer}>
            {/* Stats row */}
            <View style={[styles.statsSummaryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View>
                <Text style={[styles.resultKeyword, { color: theme.text }]}>{trendData.keyword}</Text>
                <Text style={[styles.resultSource, { color: theme.muted }]}>Source: {trendData.source}</Text>
              </View>
              <View style={styles.growthBadgeRow}>
                {trendConfig && (
                  <View style={[styles.statusBadge, { backgroundColor: trendConfig.bg }]}>
                    <trendConfig.icon size={12} color={trendConfig.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusBadgeText, { color: trendConfig.color }]}>
                      {trendConfig.label}
                    </Text>
                  </View>
                )}
                <Text style={[styles.growthPercent, { color: trendConfig?.color || theme.text }]}>
                  {trendData.averageGrowthRate}%
                </Text>
              </View>
            </View>

            {/* SVG Chart */}
            <AreaChart data={trendData.trends} theme={theme} />

            {/* AI Explain section */}
            <View style={[styles.aiSection, { borderColor: theme.border }]}>
              <View style={styles.aiHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.aiTitle, { color: theme.text }]}>AI Research Directions</Text>
                  <Text style={[styles.aiSubtitle, { color: theme.muted }]}>Generate research suggestions from this trend.</Text>
                </View>
                <TouchableOpacity
                  onPress={explainTrend}
                  disabled={isExplaining}
                  style={[styles.explainBtn, { backgroundColor: theme.primary }]}
                >
                  {isExplaining ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Sparkles size={14} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.explainBtnText}>Explain</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {aiError ? (
                <Text style={[styles.aiErrorText, { color: theme.destructive }]}>{aiError}</Text>
              ) : null}

              {aiDirections.length > 0 ? (
                <View style={styles.directionsList}>
                  {aiDirections.map((dir, idx) => (
                    <View key={idx} style={[styles.directionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <View style={styles.dirHeader}>
                        <Text style={[styles.dirTitle, { color: theme.text }]}>{dir.direction}</Text>
                        {dir.priority !== undefined && (
                          <View style={[styles.priorityBadge, { backgroundColor: theme.primary + '20' }]}>
                            <Text style={[styles.priorityBadgeText, { color: theme.primary }]}>
                              {Math.round(dir.priority * 100)}% Priority
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.dirRationale, { color: theme.muted }]}>{dir.rationale}</Text>
                      {dir.keywords && dir.keywords.length > 0 && (
                        <View style={styles.tagContainer}>
                          {dir.keywords.map((kwItem: string) => (
                            <View key={kwItem} style={[styles.tag, { backgroundColor: theme.card, borderColor: theme.border }]}>
                              <Text style={[styles.tagText, { color: theme.text }]}>{kwItem}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : !isLoading && (
          <View style={[styles.placeholderBox, { borderColor: theme.border }]}>
            <Activity size={32} color={theme.icon} style={{ opacity: 0.3, marginBottom: 8 }} />
            <Text style={[styles.placeholderText, { color: theme.muted }]}>
              Analyze a keyword to view its trends.
            </Text>
          </View>
        )}
      </View>

      {/* Hot Topics Sidebar */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 40 }]}>
        <View style={styles.cardHeader}>
          <TrendingUp size={18} color="#f97316" />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Hot Topics Now</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.muted }]}>
          Popular trending topics from the analytical corpus.
        </Text>

        {trendingTopics.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No trending topics loaded yet.</Text>
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
                  style={[
                    styles.hotTopicChip,
                    { backgroundColor: theme.background, borderColor: theme.border },
                    conf && { borderColor: conf.color + '40' },
                  ]}
                >
                  <Text style={[styles.hotTopicText, { color: theme.text }]}>
                    {topic.name || topic}
                  </Text>
                  {topic.trendStatus && (
                    <Text style={[styles.hotTopicSubText, { color: conf ? conf.color : theme.muted }]}>
                      {topic.trendStatus}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
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
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 12,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  analyzeBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
  },
  placeholderBox: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 13,
  },
  resultsContainer: {
    marginTop: 10,
  },
  statsSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  resultKeyword: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultSource: {
    fontSize: 11,
    marginTop: 2,
  },
  growthBadgeRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  growthPercent: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  chartLabelText: {
    fontSize: 9,
  },
  aiSection: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  explainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
  },
  explainBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiErrorText: {
    fontSize: 12,
    marginBottom: 12,
  },
  directionsList: {
    gap: 12,
  },
  directionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  dirHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  dirTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  dirRationale: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  hotTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hotTopicChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hotTopicText: {
    fontSize: 12,
    fontWeight: '500',
  },
  hotTopicSubText: {
    fontSize: 9,
    fontWeight: 'bold',
    opacity: 0.8,
  },
});
