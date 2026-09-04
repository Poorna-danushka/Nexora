import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { registerUser } from '@/services/api/userApi';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button, Field, Message, PasswordField } from '@/components/ui';

export const registerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required.').min(2, 'Name must be at least 2 characters.'),
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').min(8, 'Password must be at least 8 characters.'),
  university: z.string().optional(),
  degree: z.string().optional(),
  graduation_year: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 2020 && Number(val) <= 2035),
      { message: 'Graduation year must be between 2020 and 2035.' }
    ),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

const zodResolver = (schema: z.ZodType<any>) => async (values: any) => {
  const result = schema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: Record<string, any> = {};
  result.error.issues.forEach((issue) => {
    const fieldName = String(issue.path[0] ?? '');
    if (fieldName && !errors[fieldName]) {
      errors[fieldName] = { type: issue.code, message: issue.message };
    }
  });
  return { values: {}, errors };
};

const STEPS = ['Personal', 'Academic', 'Account'];

export default function RegisterScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const { control, handleSubmit, formState: { errors }, trigger } = useForm<RegisterFormData>({
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

  const nextStep = async () => {
    const fieldsForStep: (keyof RegisterFormData)[][] = [
      ['full_name', 'email'],
      ['university', 'degree', 'graduation_year'],
      ['password'],
    ];
    const valid = await trigger(fieldsForStep[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

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
      setSuccessMessage(`Account created for ${response.full_name}! Redirecting…`);
      setTimeout(() => router.replace('/login'), 900);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setServerError('An account with this email already exists.');
        } else if (err.response?.status === 422) {
          setServerError('Please check your details and try again.');
        } else if (err.request) {
          setServerError('Unable to connect. Make sure the server is running.');
        } else {
          setServerError(`Something went wrong (${err.response?.status}). Please try again.`);
        }
      } else {
        setServerError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.logoMark}>
              <Text style={styles.logoN}>N</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start your learning journey.</Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {STEPS.map((label, i) => (
              <View key={label} style={styles.stepItem}>
                <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
                )}
              </View>
            ))}
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {serverError && <Message tone="error">{serverError}</Message>}
            {successMessage && <Message tone="success">{successMessage}</Message>}

            {step === 0 && (
              <>
                <Controller
                  control={control}
                  name="full_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field
                      label="Full Name *"
                      placeholder="e.g. Alex Johnson"
                      autoCapitalize="words"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.full_name?.message}
                      returnKeyType="next"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field
                      label="Email Address *"
                      placeholder="student@university.edu"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      returnKeyType="done"
                    />
                  )}
                />
              </>
            )}

            {step === 1 && (
              <>
                <Controller
                  control={control}
                  name="university"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field
                      label="University"
                      placeholder="e.g. MIT"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      hint="Optional — helps personalize your experience"
                      returnKeyType="next"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="degree"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field
                      label="Degree / Program"
                      placeholder="e.g. B.S. Computer Science"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      returnKeyType="next"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="graduation_year"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Field
                      label="Graduation Year"
                      placeholder="e.g. 2027"
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.graduation_year?.message}
                      returnKeyType="done"
                    />
                  )}
                />
              </>
            )}

            {step === 2 && (
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <PasswordField
                    label="Password *"
                    placeholder="At least 8 characters"
                    value={value}
                    onChangeText={onChange}
                    error={errors.password?.message}
                  />
                )}
              />
            )}

            {step < STEPS.length - 1 ? (
              <Button label="Continue" onPress={nextStep} variant="primary" size="lg" />
            ) : (
              <Button
                label={isSubmitting ? 'Creating account…' : 'Create Account'}
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                variant="primary"
                size="lg"
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/login')} accessibilityRole="link">
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  backLabel: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  headerBlock: { gap: Spacing.md, paddingTop: Spacing.md },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoN: { color: Colors.white, fontSize: 24, fontWeight: Typography.weight.black },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  subtitle: { color: Colors.textMuted, fontSize: Typography.size.base, lineHeight: 22 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  stepItem: { flex: 1, alignItems: 'center', gap: Spacing.xs, position: 'relative' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepNum: { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  stepNumActive: { color: Colors.white },
  stepLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  stepLabelActive: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    right: '-50%',
    height: 1.5,
    backgroundColor: Colors.border,
  },
  stepLineActive: { backgroundColor: Colors.primary },

  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: Colors.textMuted, fontSize: Typography.size.sm },
  footerLink: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
});
