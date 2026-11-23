import { pl } from '@fastself/core';
import asistent from './asistent';
import brisanje from './brisanje';
import common from './common';
import danas from './danas';
import kalendar from './kalendar';
import nalog from './nalog';
import notif from './notif';
import onboarding from './onboarding';
import plan from './plan';
import profil from './profil';
import report from './report';
import tajmer from './tajmer';

const strings: Record<string, string> = {
  ...common,
  ...onboarding,
  ...nalog,
  ...danas,
  ...kalendar,
  ...tajmer,
  ...profil,
  ...asistent,
  ...plan,
  ...report,
  ...brisanje,
  ...notif,
};

export type CopyParams = Record<string, string | number>;

export function t(key: string, params?: CopyParams): string {
  const text = strings[key];
  if (text === undefined) return key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export { pl };
