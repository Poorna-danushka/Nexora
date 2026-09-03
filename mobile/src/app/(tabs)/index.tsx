import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WelcomeCard from '@/components/WelcomeCard';
import { clearAccessToken } from '@/services/authStorage';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WelcomeCard
          title="Nexora"
          subtitle="AI-Powered Student Learning & Productivity Platform"
        />

        <Pressable
          style={({ pressed }) => [styles.registerButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.registerButtonText}>Get Started — Create Account →</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Already have an account? Log in</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/profile')}>
          <Text style={styles.loginButtonText}>View my profile</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/subjects')}>
          <Text style={styles.loginButtonText}>Manage subjects</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/notes')}>
          <Text style={styles.loginButtonText}>Manage notes</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/materials')}>
          <Text style={styles.loginButtonText}>Study materials</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/planning')}>
          <Text style={styles.loginButtonText}>Study planning</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/calendar')}>
          <Text style={styles.loginButtonText}>Calendar & reminders</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/quizzes')}>
          <Text style={styles.loginButtonText}>Practice quizzes</Text>
        </Pressable>
        <Pressable onPress={() => clearAccessToken()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  { icon: '📚', title: 'Subject & Note Management', desc: 'Organize subjects, create rich notes, and upload study materials per course.' },
  { icon: '🤖', title: 'AI Study Assistant', desc: 'Get step-by-step explanations, instant summaries, and custom AI study plans.' },
  { icon: '📅', title: 'Study Planner & Goals', desc: 'Schedule study sessions, track academic goals, and build consistent habits.' },
  { icon: '🎯', title: 'Quizzes & Performance', desc: 'Generate practice quizzes, review incorrect answers, and track subject mastery.' },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0c1b',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 28,
  },
  registerButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.4)',
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginButton: {
    paddingVertical: 8,
  },
  loginButtonText: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutText: {
    color: '#64748b',
    fontSize: 13,
  },
  featuresGrid: {
    width: '100%',
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#15172e',
    borderWidth: 1,
    borderColor: '#26294d',
    borderRadius: 14,
    padding: 20,
    gap: 8,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  featureDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
