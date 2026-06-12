import { useState, useEffect, useRef, useCallback } from 'react';
import type { ResponseSection, LeafQuestion, Question } from '../../../../../../types/applicants';
import { isGroupQuestion, INITIAL_SECTIONS } from '../../../../../../types/applicants';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function applyToQuestions(
  questions: Question[],
  id: string,
  updater: (q: LeafQuestion) => LeafQuestion,
): Question[] {
  return questions.map((q) => {
    if (isGroupQuestion(q)) {
      return { ...q, questions: q.questions.map((sq) => (sq.id === id ? updater(sq) : sq)) };
    }
    return q.id === id ? updater(q as LeafQuestion) : q;
  });
}

function applyToSections(
  sections: ResponseSection[],
  id: string,
  updater: (q: LeafQuestion) => LeafQuestion,
): ResponseSection[] {
  return sections.map((s) => ({ ...s, questions: applyToQuestions(s.questions, id, updater) }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCustomResponsesReturn {
  sections: ResponseSection[];
  expandedSectionIds: Set<string>;
  expandedGroupIds: Set<string>;
  openDropdownId: string | null;
  dropdownRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  toggleSection: (id: string) => void;
  toggleGroup: (id: string) => void;
  toggleDropdown: (id: string) => void;
  updateTextValue: (id: string, value: string) => void;
  updateUrlValue: (id: string, value: string) => void;
  updateNumberValue: (id: string, value: number) => void;
  updateEmailValue: (id: string, value: string) => void;
  updateDateValue: (id: string, value: string) => void;
  updateCheckbox: (id: string, checked: boolean) => void;
  updateRadio: (id: string, value: string) => void;
  updateDropdown: (id: string, selectedValue: string) => void;
  updateTextarea: (id: string, value: string) => void;
  updateTags: (id: string, values: string[]) => void;
}

export interface UseCustomResponsesOptions {
  sections?: ResponseSection[];
  initialSections?: ResponseSection[];
  onSectionsChange?: (sections: ResponseSection[]) => void;
  defaultExpandedSectionIds?: string[];
}

export function useCustomResponses(
  options: UseCustomResponsesOptions = {}
): UseCustomResponsesReturn {
  const [internalSections, setInternalSections] = useState<ResponseSection[]>(
    options.initialSections ?? INITIAL_SECTIONS
  );
  const initialExpanded = (() => {
    if (options.defaultExpandedSectionIds) return options.defaultExpandedSectionIds;
    if (options.sections && options.sections.length > 0) {
      return options.sections.map((s) => s.id);
    }
    return ['personal_info', 'skills', 'experience'];
  })();
  const collectGroupIds = (secs: ResponseSection[]): string[] => {
    const ids: string[] = [];
    secs.forEach((s) => {
      s.questions.forEach((q) => {
        if (q.type === 'group') ids.push(q.groupId);
      });
    });
    return ids;
  };
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    new Set(initialExpanded)
  );
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    new Set(options.sections ? collectGroupIds(options.sections) : [])
  );
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sections = options.sections ?? internalSections;

  useEffect(() => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      sections.forEach((s) => {
        if (!next.has(s.id)) {
          next.add(s.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      collectGroupIds(sections).forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [sections]);

  useEffect(() => {
    if (options.sections) return;
    if (options.initialSections) setInternalSections(options.initialSections);
  }, [options.sections, options.initialSections]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!openDropdownId) return;
      const ref = dropdownRefs.current.get(openDropdownId);
      if (ref && !ref.contains(e.target as Node)) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) =>
      setter((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });

  const toggleSection  = useCallback(toggle(setExpandedSectionIds), []);
  const toggleGroup    = useCallback(toggle(setExpandedGroupIds), []);
  const toggleDropdown = useCallback((id: string) => setOpenDropdownId((prev) => (prev === id ? null : id)), []);

  const updateSections = useCallback(
    (updater: (prev: ResponseSection[]) => ResponseSection[]) => {
      if (options.onSectionsChange) {
        options.onSectionsChange(updater(sections));
        return;
      }
      setInternalSections(updater);
    },
    [options.onSectionsChange, sections]
  );

  const updateQuestion = useCallback(
    (id: string, updater: (q: LeafQuestion) => LeafQuestion) =>
      updateSections((prev) => applyToSections(prev, id, updater)),
    [updateSections]
  );

  const updateTextValue   = useCallback((id: string, value: string)    => updateQuestion(id, (q) => ({ ...q, value }  as LeafQuestion)), [updateQuestion]);
  const updateUrlValue    = useCallback((id: string, value: string)    => updateQuestion(id, (q) => ({ ...q, value }  as LeafQuestion)), [updateQuestion]);
  const updateNumberValue = useCallback((id: string, value: number)    => updateQuestion(id, (q) => ({ ...q, value }  as LeafQuestion)), [updateQuestion]);
  const updateEmailValue  = useCallback((id: string, value: string)    => updateQuestion(id, (q) => ({ ...q, value }  as LeafQuestion)), [updateQuestion]);
  const updateDateValue   = useCallback((id: string, value: string)    => updateQuestion(id, (q) => ({ ...q, value }  as LeafQuestion)), [updateQuestion]);
  const updateCheckbox    = useCallback((id: string, checked: boolean) => updateQuestion(id, (q) => ({ ...q, checked } as LeafQuestion)), [updateQuestion]);
  const updateRadio       = useCallback((id: string, selectedValue: string) => updateQuestion(id, (q) => ({ ...q, selectedValue } as LeafQuestion)), [updateQuestion]);
  const updateTextarea    = useCallback((id: string, value: string)    => updateQuestion(id, (q) => ({ ...q, value }  as LeafQuestion)), [updateQuestion]);
  const updateTags        = useCallback((id: string, values: string[]) => updateQuestion(id, (q) => ({ ...q, values } as LeafQuestion)), [updateQuestion]);

  const updateDropdown = useCallback((id: string, selectedValue: string) => {
    setOpenDropdownId(null);
    updateQuestion(id, (q) => ({ ...q, selectedValue } as LeafQuestion));
  }, [updateQuestion]);

  return {
    sections,
    expandedSectionIds,
    expandedGroupIds,
    openDropdownId,
    dropdownRefs,
    toggleSection,
    toggleGroup,
    toggleDropdown,
    updateTextValue,
    updateUrlValue,
    updateNumberValue,
    updateEmailValue,
    updateDateValue,
    updateCheckbox,
    updateRadio,
    updateDropdown,
    updateTextarea,
    updateTags,
  };
}