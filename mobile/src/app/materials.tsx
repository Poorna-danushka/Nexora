import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSubjects, Subject } from '@/services/api/subjectApi';
import {
  deleteStudyMaterial,
  getStudyMaterials,
  StudyMaterial,
  uploadStudyMaterial,
} from '@/services/api/studyMaterialApi';

const allowedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

export default function MaterialsScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedSubjects, loadedMaterials] = await Promise.all([
        getSubjects(),
        getStudyMaterials(subjectId ?? undefined),
      ]);
      setSubjects(loadedSubjects);
      setMaterials(loadedMaterials);
      if (subjectId === null && loadedSubjects.length) setSubjectId(loadedSubjects[0].id);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) router.replace('/login');
      else setError('Unable to load study materials.');
    }
  }, [router, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const pickFile = async () => {
    if (!subjectId) {
      setError('Create and select a subject first.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: allowedTypes, copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    if (file.size && file.size > 10 * 1024 * 1024) {
      setError('Files must be 10 MB or smaller.');
      return;
    }
    try {
      const material = await uploadStudyMaterial(
        subjectId,
        file.uri,
        file.name,
        file.mimeType ?? 'application/octet-stream'
      );
      setMaterials((current) => [material, ...current]);
      setError(null);
    } catch {
      setError('Unable to upload this file.');
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteStudyMaterial(id);
      setMaterials((current) => current.filter((material) => material.id !== id));
    } catch {
      setError('Unable to delete study material.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>Study Materials</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjects}>
          {subjects.map((subject) => (
            <Pressable key={subject.id} style={[styles.chip, subjectId === subject.id && styles.selected]} onPress={() => setSubjectId(subject.id)}>
              <Text style={styles.chipText}>{subject.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={styles.button} onPress={pickFile}><Text style={styles.buttonText}>Upload PDF, DOCX, PPTX, or TXT</Text></Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
        {materials.map((material) => (
          <View key={material.id} style={styles.card}>
            <Text style={styles.fileName}>{material.original_filename}</Text>
            <Text style={styles.meta}>{Math.ceil(material.file_size / 1024)} KB</Text>
            <Pressable onPress={() => remove(material.id)}><Text style={styles.delete}>Delete</Text></Pressable>
          </View>
        ))}
        {!materials.length && <Text style={styles.empty}>No study materials uploaded yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0c1b' },
  container: { padding: 24, gap: 16 },
  back: { color: '#a5b4fc', fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '700' },
  subjects: { gap: 8 },
  chip: { borderColor: '#475569', borderWidth: 1, borderRadius: 16, padding: 9 },
  selected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#fff', fontSize: 13 },
  button: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#fca5a5' },
  card: { backgroundColor: '#15172e', borderRadius: 12, padding: 16, gap: 6 },
  fileName: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  meta: { color: '#94a3b8' },
  delete: { color: '#fca5a5', fontSize: 13 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
