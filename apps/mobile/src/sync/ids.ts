import type { SyncTable } from '@/db/outbox';

// Fixed ids for rows that have a natural key (a practice, an allergy, a day mark), so the same row made on two phones
// is one row on the server. uuid v5 (RFC 9562 §5.5) on a small SHA-1: expo-crypto has no native module under Jest and
// its digest is async, and crypto.subtle is not on every phone. Pure TypeScript, synchronous, no dependencies.

/** The namespace of every fixed sync id. Never change it: the ids on the server are made from it. */
export const SYNC_ID_NAMESPACE = 'a3f1c6e2-5b7d-4c89-9e14-6d2b8f0a7c35';

/** UTF-8 bytes of a string. A lone surrogate becomes U+FFFD, as in TextEncoder. */
export function utf8(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else {
      out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return out;
}

const rotl = (x: number, n: number): number => (x << n) | (x >>> (32 - n));

/** SHA-1 (FIPS 180-4) of the bytes: 20 bytes. */
export function sha1(bytes: readonly number[]): number[] {
  const data = bytes.slice();
  const bitLength = bytes.length * 8;
  data.push(0x80);
  while (data.length % 64 !== 56) data.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (const word of [high, low])
    data.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);

  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const w = new Array<number>(80).fill(0);
  const at = (i: number): number => data[i] ?? 0;
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (at(j) << 24) | (at(j + 1) << 16) | (at(j + 2) << 8) | at(j + 3);
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl((w[i - 3] ?? 0) ^ (w[i - 8] ?? 0) ^ (w[i - 14] ?? 0) ^ (w[i - 16] ?? 0), 1);
    }
    let [a, b, c, d, e] = [h[0] ?? 0, h[1] ?? 0, h[2] ?? 0, h[3] ?? 0, h[4] ?? 0];
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (rotl(a, 5) + f + e + k + (w[i] ?? 0)) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = t;
    }
    h[0] = ((h[0] ?? 0) + a) | 0;
    h[1] = ((h[1] ?? 0) + b) | 0;
    h[2] = ((h[2] ?? 0) + c) | 0;
    h[3] = ((h[3] ?? 0) + d) | 0;
    h[4] = ((h[4] ?? 0) + e) | 0;
  }

  const out: number[] = [];
  for (const word of h) out.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  return out;
}

const hex = (byte: number): string => byte.toString(16).padStart(2, '0');

/** uuid v5 of a name in a namespace (a uuid string). */
export function uuidV5(namespace: string, name: string): string {
  const compact = namespace.replace(/-/g, '');
  const ns: number[] = [];
  for (let i = 0; i < 32; i += 2) ns.push(parseInt(compact.slice(i, i + 2), 16));
  const bytes = sha1([...ns, ...utf8(name)]).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const s = bytes.map(hex).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/**
 * The fixed id of a row with a natural key: `practice`, `kind:code` or `day:kind`. The same user, table and key give
 * the same id on every phone.
 */
export function stableId(userId: string, table: SyncTable, key: string): string {
  return uuidV5(SYNC_ID_NAMESPACE, `${userId}:${table}:${key}`);
}
