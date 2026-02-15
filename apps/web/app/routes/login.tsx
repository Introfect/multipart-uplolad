import type { Route } from "./+types/login";
import { data, redirect } from "react-router";
import { z } from "zod";
import { AuthFormWrapper } from "~/components/auth/auth-form-wrapper";
import { LoginForm } from "~/components/forms/login-form";
import { Toast } from "~/components/ui/toast";
import { ROUTE_METADATA } from "~/constants/routes";
import {
  fetchMe,
  getApiKeyFromRequest,
  isUserOnboarded,
  loginWithPassword,
  setApiKeyCookie,
} from "~/lib/auth.server";
import type { LoginActionData } from "~/types/auth";

export function meta({}: Route.MetaArgs) {
  const metadata = ROUTE_METADATA.LOGIN;
  return [
    { title: `${metadata.title} - MIST` },
    { name: "description", content: metadata.description },
  ];
}

const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loader({ request, context }: Route.LoaderArgs) {
  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    return null;
  }

  const meResult = await fetchMe({ context, apiKey });
  if (!meResult.ok) {
    return null;
  }

  // Check if user is admin
  const isAdmin = meResult.data.roles.some((role) => role.roleName === "admin");
  if (isAdmin) {
    throw redirect("/admin");
  }

  if (isUserOnboarded(meResult.data)) {
    throw redirect("/dashboard");
  }

  throw redirect("/onboarding");
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return data<LoginActionData>(
      {
        success: false,
        error: issue?.message ?? "Invalid form submission",
      },
      { status: 400 },
    );
  }

  const loginResult = await loginWithPassword({
    context,
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (!loginResult.ok) {
    return data<LoginActionData>(
      {
        success: false,
        error: loginResult.error || "Unable to sign in. Please try again.",
      },
      { status: loginResult.status === 401 ? 401 : 400 },
    );
  }

  const apiKey = loginResult.data.apiKey;
  const isNewUser = loginResult.data.isNewUser;

  // Fetch user data to check onboarding status
  const userResult = await fetchMe({ context, apiKey });

  if (!userResult.ok) {
    return data<LoginActionData>(
      {
        success: false,
        error: "Unable to fetch user data. Please try again.",
      },
      { status: 500 },
    );
  }

  const setCookie = await setApiKeyCookie({ apiKey, request });

  // Check if user is admin
  const isAdmin = userResult.data.roles.some(
    (role) => role.roleName === "admin",
  );
  if (isAdmin) {
    return redirect("/admin", {
      headers: {
        "Set-Cookie": setCookie,
      },
    });
  }

  const destination = isUserOnboarded(userResult.data)
    ? "/dashboard"
    : "/onboarding";

  return redirect(destination, {
    headers: {
      "Set-Cookie": setCookie,
    },
  });
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <>
      {actionData?.error ? (
        <Toast message={actionData.error} variant="error" />
      ) : null}
      <AuthFormWrapper
        icon={
          <span className="material-symbols-outlined text-[32px] leading-[40px] text-primary">
            fingerprint
          </span>
        }
        heading="Access Your Portal"
        subheading="Enter your registered email and password to continue."
      >
        <LoginForm actionData={actionData} />
      </AuthFormWrapper>
    </>
  );
}
