import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { BottomNav } from '@/components/ui';

// ─── Typing indicator dots ────────────────────────────────────────────────────
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={typing.wrap}>
      <View style={typing.bubble}>
        <View style={typing.dotsRow}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                typing.dot,
                {
                  opacity: dot,
                  transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const typing = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  bubble: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primaryLight },
});

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[bubble.row, isUser ? bubble.rowRight : bubble.rowLeft]}>
      {!isUser && (
        <View style={bubble.avatar}>
          <Text style={bubble.avatarText}>✦</Text>
        </View>
      )}
      <View style={[bubble.bubble, isUser ? bubble.userBubble : bubble.aiBubble]}>
        {!isUser && (
          <Text style={bubble.aiLabel}>NEXORA AI</Text>
        )}
        <Text style={[bubble.text, isUser ? bubble.userText : bubble.aiText]} selectable>
          {message.content}
        </Text>
        <Text style={[bubble.time, isUser ? bubble.timeRight : bubble.timeLeft]}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const bubble = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.sm },
  rowLeft:  { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: Colors.primaryLight, fontSize: 12 },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    ...Shadow.sm,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
    ...Shadow.sm,
  },
  aiLabel: {
    color: Colors.primaryLight,
    fontSize: 9,
    fontWeight: Typography.weight.black,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  text: { fontSize: Typography.size.sm, lineHeight: 21 },
  userText: { color: Colors.white },
  aiText: { color: Colors.textSecondary },
  time: { fontSize: 10, marginTop: 2 },
  timeLeft:  { color: Colors.textMuted, alignSelf: 'flex-start' },
  timeRight: { color: 'rgba(255,255,255,0.55)', alignSelf: 'flex-end' },
});

// ─── Conversation sidebar item ────────────────────────────────────────────────
function ConvoItem({
  convo,
  active,
  onPress,
}: {
  convo: AIConversation;
  active: boolean;
  onPress: () => void;
}) {
  const date = new Date(convo.created_at);
  const label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        sidebar.item,
        active && sidebar.itemActive,
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={sidebar.itemLeft}>
        <View style={[sidebar.dot, active && sidebar.dotActive]} />
        <Text style={[sidebar.title, active && sidebar.titleActive]} numberOfLines={1}>
          {convo.title}
        </Text>
      </View>
      <Text style={sidebar.date}>{label}</Text>
    </Pressable>
  );
}

