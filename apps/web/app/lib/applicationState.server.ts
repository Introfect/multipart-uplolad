import type { AppLoadContext } from "@remix-run/cloudflare";
import { fetchBackendJson } from "./backend-api.server";
import type { PersistedFormState } from "../types/persistence.types";

type ApplicationStateResponse =
  | {
      ok: true;
      data: PersistedFormState;
    }
  | {
      ok: false;
      errorCode: string;
      error: string;
    };

export async function getApplicationState({
  context,
  apiKey,
  submissionId,
}: {
  context: AppLoadContext;
  apiKey: string;
  submissionId: string;
}): Promise<ApplicationStateResponse> {
  return fetchBackendJson<ApplicationStateResponse>({
    context,
    path: `/api/v1/application/${submissionId}/state`,
    init: {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    },
  });
}
