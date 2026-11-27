import * as config from '../config';

describe('release config', () => {
  it.each(Object.entries(config))('%s is filled in', (_name, value) => {
    expect(typeof value).toBe('string');
    expect(String(value).trim()).not.toBe('');
    expect(String(value)).not.toMatch(/\[|POPUNI|TODO|example\.com/i);
  });

  it('links are https', () => {
    for (const url of [config.POLICY_URL, config.TERMS_URL, config.SUPPORT_URL]) expect(url).toMatch(/^https:\/\//);
  });
});
