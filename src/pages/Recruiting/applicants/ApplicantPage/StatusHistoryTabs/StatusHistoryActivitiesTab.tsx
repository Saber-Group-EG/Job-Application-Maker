import { Fragment } from 'react';
import type { Applicant } from '../../../../../types/applicants';
import { toPlainString } from '../../../../../utils/strings';
import { formatDate, getReadableMessageText, getStatusColor } from './statusHistoryUtils';

export type ActivityTabFilter = 'all' | 'status' | 'actions' | 'interview';

export type StatusHistoryActivitiesTabProps = {
  applicant: Applicant | null | undefined;
  user: { fullName?: string; email?: string } | null | undefined;
  filter: ActivityTabFilter;
  expandedHistory: string | null;
  setExpandedHistory: (value: string | null) => void;
};

type ActivityType = 'status' | 'message' | 'comment' | 'interview';

type ActivityItem = {
  type: ActivityType;
  date: string;
  data: unknown;
};

type Channels = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const getString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const getTime = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const getActorLabel = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return (
      getString(v.fullName) ||
      getString(v.email) ||
      toPlainString(v.name) ||
      getString(v.username)
    );
  }
  return null;
};

export default function StatusHistoryActivitiesTab({
  applicant,
  user,
  filter,
  expandedHistory,
  setExpandedHistory,
}: StatusHistoryActivitiesTabProps) {
  const activities: ActivityItem[] = [];

  applicant?.statusHistory?.forEach((history) => {
    const date = history?.changedAt || new Date().toISOString();
    activities.push({ type: 'status', date, data: history });
  });

  applicant?.messages?.forEach((message) => {
    const record = asRecord(message);
    const date = getString(record?.sentAt) || getString(record?.createdAt) || new Date().toISOString();
    activities.push({ type: 'message', date, data: message });
  });

  applicant?.comments?.forEach((comment) => {
    const record = asRecord(comment);
    const date = getString(record?.commentedAt) || getString(record?.changedAt) || getString(record?.createdAt) || new Date().toISOString();
    activities.push({ type: 'comment', date, data: comment });
  });

  applicant?.interviews?.forEach((interview) => {
    const record = asRecord(interview);
    const date = getString(record?.scheduledAt) || getString(record?.createdAt) || getString(record?.issuedAt) || new Date().toISOString();
    activities.push({ type: 'interview', date, data: interview });
  });

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    if (filter === 'status') return activity.type === 'status';
    if (filter === 'actions') return activity.type === 'message' || activity.type === 'comment';
    if (filter === 'interview') return activity.type === 'interview';
    return false;
  });

  if (filteredActivities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
        No activity records found for this tab.
      </div>
    );
  }

  const getChannels = (activity: ActivityItem): Channels | null => {
    if (activity.type !== 'status' && activity.type !== 'interview') return null;
    const data = asRecord(activity.data);
    const notifications = asRecord(data?.notifications);
    const channels = asRecord(notifications?.channels);
    if (!channels) return null;
    return {
      email: Boolean(channels.email),
      sms: Boolean(channels.sms),
      whatsapp: Boolean(channels.whatsapp),
    };
  };

  const getActorName = (activity: ActivityItem): string => {
    if (activity.type === 'status') {
      const history = asRecord(activity.data);
      const changedBy = history?.changedBy;
      const changedByLabel = getActorLabel(changedBy);
      const normalizedChangedBy = changedByLabel?.toLowerCase?.() || '';
      if (changedByLabel && normalizedChangedBy !== 'system') {
        return changedByLabel;
      }

      const histTime = getTime(history?.changedAt);
      const withinWindow = (time?: unknown) => {
        if (!histTime) return false;
        const t = getTime(time);
        if (!t) return false;
        return Math.abs(t - histTime) <= 2 * 60 * 1000;
      };

      if (applicant?.messages) {
        const match = applicant.messages.find((message) => {
          const record = asRecord(message);
          return withinWindow(record?.sentAt) || withinWindow(record?.createdAt);
        });
        const matchRecord = asRecord(match);
        const label = getActorLabel(matchRecord?.sentBy);
        if (label) return label;
      }

      if (applicant?.comments) {
        const match = applicant.comments.find((comment) => {
          const record = asRecord(comment);
          return (
            withinWindow(record?.changedAt) ||
            withinWindow(record?.commentedAt) ||
            withinWindow(record?.createdAt)
          );
        });
        const matchRecord = asRecord(match);
        const label = getActorLabel(matchRecord?.changedBy || matchRecord?.author || matchRecord?.commentedBy);
        if (label) return label;
      }

      if (applicant?.interviews) {
        const match = applicant.interviews.find((interview) => {
          const record = asRecord(interview);
          return (
            withinWindow(record?.scheduledAt) ||
            withinWindow(record?.createdAt) ||
            withinWindow(record?.issuedAt)
          );
        });
        const matchRecord = asRecord(match);
        const label = getActorLabel(matchRecord?.issuedBy);
        if (label) return label;
      }

      const currentUserLabel = user?.fullName || user?.email || 'Current User';
      return changedByLabel || currentUserLabel;
    }

    if (activity.type === 'message') {
      const message = asRecord(activity.data);
      return getActorLabel(message?.sentBy) || 'Unknown';
    }

    if (activity.type === 'comment') {
      const comment = asRecord(activity.data);
      return (
        getActorLabel(comment?.commentedBy || comment?.changedBy || comment?.author || comment?.createdBy) || 'Unknown'
      );
    }

    const interview = asRecord(activity.data);
    return getActorLabel(interview?.issuedBy) || user?.fullName || user?.email || 'System';
  };

  const getTypeBadge = (activity: ActivityItem) => {
    if (activity.type === 'status') {
      const status = toPlainString(asRecord(activity.data)?.status || 'status');
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        className: getStatusColor(status),
      };
    }

    if (activity.type === 'message') {
      return {
        label: 'Message',
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      };
    }

    if (activity.type === 'comment') {
      return {
        label: 'Comment',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      };
    }

    const interviewStatus = toPlainString(asRecord(activity.data)?.status || '').toLowerCase();
    if (interviewStatus === 'completed') {
      return {
        label: 'Interview (Completed)',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      };
    }
    if (interviewStatus === 'cancelled') {
      return {
        label: 'Interview (Cancelled)',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      };
    }
    if (interviewStatus === 'rescheduled') {
      return {
        label: 'Interview (Rescheduled)',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    }
    return {
      label: 'Interview',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
  };

  const getSummary = (activity: ActivityItem): string => {
    const data = asRecord(activity.data);
    if (activity.type === 'status') {
      return toPlainString(data?.notes) || 'Status updated.';
    }
    if (activity.type === 'message') {
      const subject = toPlainString(data?.subject);
      const content = getReadableMessageText(
        toPlainString(data?.content || data?.body || data?.message)
      );
      return subject || content || 'Message sent.';
    }
    if (activity.type === 'comment') {
      return toPlainString(data?.comment || data?.text) || 'Comment added.';
    }
    const scheduledAt = getString(data?.scheduledAt);
    if (scheduledAt) {
      return `Scheduled for ${formatDate(scheduledAt)}`;
    }
    return toPlainString(data?.notes || data?.comment) || 'Interview activity.';
  };

  const renderDetails = (activity: ActivityItem) => {
    const data = asRecord(activity.data);
    if (activity.type === 'status') {
      const notes = toPlainString(data?.notes);
      return (
        <div className="space-y-2">
          {notes ? (
            <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{notes}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No additional notes.</p>
          )}
        </div>
      );
    }

    if (activity.type === 'message') {
      const subject = toPlainString(data?.subject);
      const messageContent = getReadableMessageText(
        toPlainString(data?.content || data?.body || data?.message)
      );
      return (
        <div className="space-y-2">
          {subject && (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subject: {subject}</p>
          )}
          {messageContent ? (
            <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{messageContent}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No message body available.</p>
          )}
        </div>
      );
    }

    if (activity.type === 'comment') {
      const commentText = toPlainString(data?.comment || data?.text);
      return (
        <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
          {commentText || 'No comment text available.'}
        </p>
      );
    }

    const scheduledAt = getString(data?.scheduledAt);
    const interviewType = toPlainString(data?.type);
    const location = toPlainString(data?.location);
    const videoLink = toPlainString(data?.videoLink);
    const notes = toPlainString(data?.notes || data?.comment);

    return (
      <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
        {scheduledAt && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400">Scheduled:</span>{' '}
            {new Date(scheduledAt).toLocaleString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
        {interviewType && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400">Type:</span> {interviewType}
          </div>
        )}
        {location && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400">Location:</span> {location}
          </div>
        )}
        {videoLink && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400">Video:</span>{' '}
            <a href={videoLink} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
              {videoLink}
            </a>
          </div>
        )}
        {notes && (
          <div className="md:col-span-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400">Notes:</span>{' '}
            <span className="whitespace-pre-line">{notes}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">By</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Summary</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Channels</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {filteredActivities.map((activity, index) => {
            const dataRecord = asRecord(activity.data);
            const rowKey = `${activity.type}-${dataRecord?._id || activity.date}-${index}`;
            const isExpanded = expandedHistory === rowKey;
            const typeBadge = getTypeBadge(activity);
            const channels = getChannels(activity);

            return (
              <Fragment key={rowKey}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 align-top">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadge.className}`}>
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(activity.date)}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                    {getActorName(activity)}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                    <p className="max-w-[420px] truncate">{getSummary(activity)}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-gray-600 dark:text-gray-400">
                    {channels ? (
                      <div className="flex items-center gap-1">
                        <span title="Email" className={`${channels.email ? 'opacity-100' : 'opacity-30 grayscale'}`}>📧</span>
                        <span title="SMS" className={`${channels.sms ? 'opacity-100' : 'opacity-30 grayscale'}`}>💬</span>
                        <span title="WhatsApp" className={`${channels.whatsapp ? 'opacity-100' : 'opacity-30 grayscale'}`}>📱</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => setExpandedHistory(isExpanded ? null : rowKey)}
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {isExpanded ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50/60 dark:bg-gray-800/40">
                    <td colSpan={6} className="px-4 py-4">
                      {renderDetails(activity)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
