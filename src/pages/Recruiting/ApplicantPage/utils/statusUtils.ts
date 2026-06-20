import type { Applicant} from '../../../../types/applicants';

export const getPreviousStatus = (applicant: Applicant | null | undefined): string => {
  if (!applicant) return 'pending';

  const history = applicant.statusHistory || [];
  
  if (history.length === 0) {
    return 'pending';
  }

  if (history.length === 1) {
    const status = history[0].status || 'pending';
    return status === 'trashed' ? 'pending' : status;
  }

  const trashedIndices = history
    .map((h, i) => (h.status === 'trashed' ? i : -1))
    .filter(i => i !== -1);
  
  if (trashedIndices.length === 0) {
    const status = history[history.length - 1].status || 'pending';
    return status === 'trashed' ? 'pending' : status;
  }

  const lastTrashedIndex = trashedIndices[trashedIndices.length - 1];
  
  if (lastTrashedIndex === 0) {
    return 'pending';
  }

  for (let i = lastTrashedIndex - 1; i >= 0; i--) {
    const status = history[i].status;
    if (status && status !== 'trashed') {
      return status;
    }
  }

  return 'pending';
};

export const isTrashed = (applicant: Applicant | null | undefined): boolean => {
  return applicant?.status === 'trashed';
};