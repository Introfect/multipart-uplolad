export interface LoginFormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  emailError: string | null;
  passwordError: string | null;
  touched: boolean;
}

export interface LoginActionData {
  success?: boolean;
  error?: string;
}

export interface OnboardingFormData {
  fullName: string;
  countryCode: string;
  phoneNumber: string;
  firmName: string;
}

export interface OnboardingActionData {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof OnboardingFormData, string>>;
}
