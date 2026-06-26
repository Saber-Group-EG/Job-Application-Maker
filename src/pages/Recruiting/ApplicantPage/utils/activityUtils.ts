import type {
  ActivityItem,
  ActivityLike,
  Applicant,
  Comment,
  Interview,
  Message,
  StatusHistory,
} from '../../../../types/applicants';

const resolveActorName = (actor: unknown, t?: (key: string, ns?: string, params?: Record<string, string | number>) => string): string => {
  const systemLabel = t ? t('system', 'activity') : 'System';
  if (actor === null || actor === undefined) return systemLabel;
  if (typeof actor === 'string') return actor || systemLabel;
  if (typeof actor === 'object') {
    const obj = actor as { fullName?: string; name?: string; email?: string; firstName?: string; lastName?: string };
    if (obj.fullName) return String(obj.fullName);
    if (obj.name) return String(obj.name);
    if (obj.email) return String(obj.email);
    if (obj.firstName || obj.lastName) return `${obj.firstName ?? ''} ${obj.lastName ?? ''}`.trim() || systemLabel;
  }
  return systemLabel;
};

const toActivity = (entry: ActivityLike | null | undefined, t?: (key: string, ns?: string, params?: Record<string, string | number>) => string): ActivityItem | null => {
  if (!entry) return null;
  const id = String(
    entry._id ||
      entry.id ||
      `${entry.changedAt || entry.sentAt || entry.scheduledAt || ''}_${Math.random()}`
  );
  const timestamp = String(
    entry.commentedAt ||
      entry.changedAt ||
      entry.sentAt ||
      entry.createdAt ||
      entry.scheduledAt ||
      new Date().toISOString()
  );
  const userName = resolveActorName(
    entry.changedBy ??
      entry.commentedBy ??
      entry.sentBy ??
      entry.issuedBy ??
      entry.author ??
      (entry as any).conductedBy ??
      (entry as any).scheduledBy,
    t
  );
  return { id, timestamp, user: { name: userName } } as ActivityItem;
};

const buildActivities = (
  applicant: Applicant | null | undefined,
  t?: (key: string, ns?: string, params?: Record<string, string | number>) => string
): ActivityItem[] => {
  if (!applicant) return [];

  const items: ActivityItem[] = [];

  (applicant.statusHistory || []).forEach((entry: StatusHistory) => {
    const base = toActivity(entry, t);
    if (!base) return;
    items.push({
      ...base,
      type: 'status_change',
      title: t ? t('statusChangedTo', 'activity', { status: entry.status }) : `Application status changed to ${entry.status}`,
      status: entry.status,
      reasons: entry.reasons,
    });
  });

  (applicant.comments || []).forEach((entry: Comment) => {
    const base = toActivity(entry as unknown as ActivityLike, t);
    if (!base) return;
    const text = entry.comment || entry.text || '';
    items.push({
      ...base,
      type: 'comment',
      title: t ? t('commentAdded', 'activity') : 'Comment added',
      comment: text,
    });
  });

  (applicant.messages || []).forEach((entry: Message) => {
    const base = toActivity(entry, t);
    if (!base) return;
    items.push({
      ...base,
      type: 'message',
      title: (() => {
        const msgType = entry.type || 'internal';
        const typeLabel = msgType === 'internal'
          ? (t ? t('internal', 'activity') : 'Internal')
          : msgType === 'external'
            ? (t ? t('external', 'activity') : 'External')
            : msgType.charAt(0).toUpperCase() + msgType.slice(1);
        return t ? t('messageTitle', 'activity', { type: typeLabel }) : `${typeLabel} message`;
      })(),
      messageChannel: entry.type,
      description: entry.content ?? entry.subject,
      subject: entry.subject,
    });
  });

  (applicant.interviews || []).forEach((entry: Interview) => {
    const base = toActivity(entry as unknown as ActivityLike, t);
    if (!base) return;
    const status = (entry as { status?: string }).status || 'scheduled';
    const statusLabel = status === 'in_progress' ? (t ? t('progressing', 'activity') : 'Progressing') : status;
    items.push({
      ...base,
      type: 'interview',
      title: t ? t('interviewWithStatus', 'activity', { status: statusLabel }) : `Interview ${statusLabel}`,
      interviewStatus: status,
      description: entry.notes,
      scheduledAt: entry.scheduledAt,
      endedAt: entry.endedAt,
      conductedBy: entry.conductedBy ? (typeof entry.conductedBy === 'string' ? entry.conductedBy : resolveActorName(entry.conductedBy)) : undefined,
    });
  });

  items.push({
    id: `app_${applicant._id}`,
    type: 'application',
    title: t ? t('applicationSubmitted', 'activity') : 'Application submitted',
    timestamp: applicant.submittedAt || applicant.createdAt || new Date().toISOString(),
    user: { name: applicant.fullName || (t ? t('applicant', 'activity') : 'Applicant') },
  });

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
};

export { resolveActorName, toActivity, buildActivities };
