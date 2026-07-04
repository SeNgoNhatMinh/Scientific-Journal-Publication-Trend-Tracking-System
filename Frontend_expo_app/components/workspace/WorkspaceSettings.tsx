import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Bot, Users, Bell } from 'lucide-react-native';

export default function WorkspaceSettings({
  theme,
  workspace,
  role,
  alerts,
  corpusKeyword,
  setCorpusKeyword,
  isRunningCorpus,
  runCorpus,
  handleDeleteWorkspace
}: {
  theme: any;
  workspace: any;
  role: string;
  alerts: any[];
  corpusKeyword: string;
  setCorpusKeyword: (v: string) => void;
  isRunningCorpus: boolean;
  runCorpus: () => void;
  handleDeleteWorkspace: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Corpus Run */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Bot size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Automated Corpus Collection</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: theme.mutedForeground }]}>
          Automatically pull papers matching a seed keyword.
        </Text>
        <TextInput
          placeholder="Seed Keyword (e.g., federated learning)"
          placeholderTextColor={theme.mutedForeground}
          value={corpusKeyword}
          onChangeText={setCorpusKeyword}
          style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 8 }]}
        />
        <TouchableOpacity onPress={runCorpus} disabled={isRunningCorpus} style={[styles.fullBtn, { backgroundColor: theme.primary, marginTop: 12 }]}>
          {isRunningCorpus ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.fullBtnText}>Run Corpus</Text>}
        </TouchableOpacity>
      </View>

      {/* Members */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Users size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Members</Text>
        </View>
        {(workspace?.members || []).map((m: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ color: theme.text }}>{m.user?.email || 'User'}</Text>
            <Text style={{ color: theme.mutedForeground }}>{m.role}</Text>
          </View>
        ))}
      </View>

      {/* Alerts */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Bell size={20} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Alerts</Text>
        </View>
        {alerts.length === 0 ? (
          <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>No alerts configured.</Text>
        ) : (
          alerts.map((a: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.text }}>{a.keyword}</Text>
              <Text style={{ color: theme.mutedForeground }}>{a.notifyEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
          ))
        )}
      </View>

      {/* Danger Zone */}
      {role === 'owner' && (
        <View style={[styles.card, { backgroundColor: '#ff000010', borderColor: theme.destructive }]}>
          <Text style={[styles.cardTitle, { color: theme.destructive }]}>Danger Zone</Text>
          <Text style={{ color: theme.text, marginTop: 4, marginBottom: 12, fontSize: 13 }}>
            Once you delete a workspace, there is no going back.
          </Text>
          <TouchableOpacity onPress={handleDeleteWorkspace} style={[styles.fullBtn, { backgroundColor: theme.destructive }]}>
            <Text style={styles.fullBtnText}>Delete Workspace</Text>
          </TouchableOpacity>
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
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  fullBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  fullBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
