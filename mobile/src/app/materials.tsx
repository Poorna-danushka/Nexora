import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  Screen,
  ScreenHeader,
  BottomNav,
  Chip,
  Card,
  IconButton,
  EmptyState,
  LoadingState,
  SkeletonCard,
  Badge
} from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getStudyMaterials, StudyMaterial, uploadStudyMaterial, deleteStudyMaterial } from '@/services/api/studyMaterialApi';
import { getSubjects, Subject } from '@/services/api/subjectApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export default function MaterialsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [matData, subData] = await Promise.all([
        getStudyMaterials(),
        getSubjects()
      ]);
      setMaterials(matData);
      setSubjects(subData);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (subjects.length === 0) {
      Alert.alert('No Subjects', 'You need to create a subject first before uploading materials.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain'
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Maximum file size is 10MB.');
        return;
      }

      const subjectIdToUse = selectedSubjectId || subjects[0].id;

      setUploading(true);
      const uploaded = await uploadStudyMaterial(
        subjectIdToUse,
        file.uri,
        file.name,
        file.mimeType || 'application/octet-stream'
      );
      setMaterials(prev => [uploaded, ...prev]);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        Alert.alert('Upload failed', 'There was an error uploading the file.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Material', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteStudyMaterial(id);
          setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (err) {
          Alert.alert('Error', 'Failed to delete material');
        }
      }}
    ]);
  };

  const filteredMaterials = useMemo(() => {
    if (!selectedSubjectId) return materials;
    return materials.filter(m => m.subject_id === selectedSubjectId);
  }, [materials, selectedSubjectId]);

  const getFileBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { label: 'PDF', color: Colors.error };
    if (ext === 'docx' || ext === 'doc') return { label: 'DOC', color: Colors.info };
    if (ext === 'pptx' || ext === 'ppt') return { label: 'PPT', color: Colors.warning };
    return { label: 'TXT', color: Colors.textMuted };
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Screen scroll={true}>
        <ScreenHeader
          title="Study Materials"
          action={
            <IconButton accessibilityLabel="Upload Material" onPress={handleUpload}>
              {uploading ? (
                <Text style={{ color: Colors.primaryLight, fontSize: 14 }}>...</Text>
              ) : (
                <Text style={{ color: Colors.primaryLight, fontSize: 24 }}>+</Text>
              )}
            </IconButton>
          }
        />
        
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            <Chip
              label="All"
              active={selectedSubjectId === null}
              onPress={() => setSelectedSubjectId(null)}
            />
            {subjects.map(sub => (
              <Chip
                key={sub.id}
                label={sub.name}
                active={selectedSubjectId === sub.id}
                onPress={() => setSelectedSubjectId(sub.id)}
                color={sub.color}
              />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ gap: Spacing.md }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </View>
        ) : filteredMaterials.length === 0 ? (
          <EmptyState title="No materials yet" text="Upload your first study material" action="Upload Material" onAction={handleUpload} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {filteredMaterials.map(mat => {
              const subject = subjects.find(s => s.id === mat.subject_id);
              const badge = getFileBadge(mat.original_filename);
              return (
                <Card key={mat.id}>
                  <View style={styles.matHeader}>
                    <Badge label={badge.label} color={badge.color} />
                    <IconButton accessibilityLabel="Delete" onPress={() => handleDelete(mat.id)}>
                      <Text style={{ color: Colors.error }}>✕</Text>
                    </IconButton>
                  </View>
                  <Text style={styles.matTitle} numberOfLines={1}>{mat.original_filename}</Text>
                  
                  <View style={styles.matFooter}>
                    {subject && <Text style={[styles.matSubject, { color: subject.color || Colors.primaryLight }]}>{subject.name}</Text>}
                    <Text style={styles.matDetails}>
                      {(mat.file_size / (1024 * 1024)).toFixed(2)} MB • {new Date(mat.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      <BottomNav active="Subjects" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    marginBottom: Spacing.lg,
  },
  chipScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  matHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.sm,
  },
  matFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  matSubject: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  matDetails: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
  }
});
