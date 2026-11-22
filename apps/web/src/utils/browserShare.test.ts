import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canShareFiles, shareFile } from './browserShare.js';

describe('browserShare utility (FR-COMMS-001 §7.2)', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  describe('canShareFiles', () => {
    it('returns false when window or navigator is undefined', () => {
      // In node env without window
      expect(canShareFiles()).toBe(false);
    });

    it('returns false when window is not a secure context and not localhost', () => {
      const mockWindow = {
        isSecureContext: false,
        location: { hostname: '192.168.1.50' },
      };
      const mockNav = {
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(true),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      expect(canShareFiles()).toBe(false);
    });

    it('returns true when secure context and navigator.canShare returns true', () => {
      const mockWindow = {
        isSecureContext: true,
        location: { hostname: 'app.vyapaarkhata.com' },
      };
      const mockNav = {
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(true),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      expect(canShareFiles()).toBe(true);
    });

    it('returns true on localhost even if isSecureContext is false', () => {
      const mockWindow = {
        isSecureContext: false,
        location: { hostname: 'localhost' },
      };
      const mockNav = {
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(true),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      expect(canShareFiles()).toBe(true);
    });

    it('returns false if navigator.canShare returns false', () => {
      const mockWindow = {
        isSecureContext: true,
        location: { hostname: 'localhost' },
      };
      const mockNav = {
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(false),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      expect(canShareFiles()).toBe(false);
    });
  });

  describe('shareFile', () => {
    const dummyFile = new File(['test'], 'invoice.pdf', { type: 'application/pdf' });

    it('returns unsupported when file sharing is not available', async () => {
      const result = await shareFile({
        file: dummyFile,
        title: 'Invoice',
      });
      expect(result.status).toBe('unsupported');
    });

    it('returns shared when navigator.share succeeds', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const mockWindow = {
        isSecureContext: true,
        location: { hostname: 'localhost' },
      };
      const mockNav = {
        share: shareMock,
        canShare: vi.fn().mockReturnValue(true),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      const result = await shareFile({
        file: dummyFile,
        title: 'Tax Invoice INV-001',
        text: 'Here is your invoice',
      });

      expect(result.status).toBe('shared');
      expect(shareMock).toHaveBeenCalledWith({
        files: [dummyFile],
        title: 'Tax Invoice INV-001',
        text: 'Here is your invoice',
      });
    });

    it('returns aborted when user cancels OS share dialog (AbortError)', async () => {
      const abortError = new Error('Share canceled');
      abortError.name = 'AbortError';

      const mockWindow = {
        isSecureContext: true,
        location: { hostname: 'localhost' },
      };
      const mockNav = {
        share: vi.fn().mockRejectedValue(abortError),
        canShare: vi.fn().mockReturnValue(true),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      const result = await shareFile({
        file: dummyFile,
        title: 'Tax Invoice INV-001',
      });

      expect(result.status).toBe('aborted');
    });

    it('returns error when share throws unexpected error', async () => {
      const error = new Error('Permission denied');

      const mockWindow = {
        isSecureContext: true,
        location: { hostname: 'localhost' },
      };
      const mockNav = {
        share: vi.fn().mockRejectedValue(error),
        canShare: vi.fn().mockReturnValue(true),
      };
      Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
      Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true });

      const result = await shareFile({
        file: dummyFile,
        title: 'Tax Invoice INV-001',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.message).toBe('Permission denied');
      }
    });
  });
});
