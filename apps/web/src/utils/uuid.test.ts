import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUuid } from './uuid.js';

describe('generateUuid utility', () => {
  const originalCrypto = globalThis.crypto;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('generates valid UUID v4 format with native crypto', () => {
    const id = generateUuid();
    expect(id).toMatch(uuidRegex);
  });

  it('generates valid UUID v4 format when crypto.randomUUID is missing (insecure context)', () => {
    const mockCrypto = {
      getRandomValues: (buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
      },
    };
    Object.defineProperty(globalThis, 'crypto', { value: mockCrypto, configurable: true });

    const id = generateUuid();
    expect(id).toMatch(uuidRegex);
  });

  it('generates valid UUID v4 format when entire crypto object is missing', () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });

    const id = generateUuid();
    expect(id).toMatch(uuidRegex);
  });

  it('generates unique values across multiple calls', () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) {
      set.add(generateUuid());
    }
    expect(set.size).toBe(100);
  });
});
