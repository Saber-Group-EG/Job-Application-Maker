import { FileSignature, Inbox } from 'lucide-react';
import { useLocale } from '../../../../../context/LocaleContext';
import type { JobContract } from '../../../../../services/jobContractsService';
import { toPlainString } from '../../../../../utils/strings';
import { formatDateOnly, getStatusColor } from './historyUtils';

type Props = {
  isLoading: boolean;
  contracts: JobContract[];
  onSelectContract: (contract: JobContract) => void;
};

const TABLE_HEAD_CLASS =
  'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500';
const BODY_CELL_PRIMARY =
  'px-5 py-3.5 text-sm font-medium text-gray-800';
const BODY_CELL_SECONDARY =
  'px-5 py-3.5 text-sm text-gray-500';
const SKELETON_BASE = 'h-3.5 rounded bg-gray-200 animate-pulse';

export default function ContractHistory({
  isLoading,
  contracts,
  onSelectContract,
}: Props) {
  const { t } = useLocale();

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="min-w-full">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className={TABLE_HEAD_CLASS}>{t('position', 'history')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('company', 'applicants')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('status', 'applicants')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('start', 'history')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('end', 'history')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-32`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-24`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} h-5 w-16 rounded-full`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-24`} />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`${SKELETON_BASE} w-24`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Inbox className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">{t('noContracts', 'history')}</p>
        <p className="text-xs text-gray-400">
          {t('noContractsDesc', 'history')}
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
              <th className={TABLE_HEAD_CLASS}>{t('position', 'history')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('company', 'applicants')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('status', 'applicants')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('start', 'history')}</th>
              <th className={TABLE_HEAD_CLASS}>{t('end', 'history')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {contracts.map((contract, index) => {
              const contractId = contract?._id || null;
              const status = contract?.status || 'draft';
              const companyName =
                typeof contract?.companyId === 'string'
                  ? contract?.companyId
                  : toPlainString(contract?.companyId?.name) || t('nA', 'applicants');

              return (
                <tr
                  key={contractId || index}
                  className="group cursor-pointer transition-colors hover:bg-blue-50/40"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectContract(contract);
                  }}
                >
                  <td className={BODY_CELL_PRIMARY}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                        <FileSignature className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">
                        {toPlainString(contract?.position) || t('nA', 'applicants')}
                      </span>
                    </div>
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    <span className="truncate">{companyName}</span>
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
                    {formatDateOnly(contract?.startDate) || (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={BODY_CELL_SECONDARY}>
                    {formatDateOnly(contract?.endDate || undefined) || (
                      <span className="text-gray-300">—</span>
                    )}
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
