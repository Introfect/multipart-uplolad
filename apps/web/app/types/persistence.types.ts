export type FormFieldId = string; // e.g., "q1", "q2", etc.

export type CompletedUploadFile = {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  completedAt: string;
};

export type CompletedMultiUploadFile = CompletedUploadFile & {
  key: string;
};

export type PersistedFormState = {
  version: 1;
  singleUploads: Partial<Record<FormFieldId, CompletedUploadFile>>;
  multiUploads: Partial<Record<FormFieldId, CompletedMultiUploadFile[]>>;
};

export type FormStateMachineContext = {
  submissionId: string;
  state: PersistedFormState;
  isDirty: boolean;
};

export type FormStateMachineEvents =
  | { type: "INIT_STATE"; state: PersistedFormState }
  | { type: "ADD_SINGLE_UPLOAD"; fieldId: FormFieldId; upload: CompletedUploadFile }
  | { type: "REMOVE_SINGLE_UPLOAD"; fieldId: FormFieldId }
  | { type: "ADD_MULTI_UPLOAD"; fieldId: FormFieldId; upload: CompletedMultiUploadFile }
  | { type: "REMOVE_MULTI_UPLOAD"; fieldId: FormFieldId; key: string }
  | { type: "MARK_SAVED" };
