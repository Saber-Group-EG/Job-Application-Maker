import { useCallback, useMemo, useState } from 'react';
import type {
  ApplicantWithCustomResponses,
  CustomFieldLike,
  CustomResponseEntry,
  ExpandedGroupFieldIds,
  ExpandedSectionItemIds,
  ExpandedTextByKey,
  UnknownRecord,
} from '../../../../../types/applicants';
import {
  findMatchingResponseKeyForField,
  formatLabel,
  getCustomFieldLabel,
  isExpectedSalaryResponseKey,
  isPlainObject,
} from './customResponses.utils';

const asObjectRecord = (value: unknown): UnknownRecord => {
  if (!isPlainObject(value)) return {};
  return value;
};

const toggleSetValue = <T extends string | number>(set: Set<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
};

type UseCustomResponsesArgs = {
  applicant: ApplicantWithCustomResponses;
  customFields?: CustomFieldLike[];
};

export const useCustomResponses = ({ applicant, customFields }: UseCustomResponsesArgs) => {
  const [expandedSectionItemIds, setExpandedSectionItemIds] = useState<ExpandedSectionItemIds>({});
  const [expandedTextByKey, setExpandedTextByKey] = useState<ExpandedTextByKey>({});
  const [expandedGroupFieldIds, setExpandedGroupFieldIds] = useState<ExpandedGroupFieldIds>({});

  const rawResponses = useMemo<UnknownRecord>(() => {
    if (isPlainObject(applicant?.customResponses)) return applicant.customResponses;
    if (isPlainObject(applicant?.customFieldResponses)) return applicant.customFieldResponses;
    return {};
  }, [applicant]);

  const customResponseEntries = useMemo<CustomResponseEntry[]>(() => {
    const entries: CustomResponseEntry[] = [];
    const usedKeys = new Set<string>();

    if (Array.isArray(customFields) && customFields.length > 0) {
      const orderedFields = [...customFields].sort((fieldA, fieldB) => {
        const orderA = Number(fieldA?.displayOrder ?? fieldA?.order ?? 0);
        const orderB = Number(fieldB?.displayOrder ?? fieldB?.order ?? 0);
        return orderA - orderB;
      });

      orderedFields.forEach((field, index) => {
        const fieldId = String(field?.fieldId || `field_${index}`);
        const matchedKey = findMatchingResponseKeyForField(field, rawResponses);
        const sourceKey = matchedKey && Object.prototype.hasOwnProperty.call(rawResponses, matchedKey) ? matchedKey : fieldId;
        const value = rawResponses[sourceKey];

        if (matchedKey) usedKeys.add(matchedKey);
        if (Object.prototype.hasOwnProperty.call(rawResponses, fieldId)) usedKeys.add(fieldId);

        entries.push({
          key: fieldId,
          label: getCustomFieldLabel(field),
          value,
        });
      });
    }

    Object.entries(rawResponses).forEach(([key, value]) => {
      if (usedKeys.has(key)) return;
      entries.push({
        key,
        label: formatLabel(key),
        value,
      });
    });

    const hasExpectedSalary = applicant?.expectedSalary !== undefined && applicant?.expectedSalary !== null && String(applicant.expectedSalary) !== '';

    if (!hasExpectedSalary) return entries;

    return entries.filter((entry) => !isExpectedSalaryResponseKey(entry.key));
  }, [applicant?.expectedSalary, customFields, rawResponses]);

  const toggleSectionItem = useCallback((entryKey: string, itemIndex: number) => {
    setExpandedSectionItemIds((prev) => {
      const next: ExpandedSectionItemIds = { ...prev };
      const existing = next[entryKey] || new Set<number>();
      next[entryKey] = toggleSetValue(existing, itemIndex);
      return next;
    });
  }, []);

  const toggleText = useCallback((entryKey: string) => {
    setExpandedTextByKey((prev) => ({
      ...prev,
      [entryKey]: !prev[entryKey],
    }));
  }, []);

  const toggleGroupField = useCallback((entryKey: string, itemIndex: number, fieldName: string) => {
    setExpandedGroupFieldIds((prev) => {
      const next: ExpandedGroupFieldIds = { ...prev };
      const nextByItemIndex = { ...(next[entryKey] || {}) };
      const existing = nextByItemIndex[itemIndex] || new Set<string>();

      nextByItemIndex[itemIndex] = toggleSetValue(existing, fieldName);
      next[entryKey] = nextByItemIndex;

      return next;
    });
  }, []);

  const isSectionItemExpanded = useCallback(
    (entryKey: string, itemIndex: number): boolean => {
      return Boolean(expandedSectionItemIds[entryKey]?.has(itemIndex));
    },
    [expandedSectionItemIds],
  );

  const isGroupFieldExpanded = useCallback(
    (entryKey: string, itemIndex: number, fieldName: string): boolean => {
      return Boolean(expandedGroupFieldIds[entryKey]?.[itemIndex]?.has(fieldName));
    },
    [expandedGroupFieldIds],
  );

  return {
    customResponseEntries,
    expandedTextByKey,
    isGroupFieldExpanded,
    isSectionItemExpanded,
    rawResponses: asObjectRecord(rawResponses),
    toggleGroupField,
    toggleSectionItem,
    toggleText,
  };
};
