/**
 * Builds the official WhatsApp Click to Chat URL (FR-COMMS-001 §6.1).
 * The phone number must contain digits only, including country code (no +, spaces, hyphens).
 * The message text is strictly encoded with encodeURIComponent.
 */
export function buildWhatsAppClickToChatUrl(
  phoneDigitsOnly: string,
  message: string
): string {
  // Strip any accidental non-digits or leading plus
  const digits = (phoneDigitsOnly || '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('A valid destination phone number with country digits is required for WhatsApp Click to Chat');
  }

  const encodedMessage = encodeURIComponent(message || '');
  return `https://wa.me/${digits}?text=${encodedMessage}`;
}
