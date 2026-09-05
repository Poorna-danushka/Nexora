import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUser, updateCurrentUser } from '@/services/api/userApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Avatar, BottomNav, Button, Field, Message, SkeletonCard } from '@/components/ui';

type UserData = {
  full_name: string;
  email: string;
  university: string;
  degree: string;
  graduation_year: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [userData, setUserData] = useState<UserData>({
    full_name: '',
    email: '',
    university: '',
    degree: '',
    graduation_year: '',
  });
  const [form, setForm] = useState<UserData>({ ...userData });

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        const data: UserData = {
          full_name: u.full_name,
          email: u.email,
          university: u.university ?? '',
          degree: u.degree ?? '',
          graduation_year: u.graduation_year?.toString() ?? '',
        };
        setUserData(data);
        setForm(data);
      })
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          signOut();
        } else {
          setMessage({ text: 'Unable to load your profile.', tone: 'error' });
        }
      })
      .finally(() => setLoading(false));
  }, [router, signOut]);

  const save = async () => {
    if (!form.full_name.trim()) {
      setMessage({ text: 'Full name is required.', tone: 'error' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateCurrentUser({
        full_name: form.full_name.trim(),
        university: form.university.trim() || undefined,
        degree: form.degree.trim() || undefined,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
      });
      setUserData(form);
      setEditing(false);
      setMessage({ text: 'Profile updated successfully.', tone: 'success' });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        signOut();
      } else {
        setMessage({ text: 'Unable to update your profile. Please try again.', tone: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm(userData);
    setEditing(false);
    setMessage(null);
  };

  const signOutHandler = () => {
    if (Platform.OS === 'web') {
      void signOut();
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => { void signOut(); },
      },
    ]);
  };

  const initials = userData.full_name;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
              {!loading && !editing && (
                <Pressable
                  onPress={() => { setEditing(true); setMessage(null); }}
                  style={styles.editBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              )}
            </View>

            {/* Avatar section */}
            {loading ? (
              <View style={styles.avatarSection}>
                <View style={styles.avatarSkeletonCircle} />
                <View style={{ gap: Spacing.sm, alignItems: 'center' }}>
                  <View style={[styles.skeletonLine, { width: 140 }]} />
                  <View style={[styles.skeletonLine, { width: 100, height: 12 }]} />
                </View>
              </View>
            ) : (
              <View style={styles.avatarSection}>
                <Avatar name={userData.full_name || '?'} size={80} color={Colors.primary} />
                <View style={styles.identityBlock}>
                  <Text style={styles.displayName}>{userData.full_name}</Text>
                  <Text style={styles.displayEmail}>{userData.email}</Text>
                </View>
                {Boolean(userData.university) && (
                  <View style={styles.universityPill}>
                    <Text style={styles.universityIcon}>⌁</Text>
                    <Text style={styles.universityText}>{userData.university}</Text>
                  </View>
                )}
              </View>
            )}

            {message && (
              <Message tone={message.tone}>{message.text}</Message>
            )}

            {/* Academic info */}
            {loading ? (
              <><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                {/* Academic section */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Academic Information</Text>
                  {editing ? (
                    <View style={styles.sectionCard}>
                      <Field
                        label="Full Name"
                        value={form.full_name}
                        onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))}
                        returnKeyType="next"
                      />
                      <Field
                        label="University"
                        placeholder="e.g. MIT"
                        value={form.university}
                        onChangeText={(v) => setForm((f) => ({ ...f, university: v }))}
                        returnKeyType="next"
                      />
                      <Field
                        label="Degree / Program"
                        placeholder="e.g. B.S. Computer Science"
                        value={form.degree}
                        onChangeText={(v) => setForm((f) => ({ ...f, degree: v }))}
                        returnKeyType="next"
                      />
                      <Field
                        label="Graduation Year"
                        placeholder="e.g. 2027"
                        value={form.graduation_year}
                        onChangeText={(v) => setForm((f) => ({ ...f, graduation_year: v }))}
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    </View>
                  ) : (
                    <View style={styles.sectionCard}>
                      {[
                        { label: 'University', value: userData.university || 'Not set' },
                        { label: 'Degree / Program', value: userData.degree || 'Not set' },
                        { label: 'Graduation Year', value: userData.graduation_year || 'Not set' },
                      ].map(({ label, value }) => (
                        <View key={label} style={styles.infoRow}>
                          <Text style={styles.infoLabel}>{label}</Text>
                          <Text style={[styles.infoValue, !userData[label.toLowerCase().split(' / ')[0].replace(' ', '_') as keyof UserData] && styles.infoValueEmpty]}>
                            {value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Edit actions */}
                {editing && (
                  <View style={styles.editActions}>
                    <Button label="Cancel" onPress={cancelEdit} variant="secondary" />
                    <Button label={saving ? 'Saving…' : 'Save Changes'} onPress={save} loading={saving} />
                  </View>
                )}

                {/* Account section */}
                {!editing && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Account</Text>
                    <View style={styles.sectionCard}>
                      <Pressable
                        onPress={signOutHandler}
                        style={({ pressed }) => [styles.accountRow, pressed && { opacity: 0.7 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Sign out"
                      >
                        <Text style={styles.accountRowIcon}>⏻</Text>
                        <Text style={styles.signOutText}>Sign Out</Text>
                        <Text style={styles.accountRowChevron}>›</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* App info */}
                {!editing && (
                  <View style={styles.appInfo}>
                    <Text style={styles.appName}>nexora</Text>
                    <Text style={styles.appVersion}>Version 1.0.0 · Learn smarter. Stay organized.</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Profile" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 100, gap: Spacing.xl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  editBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  avatarSection: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  avatarSkeletonCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceElevated },
  identityBlock: { alignItems: 'center', gap: Spacing.xs },
  displayName: { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  displayEmail: { color: Colors.textMuted, fontSize: Typography.size.sm },
  universityPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border },
  universityIcon: { color: Colors.primaryLight, fontSize: 15 },
  universityText: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  skeletonLine: { height: 16, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm },

  section: { gap: Spacing.sm },
  sectionLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: Spacing.xs },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderColor: Colors.border },
  infoLabel: { color: Colors.textMuted, fontSize: Typography.size.sm },
  infoValue: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  infoValueEmpty: { color: Colors.textMuted, fontStyle: 'italic', fontWeight: Typography.weight.regular },

  editActions: { flexDirection: 'row', gap: Spacing.md },

  accountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
  accountRowIcon: { color: Colors.error, fontSize: 18, width: 24, textAlign: 'center' },
  accountRowChevron: { color: Colors.textMuted, fontSize: Typography.size.xl, marginLeft: 'auto' },
  signOutText: { color: Colors.error, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, flex: 1 },

  appInfo: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
  appName: { color: Colors.textMuted, fontSize: Typography.size.lg, fontWeight: Typography.weight.black, letterSpacing: 1 },
  appVersion: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center' },
});
