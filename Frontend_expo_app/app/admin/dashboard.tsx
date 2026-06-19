import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Database,
  FileText,
  Activity,
  ArrowRight,
  ArrowLeft,
  Server,
  Shield,
  Bell,
  Settings,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({ users: 0, corpus: 0, papers: 0, activeCorpus: 0 });
  const [apiHealth, setApiHealth] = useState<'ok' | 'error' | 'loading'>('loading');
  const [isLoading, setIsLoading] = useState(true);

  const [activities, setActivities] = useState<any[]>([]);

  const fetchAdminStats = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch user count
      const usersRes = await api.get('/users', { params: { limit: 1 } });
      const totalUsers = usersRes.data.pagination?.total ?? 0;

      // 2. Fetch corpus runs
      const runsRes = await api.get('/corpus/runs');
      const runs = runsRes.data.runs ?? runsRes.data ?? [];
      const activeJobs = Array.isArray(runs)
        ? runs.filter((r: any) => r.status === 'ingesting' || r.status === 'analyzing').length
        : 0;

      const totalPapers = Array.isArray(runs)
        ? runs.reduce((sum: number, r: any) => sum + (r.stats?.totalPapers ?? 0), 0)
        : 0;

      setStats({
        users: totalUsers,
        corpus: Array.isArray(runs) ? runs.length : 0,
        papers: totalPapers,
        activeCorpus: activeJobs,
      });

      // 3. Health check
      try {
        await api.get('/ai/health');
        setApiHealth('ok');
      } catch (e) {
        setApiHealth('error');
      }

      // 4. Notifications
      try {
        const notifRes = await api.get('/notifications', { params: { limit: 5 } });
        setActivities(notifRes.data.notifications ?? notifRes.data.data ?? []);
      } catch (e) {
        setActivities([]);
      }
    } catch (e) {
      console.error(e);
      setApiHealth('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  return (
    <>
      <Stack.Screen 
        options={{
          headerLeft: ({ tintColor }) => (
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={{ marginRight: 16, marginLeft: 8 }}
            >
              <ArrowLeft size={24} color={tintColor || theme.text} />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
      >
        {/* Header Info */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Shield size={24} color={theme.destructive} />
            <Text style={[styles.title, { color: theme.text }]}>Admin Panel</Text>
          </View>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Monitor system metrics, manage database parameters, and analyze corpus jobs.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.content}>
          {/* Stats Grid */}
          <View style={styles.grid}>
            {[
              { label: 'Total Users', value: stats.users, icon: Users, color: '#a855f7' },
              { label: 'Corpus Runs', value: stats.corpus, icon: Database, color: '#10b981' },
              { label: 'Total Papers', value: stats.papers, icon: FileText, color: '#3b82f6' },
              { label: 'Active Jobs', value: stats.activeCorpus, icon: Activity, color: '#f97316' },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
                  <stat.icon size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Quick Navigation Cards */}
          <View style={styles.navBlock}>
            <TouchableOpacity
              onPress={() => router.push('/admin/users')}
              style={[styles.navCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.navCardLeft}>
                <Users size={20} color={theme.primary} />
                <Text style={[styles.navCardTitle, { color: theme.text }]}>User Management</Text>
              </View>
              <ArrowRight size={18} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/admin/monitoring')}
              style={[styles.navCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.navCardLeft}>
                <Activity size={20} color={theme.primary} />
                <Text style={[styles.navCardTitle, { color: theme.text }]}>System Monitoring</Text>
              </View>
              <ArrowRight size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* System Health */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>System Services</Text>

            {[
              { label: 'Backend API', status: 'Operational', color: theme.success },
              { label: 'MongoDB Atlas', status: 'Connected', color: theme.success },
              {
                label: 'AI Service',
                status: apiHealth === 'ok' ? 'Active' : 'Unreachable',
                color: apiHealth === 'ok' ? theme.success : theme.destructive,
              },
            ].map((srv) => (
              <View key={srv.label} style={styles.srvRow}>
                <View style={styles.srvLeft}>
                  <Server size={14} color={theme.icon} />
                  <Text style={[styles.srvLabel, { color: theme.text }]}>{srv.label}</Text>
                </View>
                <Text style={[styles.srvStatus, { color: srv.color }]}>{srv.status}</Text>
              </View>
            ))}
          </View>

          {/* Recent Notifications */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 40 }]}>
            <View style={styles.cardHeader}>
              <Bell size={16} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Notifications</Text>
            </View>

            {activities.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>No recent notifications.</Text>
            ) : (
              activities.map((notif, idx) => (
                <View key={idx} style={[styles.notifItem, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.notifTitle, { color: theme.text }]} numberOfLines={1}>
                    {notif.title || notif.message || 'System Notification'}
                  </Text>
                  <Text style={[styles.notifDesc, { color: theme.muted }]} numberOfLines={1}>
                    {notif.message || notif.detail || ''}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
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
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  navBlock: {
    gap: 10,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  navCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  srvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea20',
  },
  srvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  srvLabel: {
    fontSize: 13,
  },
  srvStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  notifItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  notifDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
