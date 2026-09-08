// ─── AIAnswerCard ─────────────────────────────────────────────────────────────
// Renders AI Q&A responses with:
//   • Inline markdown parser (headings, bold, bullets, code, dividers)
//   • Read Aloud button (expo-speech)
//   • Copy to clipboard button
//   • Skeleton loading state
//   • Rate-limit and generic error states

import React, { useState, useCallback } from 'react';
import {
  Clipboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIAnswerCardProps {
  question: string;
  answer: string | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

// ─── Markdown Parser ──────────────────────────────────────────────────────────
// Converts markdown text into a list of typed tokens for rendering.

type Token =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'bullet'; parts: InlinePart[] }
  | { type: 'numbered'; index: number; parts: InlinePart[] }
  | { type: 'code_block'; lang: string; text: string }
  | { type: 'divider' }
  | { type: 'blank' }
  | { type: 'paragraph'; parts: InlinePart[] };

type InlinePart =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string };

function parseInline(raw: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Patterns: **bold**, *italic*, `code`
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(raw)) !== null) {
    if (m.index > last) {
      parts.push({ kind: 'text', value: raw.slice(last, m.index) });
    }
    if (m[2] !== undefined) {
      parts.push({ kind: 'bold', value: m[2] });
    } else if (m[3] !== undefined) {
      parts.push({ kind: 'italic', value: m[3] });
    } else if (m[4] !== undefined) {
      parts.push({ kind: 'code', value: m[4] });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push({ kind: 'text', value: raw.slice(last) });
  return parts;
}

function tokenize(markdown: string): Token[] {
  const lines = markdown.split('\n');
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({ type: 'code_block', lang, text: codeLines.join('\n') });
      i++;
      continue;
    }

    // Headings
    if (/^###\s/.test(line)) {
      tokens.push({ type: 'h3', text: line.slice(4).trim() });
      i++; continue;
    }
    if (/^##\s/.test(line)) {
      tokens.push({ type: 'h2', text: line.slice(3).trim() });
      i++; continue;
    }
    if (/^#\s/.test(line)) {
      tokens.push({ type: 'h1', text: line.slice(2).trim() });
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      tokens.push({ type: 'divider' });
      i++; continue;
    }

    // Bullets
    if (/^[\*\-\+]\s/.test(line)) {
      tokens.push({ type: 'bullet', parts: parseInline(line.slice(2).trim()) });
      i++; continue;
    }

    // Numbered list
    const numMatch = /^(\d+)\.\s(.+)/.exec(line);
    if (numMatch) {
      tokens.push({ type: 'numbered', index: parseInt(numMatch[1], 10), parts: parseInline(numMatch[2].trim()) });
      i++; continue;
    }

    // Blank line
    if (line.trim() === '') {
      tokens.push({ type: 'blank' });
      i++; continue;
    }

    // Paragraph
    tokens.push({ type: 'paragraph', parts: parseInline(line) });
    i++;
  }

  return tokens;
}

