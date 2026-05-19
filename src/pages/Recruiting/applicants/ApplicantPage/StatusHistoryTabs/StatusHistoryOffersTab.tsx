import type { JobOffer } from '../../../../../services/jobOffersService';
import { toPlainString } from '../../../../../utils/strings';
import { formatDate, getStatusColor } from './statusHistoryUtils';

type OfferRow = JobOffer & {
  jobPositionId?: { title?: unknown };
};

type Props = {
  isLoading: boolean;
  offers: OfferRow[];
  onSelectOffer: (offer: OfferRow) => void;
};

export default function StatusHistoryOffersTab({
  isLoading,
  offers,
  onSelectOffer,
}: Props) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Position</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Responded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
        No job offers found for this applicant.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Position</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Company</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sent</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Responded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {offers.map((offer, index) => {
            const offerId = offer?._id || offer?.id || null;
            const companyName =
              typeof offer?.companyId === 'string'
                ? offer?.companyId
                : toPlainString(offer?.companyId?.name) || 'N/A';
            const position =
              toPlainString(offer?.position) ||
              toPlainString(offer?.jobPositionId?.title) ||
              'N/A';

            return (
              <tr
                key={offerId || index}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectOffer(offer);
                }}
              >
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {position}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {companyName}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(offer?.status || 'draft')}`}>
                    {(offer?.status || 'draft').charAt(0).toUpperCase() + (offer?.status || 'draft').slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(offer?.sentAt || undefined) || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(offer?.respondedAt || undefined) || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
