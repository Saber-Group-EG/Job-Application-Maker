import { toPlainString } from './strings';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const CANDIDATE_KEYS = [
  'address',
  'addresses',
  'location',
  'locations',
  'officeAddress',
] as const;

const pickFirst = (container: Record<string, unknown>, key: string): unknown => {
  const direct = container[key];
  if (direct === undefined) return undefined;
  if (isPlainObject(direct)) {
    const settings = (direct as Record<string, unknown>).settings;
    if (isPlainObject(settings)) {
      for (const k of CANDIDATE_KEYS) {
        const v = settings[k];
        if (v !== undefined && v !== null) return v;
      }
    }
  }
  return direct;
};

export const resolveCompanyAddress = (company: unknown): string => {
  if (!company) return '';
  const comp = company as Record<string, unknown>;

  for (const key of CANDIDATE_KEYS) {
    const v = pickFirst(comp, key);
    const resolved = v !== undefined ? toPlainString(v) : '';
    if (resolved && resolved.trim()) return resolved.trim();
  }

  for (const key of Object.keys(comp)) {
    if (!/address|location/i.test(key)) continue;
    const v = comp[key];
    if (v === undefined || v === null) continue;
    const resolved = toPlainString(v);
    if (resolved && resolved.trim()) return resolved.trim();
  }

  return '';
};
