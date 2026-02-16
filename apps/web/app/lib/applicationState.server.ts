import type { AppLoadContext } from "react-router";
import { fetchBackendJson, type BackendJsonResult } from "./backend-api.server";
import type { PersistedFormState } from "../types/persistence.types";

//  Removed ApplicationStateResponse type since we're using BackendJsonResult directly

export async function getApplicationState({
  context,
  apiKey,
  submissionId,
}: {
  context: AppLoadContext;
  apiKey: string;
  submissionId: string;
}): Promise<BackendJsonResult<PersistedFormState>> {
  return fetchBackendJson<PersistedFormState>({
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
