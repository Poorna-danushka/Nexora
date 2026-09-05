// ─── Nexora UI Component Library ─────────────────────────────────────────────
// All reusable primitive UI components for the Nexora mobile app.
// Import from '@/components/ui' throughout the app.

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

// ─── Re-export colors for backwards compatibility ─────────────────────────────
export const colors = {
  bg:           Colors.bg,
  surface:      Colors.surface,
  surfaceRaised:Colors.surfaceAlt,
  border:       Colors.border,
  text:         Colors.textPrimary,
  muted:        Colors.textMuted,
  primary:      Colors.primary,
  primaryBright:Colors.primaryLight,
  success:      Colors.success,
  danger:       Colors.error,
  warning:      Colors.warning,
};

// ─── Screen Container ─────────────────────────────────────────────────────────
export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const content = <View style={[styles.content, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

// ─── Keyboard Aware Screen ────────────────────────────────────────────────────
export function KeyboardScreen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── App Header ───────────────────────────────────────────────────────────────
export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        )}
        {right && <View style={styles.headerRight}>{right}</View>}
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Screen Title Header (compact, for list screens) ─────────────────────────
export function ScreenHeader({
  title,
  onBack,
  action,
  onAction,
}: {
  title: string;
  onBack?: () => void;
  action?: React.ReactNode;
  onAction?: () => void;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        )}
        <Text style={styles.screenHeaderTitle}>{title}</Text>
      </View>
      {action && <View>{action}</View>}
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  noPadding,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
}) {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, noPadding && { padding: 0 }, style, pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, noPadding && { padding: 0 }, style]}>{children}</View>;
}

// ─── Surface (lighter weight than Card) ───────────────────────────────────────
export function Surface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

