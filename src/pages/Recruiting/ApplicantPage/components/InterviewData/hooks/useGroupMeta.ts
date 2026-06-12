import { useCallback, useLayoutEffect, useState } from 'react';
import type { InterviewAnswer } from '../../../../../../types/applicants';
import type { GroupMeta } from '../utils/groupMetaStorage';
import { clearStoredMeta, readStoredMeta, writeStoredMeta } from '../utils/groupMetaStorage';
import { getQuestionId } from '../utils/interviewUtils';

export type GroupMetaMap = Record<string, GroupMeta>;

/**
 * In-memory map of questionId -> {groupKey, groupName, groupSource}.
 * Persisted to localStorage so it survives reloads and the server
 * stripping groupKey/groupName/groupSource on round-trips.
 */
export const useGroupMeta = (applicantId: string, interviewId: string) => {
  // Initialize from localStorage synchronously so the first render already
  // has the correct group meta. Otherwise all questions collapse into a
  // single __ungrouped__ group on the first paint.
  const [meta, setMeta] = useState<GroupMetaMap>(() => {
    if (!applicantId || !interviewId) return {};
    return readStoredMeta(applicantId, interviewId);
  });

  // Reload from storage when the interview changes
  useLayoutEffect(() => {
    if (!applicantId || !interviewId) {
      setMeta({});
      return;
    }
    setMeta(readStoredMeta(applicantId, interviewId));
  }, [applicantId, interviewId]);

  const persist = useCallback(
    (next: GroupMetaMap) => {
      writeStoredMeta(applicantId, interviewId, next);
    },
    [applicantId, interviewId]
  );

  const setMetaAndPersist = useCallback(
    (updater: (prev: GroupMetaMap) => GroupMetaMap) => {
      setMeta((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  /**
   * Seed meta from a freshly built list of questions (e.g. right after the
   * user picked groups and saved). Pairs by index with the server-returned
   * questions (which carry new IDs but no group metadata).
   */
  const seedFromSaved = useCallback(
    (built: InterviewAnswer[], savedQuestions: InterviewAnswer[] | undefined) => {
      if (!Array.isArray(savedQuestions)) return;
      const additions: GroupMetaMap = {};
      built.forEach((q, idx) => {
        const saved = savedQuestions[idx];
        const qId = saved ? getQuestionId(saved) : '';
        if (!q.groupKey) return;
        const meta = {
          key: q.groupKey,
          name: q.groupName || 'Group',
          source: q.groupSource || 'company',
        };
        if (qId) additions[qId] = meta;
        additions[`__idx_${idx}`] = meta;
      });
      if (Object.keys(additions).length === 0) return;
      setMetaAndPersist((prev) => ({ ...prev, ...additions }));
    },
    [setMetaAndPersist]
  );

  /**
   * Seed meta from the server-loaded questions (when reopening an
   * interview). Prefers the groupKey on the question itself; falls back
   * to whatever was previously stored.
   */
  const seedFromLoaded = useCallback(
    (questions: InterviewAnswer[]) => {
      const stored = readStoredMeta(applicantId, interviewId);
      const additions: GroupMetaMap = {};
      questions.forEach((q, idx) => {
        const qId = getQuestionId(q);
        if (qId) {
          if (q.groupKey) {
            additions[qId] = {
              key: q.groupKey,
              name: q.groupName || 'Group',
              source: q.groupSource || 'company',
            };
          } else if (stored[qId]) {
            additions[qId] = stored[qId];
          }
        }
        // Fallback: match by index when server stripped IDs
        const idxKey = `__idx_${idx}`;
        if (stored[idxKey]) {
          const targetKey = qId || idxKey;
          if (!additions[targetKey]) {
            additions[targetKey] = stored[idxKey];
          }
        }
      });
      if (Object.keys(additions).length > 0) {
        setMetaAndPersist((prev) => ({ ...prev, ...additions }));
      }
    },
    [applicantId, interviewId, setMetaAndPersist]
  );

  const removeIds = useCallback(
    (ids: string[]) => {
      setMetaAndPersist((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    },
    [setMetaAndPersist]
  );

  const reset = useCallback(() => {
    clearStoredMeta(applicantId, interviewId);
    setMeta({});
  }, [applicantId, interviewId]);

  return {
    meta,
    seedFromSaved,
    seedFromLoaded,
    removeIds,
    reset,
  };
};
