import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock4,
  Inbox,
  Pencil,
  Trash2,
  Video,
} from 'lucide-react';
import { Modal } from '../../../../../components/ui/modal';
import { toPlainString } from '../../../../../utils/strings';
import { formatDate, getStatusColor } from './historyUtils';
import type { Interview } from '../../../../../types/applicants';

type CompletedInterview = Interview & {
  id?: string;
};

type Props = {
  isLoading: boolean;
  interviews: CompletedInterview[];
  applicantId: string;
  onEdit: (interview: CompletedInterview) => Promise<void> | void;
  onDelete: (interview: CompletedInterview) => Promise<void> | void;
};

const TABLE_HEAD_CLASS =
  'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500';
const BODY_CELL_PRIMARY =
  'px-5 py-3.5 text-sm font-medium text-gray-800';
const BODY_CELL_SECONDARY =
  'px-5 py-3.5 text-sm text-gray-500';
const SKELETON_BASE = 'h-3.5 rounded bg-gray-200 animate-pulse';

const calcDurationMs = (startedAt?: string, endedAt?: string): number | null => {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
};

const formatDuration = (ms: number | null): string => {
  if (ms === null) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes > 0) return `${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(seconds)}s`;
};

const getInterviewTypeIcon = (type?: string) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('video')) return Video;
  return Clock4;
};

export default function CompletedInterviewsHistory({
  isLoading,
  interviews,
  applicantId,
  onEdit,
  onDelete,
}: Props) {
  const [editingInterview, setEditingInterview] = useState<CompletedInterview | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedInterviews = useMemo(() => {
    if (!interviews || !Array.isArray(interviews)) return [];
    return [...interviews].sort((a, b) => {
      const aTime = new Date(
        a.endedAt || a.startedAt || a.scheduledAt || a.createdAt || 0
      ).getTime();
      const bTime = new Date(
        b.endedAt || b.startedAt || b.scheduledAt || b.createdAt || 0
      ).getTime();
      return bTime - aTime;
    });
  }, [interviews]);

  const openEditModal = (interview: CompletedInterview) => {
    setEditingInterview(interview);
    setEditNotes(interview.notes || '');
    setEditStatus(interview.status || 'completed');
  };

  const closeEditModal = () => {
    if (isSubmitting) return;
    setEditingInterview(null);
    setEditNotes('');
    setEditStatus('');
  };

  const handleEditSubmit = async () => {
    if (!editingInterview) return;
    const interviewId = editingInterview._id || editingInterview.id;
    if (!interviewId || !applicantId) return;
    setIsSubmitting(true);
    try {
      await onEdit({
        ...editingInterview,
        notes: editNotes,
        status: editStatus,
      });
      closeEditModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="min-w-full">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className={TABLE_HEAD_CLASS}>Type</th>
              <th className={TABLE_HEAD_CLASS}>Scheduled</th>
              <th className={TABLE_HEAD_CLASS}>Started</th>
              <th className={TABLE_HEAD_CLASS}>Ended</th>
              <th className={TABLE_HEAD_CLASS}>Duration</th>
              <th className={TABLE_HEAD_CLASS}>Score</th>
              <th className={TABLE_HEAD_CLASS}>Status</th>
              <th className={TABLE_HEAD_CLASS}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-20`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-32`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-32`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-32`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-20`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-16`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} h-5 w-16 rounded-full`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-20`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!sortedInterviews || sortedInterviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Inbox className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">No completed interviews</p>
        <p className="text-xs text-gray-400">
          Completed interviews for this applicant will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className={TABLE_HEAD_CLASS}>Type</th>
                <th className={TABLE_HEAD_CLASS}>Scheduled</th>
                <th className={TABLE_HEAD_CLASS}>Started</th>
                <th className={TABLE_HEAD_CLASS}>Ended</th>
                <th className={TABLE_HEAD_CLASS}>Duration</th>
                <th className={TABLE_HEAD_CLASS}>Score</th>
                <th className={TABLE_HEAD_CLASS}>Status</th>
                <th className={TABLE_HEAD_CLASS}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {sortedInterviews.map((interview, index) => {
                const interviewId = interview?._id || interview?.id || `iv_${index}`;
                const status = interview?.status || 'completed';
                const duration = calcDurationMs(interview?.startedAt, interview?.endedAt);
                const totalScore = Number(interview?.totalScore ?? 0);
                const achievedScore = Number(interview?.achievedScore ?? 0);
                const TypeIcon = getInterviewTypeIcon(interview?.type);
                const typeLabel = toPlainString(interview?.type) || 'N/A';

                return (
                  <tr key={interviewId} className="transition-colors hover:bg-blue-50/40">
                    <td className={BODY_CELL_PRIMARY}>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                          <TypeIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate capitalize">{typeLabel}</span>
                      </div>
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      {formatDate(interview?.scheduledAt) || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      {formatDate(interview?.startedAt) || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      {formatDate(interview?.endedAt) || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock4 className="h-3.5 w-3.5 text-gray-400" />
                        <span>{formatDuration(duration)}</span>
                      </span>
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      {totalScore > 0 ? (
                        <span className="font-medium text-gray-800">
                          {achievedScore}
                          <span className="text-gray-400"> / {totalScore}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusColor(
                          status,
                        )}`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {status}
                      </span>
                    </td>
                    <td className={BODY_CELL_SECONDARY}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(interview)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                          title="Edit interview"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(interview)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                          title="Delete interview"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editingInterview}
        onClose={closeEditModal}
        className="max-w-lg mx-auto"
      >
        <div className="p-2">
          <h3 className="text-lg font-semibold text-gray-800">Edit interview</h3>
          <p className="text-sm text-gray-500 mt-1">
            Update the status or notes for this completed interview.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In progress</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isSubmitting}
                rows={5}
                placeholder="Add interview notes..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
