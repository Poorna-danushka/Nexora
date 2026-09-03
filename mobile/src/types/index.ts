// Shared TypeScript definitions for Nexora Mobile App

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
  created_at: string;
  updated_at: string;
}

export interface RegisterFormData {
  full_name: string;
  email: string;
  password: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
}
