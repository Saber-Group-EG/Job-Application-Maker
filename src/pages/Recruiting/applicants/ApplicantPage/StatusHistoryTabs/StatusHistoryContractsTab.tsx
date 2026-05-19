import type { JobContract } from '../../../../../services/jobContractsService';
import { toPlainString } from '../../../../../utils/strings';
import { formatDateOnly, getStatusColor } from './statusHistoryUtils';

type Props = {
  isLoading: boolean;
  contracts: JobContract[];
  onSelectContract: (contract: JobContract) => void;
};

export default function StatusHistoryContractsTab({
  isLoading,
  contracts,
  onSelectContract,
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Start</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
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

  if (!contracts || contracts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
        No contracts found for this applicant.
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
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Start</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">End</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {contracts.map((contract, index) => {
            const contractId = contract?._id || contract?.id || null;
            const companyName =
              typeof contract?.companyId === 'string'
                ? contract?.companyId
                : toPlainString(contract?.companyId?.name) || 'N/A';

            return (
              <tr
                key={contractId || index}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectContract(contract);
                }}
              >
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {toPlainString(contract?.position) || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {companyName}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(contract?.status || 'draft')}`}>
                    {(contract?.status || 'draft').charAt(0).toUpperCase() + (contract?.status || 'draft').slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatDateOnly(contract?.startDate) || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {formatDateOnly(contract?.endDate || undefined) || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
