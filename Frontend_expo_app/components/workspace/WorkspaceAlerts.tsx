import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';

export default function WorkspaceAlerts({
  theme,
  alerts,
}: {
  theme: any;
  alerts: any[];
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Bell size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Keyword Alerts</Text>
        </View>

        {alerts.length === 0 ? (
          <Text style={{ color: theme.mutedForeground, fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
            No alerts configured.
          </Text>
        ) : (
          alerts.map((a: any, i: number) => (
            <View key={i} style={[styles.alertRow, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.alertKeyword, { color: theme.text }]}>{a.keyword}</Text>
                <Text style={[styles.alertType, { color: theme.mutedForeground }]}>
                  {a.type === 'new_paper' ? 'New Paper Published' : 'Trending Topic'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: a.notifyEnabled ? theme.primary + '20' : theme.background }]}>
                <Text style={[styles.statusText, { color: a.notifyEnabled ? theme.primary : theme.mutedForeground }]}>
                  {a.notifyEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  alertKeyword: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
