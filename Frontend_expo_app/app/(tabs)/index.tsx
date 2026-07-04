import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  Sparkles,
  TrendingUp,
  BookOpen,
  BarChart3,
  Zap,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';
import NotificationBell from '../../components/ui/NotificationBell';

const { width } = Dimensions.get('window');

const TOPIC_COLORS = [
  { text: '#a855f7', bg: '#a855f715', border: '#a855f730' }, // Purple
  { text: '#22d5e6', bg: '#22d5e615', border: '#22d5e630' }, // Cyan
  { text: '#ec4899', bg: '#ec489915', border: '#ec489930' }, // Pink
  { text: '#10b981', bg: '#10b98115', border: '#10b98130' }, // Emerald
  { text: '#f97316', bg: '#f9731615', border: '#f9731630' }, // Orange
  { text: '#3b82f6', bg: '#3b82f615', border: '#3b82f630' }, // Blue
];

export default function HomeScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [keyword, setKeyword] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadUser = async () => {
        try {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            setUser(JSON.parse(userStr));
          } else {
            setUser(null);
          }
        } catch (e) {
          setUser(null);
        }
      };
      loadUser();
      fetchTrendingTopics();
    }, [])
  );

  const fetchTrendingTopics = async () => {
    try {
      const r = await api.get('/trends/keyword-categories', { params: { limit: 6 } });
      const kws: any[] = r.data.keywords || [];
      if (kws.length > 0) {
        setTrendingTopics(
          kws.slice(0, 6).map((kw: any, i: number) => ({
            id: kw.keywordId || kw._id || i,
            title: kw.name,
            category: kw.category ? kw.category.charAt(0).toUpperCase() + kw.category.slice(1) : 'Research',
            growth: kw.growthRate != null
              ? `${kw.growthRate > 0 ? '+' : ''}${kw.growthRate.toFixed(0)}%`
              : `${kw.paperCount || 0} papers`,
            colorObj: TOPIC_COLORS[i % TOPIC_COLORS.length],
          }))
        );
      } else {
        const r2 = await api.get('/trends/trending', { params: { limit: 6 } });
        const topics = r2.data.topics || r2.data.trending || [];
        setTrendingTopics(
          topics.slice(0, 6).map((t: any, i: number) => ({
            id: t._id || i,
            title: t.name || t.seedKeyword || t.keyword || 'Topic',
            category: t.category || 'Research',
            growth: t.growthRate != null
              ? `${t.growthRate > 0 ? '+' : ''}${t.growthRate.toFixed(0)}%`
              : t.trendStatus || 'Trending',
            colorObj: TOPIC_COLORS[i % TOPIC_COLORS.length],
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch trending', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (keyword.trim()) {
      router.push(`/explore?keyword=${encodeURIComponent(keyword)}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 8, 16), borderBottomColor: theme.border }]}>
        <View style={styles.logoRow}>
          <BookOpen size={22} color={theme.primary} />
          <Text style={[styles.logoText, { color: theme.text }]}>SciTrend</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {user && <NotificationBell />}
          {user ? (
            <TouchableOpacity
              style={[styles.profileAvatar, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '30' }]}
              onPress={() => router.push('/profile')}
            >
              <Text style={[styles.avatarLetter, { color: theme.primary }]}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Badge */}
        <View style={styles.centerBox}>
          <View style={[styles.badge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <Sparkles size={14} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>AI-powered scientific analytics</Text>
          </View>

          {/* Hero Headline */}
          <Text style={[styles.headline, { color: theme.text }]}>Discover</Text>
          <Text style={[styles.headlineSub, { color: theme.primary }]}>Research Trends</Text>
          
          <Text style={[styles.heroDesc, { color: theme.mutedForeground }]}>
            Track publication growth, visualize keyword networks, and stay ahead in your research domain.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={20} color={theme.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search papers, algorithms, domains..."
            placeholderTextColor={theme.mutedForeground}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: theme.primary }]}
            onPress={handleSearch}
          >
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Topics Section */}
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Trending Topics</Text>
        </View>

        {isLoading ? (
          <View style={{ height: 140, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={trendingTopics}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.topicCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => router.push(`/insights?keyword=${encodeURIComponent(item.title)}`)}
              >
                <View style={[styles.topicBadge, { backgroundColor: item.colorObj.bg, borderColor: item.colorObj.border }]}>
                  <Text style={[styles.topicBadgeText, { color: item.colorObj.text }]}>{item.category}</Text>
                </View>
                <Text style={[styles.topicTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.topicGrowth, { color: theme.success }]}>{item.growth}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Statistics / Features */}
        <View style={styles.statsContainer}>
          {[
            { value: '200M+', label: 'Papers Indexed', icon: BookOpen },
            { value: 'Real-time', label: 'Trend Tracking', icon: Zap },
            { value: 'AI-powered', label: 'Research Insights', icon: Sparkles },
            { value: '5 Sources', label: 'Academic Databases', icon: BarChart3 },
          ].map((stat, idx) => (
            <View key={idx} style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <stat.icon size={24} color={theme.primary} style={{ marginBottom: 12 }} />
              <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 60 },
  centerBox: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 32 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  headline: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 4, textAlign: 'center' },
  headlineSub: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 16, textAlign: 'center' },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 15 },
  searchBtn: {
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  
  trendingList: { paddingHorizontal: 20, paddingBottom: 10 },
  topicCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  topicBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  topicBadgeText: { fontSize: 10, fontWeight: '700' },
  topicTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, lineHeight: 20 },
  topicGrowth: { fontSize: 13, fontWeight: '600' },
  
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    width: (width - 52) / 2, // 2 columns with gaps
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '500' },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff10',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '700',
  },
  signInBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
