// Contract detail view: overview, period, benefits, sections, notes, status and timeline.
import { Calendar, Clock3, Copy, FileText, Gift, Pencil, Trash2, UserRound } from 'lucide-react';
import type { JobContract, ContractStatus } from '../../../services/contractsService';
import { useLocale } from '../../../context/LocaleContext';
import { Badge, Card, CardToolbar, IconButton, PageShell, SectionTitle, selectClass } from '../../../components/ui/kit';
import { BackLink, DocCard, DocTimeline, Meta } from '../../../components/documents/DocumentUi';
import { ContractActions } from './ContractActions';
import { CONTRACT_STATUSES, CONTRACT_STATUS_TONE, CONTRACT_TYPE_TONE, contractStatusKey, contractTypeKey } from './contractMeta';

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
  const { t, locale } = useLocale();
  const pick = (v?: { en?: string | null; ar?: string | null } | null) => (locale === 'ar' ? v?.ar || v?.en : v?.en || v?.ar) || '';

  const applicant = typeof contract.applicantId === 'object' && contract.applicantId !== null ? contract.applicantId : null;
  const applicantName = applicant?.fullName ?? '—';
  const applicantEmail = applicant?.email ?? '—';

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(locale, { month: 'short', day: '2-digit', year: 'numeric' });
  };
  const notes = locale === 'ar' ? contract.notes?.ar : contract.notes?.en;

  return (
    <PageShell
      back={<BackLink onClick={onBack}>{t('backToContracts', 'jobContracts')}</BackLink>}
      title={pick(contract.position)}
      actions={
        <>
          <ContractActions contract={contract} />
          {canWrite && (
            <>
              <IconButton label={t('edit', 'jobContracts')} onClick={() => onEdit(contract)}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label={t('clone', 'jobContracts')} onClick={() => onClone(contract)}>
                <Copy className="size-4" />
              </IconButton>
              <IconButton tone="danger" label={t('delete', 'jobContracts')} onClick={() => onDelete(contract._id)}>
                <Trash2 className="size-4" />
              </IconButton>
            </>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardToolbar>
              <SectionTitle icon={<UserRound className="size-4" />}>{applicantName}</SectionTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={CONTRACT_TYPE_TONE[contract.contractType] ?? 'slate'}>{t(contractTypeKey(contract.contractType), 'modals')}</Badge>
                <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{t(contractStatusKey(contract.status), 'jobContracts')}</Badge>
              </div>
            </CardToolbar>
            <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label={t('email', 'jobContracts')}>
                <span dir="ltr">{applicantEmail}</span>
              </Meta>
              {contract.salary.basic != null && (
                <Meta label={t('salary', 'jobContracts')}>
                  <span className="tabular-nums">
                    {contract.salary.basic.toLocaleString()} {contract.salary.currency}
                  </span>
                </Meta>
              )}
              <Meta label={t('createdBy', 'jobContracts')}>{contract.createdBy?.fullName ?? '—'}</Meta>
              <Meta label={t('timelineCreated', 'jobContracts')}>{formatDate(contract.createdAt)}</Meta>
            </dl>
          </Card>

          <DocCard icon={<Calendar className="size-4" />} title={t('contractPeriod', 'jobContracts')}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Meta label={t('startDate', 'jobContracts')}>{formatDate(contract.startDate) ?? '—'}</Meta>
              <Meta label={t('endDate', 'jobContracts')}>{formatDate(contract.endDate) ?? t('openEnded', 'jobContracts')}</Meta>
              {contract.probationPeriod != null && (
                <Meta label={t('probation', 'jobContracts')}>
                  {contract.probationPeriod} {contract.probationPeriod !== 1 ? t('months', 'jobContracts') : t('month', 'jobContracts')}
                </Meta>
              )}
            </dl>
          </DocCard>

          {contract.benefits.length > 0 && (
            <DocCard icon={<Gift className="size-4" />} title={t('benefits', 'jobContracts')}>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {contract.benefits.map((b, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{pick(b.label)}</p>
                    {(b.value?.en || b.value?.ar) && (
                      <span className="text-sm text-slate-600 dark:text-slate-300">{pick(b.value)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </DocCard>
          )}

          {contract.sections.length > 0 && (
            <DocCard icon={<FileText className="size-4" />} title={t('contractSections', 'jobContracts')}>
              <div className="space-y-5">
                {contract.sections
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((section, i) => (
                    <div key={i}>
                      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{pick(section.title)}</h3>
                      <ul className="space-y-1.5">
                        {section.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                            {pick(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </DocCard>
          )}

          {notes && (
            <DocCard icon={<Clock3 className="size-4" />} title={t('internalNotes', 'jobContracts')}>
              <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{notes}</p>
            </DocCard>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <label htmlFor="contract-status" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('status', 'jobContracts')}
            </label>
            <select
              id="contract-status"
              className={selectClass}
              value={contract.status}
              disabled={!canWrite}
              onChange={(e) => onStatusChange(contract._id, e.target.value as ContractStatus)}
            >
              {CONTRACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(contractStatusKey(s), 'jobContracts')}
                </option>
              ))}
            </select>
          </Card>

          <DocCard icon={<Clock3 className="size-4" />} title={t('timeline', 'jobContracts')}>
            <DocTimeline
              locale={locale}
              events={[
                { label: t('timelineCreated', 'jobContracts'), date: contract.createdAt },
                { label: t('timelineSent', 'jobContracts'), date: contract.sentAt },
                { label: t('timelineSigned', 'jobContracts'), date: contract.signedAt },
                { label: t('timelineExpires', 'jobContracts'), date: contract.expiresAt },
              ]}
            />
          </DocCard>
        </div>
      </div>
    </PageShell>
  );
}
