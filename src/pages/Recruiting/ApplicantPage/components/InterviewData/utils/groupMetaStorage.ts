export type GroupSource = 'company' | 'user';

export type GroupMeta = {
  key: string;
  name: string;
  source: GroupSource;
};

export const buildMetaKey = (applicantId: string, interviewId: string): string =>
  `interview-group-meta:${applicantId}:${interviewId}`;

export const readStoredMeta = (
  applicantId: string,
  interviewId: string
): Record<string, GroupMeta> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(buildMetaKey(applicantId, interviewId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, GroupMeta>) : {};
  } catch {
    return {};
  }
};

export const writeStoredMeta = (
  applicantId: string,
  interviewId: string,
  meta: Record<string, GroupMeta>
): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      buildMetaKey(applicantId, interviewId),
      JSON.stringify(meta)
    );
  } catch {
    // ignore quota errors
  }
};

export const clearStoredMeta = (applicantId: string, interviewId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(buildMetaKey(applicantId, interviewId));
  } catch {
    // ignore
  }
};
