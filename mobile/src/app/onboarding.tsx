import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'nexora.onboarding_done';

const SLIDES = [
  {
    key: '1',
    icon: '▤',
    iconColor: '#6366F1',
    title: 'Organize everything\nyou learn',
    body: 'Subjects, notes, and study materials\nall in one focused workspace.',
    accent: '#6366F1',
  },
  {
    key: '2',
    icon: '◷',
    iconColor: '#8B5CF6',
    title: 'Plan your\nstudy time',
    body: 'Turn your academic goals into\nmanageable, focused sessions.',
    accent: '#8B5CF6',
  },
  {
    key: '3',
    icon: '✦',
    iconColor: '#14B8A6',
    title: 'Track your\nprogress',
    body: 'See how your study habits and\nquiz performance improve over time.',
    accent: '#14B8A6',
  },
] as const;

async function markOnboardingDone() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(ONBOARDING_KEY, 'true');
    return;
  }
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch {}
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToSlide = (index: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      setCurrent(index);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      goToSlide(current + 1);
    } else {
      finish();
    }
  };

  const skip = () => finish();

  const finish = async () => {
    await markOnboardingDone();
    router.replace('/auth');
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Background glow that changes color per slide */}
      <View style={[styles.glow, { backgroundColor: slide.accent + '15' }]} />

      {/* Skip button */}
      {!isLast && (
        <Pressable style={styles.skipBtn} onPress={skip} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slide content */}
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        {/* Icon illustration */}
        <View style={[styles.iconWrap, { backgroundColor: slide.accent + '20', borderColor: slide.accent + '40' }]}>
          <Text style={[styles.icon, { color: slide.accent }]}>{slide.icon}</Text>
          {/* Decorative rings */}
          <View style={[styles.ring1, { borderColor: slide.accent + '20' }]} />
          <View style={[styles.ring2, { borderColor: slide.accent + '12' }]} />
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>
      </Animated.View>

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => goToSlide(i)}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${i + 1}`}
              hitSlop={8}
            >
              <View
                style={[
                  styles.dot,
                  i === current && [styles.dotActive, { backgroundColor: slide.accent }],
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Next / Get Started button */}
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: slide.accent },
            pressed && styles.pressed,
          ]}
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
        >
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          {!isLast && <Text style={styles.nextArrow}>→</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },

  skipBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing.xl,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  skipText: { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    gap: Spacing['3xl'],
  },

  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: { fontSize: 52 },
  ring1: { position: 'absolute', width: 175, height: 175, borderRadius: 87.5, borderWidth: 1 },
  ring2: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1 },

  textBlock: { alignItems: 'center', gap: Spacing.md },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    textAlign: 'center',
    letterSpacing: Typography.tracking.tight,
    lineHeight: 36,
  },
  body: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 24,
  },

  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.xl,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { width: 24, borderRadius: 4 },

  nextBtn: {
    height: 56,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  nextText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.black },
  nextArrow: { color: Colors.white, fontSize: Typography.size.lg },
  pressed: { opacity: 0.78, transform: [{ scale: 0.975 }] },
});
