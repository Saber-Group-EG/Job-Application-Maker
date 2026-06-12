import type { Applicant, JobSpecItem } from '../../../../types/applicants';
import { jobPositionsService } from '../../../../services/jobPositionsService';
import { toPlainString } from '../../../../utils/strings';

type JobSpecLike = {
  _id?: string;
  id?: string;
  jobSpecId?: string;
  spec?: unknown;
  title?: unknown;
  label?: unknown;
  name?: unknown;
  weight?: unknown;
  answer?: unknown;
  jobSpecsWithDetails?: JobSpecLike[];
  jobSpecs?: JobSpecLike[];
};

type JobSpecResponseLike = {
  jobSpecId?: unknown;
  _id?: unknown;
  id?: unknown;
  answer?: unknown;
};

const normalizeSpecId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { _id?: string; id?: string };
    return obj?._id || obj?.id || '';
  }
  return '';
};

const buildJobSpecItems = (
  applicant: Applicant | null | undefined,
  fetchedJobPosition?: unknown,
): JobSpecItem[] => {
  if (!applicant) return [];

  const applicantLike = applicant as unknown as {
    jobPositionId?: JobSpecLike | string;
    jobPosition?: JobSpecLike;
    jobSpecsResponses?: JobSpecResponseLike[];
    jobSpecsWithDetails?: JobSpecLike[];
  };

  const populatedJobPos: JobSpecLike | undefined =
    typeof applicantLike.jobPositionId === 'object'
      ? applicantLike.jobPositionId
      : applicantLike.jobPosition;

  if (populatedJobPos && typeof populatedJobPos === 'object') {
    jobPositionsService.normalizeJobPosition(populatedJobPos);
  }
  jobPositionsService.normalizeJobPosition(applicantLike);

  const detailFromFetched = (() => {
    if (!fetchedJobPosition) return null;
    const raw = fetchedJobPosition as { jobPosition?: JobSpecLike } & JobSpecLike;
    return raw?.jobPosition ?? raw;
  })();
  if (detailFromFetched && typeof detailFromFetched === 'object') {
    jobPositionsService.normalizeJobPosition(detailFromFetched);
  }

  const fetchedSpecs: JobSpecLike[] = Array.isArray(
    (detailFromFetched as { jobSpecsWithDetails?: JobSpecLike[] } | undefined)?.jobSpecsWithDetails
  )
    ? (detailFromFetched as { jobSpecsWithDetails: JobSpecLike[] }).jobSpecsWithDetails
    : [];

  const applicantSpecs: JobSpecLike[] = Array.isArray(applicantLike.jobSpecsWithDetails)
    ? applicantLike.jobSpecsWithDetails
    : [];

  const candidateSpecs: JobSpecLike[] =
    fetchedSpecs.length > 0
      ? fetchedSpecs
      : Array.isArray(
          (populatedJobPos as { jobSpecsWithDetails?: JobSpecLike[] } | undefined)?.jobSpecsWithDetails
        ) && (populatedJobPos as { jobSpecsWithDetails: JobSpecLike[] }).jobSpecsWithDetails.length > 0
        ? (populatedJobPos as { jobSpecsWithDetails: JobSpecLike[] }).jobSpecsWithDetails
        : Array.isArray((populatedJobPos as { jobSpecs?: JobSpecLike[] } | undefined)?.jobSpecs)
          ? (populatedJobPos as { jobSpecs: JobSpecLike[] }).jobSpecs
          : applicantSpecs;

  const answerMap = new Map<string, boolean>();
  if (Array.isArray(applicantLike.jobSpecsResponses)) {
    applicantLike.jobSpecsResponses.forEach((r) => {
      const rawId = (r as { jobSpecId?: unknown; _id?: unknown; id?: unknown })?.jobSpecId
        ?? (r as { _id?: unknown })?._id
        ?? (r as { id?: unknown })?.id;
      const specId = normalizeSpecId(rawId);
      if (specId && !answerMap.has(specId)) {
        answerMap.set(
          specId,
          typeof r?.answer === 'boolean' ? r.answer : Boolean(r?.answer),
        );
      }
    });
  }
  if (Array.isArray(applicantLike.jobSpecsWithDetails)) {
    applicantLike.jobSpecsWithDetails.forEach((s) => {
      const rawId = s?.jobSpecId ?? s?._id ?? s?.id;
      const specId = normalizeSpecId(rawId);
      if (specId && !answerMap.has(specId)) {
        answerMap.set(
          specId,
          typeof s?.answer === 'boolean' ? s.answer : Boolean(s?.answer),
        );
      }
    });
  }

  const weightMap = new Map<string, number>();
  const collectWeights = (source: JobSpecLike[] | undefined) => {
    if (!Array.isArray(source)) return;
    source.forEach((s) => {
      const specId = normalizeSpecId(s?.jobSpecId ?? s?._id ?? s?.id);
      if (specId && !weightMap.has(specId)) {
        weightMap.set(specId, Number(s?.weight ?? 0));
      }
    });
  };

  collectWeights(fetchedSpecs);
  collectWeights(
    Array.isArray(applicantLike.jobSpecsWithDetails) ? applicantLike.jobSpecsWithDetails : undefined,
  );
  collectWeights(
    Array.isArray(
      (populatedJobPos as { jobSpecsWithDetails?: JobSpecLike[] } | undefined)?.jobSpecsWithDetails
    )
      ? (populatedJobPos as { jobSpecsWithDetails: JobSpecLike[] }).jobSpecsWithDetails
      : undefined,
  );

  const applicantAnswersByIndex: boolean[] = [];
  if (Array.isArray(applicantLike.jobSpecsWithDetails)) {
    applicantLike.jobSpecsWithDetails.forEach((s) => {
      applicantAnswersByIndex.push(
        typeof s?.answer === 'boolean' ? s.answer : Boolean(s?.answer),
      );
    });
  }

  return candidateSpecs.map((s, index) => {
    const specId =
      normalizeSpecId(s?.jobSpecId ?? s?._id ?? s?.id) || `spec_${index}`;
    const weight = weightMap.has(specId)
      ? weightMap.get(specId)!
      : Number(s?.weight ?? 0);
    const answer =
      answerMap.get(specId) ??
      applicantAnswersByIndex[index] ??
      false;
    return {
      _id: String(s?._id || `${specId}_${index}`),
      id: specId,
      jobSpecId: specId,
      answer,
      spec: {
        en: toPlainString(
          (typeof s?.spec === 'object' && s?.spec !== null ? (s.spec as { en?: unknown }).en : s?.spec) ??
            s?.title ??
            s?.label ??
            s?.name ??
            'Specification'
        ),
      },
      weight,
    };
  });
};

export { normalizeSpecId, buildJobSpecItems };
