/**
 * Browser Web Share API capability detection and safe execution (FR-COMMS-001 §7.2).
 * Strictly handles desktop/mobile, insecure LAN contexts, and AbortError.
 */

export interface ShareFileOptions {
  file: File;
  title: string;
  text?: string;
}

export type ShareResult =
  | { status: 'shared' }
  | { status: 'aborted' }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; message: string };

/**
 * Checks whether the current browser/OS supports sharing files via the Web Share API.
 */
export function canShareFiles(file?: File): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Web Share API requires secure context (HTTPS or localhost)
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return false;
  }

  if (typeof navigator.share !== 'function') {
    return false;
  }

  if (typeof navigator.canShare !== 'function') {
    // If canShare is not supported, we cannot guarantee file sharing
    return false;
  }

  try {
    const dummyFile = file || new File(['test'], 'invoice.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [dummyFile] });
  } catch {
    return false;
  }
}

/**
 * Invokes the native OS share sheet with a generated file.
 * Returns 'aborted' if the user cancelled the dialog (not a failure).
 */
export async function shareFile(options: ShareFileOptions): Promise<ShareResult> {
  const { file, title, text } = options;

  if (!canShareFiles(file)) {
    return {
      status: 'unsupported',
      reason: 'Your browser or current network context does not support native file sharing.',
    };
  }

  try {
    await navigator.share({
      files: [file],
      title,
      text,
    });
    return { status: 'shared' };
  } catch (err: any) {
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      return { status: 'aborted' };
    }
    return {
      status: 'error',
      message: err?.message || 'Failed to open native share sheet',
    };
  }
}
