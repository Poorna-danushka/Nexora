import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser } from '@/services/api/userApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button, Field, Message, PasswordField } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await loginUser({ email: email.trim(), password });
      await signIn(response.access_token);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError('Please enter a valid email address.');
      } else if (axios.isAxiosError(err) && err.request) {
        setError('Unable to connect. Make sure the server is running.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.logoMark}>
              <Text style={styles.logoN}>N</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Continue your learning journey.</Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {error && <Message tone="error">{error}</Message>}

            <Field
              label="Email address"
              placeholder="student@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />

            <PasswordField
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
            />

            <Button
              label={isSubmitting ? 'Signing in…' : 'Sign In'}
              onPress={submit}
              loading={isSubmitting}
              variant="primary"
              size="lg"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/register' as any)} accessibilityRole="link">
              <Text style={styles.footerLink}>Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  backLabel: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  headerBlock: { gap: Spacing.md, paddingTop: Spacing.md },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoN: { color: Colors.white, fontSize: 24, fontWeight: Typography.weight.black },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  subtitle: { color: Colors.textMuted, fontSize: Typography.size.base, lineHeight: 22 },

  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: Colors.textMuted, fontSize: Typography.size.sm },
  footerLink: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
});
