import { useMemo } from 'react';
import { useCompany } from '../../../../../../hooks/queries/useCompanies';
import { useSavedQuestionGroups } from '../../../../../../hooks/queries/useUsers';
import { useLocale } from '../../../../../../context/LocaleContext';

export type PoolGroup = {
  key: string;
  source: 'company' | 'user';
  name: string;
  questions: Array<{
    _id?: string;
    id?: string;
    question: string;
    score: number;
    answerType: string;
    choices: string[];
  }>;
};

type RawGroup = {
  _id?: string;
  id?: string;
  name?: string;
  questions?: Array<{
    _id?: string;
    id?: string;
    question?: string;
    score?: number;
    answerType?: string;
    choices?: unknown[];
  }>;
};

const normalizeGroup = (
  source: PoolGroup['source'],
  rawId: string,
  g: RawGroup,
  seen: Set<string>,
  untitledLabel = 'Untitled Group'
): PoolGroup | null => {
  if (!g || !Array.isArray(g.questions) || g.questions.length === 0) return null;
  const baseName = String(g.name || untitledLabel).trim() || untitledLabel;
  const key = `${source}_${rawId}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const questions = g.questions
    .map((q, idx) => ({
      _id: q?._id ? String(q._id) : `pool_${key}_${idx}`,
      id: q?.id ? String(q.id) : `pool_${key}_${idx}`,
      question: String(q?.question || '').trim(),
      score: Number(q.score || 0),
      answerType: String(q?.answerType || 'text'),
      choices: Array.isArray(q?.choices)
        ? q.choices.map((c) => String(c ?? '').trim()).filter(Boolean)
        : [],
    }))
    .filter((q) => Boolean(q.question));
  if (questions.length === 0) return null;
  return { key, source, name: baseName, questions };
};

export const useQuestionPool = (companyId: string) => {
  const { t } = useLocale();
  const untitledLabel = t('untitledGroup', 'interview');
  const enabled = !!companyId;
  const { data: companyData, isLoading: isLoadingCompany } = useCompany(companyId, {
    enabled,
  });
  const { data: savedGroups = [], isLoading: isLoadingSaved } = useSavedQuestionGroups();

  const pool = useMemo<PoolGroup[]>(() => {
    const groups: PoolGroup[] = [];
    const seen = new Set<string>();

    const companyInterviewSettings =
      (companyData as { settings?: { interviewSettings?: { groups?: RawGroup[] } } } | null | undefined)?.settings
        ?.interviewSettings ??
      (companyData as { interviewSettings?: { groups?: RawGroup[] } } | null | undefined)?.interviewSettings ??
      null;

    if (companyInterviewSettings && Array.isArray(companyInterviewSettings.groups)) {
      companyInterviewSettings.groups.forEach((g, idx) => {
        const poolGroup = normalizeGroup(
          'company',
          `${idx}_${String(g?.name || untitledLabel)}`,
          g,
          seen,
          untitledLabel
        );
        if (poolGroup) groups.push(poolGroup);
      });
    }

    if (Array.isArray(savedGroups)) {
      savedGroups.forEach((g) => {
        const rawId = g._id ? String(g._id) : g.name || Math.random().toString(36).slice(2);
        const poolGroup = normalizeGroup('user', rawId, g as unknown as RawGroup, seen, untitledLabel);
        if (poolGroup) groups.push(poolGroup);
      });
    }

    return groups;
  }, [companyData, savedGroups]);

  return {
    pool,
    isLoading: isLoadingCompany || isLoadingSaved,
  };
};
