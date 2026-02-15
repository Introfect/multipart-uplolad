import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { Form, Link, redirect } from "react-router";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { fetchApplicationsOverview } from "~/lib/applications.server";
import { clearApiKeyCookie, getApiKeyFromRequest } from "~/lib/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    throw redirect("/");
  }

  const submissionId = params.submissionId?.trim() ?? "";
  if (!submissionId) {
    throw redirect("/dashboard");
  }

  const applicationsResult = await fetchApplicationsOverview({
    context,
    apiKey,
  });

  if (!applicationsResult.ok) {
    if (applicationsResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }
    throw redirect("/dashboard");
  }

  const application = applicationsResult.data.applications.find(
    (app) => app.applicationId === submissionId,
  );

  if (!application) {
    throw redirect("/dashboard");
  }

  if (application.status !== "submitted") {
    // If not submitted yet, redirect back to form
    throw redirect(`/form/${submissionId}`);
  }

  return {
    tenderTitle: application.tenderTitle,
    submittedAt: application.submittedAt,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  // Simple logout action if needed, or we can use a Link to /logout if that exists
  // For now, implementing logout logic here
  return redirect("/", {
    headers: {
      "Set-Cookie": await clearApiKeyCookie(request),
    },
  });
}

export default function FormSuccessPage({
  loaderData,
}: {
  loaderData: { tenderTitle: string; submittedAt: string | null };
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05),rgba(0,0,0,0)_60%)] pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-white/5 p-12 text-center relative z-10">
        <div className="flex justify-center mb-8">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-[32px] text-primary">
              check_circle
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-light text-white mb-2">
          Submission Received
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Your application for{" "}
          <span className="text-foreground">{loaderData.tenderTitle}</span> has
          been successfully submitted and is now under review.
        </p>

        <div className="space-y-3">
          <Button variant="default" className="w-full" asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>

          <Form method="post">
            <Button variant="outline" className="w-full" type="submit">
              Log Out
            </Button>
          </Form>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Reference ID:{" "}
            {loaderData.submittedAt
              ? new Date(loaderData.submittedAt).getTime().toString().slice(-8)
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
