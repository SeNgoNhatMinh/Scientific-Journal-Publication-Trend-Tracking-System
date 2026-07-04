import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Activity, GitBranch, BarChart2 } from 'lucide-react-native';
import { AreaChart, NodeGraph } from './WorkspaceMap';

export default function WorkspaceInsights({
  theme,
  trends,
  papers,
  graphNodes,
  workspace
}: {
  theme: any;
  trends: any;
  papers: any[];
  graphNodes: any[];
  workspace: any;
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Publication Trends Chart */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Activity size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Publication Volume Trend</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
          Yearly breakdown of {trends?.paperCount || papers.length} papers in this workspace.
        </Text>
        <AreaChart data={trends?.yearlyData || []} theme={theme} />
      </View>

      {/* Keyword Co-occurrence Network Graph */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <GitBranch size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Semantic Keyword Network</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
          Visual representation of keyword relationships inside this workspace.
        </Text>
        <NodeGraph nodes={graphNodes} centerKeyword={workspace?.name || 'Workspace'} theme={theme} />
      </View>

      {/* Top Keywords */}
      {trends?.topKeywords && trends.topKeywords.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <BarChart2 size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Top Workspace Keywords</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
            Most frequent terms classified across all ingested publications.
          </Text>
          <View style={{ gap: 12, marginTop: 8 }}>
            {trends.topKeywords.slice(0, 8).map((item: any, i: number) => {
              const maxVal = trends.topKeywords[0]?.paperCount || 1;
              const percentage = (item.paperCount / maxVal) * 100;
              return (
                <View key={i} style={styles.barItem}>
                  <View style={styles.barHeader}>
                    <Text style={[styles.barText, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.barCount, { color: theme.mutedForeground }]}>{item.paperCount} papers</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: theme.background }]}>
                    <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: theme.primary }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 12 },
  
  barItem: { marginBottom: 4 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barText: { fontSize: 13, fontWeight: '600' },
  barCount: { fontSize: 11 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
