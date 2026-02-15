import { z } from "zod";
import type { ActionFunctionArgs } from "react-router";
import { UploadQuestionIds } from "@repo/upload-contracts";
import {
  abortMultipartUploadSession,
  completeMultipartUploadSession,
  initiateMultipartUpload,
  submitTenderDocuments,
} from "~/lib/upload.server";
import {
  clearApiKeyCookie,
  getApiKeyFromRequest,
} from "~/lib/auth.server";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const UploadMutationSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("initiate"),
    tenderId: z.string().trim().min(1),
    questionId: z.enum(UploadQuestionIds),
    fileName: z.string().trim().min(1),
    fileSizeBytes: z.number().int().positive(),
    contentType: z.string().trim().min(1),
  }),
  z.object({
    intent: z.literal("complete"),
    tenderId: z.string().trim().min(1),
    uploadSessionId: z.string().trim().min(1),
    parts: z
      .array(
        z.object({
          partNumber: z.number().int().positive(),
          etag: z.string().trim().min(1),
        })
      )
      .min(1)
      .optional(),
    etag: z.string().trim().min(1).optional(),
  }),
  z.object({
    intent: z.literal("abort"),
    tenderId: z.string().trim().min(1),
    uploadSessionId: z.string().trim().min(1),
  }),
  z.object({
    intent: z.literal("submit"),
    tenderId: z.string().trim().min(1),
  }),
]);

function parseJsonBody(bodyText: string): { ok: true; value: JsonValue } | { ok: false } {
  if (bodyText.trim().length === 0) {
    return { ok: false } as const;
  }

  try {
    const parsed = JSON.parse(bodyText) as JsonValue;
    return { ok: true, value: parsed } as const;
  } catch {
    return { ok: false } as const;
  }
}

function getInvalidRequestResponse() {
  return Response.json(
    {
      ok: false,
      errorCode: "INVALID_INPUT",
      error: "Invalid upload mutation request",
    } as const,
    { status: 400 }
  );
}

export async function action({ request, context }: ActionFunctionArgs) {
  const parsedBody = parseJsonBody(await request.text());
  if (!parsedBody.ok) {
    return getInvalidRequestResponse();
  }

  const parsedMutation = UploadMutationSchema.safeParse(parsedBody.value);
  if (!parsedMutation.success) {
    return getInvalidRequestResponse();
  }

  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        errorCode: "INVALID_API_KEY",
        error: "API key is required",
      } as const,
      {
        status: 401,
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      }
    );
  }

  const mutation = parsedMutation.data;

  if (mutation.intent === "initiate") {
    const result = await initiateMultipartUpload({
      context,
      apiKey,
      tenderId: mutation.tenderId,
      questionId: mutation.questionId,
      fileName: mutation.fileName,
      fileSizeBytes: mutation.fileSizeBytes,
      contentType: mutation.contentType,
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          errorCode: result.errorCode,
          error: result.error,
          debug: result.debug,
        } as const,
        {
          status: result.status,
          headers:
            result.status === 401
              ? {
                  "Set-Cookie": await clearApiKeyCookie(request),
                }
              : undefined,
        }
      );
    }

    return Response.json(
      {
        ok: true,
        data: result.data,
      } as const,
      { status: 200 }
    );
  }

  if (mutation.intent === "complete") {
    const result = await completeMultipartUploadSession({
      context,
      apiKey,
      tenderId: mutation.tenderId,
      uploadSessionId: mutation.uploadSessionId,
      parts: mutation.parts,
      etag: mutation.etag,
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          errorCode: result.errorCode,
          error: result.error,
          debug: result.debug,
        } as const,
        {
          status: result.status,
          headers:
            result.status === 401
              ? {
                  "Set-Cookie": await clearApiKeyCookie(request),
                }
              : undefined,
        }
      );
    }

    return Response.json(
      {
        ok: true,
        data: result.data,
      } as const,
      { status: 200 }
    );
  }

  if (mutation.intent === "abort") {
    const result = await abortMultipartUploadSession({
      context,
      apiKey,
      tenderId: mutation.tenderId,
      uploadSessionId: mutation.uploadSessionId,
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          errorCode: result.errorCode,
          error: result.error,
          debug: result.debug,
        } as const,
        {
          status: result.status,
          headers:
            result.status === 401
              ? {
                  "Set-Cookie": await clearApiKeyCookie(request),
                }
              : undefined,
        }
      );
    }

    return Response.json(
      {
        ok: true,
        data: result.data,
      } as const,
      { status: 200 }
    );
  }

  const result = await submitTenderDocuments({
    context,
    apiKey,
    tenderId: mutation.tenderId,
  });

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        errorCode: result.errorCode,
        error: result.error,
        debug: result.debug,
      } as const,
      {
        status: result.status,
        headers:
          result.status === 401
            ? {
                "Set-Cookie": await clearApiKeyCookie(request),
              }
            : undefined,
      }
    );
  }

  return Response.json(
    {
      ok: true,
      data: result.data,
    } as const,
    { status: 200 }
  );
}
