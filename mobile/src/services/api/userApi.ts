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

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
};

export const registerUser = async (
  data: UserRegisterRequest
): Promise<UserRegisterResponse> => {
  const response = await apiClient.post<UserRegisterResponse>('/users', data);
  return response.data;
};

export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const getCurrentUser = async (): Promise<UserRegisterResponse> => {
  const response = await apiClient.get<UserRegisterResponse>('/users/me');
  return response.data;
};

export type UserUpdateRequest = {
  full_name?: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
};

export const updateCurrentUser = async (
  data: UserUpdateRequest
): Promise<UserRegisterResponse> => {
  const response = await apiClient.patch<UserRegisterResponse>('/users/me', data);
  return response.data;
};
