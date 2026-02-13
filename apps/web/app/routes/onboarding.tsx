import type { Route } from "./+types/onboarding";
import { data, redirect } from "react-router";
import { z } from "zod";
import { AuthFormWrapper } from "~/components/auth/auth-form-wrapper";
import { OnboardingForm } from "~/components/forms/onboarding-form";
import { Toast } from "~/components/ui/toast";
import { ROUTE_METADATA } from "~/constants/routes";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import {
  clearApiKeyCookie,
  fetchMe,
  getApiKeyFromRequest,
  isUserOnboarded,
  submitOnboarding,
} from "~/lib/auth.server";
import type { OnboardingActionData } from "~/types/auth";

export function meta({}: Route.MetaArgs) {
  const metadata = ROUTE_METADATA.ONBOARDING;
  return [
    { title: `${metadata.title} - MIST` },
    { name: "description", content: metadata.description },
  ];
}

const OnboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required (min 2 characters)"),
  countryCode: z.string().trim().min(1, "Country code is required"),
  phoneNumber: z.string().trim().min(1, "Phone number is required"),
  firmName: z.string().trim().min(2, "Firm name is required (min 2 characters)"),
});

export async function loader({ request, context }: Route.LoaderArgs) {
  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    throw redirect("/");
  }

  const meResult = await fetchMe({ context, apiKey });
  if (!meResult.ok) {
    throw redirect("/", {
      headers: {
        "Set-Cookie": await clearApiKeyCookie(request),
      },
    });
  }

  if (isUserOnboarded(meResult.data)) {
    throw redirect("/dashboard");
  }

  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    throw redirect("/");
  }

  const formData = await request.formData();
  const parsed = OnboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    countryCode: formData.get("countryCode"),
    phoneNumber: formData.get("phoneNumber"),
    firmName: formData.get("firmName"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return data<OnboardingActionData>(
      {
        success: false,
        error: issue?.message ?? "Invalid form submission",
      },
      { status: 400 }
    );
  }

  const fieldErrors: Record<string, string> = {};

  if (!isValidPhoneNumber(parsed.data.phoneNumber, parsed.data.countryCode as CountryCode)) {
    fieldErrors.phoneNumber = "Please enter a valid phone number";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return data<OnboardingActionData>(
      {
        success: false,
        fieldErrors,
        error: "Please fix the highlighted fields.",
      },
      { status: 400 }
    );
  }

  const onboardResult = await submitOnboarding({
    context,
    apiKey,
    name: parsed.data.fullName,
    firmName: parsed.data.firmName,
    phoneNumber: `${parsed.data.countryCode} ${parsed.data.phoneNumber}`,
  });

  if (!onboardResult.ok) {
    if (onboardResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }

    return data<OnboardingActionData>(
      {
        success: false,
        error: onboardResult.error || "Failed to save profile. Please try again.",
      },
      { status: 400 }
    );
  }

  return redirect("/dashboard");
}

export default function Onboarding({ actionData }: Route.ComponentProps) {
  return (
    <>
      {actionData?.error ? <Toast message={actionData.error} variant="error" /> : null}
      <AuthFormWrapper
        icon={
          <span className="material-symbols-outlined text-[32px] leading-[40px] text-primary">
            person_add
          </span>
        }
        heading="Complete Your Profile"
        subheading="Please provide your professional details to complete your registration"
      >
        <OnboardingForm actionData={actionData} />
      </AuthFormWrapper>
    </>
  );
}
