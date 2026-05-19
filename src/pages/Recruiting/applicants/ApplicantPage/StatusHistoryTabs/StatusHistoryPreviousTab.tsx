import type { Applicant } from '../../../../../types/applicants';
import { toPlainString } from '../../../../../utils/strings';
import { formatDateOnly, getStatusColor } from './statusHistoryUtils';

type PreviousApplicant = Partial<Applicant> & { _id?: string };

type Props = {
  isLoading: boolean;
  applicants: PreviousApplicant[];
  onSelectApplicant: (applicantId: string) => void;
};

export default function StatusHistoryPreviousTab({
  isLoading,
  applicants,
  onSelectApplicant,
}: Props) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Applied Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!applicants || applicants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
        No previous entries found with the same phone number.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Applied Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Job Position</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {applicants.map((prev, index) => (
            <tr
              key={prev?._id || index}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
              onClick={() => prev?._id && onSelectApplicant(prev._id)}
            >
              <td className="px-4 py-3 text-sm text-brand-600 hover:underline dark:text-brand-400">
                {prev?.fullName || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                <a
                  href={`mailto:${prev?.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {prev?.email || 'N/A'}
                </a>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {prev?.phone || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                    prev?.status || 'pending'
                  )}`}
                >
                  {prev?.status ? prev.status.charAt(0).toUpperCase() + prev.status.slice(1) : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {formatDateOnly(prev?.submittedAt) || formatDateOnly(prev?.createdAt) || formatDateOnly(prev?.appliedAt) || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {toPlainString(prev?.jobPositionId?.title) || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
