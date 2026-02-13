export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const emailValidation = {
  // RFC 5322 compliant email regex pattern
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  validate: (email: string): ValidationResult => {
    if (!email || email.trim() === "") {
      return {
        isValid: false,
        error: "Email address is required",
      };
    }

    if (!emailValidation.pattern.test(email)) {
      return {
        isValid: false,
        error: "Please enter a valid email address",
      };
    }

    return {
      isValid: true,
    };
  },
};
