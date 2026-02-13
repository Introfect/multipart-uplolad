import { Outlet } from "react-router";
import { AuthLayout } from "~/components/auth/auth-layout";
import { AuthFormWrapper } from "~/components/auth/auth-form-wrapper";

export default function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
