import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

// Decorative floating card data
const FLOAT_CARDS = [
  { label: 'Database Systems', sub: '72% complete', color: '#6366F1', x: -20, y: 0, rotate: '-8deg' },
  { label: 'Binary Search', sub: 'Note • 2h ago', color: '#8B5CF6', x: width - 180, y: 60, rotate: '6deg' },
  { label: 'Quiz Results', sub: '9/10 · 90%', color: '#14B8A6', x: 20, y: 120, rotate: '5deg' },
  { label: 'Study Session', sub: 'Tomorrow 10 AM', color: '#F59E0B', x: width - 190, y: 180, rotate: '-4deg' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const cardAnims = FLOAT_CARDS.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    // Main content fade in
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    // Staggered card appearances
    cardAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 300 + i * 150,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  }, []);

  // Gentle float animation
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -8, duration: 2000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(floatY, { toValue: 0, duration: 2000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [floatY]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Background subtle radial glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Floating preview cards */}
      <View style={[styles.floatingCards, styles.nonInteractive]}>
        {FLOAT_CARDS.map((card, i) => (
          <Animated.View
            key={i}
            style={[
              styles.floatCard,
              {
                left: card.x,
                top: card.y,
                transform: [
                  { translateY: floatY },
                  { rotate: card.rotate },
                ],
                opacity: cardAnims[i],
              },
            ]}
          >
            <View style={[styles.floatDot, { backgroundColor: card.color }]} />
            <View>
              <Text style={styles.floatCardLabel}>{card.label}</Text>
              <Text style={styles.floatCardSub}>{card.sub}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Main content */}
      <Animated.View
        style={[styles.content, { opacity: fade, transform: [{ translateY: slideUp }] }]}
      >
        {/* Logo mark */}
        <View style={styles.logoMark}>
          <Text style={styles.logoN}>N</Text>
        </View>
        <Text style={styles.logoText}>nexora</Text>

        {/* Hero copy */}
        <View style={styles.hero}>
          <Text style={styles.headline}>Your study life,{'\n'}organized.</Text>
          <Text style={styles.subtext}>
            Learn, plan, practice, and make{'\n'}progress — all in one place.
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.push('/onboarding')}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => router.push('/auth')}
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </Pressable>
        </View>

        {/* Footer tagline */}
        <View style={styles.taglineRow}>
          <View style={styles.taglineDot} />
          <Text style={styles.taglineText}>Learn</Text>
          <View style={styles.taglineDot} />
          <Text style={styles.taglineText}>Plan</Text>
          <View style={styles.taglineDot} />
          <Text style={styles.taglineText}>Practice</Text>
          <View style={styles.taglineDot} />
          <Text style={styles.taglineText}>Progress</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  glowTop: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.primary + '18',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primaryLight + '10',
  },

  floatingCards: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 300,
  },
  nonInteractive: {
    pointerEvents: 'none',
  },
  floatCard: {
    position: 'absolute',
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: 160,
  },
  floatDot: { width: 8, height: 8, borderRadius: 4 },
  floatCardLabel: { color: Colors.textPrimary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  floatCardSub: { color: Colors.textMuted, fontSize: 10 },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.38,
    paddingBottom: Spacing['2xl'],
    justifyContent: 'flex-end',
    gap: Spacing['2xl'],
  },

  logoMark: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  logoN: { color: Colors.white, fontSize: 24, fontWeight: Typography.weight.black },
  logoText: {
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: 1,
    marginTop: -Spacing.base,
  },

  hero: { gap: Spacing.md },
  headline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    lineHeight: 42,
  },
  subtext: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    lineHeight: 24,
  },

  actions: { gap: Spacing.md },
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.black },
  arrowIcon: { color: Colors.white, fontSize: Typography.size.lg, marginTop: 1 },
  secondaryBtn: {
    height: 52,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold },
  pressed: { opacity: 0.78, transform: [{ scale: 0.975 }] },

  taglineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  taglineDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted },
  taglineText: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium, letterSpacing: 0.5 },
});
