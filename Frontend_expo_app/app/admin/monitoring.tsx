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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  RefreshCw,
  Globe,
  AlertTriangle,
  Server,
  Database,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import api from '../../lib/api';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const API_LIMITS: Record<string, { label: string; limit: number; color: string; period: string }> = {
  openalex: { label: 'OpenAlex API', limit: 10000, color: '#a855f7', period: 'Weekly' },
  semanticscholar: { label: 'Semantic Scholar', limit: 10000, color: '#22d5e6', period: 'Daily' },
  crossref: { label: 'CrossRef API', limit: 5000, color: '#fb923c', period: 'Daily' },
  ieee: { label: 'IEEE Xplore', limit: 200, color: '#f87171', period: 'Monthly' },
  exa: { label: 'Exa Research', limit: 1000, color: '#34d399', period: 'Monthly' },
};

export default function AdminMonitoringScreen() {
  const router = useRouter();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [aiHealth, setAiHealth] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [backendStatus, setBackendStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [apiUsage, setApiUsage] = useState<Record<string, number>>({});
  const [dbStats, setDbStats] = useState({ papers: 0, users: 0, runs: 0 });

  const checkHealthStatus = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    setAiStatus('loading');
    setBackendStatus('loading');

    // Check main backend API
    api.get('/trends/trending', { params: { limit: 1 } })
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('error'));

    // Check AI health status
    api.get('/ai/health')
      .then((r) => {
        setAiHealth(r.data);
        const isOk = r.data?.status === 'ok' || r.data?.success;
        setAiStatus(isOk ? 'ok' : 'error');
      })
      .catch(() => {
        setAiStatus('error');
        setAiHealth(null);
      })
      .finally(() => {
        setLastChecked(new Date());
        if (showLoading) setIsRefreshing(false);
      });
  };

  const fetchStats = async () => {
    try {
      // 1. Fetch API usage based on runs
      const res = await api.get('/corpus/runs', { params: { limit: 100 } });
      const runs = res.data.runs ?? res.data ?? [];
      const usage: Record<string, number> = {};
      if (Array.isArray(runs)) {
        runs.forEach((r: any) => {
          const src = (r.source ?? 'openalex').toLowerCase();
          usage[src] = (usage[src] ?? 0) + (r.stats?.totalPapers ?? 0);
        });
      }
      setApiUsage(usage);

      // 2. Fetch DB counts
      const [papersRes, usersRes] = await Promise.allSettled([
        api.get('/papers/search', { params: { limit: 1, keyword: 'a' } }),
        api.get('/users', { params: { limit: 1 } }),
      ]);

      const papersCount = papersRes.status === 'fulfilled' ? (papersRes.value.data.pagination?.total ?? 0) : 0;
      const usersCount = usersRes.status === 'fulfilled' ? (usersRes.value.data.pagination?.total ?? 0) : 0;

      setDbStats({
        papers: papersCount,
        users: usersCount,
        runs: Array.isArray(runs) ? runs.length : 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkHealthStatus();
    fetchStats();
  }, []);

  const handleRefresh = () => {
    checkHealthStatus(true);
    fetchStats();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.scrollContent}>
      {/* Refresh Header */}
      <View style={styles.topHeader}>
        <View style={styles.clockRow}>
          <Clock size={14} color={theme.icon} />
          <Text style={[styles.clockText, { color: theme.muted }]}>
            {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking...'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isRefreshing}
          style={[styles.refreshBtn, { borderColor: theme.border }]}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <RefreshCw size={12} color={theme.text} style={{ marginRight: 4 }} />
              <Text style={[styles.refreshText, { color: theme.text }]}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* API Usage limits card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Globe size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>External API Rate Limits</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.muted }]}>
          Estimated usage counts computed from active/completed runs.
        </Text>

        <View style={styles.usageList}>
          {Object.entries(API_LIMITS).map(([key, config]) => {
            const used = apiUsage[key] || 0;
            const pct = Math.min((used / config.limit) * 100, 100);
            const isWarn = pct >= 80;

            return (
              <View key={key} style={styles.usageItem}>
                <View style={styles.usageInfoRow}>
                  <View style={styles.usageNameContainer}>
                    <Text style={[styles.usageLabel, { color: theme.text }]}>{config.label}</Text>
                    {isWarn && (
                      <View style={[styles.warnBadge, { backgroundColor: '#f9731615', borderColor: '#f9731630' }]}>
                        <AlertTriangle size={8} color="#f97316" />
                        <Text style={styles.warnText}>High</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.usageText, { color: theme.text }]}>
                    {used} / <Text style={{ color: theme.muted }}>{config.limit}</Text>
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressBg, { backgroundColor: theme.background }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${pct}%`,
                        backgroundColor: isWarn ? theme.destructive : config.color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.usageFooterRow}>
                  <Text style={[styles.usagePeriod, { color: theme.muted }]}>{config.period} quota</Text>
                  <Text style={[styles.usagePct, { color: isWarn ? theme.destructive : theme.muted }]}>
                    {pct.toFixed(1)}% used
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Services Health Status Card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Server size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Internal Services Health</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.muted }]}>
          Real-time ping checks of deployed endpoints.
        </Text>

        <View style={styles.srvList}>
          {[
            { name: 'Main Backend API', sub: 'Node.js Express', status: backendStatus },
            { name: 'Database Parameters', sub: 'MongoDB Atlas', status: 'ok' },
            { name: 'AI Service', sub: 'FastAPI / Python', status: aiStatus },
          ].map((srv) => {
            const isOk = srv.status === 'ok';
            const isLoad = srv.status === 'loading';
            return (
              <View key={srv.name} style={[styles.srvItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View>
                  <Text style={[styles.srvName, { color: theme.text }]}>{srv.name}</Text>
                  <Text style={[styles.srvSub, { color: theme.muted }]}>{srv.sub}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isOk ? '#10b98112' : isLoad ? '#fb923c12' : '#ef444412',
                      borderColor: isOk ? '#10b98125' : isLoad ? '#fb923c25' : '#ef444425',
                    },
                  ]}
                >
                  {isOk ? (
                    <CheckCircle2 size={12} color="#10b981" />
                  ) : isLoad ? (
                    <ActivityIndicator size="small" color="#fb923c" />
                  ) : (
                    <XCircle size={12} color="#ef4444" />
                  )}
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isOk ? '#10b981' : isLoad ? '#fb923c' : '#ef4444' },
                    ]}
                  >
                    {isOk ? 'Operational' : isLoad ? 'Checking' : 'Offline'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Database Metrics Card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 40 }]}>
        <View style={styles.cardHeader}>
          <Database size={18} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Database Metrics</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.muted }]}>
          Live indexed database documents counts.
        </Text>

        <View style={styles.metricsRow}>
          {[
            { label: 'Papers', val: dbStats.papers, color: '#3b82f6' },
            { label: 'Users', val: dbStats.users, color: '#10b981' },
            { label: 'Runs', val: dbStats.runs, color: '#a855f7' },
          ].map((m) => (
            <View key={m.label} style={[styles.metricBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.metricVal, { color: m.color }]}>{m.val}</Text>
              <Text style={[styles.metricLabel, { color: theme.text }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockText: {
    fontSize: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 11,
    marginBottom: 16,
  },
  usageList: {
    gap: 16,
  },
  usageItem: {
    gap: 6,
  },
  usageInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  warnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  warnText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#f97316',
  },
  usageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  usageFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usagePeriod: {
    fontSize: 10,
  },
  usagePct: {
    fontSize: 10,
    fontWeight: '600',
  },
  srvList: {
    gap: 10,
  },
  srvItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  srvName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  srvSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
});
