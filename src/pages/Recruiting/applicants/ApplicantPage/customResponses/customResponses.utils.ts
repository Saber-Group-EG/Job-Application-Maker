import type {
  ArrayObjectItemModel,
  CustomFieldLike,
  NormalizedValueModel,
  ObjectFieldModel,
  UnknownRecord,
} from '../../../../../types/applicants';

const LABEL_MAPPING: Record<string, string> = {
  birthdate: 'Birth Date',
  birth_date: 'Birth Date',
  birthDate: 'Birth Date',
  work_experience: 'Work Experience',
  workExperience: 'Work Experience',
  courses_certifications: 'Courses & Certifications',
  coursesCertifications: 'Courses & Certifications',
  education_level: 'Education Level',
  educationLevel: 'Education Level',
  expected_salary: 'Expected Salary',
  expectedSalary: 'Expected Salary',
  military_status: 'Military Status',
  militaryStatus: 'Military Status',
  personal_skills: 'Personal Skills',
  personalSkills: 'Personal Skills',
  gender: 'Gender',
};

const EXPECTED_SALARY_KEYS = new Set([
  'expectedsalary',
  'expected_salary',
  'expected salary',
  'expected',
  'الراتبالمتوقع',
  'الراتب_المتوقع',
  'راتب',
]);

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isPlainObject = (value: unknown): value is UnknownRecord => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

export const isArabic = (text?: unknown): boolean => {
  if (!isString(text)) return false;
  return /[\u0600-\u06FF]/.test(text);
};

export const toPlainString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (isString(value)) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (isPlainObject(value)) {
    if (isString(value.en)) return value.en;
    if (isString(value.ar)) return value.ar;
    if (isString(value.value)) return value.value;
  }

  return String(value);
};

export const normalizeLookupToken = (value: unknown): string => {
  return String(value || '')
    .toLowerCase()
    .replace(/\u200e|\u200f/g, '')
    .replace(/[^\w\u0600-\u06FF\s]/g, ' ')
    .replace(/[\s_-]+/g, ' ')
    .trim();
};

export const formatLabel = (key: string): string => {
  if (!key) return '';
  if (LABEL_MAPPING[key]) return LABEL_MAPPING[key];

  const normalized = key.replace(/\s|_|-/g, '').toLowerCase();
  if (LABEL_MAPPING[normalized]) return LABEL_MAPPING[normalized];

  if (/[\u0600-\u06FF]/.test(key)) {
    return key.replace(/[_-]+/g, ' ');
  }

  let title = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  title = title.replace(/\b\w/g, (char) => char.toUpperCase());
  return title;
};

export const getCustomFieldLabel = (field: CustomFieldLike): string => {
  return toPlainString(field?.label) || String(field?.fieldId || '') || 'Custom Field';
};

export const tryParseJson = (value: unknown): unknown => {
  if (!isString(value)) return value;

  const trimmed = value.trim();
  const isJsonObject = trimmed.startsWith('{') && trimmed.endsWith('}');
  const isJsonArray = trimmed.startsWith('[') && trimmed.endsWith(']');

  if (!isJsonObject && !isJsonArray) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

export const findReadableValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (isString(value)) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    const parts = value.map((item) => findReadableValue(item)).filter(Boolean);
    return parts.join(', ');
  }

  if (isPlainObject(value)) {
    const direct = value.answer ?? value.value ?? value.en ?? value.ar ?? null;
    if (direct !== null && direct !== undefined) {
      const directText = findReadableValue(direct);
      if (directText) return directText;
    }

    const entries = Object.entries(value)
      .filter(([entryKey, entryValue]) => entryKey !== '_id' && entryKey !== 'id' && entryValue !== null && entryValue !== undefined)
      .map(([entryKey, entryValue]) => {
        const entryText = findReadableValue(entryValue);
        if (!entryText) return '';

        const label = formatLabel(entryKey);
        return label && label !== entryKey ? `${label}: ${entryText}` : entryText;
      })
      .filter(Boolean);

    return entries.join(' | ');
  }

  return String(value).trim();
};

export const containsArabicInValue = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    if (value.length === 0) return false;

    return value.some((item) => {
      if (isString(item)) return isArabic(item);
      if (isPlainObject(item)) return Object.values(item).some((entry) => isString(entry) && isArabic(entry));
      return false;
    });
  }

  if (isString(value)) return isArabic(value);
  if (isPlainObject(value)) return Object.values(value).some((entry) => isString(entry) && isArabic(entry));
  return false;
};

export const isExpectedSalaryResponseKey = (key: string): boolean => {
  const normalized = key.toString().replace(/\s|_|-/g, '').toLowerCase();
  return EXPECTED_SALARY_KEYS.has(normalized);
};

