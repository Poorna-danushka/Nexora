import apiClient from './apiClient';

export type StudyMaterial = {
  id: number;
  owner_id: number;
  subject_id: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
};

export const getStudyMaterials = async (subjectId?: number): Promise<StudyMaterial[]> =>
  (await apiClient.get<StudyMaterial[]>('/study-materials', { params: { subject_id: subjectId } })).data;

export const uploadStudyMaterial = async (
  subjectId: number,
  uri: string,
  name: string,
  type: string
): Promise<StudyMaterial> => {
  const formData = new FormData();
  formData.append('file', { uri, name, type } as unknown as Blob);
  return (await apiClient.post<StudyMaterial>(`/study-materials?subject_id=${subjectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};

export const deleteStudyMaterial = async (id: number): Promise<void> => {
  await apiClient.delete(`/study-materials/${id}`);
};
