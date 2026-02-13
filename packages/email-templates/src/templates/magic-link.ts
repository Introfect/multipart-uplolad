export function renderMagicLinkEmail({ verifyUrl }: { verifyUrl: string }): string {
  return `<p>Click the link below to continue:</p><p><a href=\"${verifyUrl}\">Verify magic link</a></p>`;
}
