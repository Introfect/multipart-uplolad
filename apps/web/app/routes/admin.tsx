import type { Route } from "./+types/admin";
import { data, Link, redirect } from "react-router";
import { Footer } from "~/components/ui/footer";
import { Toast } from "~/components/ui/toast";
import { ROUTE_METADATA } from "~/constants/routes";
import {
  fetchAllSubmissions,
  type SubmissionDetail,
} from "~/lib/applications.server";
import {
  clearApiKeyCookie,
  fetchMe,
  getApiKeyFromRequest,
} from "~/lib/auth.server";
import { DateTime } from "luxon";

export function meta({}: Route.MetaArgs) {
  const metadata = ROUTE_METADATA.DASHBOARD;
  return [
    { title: `Admin Dashboard - MIST` },
    { name: "description", content: "View all submissions" },
  ];
}

type AdminLoaderData = {
  submissions: SubmissionDetail[];
  error: string | null;
  user: {
    name: string;
    email: string;
  };
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const apiKey = await getApiKeyFromRequest(request);

  if (!apiKey) {
    throw redirect("/");
  }

  const meResult = await fetchMe({ context, apiKey });
  if (!meResult.ok) {
    if (meResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }
    throw redirect("/");
  }

  // Check if user is admin
  const isAdmin = meResult.data.roles.some((role) => role.roleName === "admin");
  if (!isAdmin) {
    // Non-admins should go to dashboard
    throw redirect("/dashboard");
  }

  const submissionsResult = await fetchAllSubmissions({ context, apiKey });

  if (!submissionsResult.ok) {
    if (submissionsResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }

    return data<AdminLoaderData>({
      submissions: [],
      error: submissionsResult.error || "Failed to load submissions",
      user: {
        name: meResult.data.name || "Admin",
        email: meResult.data.email,
      },
    });
  }

  return data<AdminLoaderData>({
    submissions: submissionsResult.data.applications,
    error: null,
    user: {
      name: meResult.data.name || "Admin",
      email: meResult.data.email,
    },
  });
}
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { submissions = [], error = null, user } = loaderData || {};

  return (
    <>
      {error ? <Toast message={error} variant="error" /> : null}
      <div className="min-h-screen bg-background flex flex-col">
        {/* Admin Navbar */}
        <nav className="flex items-center justify-between h-16 px-6 md:px-12 backdrop-blur-md bg-[rgba(10,10,10,0.5)] border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[3px] text-muted-foreground">
              MIST
            </span>
            <span className="text-white/10">/</span>
            <span className="text-[10px] font-bold uppercase tracking-[3px] text-white">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {getInitials(user?.name || "A")}
                </span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs text-foreground leading-tight">
                  {user?.name || "Admin"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {user?.email || ""}
                </span>
              </div>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <a
              href="/logout"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">
                logout
              </span>
              <span className="hidden md:inline">Logout</span>
            </a>
          </div>
        </nav>

        <div className="flex-1 px-6 py-8 md:px-12 md:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-light text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                All submitted applications
              </p>
            </div>

            {/* Table */}
            <div className="border border-white/5 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Firm Name
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Submitted
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Bucket Link
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 px-4 text-center text-sm text-muted-foreground"
                        >
                          No submissions yet
                        </td>
                      </tr>
                    ) : (
                      submissions.map((submission) => (
                        <tr
                          key={submission.applicationId}
                          className="border-b border-white/5 hover:bg-white/2 transition-colors"
                        >
                          <td className="py-4 px-4 text-sm text-foreground">
                            {submission.applicantName || "—"}
                          </td>
                          <td className="py-4 px-4 text-sm text-foreground">
                            {submission.applicantFirmName || "—"}
                          </td>
                          <td className="py-4 px-4 text-sm text-muted-foreground">
                            {submission.applicantPhoneNumber || "—"}
                          </td>
                          <td className="py-4 px-4 text-xs text-muted-foreground">
                            {DateTime.fromISO(
                              submission.submittedAt,
                            ).toLocaleString(DateTime.DATETIME_MED)}
                          </td>
                          <td className="py-4 px-4">
                            <a
                              href={
                                submission.r2FolderUrl.startsWith("http")
                                  ? submission.r2FolderUrl
                                  : `https://${submission.r2FolderUrl}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              <span>View Files</span>
                              <span className="material-symbols-outlined text-[14px]">
                                open_in_new
                              </span>
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stats */}
            {submissions.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                Total submissions: {submissions.length}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 md:px-12">
          <Footer />
        </div>
      </div>
    </>
  );
}
