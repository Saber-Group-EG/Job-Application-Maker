import type {
  Applicant,
  LeafQuestion,
  Question,
  ResponseSection,
} from '../../../../types/applicants';
import { toPlainString } from '../../../../utils/strings';

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return toPlainString(value);
  }
};

const humanizeKey = (key: string): string =>
  String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isStructuredAnswer = (value: unknown): value is { type?: string; answer?: unknown; value?: unknown } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== 'string') return false;
  return 'answer' in obj || 'value' in obj;
};

const isGroupLikeArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => item && typeof item === 'object' && !Array.isArray(item));

const toGroupArray = (value: unknown): Record<string, unknown>[] => {
  if (isGroupLikeArray(value)) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return [value as Record<string, unknown>];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return toGroupArray(parsed);
      } catch {
        return [];
      }
    }
  }
  return [];
};

const getMatchedInputType = (field: unknown): string | null => {
  if (!field || typeof field !== 'object') return null;
  const t = (field as { inputType?: unknown; type?: unknown }).inputType
    ?? (field as { type?: unknown }).type;
  if (typeof t !== 'string') return null;
  return t.toLowerCase();
};

const JOB_INPUT_TYPE_MAP: Record<string, string> = {
  dropdown: 'dropdown',
  select: 'dropdown',
  radio: 'radio',
  radio_group: 'radio',
  tags: 'tags',
  checkbox: 'checkbox',
  textarea: 'textarea',
  text: 'text',
  short_text: 'text',
  long_text: 'textarea',
  number: 'number',
  date: 'date',
  email: 'email',
  url: 'url',
  phone: 'text',
  file: 'text',
};

const findFieldForKey = (key: string, fields: unknown[]): Record<string, unknown> | null => {
  const normalize = (s: unknown): string => String(s ?? '').trim().toLowerCase();
  const expandForms = (s: string): string[] => {
    const out = new Set<string>();
    const base = normalize(s);
    if (!base) return [];
    out.add(base);
    out.add(base.replace(/\s+/g, '_'));
    out.add(base.replace(/_/g, ' '));
    return Array.from(out);
  };
  const needleForms = new Set(expandForms(key));
  if (needleForms.size === 0) return null;

  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    const obj = f as {
      fieldId?: unknown;
      fieldKey?: unknown;
      id?: unknown;
      name?: unknown;
      label?: unknown;
      groupFields?: unknown;
      choices?: unknown;
    };

    const candidates: unknown[] = [
      obj.fieldId,
      obj.fieldKey,
      obj.id,
      obj.name,
    ];
    if (obj.label && typeof obj.label === 'object') {
      const lbl = obj.label as { en?: unknown; ar?: unknown };
      candidates.push(lbl.en, lbl.ar);
    }
    for (const c of candidates) {
      for (const form of expandForms(String(c ?? ''))) {
        if (needleForms.has(form)) return obj;
      }
    }

    if (Array.isArray(obj.groupFields)) {
      const sub = findFieldForKey(key, obj.groupFields as unknown[]);
      if (sub) return sub;
    }
  }
  return null;
};

const lookupJobInputType = (key: string, customFields: unknown): string | null => {
  if (!Array.isArray(customFields)) return null;
  const fields: unknown[] = customFields;
  const field = findFieldForKey(key, fields);
  if (!field) return null;
  const t = (field as { inputType?: unknown; type?: unknown }).inputType
    ?? (field as { type?: unknown }).type;
  if (typeof t !== 'string') return null;
  const mapped = JOB_INPUT_TYPE_MAP[t.toLowerCase()];
  return mapped ?? null;
};

const inferQuestionType = (key: string, value: unknown, customFields?: unknown): string => {
  const fromJob = lookupJobInputType(key, customFields);
  if (fromJob) return fromJob;

  if (isStructuredAnswer(value)) {
    const t = (value as { type?: string }).type;
    if (t) return t;
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  if (Array.isArray(value)) return 'tags';

  const lower = key.toLowerCase();
  if (/(_at$|^.*_date$|date$|dob$|birth)/.test(lower)) return 'date';
  if (lower.includes('email')) return 'email';
  if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url';
  if (
    lower.includes('salary') ||
    lower.includes('number') ||
    lower.includes('count') ||
    lower.includes('amount') ||
    lower.includes('score')
  )
    return 'number';
  if (
    lower.includes('description') ||
    lower.includes('notes') ||
    lower.includes('responsibilit') ||
    lower.includes('reason') ||
    lower.includes('address')
  )
    return 'textarea';
  return 'text';
};

const extractAnswer = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isStructuredAnswer(value)) {
    const a = (value as { answer?: unknown; value?: unknown }).answer;
    if (a !== undefined) return stringifyValue(a);
    const v = (value as { value?: unknown }).value;
    if (v !== undefined) return stringifyValue(v);
  }
  return stringifyValue(value);
};

