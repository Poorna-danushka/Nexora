import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Alert, Platform, ScrollView, TextInput } from 'react-native';
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
  Badge,
  Button,
  Field,
  Message,
} from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { getStudyMaterials, StudyMaterial, uploadStudyMaterial, deleteStudyMaterial, downloadStudyMaterial } from '@/services/api/studyMaterialApi';
import { getSubjects, Subject } from '@/services/api/subjectApi';
import { useAuth } from '@/context/AuthContext';
import { askMaterial, parseAIError, isAuthError, type AIErrorKind } from '@/services/api/aiApi';
import { AIAnswerCard } from '@/components/AIAnswerCard';
import axios from 'axios';

// ─── Per-material AI state ─────────────────────────────────────────────────────
interface MaterialAIState {
  expanded: boolean;      // whether the Ask AI panel is open
  question: string;       // the user's typed question
  asking: boolean;        // request in-flight
  answer: string | null;
  error: AIErrorKind | null;
}

const INITIAL_AI_STATE: MaterialAIState = {
  expanded: false,
  question: '',
  asking: false,
  answer: null,
  error: null,
};

export default function MaterialsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Map: material.id → AI state
  const [aiStates, setAiStates] = useState<Record<number, MaterialAIState>>({});

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

  const removeMaterial = async (id: number) => {
    try {
      await deleteStudyMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      setAiStates(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        Alert.alert('Error', 'Failed to delete material');
      }
    }
  };

  const openMaterial = async (material: StudyMaterial) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Open material', 'Material opening is currently available in the web app.');
      return;
    }
    try {
      const blob = await downloadStudyMaterial(material.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        Alert.alert('Open failed', 'There was an error opening the material.');
      }
    }
  };

  const handleDelete = (id: number) => {
    if (Platform.OS === 'web') {
      void removeMaterial(id);
      return;
    }
    Alert.alert('Delete Material', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void removeMaterial(id); } }
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

  // ─── AI state helpers ─────────────────────────────────────────────────────
  const getAI = (id: number): MaterialAIState =>
    aiStates[id] ?? INITIAL_AI_STATE;

  const setAI = (id: number, patch: Partial<MaterialAIState>) =>
    setAiStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? INITIAL_AI_STATE), ...patch },
    }));

  const toggleAIPanel = (id: number) => {
    const current = getAI(id);
    if (current.expanded) {
      // collapse and reset
      setAI(id, INITIAL_AI_STATE);
    } else {
      setAI(id, { expanded: true });
    }
  };

  const handleAskAI = async (matId: number) => {
    const state = getAI(matId);
    if (state.asking) return; // duplicate guard
    const question = state.question.trim();
    if (!question) {
      setAI(matId, { error: 'validation' });
      return;
    }
    setAI(matId, { asking: true, answer: null, error: null });
    try {
      const result = await askMaterial(matId, question);
      setAI(matId, { asking: false, answer: result.answer });
    } catch (err) {
      if (isAuthError(err)) {
        signOut();
        return;
      }
      setAI(matId, { asking: false, error: parseAIError(err) });
    }
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
              const ai = getAI(mat.id);
              return (
                <Card key={mat.id}>
                  {/* ── File header ── */}
                  <View style={styles.matHeader}>
                    <Badge label={badge.label} color={badge.color} />
                    <IconButton accessibilityLabel="Delete" onPress={() => handleDelete(mat.id)}>
                      <Text style={{ color: Colors.error }}>✕</Text>
                    </IconButton>
                  </View>
                  <Text style={styles.matTitle} numberOfLines={1}>{mat.original_filename}</Text>
                  <Button label="Open material" onPress={() => void openMaterial(mat)} variant="ghost" size="sm" />
                  
                  <View style={styles.matFooter}>
                    {subject && <Text style={[styles.matSubject, { color: subject.color || Colors.primaryLight }]}>{subject.name}</Text>}
                    <Text style={styles.matDetails}>
                      {(mat.file_size / (1024 * 1024)).toFixed(2)} MB • {new Date(mat.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* ── Ask AI toggle ── */}
                  <View style={styles.aiToggleRow}>
                    <Button
                      label={ai.expanded ? 'Close AI Q&A' : '✦  Ask AI'}
                      onPress={() => toggleAIPanel(mat.id)}
                      variant="ghost"
                      size="sm"
                    />
                  </View>

                  {/* ── Ask AI panel ── */}
                  {ai.expanded && (
                    <View style={styles.aiPanel}>
                      <Field
                        label="Your question"
                        value={ai.question}
                        onChangeText={(t) => setAI(mat.id, { question: t, error: null, answer: null })}
                        placeholder="e.g. What is the main topic of this document?"
                        multiline
                        style={styles.questionInput}
                        editable={!ai.asking}
                      />
                      {ai.error === 'validation' && !ai.asking && !ai.answer && (
                        <Message tone="error">Please enter a question before asking AI.</Message>
                      )}
                      <Button
                        label={ai.asking ? 'Asking AI…' : '✦  Ask AI'}
                        onPress={() => handleAskAI(mat.id)}
                        variant="secondary"
                        size="sm"
                        loading={ai.asking}
                        disabled={ai.asking}
                      />
                      <AIAnswerCard
                        question={ai.question}
                        answer={ai.answer}
                        loading={ai.asking}
                        error={ai.error !== 'validation' ? ai.error : null}
                        onDismiss={() => setAI(mat.id, { answer: null, error: null, question: '' })}
                        onRetry={() => handleAskAI(mat.id)}
                      />
                    </View>
                  )}
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
  },
  // AI panel
  aiToggleRow: {
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: Spacing.sm,
    alignItems: 'flex-start',
  },
  aiPanel: {
    gap: Spacing.md,
  },
  questionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
