import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function AuthScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Background glow */}
      <View style={styles.glowTop} />

      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoN}>N</Text>
          </View>
          <Text style={styles.logoName}>nexora</Text>
          <Text style={styles.tagline}>Welcome</Text>
          <Text style={styles.subtitle}>
            Sign in or create your account{'\n'}to start your learning journey.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {['Subjects', 'Notes', 'Quizzes', 'Planning'].map((f) => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Auth buttons */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel="Log in to your account"
          >
            <Text style={styles.loginBtnText}>Log In</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}
            onPress={() => router.push('/register')}
            accessibilityRole="button"
            accessibilityLabel="Create a new account"
          >
            <Text style={styles.registerBtnText}>Create Account</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to Nexora's{'\n'}Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  glowTop: {
    position: 'absolute',
    top: -60,
    left: '50%',
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primary + '14',
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    paddingBottom: Spacing['2xl'],
    justifyContent: 'flex-end',
    gap: Spacing['2xl'],
  },

  brand: { alignItems: 'center', gap: Spacing.md },
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoN: { color: Colors.white, fontSize: 30, fontWeight: Typography.weight.black },
  logoName: {
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.textPrimary,
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 24,
  },

  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  actions: { gap: Spacing.md },
  loginBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: Colors.white, fontSize: Typography.size.md, fontWeight: Typography.weight.black },
  registerBtn: {
    height: 56,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: { color: Colors.primaryLight, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  pressed: { opacity: 0.78, transform: [{ scale: 0.975 }] },

  terms: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
