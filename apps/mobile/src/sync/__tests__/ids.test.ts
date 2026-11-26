import { SYNC_ID_NAMESPACE, stableId, uuidV5 } from '../ids';

// Node's own SHA-1 and UTF-8 as the reference. The app has no Node types, so the two modules get a minimal shape.
interface Hash {
  update(data: Uint8Array): Hash;
  digest(): Uint8Array;
}
/* eslint-disable @typescript-eslint/no-require-imports */
const { createHash } = require('node:crypto') as { createHash(algorithm: 'sha1'): Hash };
const { Buffer } = require('node:buffer') as { Buffer: { from(text: string, encoding: 'hex' | 'utf8'): Uint8Array } };
/* eslint-enable @typescript-eslint/no-require-imports */

/** uuid v5 (RFC 9562 §5.5) on Node's SHA-1. */
function referenceV5(namespace: string, name: string): string {
  const hash = createHash('sha1')
    .update(Buffer.from(namespace.replace(/-/g, ''), 'hex'))
    .update(Buffer.from(name, 'utf8'))
    .digest();
  const bytes = Array.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const randomUUID = () => globalThis.crypto.randomUUID();

// Letters a custom avoid word may hold, an emoji (a surrogate pair) and the separators of a natural key.
const ALPHABET = ['a', 'z', 'K', '0', ' ', ':', '-', 'č', 'ć', 'š', 'đ', 'ž', 'Č', 'Ž', 'é', '€', '😀', '\u0000'];

function randomName(): string {
  const length = Math.floor(Math.random() * 130);
  let name = '';
  for (let i = 0; i < length; i++) name += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return name;
}

describe('stableId', () => {
  it('matches the RFC example for the DNS namespace', () => {
    expect(uuidV5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.example.com')).toBe(
      '2ed6657d-e927-568b-95e1-2665a8aea6a2',
    );
  });

  it('equals uuid v5 on node:crypto SHA-1 for random names, across one and several SHA-1 blocks', () => {
    for (let i = 0; i < 300; i++) {
      const namespace = randomUUID();
      const name = randomName();
      expect(uuidV5(namespace, name)).toBe(referenceV5(namespace, name));
    }
  });

  it('encodes č, ć, š, đ, ž and a lone surrogate the way UTF-8 does', () => {
    for (const name of ['čćšđž', 'ČĆŠĐŽ', 'ljuta paprika 🌶', '\ud800x', 'x\udc00']) {
      expect(uuidV5(SYNC_ID_NAMESPACE, name)).toBe(referenceV5(SYNC_ID_NAMESPACE, name));
    }
  });

  it('is `${userId}:${table}:${key}` in the fixed namespace, lowercase, version 5', () => {
    const user = randomUUID();
    const id = stableId(user, 'allergies', 'custom:ćevapi');
    expect(id).toBe(referenceV5(SYNC_ID_NAMESPACE, `${user}:allergies:custom:ćevapi`));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('differs per user, per table and per key, and is the same on every call', () => {
    const ids = new Set([
      stableId('u1', 'practices', 'orthodox'),
      stableId('u2', 'practices', 'orthodox'),
      stableId('u1', 'practices', 'if'),
      stableId('u1', 'day_marks', 'orthodox'),
    ]);
    expect(ids.size).toBe(4);
    expect(stableId('u1', 'practices', 'orthodox')).toBe(stableId('u1', 'practices', 'orthodox'));
  });
});
