import apiClient from './apiClient';

export type UserRegisterRequest = {
  full_name: string;
  email: string;
  password: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
};

export type UserRegisterResponse = {
  id: number;
  full_name: string;
  email: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
  created_at: string;
  updated_at: string;
};

export const registerUser = async (
  data: UserRegisterRequest
): Promise<UserRegisterResponse> => {
  const response = await apiClient.post<UserRegisterResponse>('/users', data);
  return response.data;
};
