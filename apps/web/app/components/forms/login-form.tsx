import * as React from "react";
import { Form } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { emailValidation } from "~/lib/validation";
import type { LoginFormState, LoginActionData } from "~/types/auth";

export interface LoginFormProps {
  actionData?: LoginActionData;
}

export function LoginForm({ actionData }: LoginFormProps) {
  const [formState, setFormState] = React.useState<LoginFormState>({
    email: "",
    password: "",
    isSubmitting: false,
    emailError: null,
    passwordError: null,
    touched: false,
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      email: e.target.value,
      emailError: null,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      password: e.target.value,
      passwordError: null,
    }));
  };

  const handleEmailBlur = () => {
    setFormState((prev) => ({ ...prev, touched: true }));
    const validation = emailValidation.validate(formState.email);
    if (!validation.isValid) {
      setFormState((prev) => ({ ...prev, emailError: validation.error || null }));
    }
  };

  const handlePasswordBlur = () => {
    setFormState((prev) => ({ ...prev, touched: true }));
    if (formState.password.trim().length < 8) {
      setFormState((prev) => ({
        ...prev,
        passwordError: "Password must be at least 8 characters",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const emailResult = emailValidation.validate(formState.email);
    const passwordError =
      formState.password.trim().length < 8
        ? "Password must be at least 8 characters"
        : null;

    if (!emailResult.isValid || passwordError) {
      e.preventDefault();
      setFormState((prev) => ({
        ...prev,
        emailError: emailResult.error || null,
        passwordError,
        touched: true,
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true }));
  };

  return (
    <Form method="post" onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] uppercase tracking-[2px] leading-[15px] text-muted-foreground font-bold">
          PROFESSIONAL EMAIL
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="architect@institution.org"
          variant="borderless"
          value={formState.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={!!(formState.touched && formState.emailError)}
          helperText={formState.touched ? formState.emailError || "" : ""}
          disabled={formState.isSubmitting}
          required
          aria-describedby={formState.emailError ? "email-error" : undefined}
          aria-invalid={!!(formState.touched && formState.emailError)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[10px] uppercase tracking-[2px] leading-[15px] text-muted-foreground font-bold">
          PASSWORD
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          variant="borderless"
          value={formState.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={!!(formState.touched && formState.passwordError)}
          helperText={formState.touched ? formState.passwordError || "" : ""}
          disabled={formState.isSubmitting}
          required
          minLength={8}
          aria-describedby={formState.passwordError ? "password-error" : undefined}
          aria-invalid={!!(formState.touched && formState.passwordError)}
        />
      </div>

      <div className="space-y-4">
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={formState.isSubmitting}
        >
          {formState.isSubmitting ? "Signing In..." : "Sign In"}
        </Button>
        <p className="text-[10px] leading-[15px] text-muted-foreground">
          Use your registered credentials to access the submission portal.
        </p>
      </div>

      {actionData?.error && (
        <div
          className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20"
          role="alert"
        >
          <span className="material-symbols-outlined text-[16px] leading-[16px] text-destructive">
            error
          </span>
          <p className="text-[12px] leading-[16px] text-destructive">
            {actionData.error}
          </p>
        </div>
      )}
    </Form>
  );
}
