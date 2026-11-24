import { randomUUID } from 'expo-crypto';

let generate: () => string = randomUUID;

/** uuid v4 for local rows and the install id. */
export function newId(): string {
  return generate();
}

/** Tests only: expo-crypto has no native module under Jest. */
export function setIdGenerator(fn: () => string): void {
  generate = fn;
}
