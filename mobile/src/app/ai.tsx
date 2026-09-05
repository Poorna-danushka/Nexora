import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import {
  AI_ERROR_MESSAGES,
  createAIConversation,
  deleteAIConversation,
  getAIMessages,
  getAIConversations,
  isAuthError,
  parseAIError,
  renameAIConversation,
  sendAIMessage,
} from '@/services/api/aiApi';
import type { AIConversation, AIMessage, AIErrorKind } from '@/types/ai';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { BottomNav, Button, EmptyState, Message } from '@/components/ui';

export default function AIAssistantScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selected, setSelected] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [error, setError] = useState<AIErrorKind | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadConversations = async () => {
    try {
      const data = await getAIConversations();
      setConversations(data);
      if (data[0]) {
        setSelected(data[0]);
        setMessages(await getAIMessages(data[0].id));
      }
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadConversations(); }, []);

  const selectConversation = async (conversation: AIConversation) => {
    setBusy(true);
    setError(null);
    try {
      setSelected(conversation);
      setMessages(await getAIMessages(conversation.id));
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setBusy(false);
    }
  };

  const createConversation = async () => {
    setBusy(true);
    setError(null);
    try {
      const conversation = await createAIConversation();
      setConversations((items) => [conversation, ...items]);
      setSelected(conversation);
      setMessages([]);
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!selected || sending || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);
    setError(null);
    try {
      setMessages(await sendAIMessage(selected.id, content));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
    } catch (err) {
      setDraft(content);
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setSending(false);
    }
  };

  const rename = async () => {
    if (!selected || !renameDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await renameAIConversation(selected.id, renameDraft.trim());
      setSelected(updated);
      setRenameDraft('');
      setConversations((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAIConversation(selected.id);
      const remaining = conversations.filter((item) => item.id !== selected.id);
      setConversations(remaining);
      setSelected(remaining[0] ?? null);
      setMessages(remaining[0] ? await getAIMessages(remaining[0].id) : []);
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>AI Assistant</Text>
          <Button label="New" onPress={() => { void createConversation(); }} size="sm" />
        </View>
        <View style={styles.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationRow}>
            {conversations.map((conversation) => (
              <Pressable key={conversation.id} onPress={() => { void selectConversation(conversation); }} style={[styles.conversationChip, selected?.id === conversation.id && styles.selectedChip]}>
                <Text style={styles.conversationText} numberOfLines={1}>{conversation.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {selected && (
            <View style={styles.actions}>
              <TextInput
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder={selected.title}
                placeholderTextColor={Colors.textMuted}
                style={styles.renameInput}
                maxLength={160}
                editable={!busy}
              />
              <Button label="Rename" onPress={() => { void rename(); }} variant="ghost" size="sm" disabled={busy || !renameDraft.trim()} />
              <Button label="Delete" onPress={() => { void remove(); }} variant="ghost" size="sm" disabled={busy} />
            </View>
          )}
          {error && <Message tone="error">{AI_ERROR_MESSAGES[error]}</Message>}
          {!selected && !loading ? (
            <EmptyState title="Start a conversation" text="Ask Nexora's AI study assistant a question." action="New Conversation" onAction={() => { void createConversation(); }} />
          ) : (
            <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} keyboardShouldPersistTaps="handled">
              {messages.length === 0 && <Text style={styles.emptyText}>Ask a study question to get started.</Text>}
              {messages.map((message) => (
                <View key={message.id} style={[styles.message, message.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
              ))}
              {sending && <Text style={styles.sending}>Thinking…</Text>}
            </ScrollView>
          )}
          {selected && (
            <View style={styles.composer}>
              <TextInput value={draft} onChangeText={setDraft} placeholder="Ask a study question…" placeholderTextColor={Colors.textMuted} style={styles.input} multiline editable={!sending} />
              <Button label="Send" onPress={() => { void send(); }} loading={sending} disabled={sending || !draft.trim()} size="sm" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <BottomNav active="Home" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  back: { color: Colors.primaryLight, fontSize: 34 },
  title: { flex: 1, color: Colors.textPrimary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black },
  body: { flex: 1, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  conversationRow: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  conversationChip: { maxWidth: 180, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt },
  selectedChip: { backgroundColor: Colors.primary },
  conversationText: { color: Colors.textPrimary, fontSize: Typography.size.sm },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs },
  renameInput: { flex: 1, minHeight: 36, color: Colors.textPrimary, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.sm },
  messages: { flex: 1 },
  messagesContent: { gap: Spacing.sm, paddingVertical: Spacing.md },
  message: { maxWidth: '86%', padding: Spacing.md, borderRadius: Radius.lg },
  userMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: Colors.surface },
  messageText: { color: Colors.textPrimary, lineHeight: 21 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  sending: { color: Colors.textMuted, padding: Spacing.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingVertical: Spacing.md },
  input: { flex: 1, minHeight: 44, maxHeight: 120, color: Colors.textPrimary, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.sm },
});