const extractLocalizedText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const obj = value as { en?: unknown; ar?: unknown; value?: unknown; label?: unknown; name?: unknown; text?: unknown };
    if (typeof obj.en === 'string' && obj.en.trim()) return obj.en;
    if (typeof obj.ar === 'string' && obj.ar.trim()) return obj.ar;
    if (typeof obj.value === 'string' && obj.value.trim()) return obj.value;
    if (typeof obj.label === 'string' && obj.label.trim()) return obj.label;
    if (typeof obj.name === 'string' && obj.name.trim()) return obj.name;
    if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;
  }
  return toPlainString(value);
};

const extractFieldChoices = (field: unknown): string[] => {
  if (!field || typeof field !== 'object') return [];
  const f = field as { choices?: unknown; options?: unknown; values?: unknown; items?: unknown };
  let raw: unknown = f.choices ?? f.options ?? f.values ?? f.items ?? [];
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object') {
      raw = Object.values(raw as Record<string, unknown>);
    } else {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((choice) => extractLocalizedText(choice))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const extractFieldLabel = (field: unknown): string | null => {
  if (!field || typeof field !== 'object') return null;
  const lbl = (field as { label?: unknown }).label;
  if (lbl && typeof lbl === 'object') {
    const obj = lbl as { en?: unknown; ar?: unknown };
    if (typeof obj.en === 'string' && obj.en.trim()) return obj.en.trim();
    if (typeof obj.ar === 'string' && obj.ar.trim()) return obj.ar.trim();
  }
  return null;
};

const buildLeafQuestion = (
  id: string,
  key: string,
  value: unknown,
  choices: string[] = [],
  customFields: unknown = [],
  matchedField: Record<string, unknown> | null = null,
): LeafQuestion => {
  const type = inferQuestionType(key, value, customFields);
  const labelText = extractFieldLabel(matchedField);
  const text = labelText ?? humanizeKey(key);
  const answer = extractAnswer(value);

  switch (type) {
    case 'textarea':
      return { id, type: 'textarea', text, value: answer, rows: 3 };
    case 'email':
      return { id, type: 'email', text, value: answer };
    case 'date':
      return { id, type: 'date', text, value: answer };
    case 'url':
      return { id, type: 'url', text, value: answer };
    case 'number': {
      const num = Number(answer);
      return { id, type: 'number', text, value: Number.isFinite(num) ? num : 0 };
    }
    case 'checkbox':
      return { id, type: 'checkbox', text, checked: answer === 'true' || answer === '1' };
    case 'radio':
      return { id, type: 'radio', text, options: choices, selectedValue: answer };
    case 'dropdown':
      return { id, type: 'dropdown', text, options: choices, selectedValue: answer };
    case 'tags': {
      const values = Array.isArray(value)
        ? value.map((v) => String(v)).filter(Boolean)
        : answer
          ? answer.split(',').map((v) => v.trim()).filter(Boolean)
          : [];
      return { id, type: 'tags', text, values, options: choices };
    }
    case 'text':
    default:
      return { id, type: 'text', text, value: answer };
  }
};

const buildCustomResponseSections = (
  applicant: Applicant | null | undefined,
  customFields: unknown = [],
): ResponseSection[] => {
  if (!applicant) return [];

  const collectResponses = (a: unknown): Record<string, unknown> => {
    if (!a || typeof a !== 'object') return {};
    const obj = a as Record<string, unknown>;
    const candidates: Record<string, unknown> = {};
    const sources: unknown[] = [
      obj.customResponses,
      obj.customFieldResponses,
      obj.fieldResponses,
      obj.responses,
    ];
    for (const s of sources) {
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        Object.assign(candidates, s as Record<string, unknown>);
      }
    }
    return candidates;
  };

  const raw: Record<string, unknown> = (() => {
    const collected = collectResponses(applicant);
    const appObj = applicant as unknown as Record<string, unknown>;
    const wrapped = (appObj.applicant ?? appObj.data ?? appObj.result) as unknown;
    if (wrapped && wrapped !== applicant) {
      Object.assign(collected, collectResponses(wrapped));
    }
    return collected;
  })();

  const questions: Question[] = [];
  const fieldsList: unknown[] = Array.isArray(customFields) ? customFields : [];

  Object.entries(raw).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && !value.trim()) return;
    if (Array.isArray(value) && value.length === 0) return;

    const matchedField = findFieldForKey(key, fieldsList);
    const choices = extractFieldChoices(matchedField);

    const groupLabel =
      extractFieldLabel(matchedField) ?? humanizeKey(key);

    const matchedInputType = getMatchedInputType(matchedField);
    const isGroupField = matchedInputType === 'repeatable_group' || matchedInputType === 'group';
    const groupArray = toGroupArray(value);
    const looksLikeGroupValue =
      groupArray.length > 0 || (typeof value === 'object' && value !== null && !Array.isArray(value));

    if (groupArray.length > 0 || isGroupField || looksLikeGroupValue) {
      const entries = groupArray.length > 0 ? groupArray : [{}];
      const META_KEYS = new Set(['type', 'inputType', 'questionType', 'kind', 'fieldType']);
      entries.forEach((item, index) => {
        const groupId = `${key}_${index}`;
        const itemObj = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const hasAnswerKey = 'answer' in itemObj || 'value' in itemObj;
        const subEntries = Object.entries(itemObj).filter(([k, v]) => {
          if (META_KEYS.has(k)) return false;
          if (hasAnswerKey && (k === 'answer' || k === 'value')) return true;
          if (v === null || v === undefined) return false;
          if (typeof v === 'string' && !v.trim()) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        });

        let subQuestions: LeafQuestion[];
        if (subEntries.length === 0 && Array.isArray(matchedField?.groupFields)) {
          subQuestions = (matchedField.groupFields as unknown[])
            .map((gf) => {
              if (!gf || typeof gf !== 'object') return null;
              const subField = gf as Record<string, unknown>;
              const subKey = String(subField.fieldId ?? '');
              if (!subKey) return null;
              const subChoices = extractFieldChoices(subField);
              return buildLeafQuestion(
                `${groupId}_${subKey}`,
                subKey,
                undefined,
                subChoices,
                fieldsList,
                subField,
              );
            })
            .filter((q): q is LeafQuestion => q !== null);
        } else {
          subQuestions = subEntries.map(([subKey, subValue]) => {
            const subField = findFieldForKey(subKey, fieldsList);
            const subChoices = extractFieldChoices(subField);
            return buildLeafQuestion(
              `${groupId}_${subKey}`,
              subKey,
              subValue,
              subChoices,
              fieldsList,
              subField,
            );
          });
        }
        if (subQuestions.length === 0) return;
        questions.push({
          id: groupId,
          type: 'group',
          text: `Entry ${index + 1}`,
          groupId,
          groupName: `${groupLabel} #${index + 1}`,
          questions: subQuestions,
        });
      });
      return;
    }

    questions.push(
      buildLeafQuestion(key, key, value, choices, fieldsList, matchedField),
    );
  });

  if (questions.length === 0) return [];

  return [
    {
      id: 'applicant_responses',
      title: 'Application Responses',
      description: 'Custom field responses submitted with the application',
      questions,
    },
  ];
};

const extractCustomFieldsFromJobPosition = (jobPosition: unknown): unknown[] => {
  if (!jobPosition || typeof jobPosition !== 'object') return [];
  const sources: unknown[] = [
    jobPosition,
    (jobPosition as { jobPosition?: unknown }).jobPosition,
    (jobPosition as { data?: { jobPosition?: unknown } }).data?.jobPosition,
  ];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const cf = (source as { customFields?: unknown }).customFields;
    if (Array.isArray(cf)) return cf;
  }
  return [];
};

export {
  humanizeKey,
  isStructuredAnswer,
  isGroupLikeArray,
  toGroupArray,
  getMatchedInputType,
  lookupJobInputType,
  inferQuestionType,
  extractAnswer,
  extractLocalizedText,
  extractFieldChoices,
  findFieldForKey,
  extractFieldLabel,
  buildLeafQuestion,
  buildCustomResponseSections,
  extractCustomFieldsFromJobPosition,
};
