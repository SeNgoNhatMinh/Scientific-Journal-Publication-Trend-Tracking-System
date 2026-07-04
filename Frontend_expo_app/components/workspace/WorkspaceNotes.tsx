import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Plus, StickyNote, X } from 'lucide-react-native';

export default function WorkspaceNotes({
  theme,
  notes,
  showAddNote,
  setShowAddNote,
  noteTitle,
  setNoteTitle,
  noteContent,
  setNoteContent,
  isSavingNote,
  createNote
}: {
  theme: any;
  notes: any[];
  showAddNote: boolean;
  setShowAddNote: (v: boolean) => void;
  noteTitle: string;
  setNoteTitle: (v: string) => void;
  noteContent: string;
  setNoteContent: (v: string) => void;
  isSavingNote: boolean;
  createNote: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actionRow}>
        <Text style={[styles.statsLabel, { color: theme.text }]}>{notes.length} research notes</Text>
        <TouchableOpacity onPress={() => setShowAddNote(true)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
          <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.primaryBtnText}>New Note</Text>
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.centerContainer}>
          <StickyNote size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No research notes written yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => (item._id || item.id).toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.itemContent, { color: theme.mutedForeground }]}>{item.content}</Text>
            </View>
          )}
        />
      )}

      {/* New Note Modal */}
      <Modal visible={showAddNote} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Research Note</Text>
              <TouchableOpacity onPress={() => setShowAddNote(false)}>
                <X size={20} color={theme.icon} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Note Title"
              placeholderTextColor={theme.mutedForeground}
              value={noteTitle}
              onChangeText={setNoteTitle}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              placeholder="Content details..."
              placeholderTextColor={theme.mutedForeground}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              style={[styles.input, { color: theme.text, borderColor: theme.border, height: 120, textAlignVertical: 'top' }]}
            />

            <TouchableOpacity
              onPress={createNote}
              disabled={isSavingNote || !noteTitle.trim()}
              style={[styles.fullBtn, { backgroundColor: theme.primary, opacity: isSavingNote || !noteTitle.trim() ? 0.7 : 1 }]}
            >
              {isSavingNote ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.fullBtnText}>Save Note</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  statsLabel: { fontSize: 14, fontWeight: '500' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  itemContent: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  fullBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  fullBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
