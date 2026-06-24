import { Inbox, Mail, Phone, UserCircle2 } from 'lucide-react';
import type { Applicant } from '../../../../../types/applicants';
import { toPlainString } from '../../../../../utils/strings';
import { formatDateOnly, getStatusColor } from './historyUtils';

type PreviousApplicant = Omit<Partial<Applicant>, 'jobPositionId'> & {
  _id?: string;
  appliedAt?: string;
  jobPositionId?: { title?: unknown } | string | null;
};

type Props = {
  isLoading: boolean;
  applicants: PreviousApplicant[];
  onSelectApplicant: (applicantId: string) => void;
};

const TABLE_HEAD_CLASS =
  'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500';
const BODY_CELL_PRIMARY =
  'px-5 py-3.5 text-sm font-medium text-gray-800';
const BODY_CELL_SECONDARY =
  'px-5 py-3.5 text-sm text-gray-500';
const SKELETON_BASE = 'h-3.5 rounded bg-gray-200 animate-pulse';

export default function PreviousEntriesHistory({
  isLoading,
  applicants,
  onSelectApplicant,
}: Props) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="min-w-full">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className={TABLE_HEAD_CLASS}>Full Name</th>
              <th className={TABLE_HEAD_CLASS}>Email</th>
              <th className={TABLE_HEAD_CLASS}>Phone</th>
              <th className={TABLE_HEAD_CLASS}>Status</th>
              <th className={TABLE_HEAD_CLASS}>Rejected Reasons</th>
              <th className={TABLE_HEAD_CLASS}>Applied Date</th>
              <th className={TABLE_HEAD_CLASS}>Job Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-32`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-40`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-28`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} h-5 w-16 rounded-full`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-24`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-28`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!applicants || applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Inbox className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">No previous entries</p>
        <p className="text-xs text-gray-400">
          Other applications with the same phone number will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/80">
            <tr>
              <th className={TABLE_HEAD_CLASS}>Full Name</th>
              <th className={TABLE_HEAD_CLASS}>Email</th>
              <th className={TABLE_HEAD_CLASS}>Phone</th>
              <th className={TABLE_HEAD_CLASS}>Status</th>
              <th className={TABLE_HEAD_CLASS}>Rejected Reasons</th>
              <th className={TABLE_HEAD_CLASS}>Applied Date</th>
              <th className={TABLE_HEAD_CLASS}>Job Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {applicants.map((prev, index) => {
              const status = prev?.status || 'pending';
              const appliedDate =
                formatDateOnly(prev?.submittedAt) ||
                formatDateOnly(prev?.createdAt) ||
                formatDateOnly(prev?.appliedAt);
              const jobPosition =
                typeof prev?.jobPositionId === 'string'
                  ? prev.jobPositionId
                  : toPlainString(prev?.jobPositionId?.title);
              const rejectReasons = prev?.statusHistory
                ?.filter((h) => h.status === 'rejected' && h.reasons?.length)
                .flatMap((h) => h.reasons!)
                .filter((r, i, a) => a.indexOf(r) === i) ?? [];

              return (
                <tr
                  key={prev?._id || index}
                  className="group cursor-pointer transition-colors hover:bg-blue-50/40"
                  onClick={() => prev?._id && onSelectApplicant(prev._id)}
                >
                  <td className={BODY_CELL_PRIMARY}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                        <UserCircle2 className="h-4 w-4" />
                      </span>
                      <span className="truncate text-blue-600 group-hover:underline">
                        {prev?.fullName || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    {prev?.email ? (
                      <a
                        href={`mailto:${prev.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{prev.email}</span>
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    {prev?.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span>{prev.phone}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusColor(
                        status,
                      )}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    {status === 'rejected' && rejectReasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rejectReasons.map((reason, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-inset ring-red-200"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    {appliedDate || <span className="text-gray-300">—</span>}
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    <span className="truncate">{jobPosition || 'N/A'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
