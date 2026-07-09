import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Send, Bot, User, Sparkles, X } from 'lucide-react-native';
import api from '../../lib/api';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  error?: boolean;
}

const initialMessages: Message[] = [
  {
    role: 'assistant',
    content: 'Hi! I am your AI Research Assistant. You can ask me anything about academic papers, research trends, or concepts. I will search the database and external sources to answer your questions.',
  },
];

export default function WorkspaceChatbot({
  theme,
  isVisible,
  onClose,
}: {
  theme: any;
  isVisible: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleChat = async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat/ask', { question: text });
      const answer = res.data.answer || "I'm sorry, I couldn't find an answer to that.";
      const sources = res.data.sources || [];

      let fullAnswer = answer;
      if (sources.length > 0) {
        fullAnswer += '\n\nSources:\n' + sources.map((s: any, i: number) => `[${i + 1}] ${s.title || 'Untitled'}`).join('\n');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullAnswer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI service is currently unavailable. Please try again later.', error: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.primary + '10' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '30' }]}>
                <Sparkles size={16} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>AI Research Assistant</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.statusText, { color: theme.mutedForeground }]}>Online</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={styles.messagesContainer}
          >
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <View key={i} style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
                  {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                      <Bot size={14} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? [styles.bubbleUser, { backgroundColor: theme.primary + '20' }]
                        : msg.error
                          ? [styles.bubbleError, { backgroundColor: theme.destructive + '15', borderColor: theme.destructive + '30' }]
                          : [styles.bubbleAssistant, { backgroundColor: theme.card, borderColor: theme.border }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        { color: msg.error ? theme.destructive : theme.text },
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                  {isUser && (
                    <View style={[styles.avatar, { backgroundColor: theme.mutedForeground }]}>
                      <User size={14} color="#fff" />
                    </View>
                  )}
                </View>
              );
            })}
            {isLoading && (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Bot size={14} color="#fff" />
                </View>
                <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Ask anything about academic papers..."
              placeholderTextColor={theme.mutedForeground}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleChat}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary, opacity: isLoading || !input.trim() ? 0.6 : 1 }]}
              onPress={handleChat}
              disabled={isLoading || !input.trim()}
            >
              <Send size={18} color="#fff" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
  },
  messagesContainer: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bubbleAssistant: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleError: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
