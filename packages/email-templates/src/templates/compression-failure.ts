export function renderCompressionFailureEmail({ applicationId, errorMessage }: { applicationId: string; errorMessage: string }): string {
  return `<p>Application ${applicationId} processing failed.</p><p>${errorMessage}</p>`;
}
