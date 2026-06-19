import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  Sparkles,
  TrendingUp,
  BookOpen,
  Zap,
  Network,
  LogOut,
  User as UserIcon,
  ShieldAlert,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TOPIC_COLORS = [
  { bg: '#8B2CE515', border: '#8B2CE540', text: '#a855f7', badgeBg: '#8B2CE525' },
  { bg: '#06b6d415', border: '#06b6d440', text: '#22d5e6', badgeBg: '#06b6d425' },
  { bg: '#ec489915', border: '#ec489940', text: '#f472b6', badgeBg: '#ec489925' },
  { bg: '#10b98115', border: '#10b98140', text: '#34d399', badgeBg: '#10b98125' },
  { bg: '#f9731615', border: '#f9731640', text: '#fb923c', badgeBg: '#f9731625' },
  { bg: '#3b82f615', border: '#3b82f640', text: '#60a5fa', badgeBg: '#3b82f625' },
];

export default function HomeScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [keyword, setKeyword] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load user details
  const checkUserStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkUserStatus();
    }, [])
  );

  useEffect(() => {
    // Fetch top trending keywords matching Web
    api.get('/trends/keyword-categories', { params: { limit: 6 } })
      .then((r) => {
        const kws = r.data.keywords ?? [];
        if (kws.length > 0) {
          setTrendingTopics(
            kws.slice(0, 6).map((kw: any, i: number) => ({
              id: kw.keywordId ?? kw._id ?? i,
              title: kw.name,
              category: kw.category
                ? kw.category.charAt(0).toUpperCase() + kw.category.slice(1)
                : 'Research',
              growth: kw.growthRate != null
                ? `${kw.growthRate > 0 ? '+' : ''}${kw.growthRate.toFixed(0)}%`
                : `${kw.paperCount ?? 0} papers`,
              ...TOPIC_COLORS[i % TOPIC_COLORS.length],
            }))
          );
        } else {
          // Fallback to trending run
          api.get('/trends/trending', { params: { limit: 6 } })
            .then((r2) => {
              const topics = r2.data.topics ?? r2.data.trending ?? [];
              setTrendingTopics(
                topics.slice(0, 6).map((t: any, i: number) => ({
                  id: t._id ?? i,
                  title: t.name ?? t.seedKeyword ?? t.keyword ?? 'Topic',
                  category: t.category ?? 'Research',
                  growth: t.growthRate != null
                    ? `${t.growthRate > 0 ? '+' : ''}${t.growthRate.toFixed(0)}%`
                    : t.trendStatus ?? 'Trending',
                  ...TOPIC_COLORS[i % TOPIC_COLORS.length],
                }))
              );
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    if (keyword.trim()) {
      router.push({
        pathname: '/explore',
        params: { searchKeyword: keyword },
      });
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    router.replace('/login');
  };

  const quickSearch = (kw: string) => {
    router.push({
      pathname: '/explore',
      params: { searchKeyword: kw },
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.logoContainer}>
          <BookOpen size={24} color={theme.primary} />
          <Text style={[styles.logoText, { color: theme.text }]}>SciTrend</Text>
        </View>

        <View style={styles.headerRight}>
          {isLoggedIn ? (
            <>
              {user?.role === 'admin' && (
                <TouchableOpacity
                  onPress={() => router.push('/admin/dashboard')}
                  style={[styles.adminBadge, { backgroundColor: theme.primary + '20' }]}
                >
                  <ShieldAlert size={16} color={theme.primary} />
                  <Text style={[styles.adminText, { color: theme.primary }]}>Admin</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => router.push('/profile')}
                style={[styles.avatarButton, { backgroundColor: theme.primary + '15' }]}
              >
                <UserIcon size={16} color={theme.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/login')}
              style={[styles.loginBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hero Header */}
      <View style={styles.heroSection}>
        <View style={[styles.pillBadge, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
          <Sparkles size={14} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.pillBadgeText, { color: theme.primary }]}>AI-powered journal analytics</Text>
        </View>

        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Discover{'\n'}
          <Text style={{ color: theme.primary }}>Research Trends</Text>
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Track emerging topics, analyze academic publication velocity, and find the next breakthrough.
        </Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={20} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            placeholder="Search federated learning, transformers..."
            placeholderTextColor={theme.muted}
            value={keyword}
            onChangeText={setKeyword}
            style={[styles.searchInput, { color: theme.text }]}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            onPress={handleSearch}
            style={[styles.searchButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick suggestions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionScroll}
      >
        {['LLM', 'Computer Vision', 'Reinforcement Learning', 'Graph Neural Networks'].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => quickSearch(s)}
            style={[styles.suggestionChip, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.suggestionText, { color: theme.text }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Bar */}
      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          {[
            { value: '200M+', label: 'Papers Indexed', icon: BookOpen },
            { value: 'Real-time', label: 'Trend Tracking', icon: Zap },
          ].map((item) => (
            <View key={item.label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <item.icon size={20} color={theme.primary} style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: theme.text }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statsRow}>
          {[
            { value: 'AI-powered', label: 'Research Insights', icon: Sparkles },
            { value: '5 Sources', label: 'Academic DBs', icon: Network },
          ].map((item) => (
            <View key={item.label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <item.icon size={20} color={theme.primary} style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: theme.text }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trending Now */}
      <View style={styles.trendingSection}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Trending Now</Text>
        </View>

        {trendingTopics.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No trending topics loaded yet.</Text>
        ) : (
          <FlatList
            data={trendingTopics}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.trendingList}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => quickSearch(item.title)}
                style={[
                  styles.trendingCard,
                  { backgroundColor: item.bg, borderColor: item.border },
                ]}
              >
                <View style={[styles.categoryBadge, { backgroundColor: item.badgeBg }]}>
                  <Text style={[styles.categoryBadgeText, { color: item.text }]}>
                    {item.category}
                  </Text>
                </View>
                <Text style={[styles.trendingTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.trendingFooter}>
                  <Text style={[styles.trendingGrowth, { color: theme.success }]}>
                    {item.growth}
                  </Text>
                  <Text style={[styles.trendingSub, { color: theme.muted }]}>growth</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Features List */}
      <View style={styles.featuresSection}>
        <Text style={[styles.featuresHeader, { color: theme.text }]}>
          Research Intelligence Features
        </Text>

        {[
          {
            icon: Search,
            title: 'Live Search',
            desc: 'Instantly query academic databases cross-referencing OpenAlex, Semantic Scholar, Crossref, and IEEE.',
          },
          {
            icon: TrendingUp,
            title: 'Trend Analysis',
            desc: 'Track keyword growth rates, find exploding topics, and compare research interests over time.',
          },
          {
            icon: Network,
            title: 'Keyword Graphs',
            desc: 'Visualize semantic relationships between algorithms, domains, and methods with interactive maps.',
          },
        ].map((feat, i) => (
          <View
            key={feat.title}
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.featureIconContainer, { backgroundColor: theme.primary + '15' }]}>
              <feat.icon size={22} color={theme.primary} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>{feat.title}</Text>
              <Text style={[styles.featureDesc, { color: theme.muted }]}>{feat.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  adminText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  searchButton: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestionScroll: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 30,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  trendingSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    paddingHorizontal: 20,
    fontSize: 14,
    fontStyle: 'italic',
  },
  trendingList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  trendingCard: {
    width: width * 0.45,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    height: 120,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  trendingTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  trendingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  trendingGrowth: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendingSub: {
    fontSize: 9,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  featuresHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