// ─── Inline Renderer ──────────────────────────────────────────────────────────
function InlineText({ parts }: { parts: InlinePart[] }) {
  return (
    <Text>
      {parts.map((p, i) => {
        if (p.kind === 'bold')   return <Text key={i} style={md.bold}>{p.value}</Text>;
        if (p.kind === 'italic') return <Text key={i} style={md.italic}>{p.value}</Text>;
        if (p.kind === 'code')   return <Text key={i} style={md.inlineCode}>{p.value}</Text>;
        return <Text key={i} style={md.plain}>{p.value}</Text>;
      })}
    </Text>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function MarkdownContent({ text }: { text: string }) {
  const tokens = tokenize(text);

  return (
    <View style={{ gap: 2 }}>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'h1':
            return (
              <Text key={i} style={md.h1}>{token.text}</Text>
            );
          case 'h2':
            return (
              <View key={i} style={md.h2Wrap}>
                <Text style={md.h2}>{token.text}</Text>
                <View style={md.h2Line} />
              </View>
            );
          case 'h3':
            return (
              <Text key={i} style={md.h3}>{token.text}</Text>
            );
          case 'bullet':
            return (
              <View key={i} style={md.bulletRow}>
                <View style={md.bulletDot} />
                <Text style={md.bulletText}>
                  <InlineText parts={token.parts} />
                </Text>
              </View>
            );
          case 'numbered':
            return (
              <View key={i} style={md.bulletRow}>
                <Text style={md.numIndex}>{token.index}.</Text>
                <Text style={md.bulletText}>
                  <InlineText parts={token.parts} />
                </Text>
              </View>
            );
          case 'code_block':
            return (
              <View key={i} style={md.codeBlock}>
                {token.lang !== '' && (
                  <View style={md.codeLangBar}>
                    <Text style={md.codeLang}>{token.lang}</Text>
                  </View>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={md.codeText} selectable>{token.text}</Text>
                </ScrollView>
              </View>
            );
          case 'divider':
            return <View key={i} style={md.divider} />;
          case 'blank':
            return <View key={i} style={{ height: Spacing.sm }} />;
          case 'paragraph':
            return (
              <Text key={i} style={md.paragraph}>
                <InlineText parts={token.parts} />
              </Text>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

const md = StyleSheet.create({
  h1: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.black,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  h2Wrap: { marginTop: Spacing.md, marginBottom: Spacing.xs, gap: 4 },
  h2: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  h2Line: { height: 1, backgroundColor: Colors.border },
  h3: {
    color: Colors.primaryLight,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.sm,
  },
  plain: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    lineHeight: 24,
  },
  bold: {
    color: Colors.textPrimary,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.base,
  },
  italic: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontSize: Typography.size.base,
  },
  inlineCode: {
    color: Colors.warning,
    fontFamily: 'monospace' as any,
    fontSize: Typography.size.sm,
    backgroundColor: Colors.surfacePressed,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  paragraph: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
    marginVertical: 2,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
    marginTop: 9,
  },
  numIndex: {
    color: Colors.primaryLight,
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
    marginTop: 4,
    minWidth: 20,
  },
  bulletText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    lineHeight: 24,
    flex: 1,
  },
  codeBlock: {
    backgroundColor: '#0D1117',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  codeLangBar: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  codeLang: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontFamily: 'monospace' as any,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    color: '#E6EDF3',
    fontFamily: 'monospace' as any,
    fontSize: Typography.size.sm,
    lineHeight: 22,
    padding: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});

// ─── Strip markdown for TTS ───────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[\*\-\+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/[-*_]{3,}/g, '')
    .trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AIAnswerCard({
  question,
  answer,
  loading,
  error,
  onDismiss,
  onRetry,
}: AIAnswerCardProps) {
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!loading && !error && !answer) return null;

  const handleReadAloud = useCallback(async () => {
    if (!answer) return;
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(stripMarkdown(answer), {
      language: 'en',
      rate: 0.92,
      pitch: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [answer, speaking]);

  const handleCopy = useCallback(() => {
    if (!answer) return;
    Clipboard.setString(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [answer]);

  return (
    <View style={styles.card}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>AI Answer</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Action buttons — only when answer is ready */}
          {!loading && answer && (
            <>
              {/* Read Aloud */}
              <Pressable
                onPress={handleReadAloud}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={speaking ? 'Stop reading' : 'Read aloud'}
                style={({ pressed }) => [
                  styles.actionBtn,
                  speaking && styles.actionBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.actionBtnIcon, speaking && styles.actionBtnIconActive]}>
                  {speaking ? '■' : '▶'}
                </Text>
                <Text style={[styles.actionBtnLabel, speaking && styles.actionBtnIconActive]}>
                  {speaking ? 'Stop' : 'Read'}
                </Text>
              </Pressable>

              {/* Copy */}
              <Pressable
                onPress={handleCopy}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Copy answer"
                style={({ pressed }) => [
                  styles.actionBtn,
                  copied && styles.actionBtnCopied,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.actionBtnIcon, copied && styles.actionBtnIconCopied]}>
                  {copied ? '✓' : '⧉'}
                </Text>
                <Text style={[styles.actionBtnLabel, copied && styles.actionBtnIconCopied]}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </>
          )}

          {/* Dismiss */}
          {onDismiss && !loading && (
            <Pressable
              onPress={onDismiss}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss answer"
              style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.dismissIcon}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Question bubble ── */}
      <View style={styles.questionBubble}>
        <Text style={styles.questionLabel}>YOUR QUESTION</Text>
        <Text style={styles.questionText}>{question}</Text>
      </View>

      {/* ── Loading state ── */}
      {loading && (
        <View style={styles.loadingWrap}>
          <View style={styles.loadingHeader}>
            <View style={styles.loadingDot} />
            <Text style={styles.loadingText}>AI is thinking…</Text>
          </View>
          <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
            <SkeletonLine width="95%" height={13} />
            <SkeletonLine width="82%" height={13} />
            <SkeletonLine width="90%" height={13} />
            <SkeletonLine width="70%" height={13} />
            <SkeletonLine width="85%" height={13} />
          </View>
        </View>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <View style={styles.errorWrap}>
          {error === 'rate_limit' ? (
            <AIRateLimitBanner />
          ) : (
            <Message tone="error">{AI_ERROR_MESSAGES[error]}</Message>
          )}
          {onRetry && error !== 'rate_limit' && (
            <Button label="Retry" onPress={onRetry} variant="ghost" size="sm" />
          )}
        </View>
      )}

      {/* ── Success state ── */}
      {!loading && !error && answer && (
        <>
          {/* Answer label bar */}
          <View style={styles.answerLabelRow}>
            <View style={styles.answerLabelLine} />
            <Text style={styles.answerLabel}>ANSWER</Text>
            <View style={styles.answerLabelLine} />
          </View>

          {/* Parsed markdown content */}
          <MarkdownContent text={answer} />

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerBadge}>
              <Text style={styles.footerBadgeText}>✦ AI-generated</Text>
            </View>
            <Text style={styles.footerNote}>Not saved · Review before using</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '35',
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  badgeIcon: { color: Colors.primaryLight, fontSize: 11 },
  badgeText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  // Action buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnActive: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary + '60',
  },
  actionBtnCopied: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success + '60',
  },
  actionBtnIcon: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
  },
  actionBtnIconActive: {
    color: Colors.primaryLight,
  },
  actionBtnIconCopied: {
    color: Colors.success,
  },
  actionBtnLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },

  // Dismiss
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
  },

  // Question bubble
  questionBubble: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryLight,
    gap: 4,
  },
  questionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1.5,
  },
  questionText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },

  // Loading
  loadingWrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },
  loadingText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },

  // Error
  errorWrap: { gap: Spacing.sm },

  // Answer section
  answerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  answerLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  answerLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 2,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
  },
  footerBadge: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  footerBadgeText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  footerNote: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontStyle: 'italic',
  },
});
