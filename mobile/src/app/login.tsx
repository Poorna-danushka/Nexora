import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginUser } from '@/services/api/userApi';
import { saveAccessToken } from '@/services/authStorage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await loginUser({ email: email.trim(), password });
      await saveAccessToken(response.access_token);
      router.replace('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid email or password.');
      } else if (axios.isAxiosError(err) && err.request) {
        setError('Unable to connect to the server. Make sure FastAPI is running.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.appName}>Nexora</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue your learning journey.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="student@university.edu"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={submit}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>{isSubmitting ? 'Signing in...' : 'Sign In'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/register')}>
          <Text style={styles.link}>Need an account? Create one</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0c1b' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  appName: { color: '#f8fafc', fontSize: 34, fontWeight: '800', textAlign: 'center' },
  title: { color: '#cbd5e1', fontSize: 24, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  errorBox: { backgroundColor: '#451a03', borderColor: '#d97706', borderWidth: 1, padding: 14, borderRadius: 8 },
  errorText: { color: '#fbbf24', textAlign: 'center' },
  form: { backgroundColor: '#15172e', padding: 24, borderRadius: 16, gap: 12 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: '#0b0c1b', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 12, color: '#fff' },
  button: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#a5b4fc', textAlign: 'center', fontWeight: '600' },
});
