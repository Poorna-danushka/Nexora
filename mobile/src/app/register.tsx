import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { useRouter } from 'expo-router';

import { registerUser } from '@/services/api/userApi';

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required.')
    .min(2, 'Name must be at least 2 characters.'),
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.'),
  university: z.string().optional(),
  degree: z.string().optional(),
  graduation_year: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 2020 && Number(val) <= 2035), {
      message: 'Graduation year must be between 2020 and 2035.',
    }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

const zodResolver = (schema: z.ZodType<any>) => async (values: any) => {
  const result = schema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const errors: Record<string, any> = {};
  result.error.issues.forEach((issue) => {
    const fieldName = String(issue.path[0] ?? '');
    if (fieldName && !errors[fieldName]) {
      errors[fieldName] = { type: issue.code, message: issue.message };
    }
  });
  return { values: {}, errors };
};

export default function RegisterScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      university: '',
      degree: '',
      graduation_year: '',
    },
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        university: data.university || undefined,
        degree: data.degree || undefined,
        graduation_year: data.graduation_year ? Number(data.graduation_year) : undefined,
      });

      setSuccessMessage(`Account created successfully for ${response.full_name}!`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          if (err.response.status === 409) {
            setServerError('An account with this email already exists.');
          } else if (err.response.status === 422) {
            setServerError('Invalid form submission data.');
          } else {
            setServerError(`Server error (${err.response.status}). Please try again.`);
          }
        } else if (err.request) {
          setServerError('Unable to connect to the server. Make sure FastAPI is running.');
        } else {
          setServerError('An error occurred during registration.');
        }
      } else {
        setServerError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>Nexora</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to start learning and managing your student journey.
          </Text>
        </View>

        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {serverError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{serverError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.full_name && styles.inputError]}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.full_name && (
              <Text style={styles.fieldError}>{errors.full_name.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="student@university.edu"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>University</Text>
            <Controller
              control={control}
              name="university"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Stanford University"
                  placeholderTextColor="#64748b"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Degree / Program</Text>
            <Controller
              control={control}
              name="degree"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. B.S. Computer Science"
                  placeholderTextColor="#64748b"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Graduation Year</Text>
            <Controller
              control={control}
              name="graduation_year"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.graduation_year && styles.inputError]}
                  placeholder="e.g. 2026"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.graduation_year && (
              <Text style={styles.fieldError}>{errors.graduation_year.message}</Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              isSubmitting && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.buttonText}>Creating account...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.push('/')}>
            <Text style={styles.link}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0c1b',
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#15172e',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#26294d',
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#0b0c1b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    fontSize: 12,
    color: '#f87171',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
    borderWidth: 1,
    padding: 14,
    borderRadius: 8,
  },
  successText: {
    color: '#34d399',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#451a03',
    borderColor: '#d97706',
    borderWidth: 1,
    padding: 14,
    borderRadius: 8,
  },
  errorBoxText: {
    color: '#fbbf24',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  link: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
  },
});
