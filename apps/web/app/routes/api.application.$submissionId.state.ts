import type { ActionFunctionArgs } from "react-router";
import { getApiKeyFromRequest, clearApiKeyCookie } from "~/lib/auth.server";

export async function action({ context, request, params }: ActionFunctionArgs) {
  const apiKey = await getApiKeyFromRequest(request);

  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Unauthorized" },
      {
        status: 401,
        headers: { "Set-Cookie": await clearApiKeyCookie(request) },
      },
    );
  }

  const submissionId = params.submissionId;
  if (!submissionId) {
    return Response.json(
      { ok: false, error: "Missing submission ID" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    data: import("../types/persistence.types").PersistedFormState;
  };

  const backendUrl = context.cloudflare.env.BACKEND_API_URL;
  const response = await fetch(
    `${backendUrl}/api/v1/application/${submissionId}/state`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ data: body.data }),
    },
  );

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