export const findMatchingResponseKeyForField = (field: CustomFieldLike, responses: UnknownRecord): string => {
  if (!isPlainObject(responses)) return '';

  const fieldId = String(field?.fieldId || '');
  if (fieldId && Object.prototype.hasOwnProperty.call(responses, fieldId)) {
    return fieldId;
  }

  const directCandidates = [field?.label && isPlainObject(field.label) ? field.label.en : undefined, field?.label && isPlainObject(field.label) ? field.label.ar : undefined, toPlainString(field?.label)]
    .filter(Boolean)
    .map((value) => String(value));

  for (const candidate of directCandidates) {
    if (Object.prototype.hasOwnProperty.call(responses, candidate)) {
      return candidate;
    }
  }

  const normalizedTargets = new Set<string>();
  [fieldId, ...directCandidates]
    .filter(Boolean)
    .forEach((token) => {
      const normalized = normalizeLookupToken(token);
      if (!normalized) return;
      normalizedTargets.add(normalized);
      normalizedTargets.add(normalized.replace(/^rec/, ''));
      normalizedTargets.add(normalized.replace(/^sav/, ''));
    });

  for (const key of Object.keys(responses)) {
    const normalizedKey = normalizeLookupToken(key);
    if (!normalizedKey) continue;
    if (normalizedTargets.has(normalizedKey)) return key;

    for (const target of normalizedTargets) {
      if (!target) continue;
      if (normalizedKey.includes(target) || target.includes(normalizedKey)) {
        return key;
      }
    }
  }

  return '';
};

export const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const toHttpUrl = (value: string): string => (isUrl(value) ? value : `http://${value}`);

const toArrayObjectItems = (value: unknown[]): ArrayObjectItemModel[] => {
  return value
    .map((item, itemIndex) => {
      if (!isPlainObject(item)) return null;

      const summaryText = findReadableValue(item) || `Item ${itemIndex + 1}`;
      const summaryIsArabic = isArabic(summaryText);
      const summaryDisplay = summaryIsArabic
        ? summaryText.length > 30
          ? `...${summaryText.slice(-30)}`
          : summaryText
        : summaryText.length > 30
        ? `${summaryText.substring(0, 30)}...`
        : summaryText;

      return {
        itemIndex,
        summaryText,
        summaryDisplay,
        summaryIsArabic,
        value: item,
      };
    })
    .filter((item): item is ArrayObjectItemModel => Boolean(item));
};

const normalizePrimitive = (value: string | number | boolean): NormalizedValueModel => {
  const text = String(value);
  const href = isUrl(text) ? text : undefined;

  return {
    kind: 'primitive',
    text,
    href,
    isArabic: isArabic(text),
    multiline: text.includes('\n'),
  };
};

export const normalizeResponseValue = (value: unknown): NormalizedValueModel => {
  const parsedValue = tryParseJson(value);

  if (parsedValue === null || parsedValue === undefined) {
    return { kind: 'empty' };
  }

  if (typeof parsedValue === 'string' || typeof parsedValue === 'number' || typeof parsedValue === 'boolean') {
    return normalizePrimitive(parsedValue);
  }

  if (Array.isArray(parsedValue)) {
    if (parsedValue.length === 0) return { kind: 'empty' };

    if (isPlainObject(parsedValue[0])) {
      return {
        kind: 'array-object',
        items: toArrayObjectItems(parsedValue),
      };
    }

    const text = parsedValue.map((item) => String(item)).join(', ');
    if (!text.trim()) return { kind: 'empty' };

    return {
      kind: 'array-primitive',
      text,
      isArabic: parsedValue.some((item) => isArabic(String(item))),
    };
  }

  if (isPlainObject(parsedValue)) {
    const candidate = parsedValue.answer ?? parsedValue.value ?? parsedValue.en ?? parsedValue.ar ?? null;
    if (candidate !== null && candidate !== undefined && (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean')) {
      const normalized = normalizePrimitive(candidate);
      const isUrlType = normalized.kind === 'primitive' && (Boolean(normalized.href) || String(parsedValue.type || '').toLowerCase() === 'url');
      if (normalized.kind === 'primitive' && isUrlType) {
        return {
          ...normalized,
          href: toHttpUrl(normalized.text),
        };
      }
      return normalized;
    }

    return {
      kind: 'object',
      value: parsedValue,
    };
  }

  return normalizePrimitive(String(parsedValue));
};

export const buildObjectFieldModels = (value: UnknownRecord): ObjectFieldModel[] => {
  return Object.entries(value)
    .filter(([fieldKey, fieldValue]) => {
      if (fieldKey === '_id' || fieldKey === 'id') return false;
      if (fieldValue === null || fieldValue === undefined) return false;
      if (isString(fieldValue)) return fieldValue.trim() !== '';
      if (typeof fieldValue === 'number' || typeof fieldValue === 'boolean') return true;
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      return true;
    })
    .map(([fieldKey, fieldValue]) => {
      const label = formatLabel(fieldKey);
      const normalized = normalizeResponseValue(fieldValue);

      let displayText = '-';
      let href: string | undefined;
      let nestedObject: UnknownRecord | undefined;

      if (normalized.kind === 'primitive') {
        displayText = normalized.text || '-';
        href = normalized.href;
      } else if (normalized.kind === 'array-primitive') {
        displayText = normalized.text || '-';
      } else if (normalized.kind === 'array-object') {
        displayText = findReadableValue(fieldValue) || 'Object';
      } else if (normalized.kind === 'object') {
        displayText = findReadableValue(normalized.value) || 'Object';
        nestedObject = normalized.value;
      }

      const rowIsArabic = isArabic(displayText) || isArabic(label);

      return {
        fieldKey,
        label,
        displayText,
        rowIsArabic,
        canTruncate: displayText.length > 20,
        href,
        nestedObject,
        rawValue: fieldValue,
      };
    });
};
