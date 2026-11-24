import { getDb } from '../index';
import { kvGet, kvSet, type KvKey } from './kv';

export type ConsentKind = 'ai' | 'practices' | 'allergies' | 'history';

const KEY: Record<ConsentKind, KvKey> = {
  ai: 'consent_ai',
  practices: 'consent_sync_practices',
  allergies: 'consent_sync_allergies',
  history: 'consent_sync_history',
};

/** Local consent flags. Every consent is off until the user turns it on. */
export const consents = {
  set(kind: ConsentKind, on: boolean): void {
    kvSet(getDb(), KEY[kind], on ? '1' : '0');
  },

  get(kind: ConsentKind): boolean {
    return kvGet(getDb(), KEY[kind]) === '1';
  },
};