const sidebar = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  itemActive: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border, flexShrink: 0 },
  dotActive: { backgroundColor: Colors.primaryLight },
  title: { color: Colors.textMuted, fontSize: Typography.size.sm, flex: 1 },
  titleActive: { color: Colors.textPrimary, fontWeight: Typography.weight.semibold },
  date: { color: Colors.textMuted, fontSize: 10, flexShrink: 0 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AIAssistantScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [selected, setSelected] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [error, setError] = useState<AIErrorKind | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);

  const loadConversations = useCallback(async () => {
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
  }, []);

  useEffect(() => { void loadConversations(); }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, sending]);

  const selectConversation = async (convo: AIConversation) => {
    setBusy(true);
    setError(null);
    setShowSidebar(false);
    try {
      setSelected(convo);
      setMessages(await getAIMessages(convo.id));
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally { setBusy(false); }
  };

  const createConversation = async () => {
    setBusy(true);
    setError(null);
    setShowSidebar(false);
    try {
      const convo = await createAIConversation('New Conversation');
      setConversations(prev => [convo, ...prev]);
      setSelected(convo);
      setMessages([]);
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally { setBusy(false); }
  };

  const send = async () => {
    if (!selected || sending || !draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);
    setError(null);
    try {
      const updated = await sendAIMessage(selected.id, content);
      setMessages(updated);
    } catch (err) {
      setDraft(content);
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally { setSending(false); }
  };

  const saveRename = async () => {
    if (!selected || !renameDraft.trim()) { setRenaming(false); return; }
    setBusy(true);
    try {
      const updated = await renameAIConversation(selected.id, renameDraft.trim());
      setSelected(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      if (isAuthError(err)) signOut();
    } finally { setBusy(false); setRenaming(false); setRenameDraft(''); }
  };

  const confirmDelete = () => {
    if (!selected || busy) return;
    const doDelete = async () => {
      setBusy(true);
      try {
        await deleteAIConversation(selected.id);
        const remaining = conversations.filter(c => c.id !== selected.id);
        setConversations(remaining);
        setSelected(remaining[0] ?? null);
        setMessages(remaining[0] ? await getAIMessages(remaining[0].id) : []);
        setShowSidebar(false);
      } catch (err) {
        if (isAuthError(err)) signOut();
      } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { void doDelete(); return; }
    Alert.alert('Delete Conversation', 'This will permanently delete this chat.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  // ─── Suggested prompts ──────────────────────────────────────────────────────
  const SUGGESTIONS = [
    'Explain a concept I\'m struggling with',
    'Summarize key points of a topic',
    'Give me a study plan for my exam',
    'Quiz me on a topic',
    'Help me understand this topic better',
  ];

  const hasMsgs = messages.length > 0;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >

          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>

            <View style={styles.topCenter}>
              {renaming ? (
                <TextInput
                  value={renameDraft}
                  onChangeText={setRenameDraft}
                  onSubmitEditing={saveRename}
                  onBlur={() => { setRenaming(false); setRenameDraft(''); }}
                  placeholder="Conversation name…"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.renameInput}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <Pressable
                  onPress={() => { if (selected) { setRenameDraft(selected.title); setRenaming(true); } }}
                  disabled={!selected}
                  hitSlop={8}
                >
                  <Text style={styles.topTitle} numberOfLines={1}>
                    {selected ? selected.title : 'AI Assistant'}
                  </Text>
                  {selected && <Text style={styles.topSubtitle}>Tap title to rename</Text>}
                </Pressable>
              )}
            </View>

            <View style={styles.topRight}>
              {selected && (
                <Pressable
                  onPress={confirmDelete}
                  hitSlop={8}
                  style={({ pressed }) => [styles.topIconBtn, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete conversation"
                >
                  <Text style={styles.topIconDelete}>🗑</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setShowSidebar(v => !v)}
                hitSlop={8}
                style={({ pressed }) => [styles.topIconBtn, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Toggle conversations"
              >
                <Text style={styles.topIconMenu}>☰</Text>
                {conversations.length > 0 && (
                  <View style={styles.convoBadge}>
                    <Text style={styles.convoBadgeText}>{conversations.length}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => void createConversation()}
                hitSlop={8}
                style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel="New conversation"
              >
                <Text style={styles.newBtnText}>+ New</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Conversations sidebar (dropdown) ── */}
          {showSidebar && (
            <View style={styles.sidebarDropdown}>
              <Text style={styles.sidebarLabel}>CONVERSATIONS</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {conversations.length === 0 ? (
                  <Text style={styles.sidebarEmpty}>No conversations yet.</Text>
                ) : (
                  conversations.map(c => (
                    <ConvoItem
                      key={c.id}
                      convo={c}
                      active={selected?.id === c.id}
                      onPress={() => void selectConversation(c)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* ── Error banner ── */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {AI_ERROR_MESSAGES[error]}</Text>
              <Pressable onPress={() => setError(null)} hitSlop={8}>
                <Text style={styles.errorDismiss}>✕</Text>
              </Pressable>
            </View>
          )}

          {/* ── Messages area ── */}
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Colors.primaryLight} size="large" />
              <Text style={styles.centerText}>Loading…</Text>
            </View>
          ) : !selected ? (
            /* ── Empty / welcome ── */
            <View style={styles.welcomeWrap}>
              <View style={styles.welcomeIconWrap}>
                <Text style={styles.welcomeIcon}>✦</Text>
              </View>
              <Text style={styles.welcomeTitle}>Nexora AI Assistant</Text>
              <Text style={styles.welcomeDesc}>
                Your personal AI study companion. Ask anything — concepts, summaries, study plans, or quiz practice.
              </Text>
              <Pressable
                onPress={() => void createConversation()}
                style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.startBtnText}>Start a Conversation</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Welcome message when empty */}
              {!hasMsgs && !sending && (
                <View style={styles.chatWelcome}>
                  <View style={styles.chatWelcomeIcon}>
                    <Text style={{ fontSize: 24 }}>✦</Text>
                  </View>
                  <Text style={styles.chatWelcomeText}>
                    Hi! I'm Nexora AI. Ask me anything about your studies.
                  </Text>
                  {/* Suggestion chips */}
                  <View style={styles.suggestions}>
                    {SUGGESTIONS.map(s => (
                      <Pressable
                        key={s}
                        onPress={() => { setDraft(s); inputRef.current?.focus(); }}
                        style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Messages */}
              {messages.map(m => <MessageBubble key={m.id} message={m} />)}

              {/* Typing indicator */}
              {sending && <TypingDots />}
            </ScrollView>
          )}

          {/* ── Composer ── */}
          {selected && (
            <View style={[styles.composer, { paddingBottom: Math.max(Spacing.md, insets.bottom) }]}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="Message Nexora AI…"
                placeholderTextColor={Colors.textMuted}
                style={styles.composerInput}
                multiline
                editable={!sending && !busy}
                returnKeyType="default"
                maxLength={2000}
              />
              <Pressable
                onPress={() => void send()}
                disabled={sending || !draft.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!draft.trim() || sending) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {sending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.sendBtnIcon}>↑</Text>
                )}
              </Pressable>
            </View>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Home" onNavigate={route => router.push(route as never)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backIcon: {
    color: Colors.primaryLight,
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  topCenter: { flex: 1, minWidth: 0 },
  topTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  topSubtitle: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  renameInput: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary + '60',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  topIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  topIconMenu: { fontSize: 18, color: Colors.textSecondary },
  topIconDelete: { fontSize: 15 },
  convoBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoBadgeText: { color: Colors.white, fontSize: 9, fontWeight: Typography.weight.bold },
  newBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  newBtnText: { color: Colors.white, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // Sidebar dropdown
  sidebarDropdown: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  sidebarLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  sidebarEmpty: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorMuted,
    borderBottomWidth: 1,
    borderBottomColor: Colors.error + '40',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  errorText: { flex: 1, color: '#FCA5A5', fontSize: Typography.size.xs, lineHeight: 18 },
  errorDismiss: { color: Colors.error, fontSize: 12, fontWeight: Typography.weight.bold },

  // States
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  centerText: { color: Colors.textMuted, fontSize: Typography.size.sm },

  // Welcome
  welcomeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  welcomeIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2,
    borderColor: Colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  welcomeIcon: { fontSize: 28, color: Colors.primaryLight },
  welcomeTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.black,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeDesc: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  startBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  startBtnText: { color: Colors.white, fontWeight: Typography.weight.bold, fontSize: Typography.size.base },

  // Messages
  messagesContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },

  // Chat welcome (first message state)
  chatWelcome: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  chatWelcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  chatWelcomeText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestions: {
    gap: Spacing.sm,
    width: '100%',
  },
  suggestionChip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  suggestionText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 19,
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Shadow.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.surfacePressed, ...Shadow.sm },
  sendBtnIcon: { color: Colors.white, fontSize: 20, fontWeight: Typography.weight.bold },
});
