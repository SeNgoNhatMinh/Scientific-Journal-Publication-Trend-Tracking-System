import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Plus, FileText, X, Search } from 'lucide-react-native';

export default function WorkspacePapers({
  theme,
  papers,
  showAddPaper,
  setShowAddPaper,
  paperQuery,
  setPaperQuery,
  searchAcademicPapers,
  isSearching,
  searchResults,
  addPaperToWorkspace,
  addingId,
  formatAuthors,
  getUnwrappedPaperId,
  router
}: {
  theme: any;
  papers: any[];
  showAddPaper: boolean;
  setShowAddPaper: (v: boolean) => void;
  paperQuery: string;
  setPaperQuery: (v: string) => void;
  searchAcademicPapers: () => void;
  isSearching: boolean;
  searchResults: any[];
  addPaperToWorkspace: (item: any) => void;
  addingId: string | null;
  formatAuthors: (authors: any[]) => string;
  getUnwrappedPaperId: (p: any) => string;
  router: any;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actionRow}>
        <Text style={[styles.statsLabel, { color: theme.text }]}>{papers.length} publications</Text>
        <TouchableOpacity onPress={() => setShowAddPaper(true)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
          <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.primaryBtnText}>Add Paper</Text>
        </TouchableOpacity>
      </View>

      {papers.length === 0 ? (
        <View style={styles.centerContainer}>
          <FileText size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No papers in this workspace.</Text>
        </View>
      ) : (
        <FlatList
          data={papers}
          keyExtractor={(item) => getUnwrappedPaperId(item).toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const p = item.paper || item;
            const pId = getUnwrappedPaperId(item);
            return (
              <TouchableOpacity
                onPress={() => router.push(`/paper/${pId}`)}
                style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>{p.title || 'Untitled Paper'}</Text>
                <Text style={[styles.itemMeta, { color: theme.mutedForeground }]}>
                  {formatAuthors(p.authors)} · {p.publicationYear || 'N/A'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Add Paper Modal */}
      <Modal visible={showAddPaper} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Research Paper</Text>
              <TouchableOpacity onPress={() => setShowAddPaper(false)}>
                <X size={20} color={theme.icon} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Search OpenAlex..."
                placeholderTextColor={theme.mutedForeground}
                value={paperQuery}
                onChangeText={setPaperQuery}
                style={[styles.searchInput, { color: theme.text }]}
                onSubmitEditing={searchAcademicPapers}
              />
              <TouchableOpacity onPress={searchAcademicPapers} style={[styles.searchBtn, { backgroundColor: theme.primary }]}>
                {isSearching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Go</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalResultsScroll}>
              {searchResults.map((item) => (
                <View key={item.id} style={[styles.resultItem, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.resultMeta, { color: theme.mutedForeground }]}>{formatAuthors(item.authors)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => addPaperToWorkspace(item)}
                    disabled={addingId === (item.id || item.title)}
                    style={[styles.addResultBtn, { backgroundColor: theme.primary }]}
                  >
                    {addingId === (item.id || item.title) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addResultBtnText}>Add</Text>}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
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
  itemMeta: { fontSize: 12, marginTop: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, borderWidth: 1, paddingLeft: 12, paddingRight: 4, marginBottom: 16 },
  searchInput: { flex: 1, height: '100%', fontSize: 14 },
  searchBtn: { paddingHorizontal: 14, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  modalResultsScroll: { gap: 12 },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  resultTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  resultMeta: { fontSize: 12 },
  addResultBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addResultBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' }
});
