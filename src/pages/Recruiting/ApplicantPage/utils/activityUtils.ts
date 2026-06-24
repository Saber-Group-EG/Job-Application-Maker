import type {
  ActivityItem,
  ActivityLike,
  Applicant,
  Comment,
  Interview,
  Message,
  StatusHistory,
} from '../../../../types/applicants';

const resolveActorName = (actor: unknown): string => {
  if (actor === null || actor === undefined) return 'System';
  if (typeof actor === 'string') return actor || 'System';
  if (typeof actor === 'object') {
    const obj = actor as { fullName?: string; name?: string; email?: string; firstName?: string; lastName?: string };
    if (obj.fullName) return String(obj.fullName);
    if (obj.name) return String(obj.name);
    if (obj.email) return String(obj.email);
    if (obj.firstName || obj.lastName) return `${obj.firstName ?? ''} ${obj.lastName ?? ''}`.trim() || 'System';
  }
  return 'System';
};

const toActivity = (entry: ActivityLike | null | undefined): ActivityItem | null => {
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
      (entry as any).scheduledBy
  );
  return { id, timestamp, user: { name: userName } } as ActivityItem;
};

const buildActivities = (applicant: Applicant | null | undefined): ActivityItem[] => {
  if (!applicant) return [];

  const items: ActivityItem[] = [];

  (applicant.statusHistory || []).forEach((entry: StatusHistory) => {
    const base = toActivity(entry);
    if (!base) return;
    items.push({
      ...base,
      type: 'status_change',
      title: `Application status changed to ${entry.status}`,
      status: entry.status,
      reasons: entry.reasons,
    });
  });

  (applicant.comments || []).forEach((entry: Comment) => {
    const base = toActivity(entry as unknown as ActivityLike);
    if (!base) return;
    const text = entry.comment || entry.text || '';
    items.push({
      ...base,
      type: 'comment',
      title: 'Comment added',
      comment: text,
    });
  });

  (applicant.messages || []).forEach((entry: Message) => {
    const base = toActivity(entry);
    if (!base) return;
    items.push({
      ...base,
      type: 'message',
      title: `${(entry.type || 'internal').charAt(0).toUpperCase() + (entry.type || 'internal').slice(1)} message`,
      messageChannel: entry.type,
      description: entry.content ?? entry.subject,
      subject: entry.subject,
    });
  });

  (applicant.interviews || []).forEach((entry: Interview) => {
    const base = toActivity(entry as unknown as ActivityLike);
    if (!base) return;
    const status = (entry as { status?: string }).status || 'scheduled';
    const statusLabel = status === 'in_progress' ? 'Progressing' : status;
    items.push({
      ...base,
      type: 'interview',
      title: `Interview ${statusLabel}`,
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
    title: 'Application submitted',
    timestamp: applicant.submittedAt || applicant.createdAt || new Date().toISOString(),
    user: { name: applicant.fullName || 'Applicant' },
  });

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
};

export { resolveActorName, toActivity, buildActivities };
