import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Plus, FileText, X, Search, Trash2 } from 'lucide-react-native';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function WorkspacePapers({
  theme,
  papers,
  showAddPaper,
  setShowAddPaper,
  paperQuery,
  setPaperQuery,
  searchSource,
  setSearchSource,
  searchAcademicPapers,
  loadMorePapers,
  isSearching,
  searchResults,
  searchTotal,
  addPaperToWorkspace,
  addingId,
  formatAuthors,
  getUnwrappedPaperId,
  removePaperFromWorkspace,
  router
}: {
  theme: any;
  papers: any[];
  showAddPaper: boolean;
  setShowAddPaper: (v: boolean) => void;
  paperQuery: string;
  setPaperQuery: (v: string) => void;
  searchSource: string;
  setSearchSource: (v: string) => void;
  searchAcademicPapers: () => void;
  loadMorePapers: () => void;
  isSearching: boolean;
  searchResults: any[];
  searchTotal: number;
  addPaperToWorkspace: (item: any) => void;
  addingId: string | null;
  formatAuthors: (authors: any[]) => string;
  getUnwrappedPaperId: (p: any) => string;
  removePaperFromWorkspace: (paperId: string) => void;
  router: any;
}) {
  const [paperToRemove, setPaperToRemove] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actionRow}>
        <Text style={[styles.statsLabel, { color: theme.text }]}>{papers.length} publications</Text>
        {!showAddPaper && (
          <TouchableOpacity onPress={() => setShowAddPaper(true)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.primaryBtnText}>Add Paper</Text>
          </TouchableOpacity>
        )}
      </View>

      {showAddPaper && (
        <View style={[styles.inlineAddContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.inlineAddHeader}>
            <Text style={[styles.inlineAddTitle, { color: theme.text }]}>Add Research Paper</Text>
            <TouchableOpacity onPress={() => setShowAddPaper(false)}>
              <X size={20} color={theme.icon} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Search size={18} color={theme.icon} style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Search Academic Papers..."
              placeholderTextColor={theme.mutedForeground}
              value={paperQuery}
              onChangeText={setPaperQuery}
              style={[styles.searchInput, { color: theme.text }]}
              onSubmitEditing={searchAcademicPapers}
            />
            <TouchableOpacity onPress={searchAcademicPapers} style={[styles.searchBtn, { backgroundColor: theme.primary }]}>
              {isSearching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.sourceSelector}>
            {['openalex', 'semanticscholar', 'exa'].map((src) => (
              <TouchableOpacity
                key={src}
                onPress={() => setSearchSource(src)}
                style={[
                  styles.sourceBtn,
                  searchSource === src ? { backgroundColor: theme.primary + '20', borderColor: theme.primary } : { borderColor: theme.border }
                ]}
              >
                <Text style={[styles.sourceBtnText, { color: searchSource === src ? theme.primary : theme.mutedForeground }]}>
                  {src === 'openalex' ? 'OpenAlex' : src === 'semanticscholar' ? 'Semantic Scholar' : 'Exa AI'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item, idx) => (item.id || item._id || idx).toString()}
              style={styles.searchResultsInline}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMorePapers}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isSearching && searchResults.length > 0 ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
                ) : searchResults.length >= searchTotal ? (
                  <Text style={{ textAlign: 'center', color: theme.mutedForeground, fontSize: 12, marginVertical: 12 }}>
                    No more results
                  </Text>
                ) : null
              }
              renderItem={({ item, index }) => {
                const pId = item.id || item._id;
                const isAdding = addingId === pId;
                const isAlreadyAdded = papers.some((wp: any) => {
                  const p = wp.paperId && typeof wp.paperId === 'object' ? wp.paperId : (wp.paper || wp);
                  if (p.title === item.title) return true;
                  if (p.externalIds?.openalex === pId) return true;
                  if (p.externalIds?.semanticScholar === pId) return true;
                  if (p.externalIds?.crossref === pId) return true;
                  return false;
                });

                const authorStr = item.authorships
                  ? item.authorships.map((a: any) => a.author?.display_name).join(', ')
                  : item.authors
                  ? item.authors.map((a: any) => a.name).join(', ')
                  : 'Unknown Authors';

                return (
                  <View style={[styles.searchResultItem, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.searchResultTitle, { color: theme.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[styles.searchResultMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
                        {authorStr} · {item.publication_year || item.year || 'N/A'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => addPaperToWorkspace(item)}
                      disabled={isAdding || isAlreadyAdded}
                      style={[
                        styles.addBtn,
                        { backgroundColor: isAlreadyAdded ? theme.border : (isAdding ? theme.mutedForeground : theme.primary) },
                        isAlreadyAdded && { width: 'auto', paddingHorizontal: 12 }
                      ]}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : isAlreadyAdded ? (
                        <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Added</Text>
                      ) : (
                        <Plus size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {!showAddPaper && papers.length === 0 ? (
        <View style={styles.centerContainer}>
          <FileText size={48} color={theme.icon} style={{ opacity: 0.2, marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No papers in this workspace.</Text>
        </View>
      ) : !showAddPaper ? (
        <FlatList
          data={papers}
          keyExtractor={(item) => getUnwrappedPaperId(item).toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const p = item.paperId && typeof item.paperId === 'object' ? item.paperId : (item.paper || item);
            const pId = getUnwrappedPaperId(item);
            return (
              <TouchableOpacity
                onPress={() => router.push(`/paper/${pId}`)}
                style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                    {p.title?.text || p.title || 'Untitled Paper'}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.mutedForeground }]}>
                    {formatAuthors(p.authors)} · {p.publicationYear || 'N/A'}
                  </Text>
                  {item.addedBy?.name && (
                    <Text style={[styles.addedByText, { color: theme.mutedForeground, opacity: 0.8 }]}>
                      Added by <Text style={{ fontWeight: '500' }}>{item.addedBy.name}</Text>
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setPaperToRemove(pId)} style={{ padding: 8 }}>
                  <Trash2 size={18} color={theme.destructive} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={!!paperToRemove}
        onClose={() => setPaperToRemove(null)}
        onConfirm={() => {
          if (paperToRemove) {
            removePaperFromWorkspace(paperToRemove);
          }
        }}
        title="Remove Paper"
        description="Are you sure you want to remove this paper from the workspace?"
        confirmText="Remove"
        isDanger={true}
      />
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
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  itemTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, lineHeight: 20 },
  itemMeta: { fontSize: 12, marginBottom: 4 },
  addedByText: { fontSize: 11, marginTop: 2 },
  
  // Inline Add Paper
  inlineAddContainer: { flex: 1, marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  inlineAddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inlineAddTitle: { fontSize: 16, fontWeight: '700' },
  sourceSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sourceBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  sourceBtnText: { fontSize: 11, fontWeight: '500' },
  searchResultsInline: { flex: 1, marginTop: 4 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  searchResultTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  searchResultMeta: { fontSize: 12 },
  addBtn: { padding: 8, borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 16, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
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
