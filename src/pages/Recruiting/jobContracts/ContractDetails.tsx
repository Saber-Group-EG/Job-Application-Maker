import {
  ArrowLeft,
  Calendar,
  Clock,
  Clock3,
  Copy,
  DollarSign,
  FileText,
  Gift,
  Pencil,
  Trash2,
} from 'lucide-react';
import type {
  JobContract,
  ContractStatus,
} from '../../../services/contractsService';
import { STATUS_CHIP, CONTRACT_TYPE_COLORS } from './ContractsPage';
import { ContractActions } from './ContractActions';

export function ContractDetail({
  contract,
  canWrite,
  onBack,
  onEdit,
  onDelete,
  onClone,
  onStatusChange,
}: {
  contract: JobContract;
  canWrite: boolean;
  onBack: () => void;
  onEdit: (c: JobContract) => void;
  onDelete: (id: string) => void;
  onClone: (c: JobContract) => void;
  onStatusChange: (id: string, status: ContractStatus) => void;
}) {
  const chip = STATUS_CHIP[contract.status];

  const applicantName =
    typeof contract.applicantId === 'object' && contract.applicantId !== null
      ? contract.applicantId.fullName
      : '—';
  const applicantEmail =
    typeof contract.applicantId === 'object' && contract.applicantId !== null
      ? contract.applicantId.email
      : '—';

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contracts
          </button>

          <div className="flex items-center gap-2">
            {/* PDF download only — no email */}
            <ContractActions contract={contract} />

            {canWrite && (
              <>
                <button
                  onClick={() => onEdit(contract)}
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700"
                  title="Edit"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => onClone(contract)}
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700"
                  title="Clone"
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(contract._id)}
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contract header */}
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {contract.position?.en}{' '}
              {contract.position?.ar && ` / ${contract.position.ar}`}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CONTRACT_TYPE_COLORS[contract.contractType]}`}
              >
                {contract.contractType}
              </span>
              {contract.salary.basic != null && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <DollarSign className="size-3.5" />
                  {contract.salary.basic.toLocaleString()}{' '}
                  {contract.salary.currency}
                </span>
              )}
              {contract.probationPeriod != null && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="size-3.5" />
                  {contract.probationPeriod}mo probation
                </span>
              )}
            </div>
          </div>

          {/* Status selector */}
          <select
            className={`rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none ${chip.bg} ${chip.text} ${canWrite ? 'cursor-pointer' : 'cursor-default'}`}
            value={contract.status}
            disabled={!canWrite}
            onChange={(e) =>
              onStatusChange(contract._id, e.target.value as ContractStatus)
            }
          >
            {(
              [
                'draft',
                'sent',
                'signed',
                'rejected',
                'expired',
              ] as ContractStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Applicant info */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {applicantName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {applicantEmail}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>
              Created by{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {contract.createdBy?.fullName ?? '—'}
              </span>
            </p>
            <p className="mt-0.5">{formatDate(contract.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Contract dates */}
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="h-4 w-4" />
          Contract Period
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Start Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatDate(contract.startDate) ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              End Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatDate(contract.endDate) ?? 'Open-ended'}
            </p>
          </div>
          {contract.probationPeriod != null && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Probation
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {contract.probationPeriod} month
                {contract.probationPeriod !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      {contract.benefits.length > 0 && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Gift className="h-4 w-4" />
            Benefits
          </h3>
          <div className="space-y-2">
            {contract.benefits.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {b.label.en || b.label.ar}
                </p>
                {(b.value?.en || b.value?.ar) && (
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {b.value?.en} {b.value?.ar && ` / ${b.value.ar}`} 
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {contract.sections.length > 0 && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <FileText className="h-4 w-4" />
            Contract Sections
          </h3>
          <div className="space-y-4">
            {contract.sections
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((section, i) => (
                <div key={i}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {section.title.en || section.title.ar}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {item.en || item.ar}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {contract.notes?.en && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Clock3 className="h-4 w-4" />
            Internal Notes (EN)
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {contract.notes.en}
          </p>
        </div>
      )}
      {contract.notes?.ar && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Clock3 className="h-4 w-4" />
            Internal Notes (AR)
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {contract.notes.ar}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Clock3 className="h-4 w-4" />
          Timeline
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Created', date: contract.createdAt },
            { label: 'Sent', date: contract.sentAt },
            { label: 'Signed', date: contract.signedAt },
            { label: 'Expires', date: contract.expiresAt },
          ]
            .filter((e) => e.date)
            .map((event, idx, arr) => (
              <div key={idx} className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-brand-500" />
                  {idx !== arr.length - 1 && (
                    <div className="absolute top-2 h-full w-px bg-slate-200 dark:bg-slate-700" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {event.label}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(event.date!).toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
