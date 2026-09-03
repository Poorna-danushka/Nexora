import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser, updateCurrentUser } from '@/services/api/userApi';
import { clearAccessToken } from '@/services/authStorage';

export default function ProfileScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setFullName(user.full_name);
        setUniversity(user.university ?? '');
        setDegree(user.degree ?? '');
        setGraduationYear(user.graduation_year?.toString() ?? '');
      })
      .catch(() => setMessage('Unable to load your profile.'));
  }, []);

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateCurrentUser({
        full_name: fullName.trim(),
        university: university.trim() || undefined,
        degree: degree.trim() || undefined,
        graduation_year: graduationYear ? Number(graduationYear) : undefined,
      });
      setMessage('Profile updated successfully.');
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearAccessToken();
        router.replace('/login');
      } else {
        setMessage('Unable to update your profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    await clearAccessToken();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Student Profile</Text>
        {message && <Text style={styles.message}>{message}</Text>}
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
          <Text style={styles.label}>University</Text>
          <TextInput style={styles.input} value={university} onChangeText={setUniversity} />
          <Text style={styles.label}>Degree / Program</Text>
          <TextInput style={styles.input} value={degree} onChangeText={setDegree} />
          <Text style={styles.label}>Graduation Year</Text>
          <TextInput
            style={styles.input}
            value={graduationYear}
            onChangeText={setGraduationYear}
            keyboardType="numeric"
          />
          <Pressable style={styles.button} onPress={save} disabled={isSaving}>
            <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Profile'}</Text>
          </Pressable>
        </View>
        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0c1b' },
  container: { flex: 1, padding: 24, gap: 16 },
  back: { color: '#a5b4fc', fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '700' },
  message: { color: '#a7f3d0' },
  form: { backgroundColor: '#15172e', padding: 24, borderRadius: 16, gap: 10 },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: '#0b0c1b', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 12, color: '#fff' },
  button: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOut: { color: '#fca5a5', textAlign: 'center', fontWeight: '600' },
});
