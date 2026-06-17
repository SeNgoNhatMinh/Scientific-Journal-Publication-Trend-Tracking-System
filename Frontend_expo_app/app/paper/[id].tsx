import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Bot,
  Upload,
  Sparkles,
  FileText,
  Tag,
  Calendar,
  Quote,
} from 'lucide-react-native';
import api, { getBackendAssetUrl } from '../../lib/api';
import { Colors } from '../../constants/theme';

export default function PaperDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const systemScheme = useColorScheme();
  const theme = Colors[systemScheme || 'dark'];

  const [paper, setPaper] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [pdfFile, setPdfFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [pdfError, setPdfError] = useState('');

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [aiError, setAiError] = useState('');

  const [isBookmarked, setIsBookmarked] = useState(false);

  const fetchPaperDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/papers/${id}`);
      const paperData = res.data.paper || res.data;
      setPaper(paperData);
      
      // Determine bookmark status from user context or backend check
      // For simple sync, we can see if bookmarked is set to true on the model
      setIsBookmarked(!!paperData.bookmarkedBy?.length || false);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load paper details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaperDetails();
  }, [id]);

  const handleBookmark = async () => {
    try {
      await api.post(`/papers/${id}/bookmark`);
      setIsBookmarked(!isBookmarked);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      }
    }
  };

  const selectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPdfFile(result.assets[0]);
        setPdfError('');
        setPdfMessage('');
      }
    } catch (err) {
      console.error('Document selection failed', err);
    }
  };

  const handlePdfUpload = async () => {
    if (!id || !pdfFile) return;
    setIsUploadingPdf(true);
    setPdfMessage('');
    setPdfError('');

    try {
      const formData = new FormData();
      // React Native requires a special object structure for file uploads in FormData
      const fileToUpload = {
        uri: pdfFile.uri,
        type: 'application/pdf',
        name: pdfFile.name || 'document.pdf',
      };
      
      formData.append('pdf', fileToUpload as any);

      const res = await api.post(`/papers/${id}/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPaper((current: any) => ({
        ...current,
        pdfUrl: res.data.pdfUrl,
        uploadedPdf: res.data.uploadedPdf,
      }));

      setPdfMessage(
        res.data.fullTextExtracted
          ? `PDF successfully uploaded and processed.`
          : 'PDF uploaded. Text extraction not available.'
      );
      setPdfFile(null);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setPdfError(err.response?.data?.message || 'Failed to upload PDF.');
      }
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleAiSummary = async () => {
    const text = paper?.fullText || paper?.abstract || '';
    if (!text) {
      setAiError('This paper does not have abstract or text to summarize.');
      return;
    }
    setIsSummarizing(true);
    setAiError('');
    try {
      const trimmedText = text.slice(0, 8000);
      const [summaryRes, insightRes] = await Promise.all([
        api.post('/ai/summarization/abstract', { abstract: trimmedText, maxLength: 500 }),
        api.post('/ai/summarization/extract-problem', { abstract: trimmedText }),
      ]);
      setAiSummary(summaryRes.data);
      setAiInsight(insightRes.data);
    } catch (err: any) {
      setAiError('AI summarization is currently offline.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown Authors';
    if (typeof authors[0] === 'string') return authors.join(', ');
    return authors.map((a) => a.name).join(', ');
  };

  const handleOpenSource = () => {
    const url = paper?.url || (paper?.doi ? `https://doi.org/${paper.doi}` : '');
    if (url) {
      Linking.openURL(url);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.muted }]}>Loading paper details...</Text>
      </View>
    );
  }

  if (error || !paper) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background, padding: 30 }]}>
        <Text style={[styles.errorText, { color: theme.destructive }]}>{error || 'Paper not found.'}</Text>
        <TouchableOpacity style={[styles.backBtn, { borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={{ color: theme.text }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.scrollContent}>
      {/* Upper Meta Row */}
      <View style={styles.metaBadgeRow}>
        {paper.source ? (
          <View style={[styles.sourceBadge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.sourceBadgeText, { color: theme.primary }]}>{paper.source.toUpperCase()}</Text>
          </View>
        ) : null}
        {paper.publicationYear && (
          <View style={styles.metaTextItem}>
            <Calendar size={14} color={theme.icon} />
            <Text style={[styles.metaText, { color: theme.muted }]}>{paper.publicationYear}</Text>
          </View>
        )}
        {paper.citationCount > 0 && (
          <View style={styles.metaTextItem}>
            <Quote size={14} color={theme.icon} />
            <Text style={[styles.metaText, { color: theme.muted }]}>{paper.citationCount} citations</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>{paper.title}</Text>

      {/* Authors */}
      <Text style={[styles.authors, { color: theme.muted }]}>{formatAuthors(paper.authors)}</Text>
      {paper.journalName ? (
        <Text style={[styles.journal, { color: theme.muted }]}>{paper.journalName}</Text>
      ) : null}

      {/* Quick Action Bar */}
      <View style={[styles.actionsRow, { borderBottomColor: theme.border, borderTopColor: theme.border }]}>
        <TouchableOpacity onPress={handleBookmark} style={styles.actionBtn}>
          <Bookmark size={18} color={isBookmarked ? theme.primary : theme.icon} fill={isBookmarked ? theme.primary : 'none'} />
          <Text style={[styles.actionBtnText, { color: isBookmarked ? theme.primary : theme.icon }]}>
            {isBookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleOpenSource} style={styles.actionBtn}>
          <ExternalLink size={18} color={theme.icon} />
          <Text style={[styles.actionBtnText, { color: theme.icon }]}>Source</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAiSummary} disabled={isSummarizing} style={styles.actionBtn}>
          {isSummarizing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Bot size={18} color={theme.primary} />
          )}
          <Text style={[styles.actionBtnText, { color: theme.primary }]}>AI Summary</Text>
        </TouchableOpacity>
      </View>

      {/* PDF Upload Card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Upload size={16} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Research File & AI Ingestion</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.muted }]}>
          Upload the full paper PDF so the AI can perform deep reading.
        </Text>

        {paper.pdfUrl && (
          <View style={[styles.pdfIndicator, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <FileText size={16} color={theme.primary} />
            <Text style={[styles.pdfText, { color: theme.text }]} numberOfLines={1}>
              {paper.uploadedPdf?.originalName || 'PDF Ingested'}
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(getBackendAssetUrl(paper.pdfUrl))}
              style={[styles.openPdfBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.openPdfBtnText}>Open</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.uploadRow}>
          <TouchableOpacity onPress={selectDocument} style={[styles.pickBtn, { borderColor: theme.border }]}>
            <Text style={[styles.pickBtnText, { color: theme.text }]}>
              {pdfFile ? pdfFile.name : 'Select PDF...'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePdfUpload}
            disabled={!pdfFile || isUploadingPdf}
            style={[styles.uploadBtn, { backgroundColor: theme.primary }, !pdfFile && { opacity: 0.5 }]}
          >
            {isUploadingPdf ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.uploadBtnText}>Upload</Text>
            )}
          </TouchableOpacity>
        </View>

        {pdfMessage ? <Text style={[styles.successText, { color: theme.success }]}>{pdfMessage}</Text> : null}
        {pdfError ? <Text style={[styles.errorSubText, { color: theme.destructive }]}>{pdfError}</Text> : null}
      </View>

      {/* AI Reading Notes */}
      {(aiSummary || aiInsight || aiError) && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.primary + '30' }]}>
          <View style={styles.cardHeader}>
            <Sparkles size={16} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>AI Reading Notes</Text>
          </View>

          {aiError ? <Text style={[styles.errorSubText, { color: theme.destructive }]}>{aiError}</Text> : null}

          {aiSummary?.summary && (
            <View style={styles.aiBlock}>
              <Text style={[styles.aiLabel, { color: theme.primary }]}>SUMMARY</Text>
              <Text style={[styles.aiTextContent, { color: theme.text }]}>{aiSummary.summary}</Text>
            </View>
          )}

          {aiSummary?.keyPoints && aiSummary.keyPoints.length > 0 && (
            <View style={styles.aiBlock}>
              <Text style={[styles.aiLabel, { color: theme.primary }]}>KEY TAKEAWAYS</Text>
              {aiSummary.keyPoints.map((point: string, idx: number) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: theme.primary }]}>•</Text>
                  <Text style={[styles.bulletText, { color: theme.text }]}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {aiInsight && (
            <View style={styles.insightGrid}>
              <View style={[styles.insightBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.insightLabel, { color: theme.muted }]}>Problem</Text>
                <Text style={[styles.insightText, { color: theme.text }]}>{aiInsight.problem || 'N/A'}</Text>
              </View>
              <View style={[styles.insightBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.insightLabel, { color: theme.muted }]}>Method</Text>
                <Text style={[styles.insightText, { color: theme.text }]}>{aiInsight.methodology || 'N/A'}</Text>
              </View>
              <View style={[styles.insightBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.insightLabel, { color: theme.muted }]}>Result</Text>
                <Text style={[styles.insightText, { color: theme.text }]}>{aiInsight.results || 'N/A'}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Abstract */}
      <View style={styles.abstractSection}>
        <View style={styles.sectionHeader}>
          <FileText size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Abstract</Text>
        </View>
        <View style={[styles.abstractCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.abstractText, { color: theme.text }]}>
            {paper.abstract || 'No abstract available.'}
          </Text>
        </View>
      </View>

      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <View style={styles.keywordsSection}>
          <View style={styles.sectionHeader}>
            <Tag size={16} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Keywords</Text>
          </View>
          <View style={styles.keywordsContainer}>
            {paper.keywords.map((kw: any, idx: number) => {
              const kwStr = typeof kw === 'string' ? kw : kw.name || '';
              if (!kwStr) return null;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push({ pathname: '/explore', params: { searchKeyword: kwStr } })}
                  style={[styles.keywordChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Text style={[styles.keywordChipText, { color: theme.text }]}>{kwStr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  metaTextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 28,
    marginBottom: 8,
  },
  authors: {
    fontSize: 14,
    fontWeight: '600',
  },
  journal: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginVertical: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 11,
    marginBottom: 12,
  },
  pdfIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  pdfText: {
    flex: 1,
    fontSize: 12,
    marginHorizontal: 8,
  },
  openPdfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openPdfBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickBtn: {
    flex: 2,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pickBtnText: {
    fontSize: 12,
  },
  uploadBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  successText: {
    fontSize: 11,
    marginTop: 8,
  },
  errorSubText: {
    fontSize: 11,
    marginTop: 8,
  },
  aiBlock: {
    marginBottom: 14,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  aiTextContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 14,
    marginRight: 6,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  insightGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  insightBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 16,
  },
  abstractSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  abstractCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  abstractText: {
    fontSize: 14,
    lineHeight: 20,
  },
  keywordsSection: {},
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  keywordChipText: {
    fontSize: 11,
  },
});