// ─── Button ───────────────────────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}) {
  const variantStyle = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    ghost: styles.btnGhost,
    danger: styles.btnDanger,
  }[variant];

  const textStyle = {
    primary: styles.btnTextPrimary,
    secondary: styles.btnTextSecondary,
    ghost: styles.btnTextGhost,
    danger: styles.btnTextDanger,
  }[variant];

  const sizeStyle = {
    sm: styles.btnSm,
    md: styles.btnMd,
    lg: styles.btnLg,
  }[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variantStyle,
        sizeStyle,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primaryLight} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          {icon && icon}
          <Text style={[styles.btnText, textStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'ghost' | 'filled';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        variant === 'filled' && styles.iconBtnFilled,
        pressed && styles.btnPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ─── Field / Input ────────────────────────────────────────────────────────────
export function Field({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label?: string; error?: string; hint?: string }) {
  return (
    <View style={styles.field}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={Colors.textMuted}
        style={[
          styles.input,
          props.multiline && styles.inputMultiline,
          error && styles.inputError,
          props.style as any,
        ]}
      />
      {hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Password Field (with show/hide toggle) ───────────────────────────────────
export function PasswordField({
  label,
  error,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  error?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel={label}
          style={[styles.input, styles.passwordInput, error && styles.inputError]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eyeBtn}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Text style={styles.eyeIcon}>{visible ? '◎' : '○'}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────
export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  return (
    <View style={styles.searchRow}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear || (() => onChangeText(''))} hitSlop={8}>
          <Text style={styles.searchClear}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && [styles.chipActive, color ? { backgroundColor: color + '22', borderColor: color } : {}]]}
    >
      <Text style={[styles.chipText, active && [styles.chipTextActive, color ? { color } : {}]]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({
  label,
  color = Colors.primary,
  textColor = Colors.textPrimary,
}: {
  label: string;
  color?: string;
  textColor?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 44,
  color = Colors.primary,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '30',
          borderColor: color + '60',
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38, color }]}>{initials}</Text>
    </View>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({
  progress,
  color = Colors.primary,
  height = 6,
  style,
}: {
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  return (
    <View style={[styles.progressTrack, { height }, style]}>
      <View
        style={[
          styles.progressFill,
          { width: `${clampedProgress}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({
  value,
  label,
  color = Colors.primaryLight,
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Message Banner ───────────────────────────────────────────────────────────
export function Message({
  children,
  tone = 'error',
}: {
  children: React.ReactNode;
  tone?: 'error' | 'success' | 'warning' | 'info';
}) {
  const toneStyles = {
    error:   { bg: Colors.errorMuted,   border: Colors.error + '60',   text: '#FCA5A5' },
    success: { bg: Colors.successMuted, border: Colors.success + '60', text: '#86EFAC' },
    warning: { bg: Colors.warningMuted, border: Colors.warning + '60', text: '#FCD34D' },
    info:    { bg: Colors.infoMuted,    border: Colors.info + '60',    text: '#7DD3FC' },
  }[tone];

  return (
    <View style={[styles.message, { backgroundColor: toneStyles.bg, borderColor: toneStyles.border }]}>
      <Text style={[styles.messageText, { color: toneStyles.text }]}>{children}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  text,
  action,
  onAction,
  icon = '◈',
}: {
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
  icon?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text && <Text style={styles.emptyText}>{text}</Text>}
      {action && onAction && (
        <Button label={action} onPress={onAction} variant="secondary" size="sm" />
      )}
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
export function ErrorState({
  title = "Something went wrong",
  text,
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: Colors.errorMuted }]}>
        <Text style={[styles.emptyIcon, { color: Colors.error }]}>!</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text && <Text style={styles.emptyText}>{text}</Text>}
      {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" />}
    </View>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={Colors.primaryLight} size="large" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
export function SkeletonLine({
  width = '100%',
  height = 16,
  style,
}: {
  width?: string | number;
  height?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonLine width="60%" height={18} />
      <SkeletonLine width="40%" height={13} />
      <SkeletonLine width="100%" height={8} style={{ borderRadius: Radius.full }} />
    </View>
  );
}

// ─── Segmented Control ────────────────────────────────────────────────────────
export function SegmentedControl({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (opt: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === opt }}
          style={[styles.segmentItem, selected === opt && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, selected === opt && styles.segmentTextActive]}>
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Home',     route: '/',         icon: '⌂',  iconActive: '⌂'  },
  { label: 'Subjects', route: '/subjects',  icon: '▤',  iconActive: '▤'  },
  { label: 'Planner',  route: '/planning',  icon: '◷',  iconActive: '◷'  },
  { label: 'Notes',    route: '/notes',     icon: '✎',  iconActive: '✎'  },
  { label: 'Profile',  route: '/profile',   icon: '◉',  iconActive: '◉'  },
] as const;

export function BottomNav({
  active = 'Home',
  onNavigate,
}: {
  active?: string;
  onNavigate: (route: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { bottom: Math.max(Spacing.base, insets.bottom + Spacing.xs) }]}>
      {NAV_ITEMS.map(({ label, route, icon, iconActive }) => {
        const isActive = active === label;
        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`Open ${label}`}
            accessibilityState={{ selected: isActive }}
            style={styles.navItem}
            onPress={() => onNavigate(route)}
          >
            {isActive && <View style={styles.navIndicator} />}
            <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
              {isActive ? iconActive : icon}
            </Text>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Screen
  safe:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { paddingBottom: 120 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },

  // Header
  header:         { gap: Spacing.xs },
  headerTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backIcon:       { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  backLabel:      { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  headerTitle:    { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight, lineHeight: 36 },
  headerSubtitle: { color: Colors.textMuted, fontSize: Typography.size.base, lineHeight: 22 },

  // Screen header (compact)
  screenHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  screenHeaderTitle: { color: Colors.textPrimary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

  // Surface
  surface: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.base },

  // Button
  btn:            { minHeight: 52, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  btnPrimary:     { backgroundColor: Colors.primary },
  btnSecondary:   { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  btnGhost:       { backgroundColor: Colors.transparent },
  btnDanger:      { backgroundColor: Colors.errorMuted, borderWidth: 1, borderColor: Colors.error + '40' },
  btnSm:          { minHeight: 38, borderRadius: Radius.md, paddingHorizontal: Spacing.base },
  btnMd:          { minHeight: 52 },
  btnLg:          { minHeight: 58, borderRadius: Radius.xl },
  btnDisabled:    { opacity: 0.45 },
  btnPressed:     { opacity: 0.82, transform: [{ scale: 0.975 }] },
  btnText:        { fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  btnTextPrimary: { color: Colors.white },
  btnTextSecondary:{ color: Colors.primaryLight },
  btnTextGhost:   { color: Colors.textSecondary },
  btnTextDanger:  { color: '#FCA5A5' },

  // Icon button
  iconBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  iconBtnFilled: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },

  // Field
  field:         { gap: Spacing.xs },
  fieldLabel:    { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  fieldHint:     { color: Colors.textMuted, fontSize: Typography.size.xs },
  fieldError:    { color: Colors.error, fontSize: Typography.size.xs },
  input: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    minHeight: 52,
  },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top', paddingTop: Spacing.md },
  inputError:    { borderColor: Colors.error },

  // Password field
  passwordRow:   { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn:        { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 32 },
  eyeIcon:       { color: Colors.textMuted, fontSize: 17 },

  // Search
  searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, gap: Spacing.sm },
  searchIcon:   { color: Colors.textMuted, fontSize: 18 },
  searchInput:  { flex: 1, color: Colors.textPrimary, fontSize: Typography.size.base, paddingVertical: Spacing.md },
  searchClear:  { color: Colors.textMuted, fontSize: Typography.size.sm },

  // Chip
  chip:          { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.primarySubtle, borderColor: Colors.primaryLight + '60' },
  chipText:      { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  chipTextActive:{ color: Colors.primaryLight, fontWeight: Typography.weight.semibold },

  // Badge
  badge:     { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },

  // Avatar
  avatar:     { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontWeight: Typography.weight.bold },

  // Progress
  progressTrack: { backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden', width: '100%' },
  progressFill:  { borderRadius: Radius.full },

  // Stat card
  statCard:  { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  statLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center' },

  // Section header
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  sectionAction: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // Divider
  divider: { height: 1, backgroundColor: Colors.border },

  // Message
  message:     { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.base },
  messageText: { fontSize: Typography.size.sm, lineHeight: 20 },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.base },
  emptyIconWrap:{ width: 56, height: 56, borderRadius: Radius.xl, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  emptyIcon:    { color: Colors.primaryLight, fontSize: 24 },
  emptyTitle:   { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, textAlign: 'center' },
  emptyText:    { color: Colors.textMuted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.xl },

  // Loading
  loadingState: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing['3xl'] },
  loadingLabel: { color: Colors.textMuted, fontSize: Typography.size.sm },

  // Skeleton
  skeleton:     { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm },
  skeletonCard: { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md },

  // Segmented control
  segmented:          { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 4, gap: 4 },
  segmentItem:        { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  segmentActive:      { backgroundColor: Colors.surfaceElevated },
  segmentText:        { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  segmentTextActive:  { color: Colors.textPrimary },

  // Bottom nav
  nav: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    bottom: Spacing.base,
    height: 70,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    ...Shadow.lg,
  },
  navItem:        { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 52, gap: 3, position: 'relative' },
  navIndicator:   { position: 'absolute', top: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primaryLight },
  navIcon:        { fontSize: 20, color: Colors.textMuted },
  navIconActive:  { color: Colors.primaryLight },
  navLabel:       { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.textMuted },
  navLabelActive: { color: Colors.primaryLight },
});

export const uiStyles = styles;
