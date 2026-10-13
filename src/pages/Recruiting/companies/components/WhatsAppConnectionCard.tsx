import { CheckCircle2, MessageCircle, TriangleAlert } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useAuth } from '../../../../context/AuthContext';
import { useLocale } from '../../../../context/LocaleContext';
import {
  useAssignWhatsAppNumber,
  useWhatsAppNumbers,
  useWhatsAppStatus,
} from '../../../../hooks/queries/useCompanies';

type Props = {
  companyId?: string;
  companyName?: string;
};

const errorMessage = (err: unknown) => (err as { message?: string })?.message || String(err);

/**
 * WhatsApp Business for one company: the numbers it can send from. The account
 * itself is configured on the server. A platform admin (system role) also sees
 * every number on the account and can assign each to a company, since a number
 * carries one company's display name.
 */
export default function WhatsAppConnectionCard({ companyId, companyName }: Props) {
  const { t } = useLocale();
  const { user } = useAuth();
  const isPlatformAdmin = (user as any)?.roleId?.isSystemRole === true;
  const { data: status, isLoading } = useWhatsAppStatus(companyId);
  const { data: overview } = useWhatsAppNumbers(isPlatformAdmin && Boolean(status?.configured));
  const assign = useAssignWhatsAppNumber();

  if (!companyId) return null;

  const handleAssign = async (phoneNumberId: string, owner: { companyName: string | null } | null) => {
    if (owner) {
      const confirm = await Swal.fire({
        icon: 'warning',
        text: t('waReassignConfirm', 'companies', { name: owner.companyName || '' }),
        showCancelButton: true,
        confirmButtonText: t('waAssignHere', 'companies'),
        cancelButtonText: t('cancel', 'common'),
      });
      if (!confirm.isConfirmed) return;
    }
    try {
      await assign.mutateAsync({ phoneNumberId, companyId });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('waAssignFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const handleUnassign = async (phoneNumberId: string) => {
    try {
      await assign.mutateAsync({ phoneNumberId, companyId: null });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('waAssignFailed', 'companies'), text: errorMessage(err) });
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <MessageCircle className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('waTitle', 'companies')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('waSubtitle', 'companies')}</p>
          </div>
        </div>
        {status?.connected && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
            <CheckCircle2 className="size-3.5" />
            {t('waConnectedBadge', 'companies')}
          </span>
        )}
      </div>

      <div className="space-y-6 p-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">{t('loading', 'common')}</p>
        ) : !status?.configured ? (
          <p className="text-sm text-slate-500">{t('waNotSetUp', 'companies')}</p>
        ) : status.error ? (
          <p className="flex items-start gap-2 text-sm text-amber-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {t('waConnectionError', 'companies')}: {status.error}
            </span>
          </p>
        ) : !status.connected ? (
          <p className="text-sm text-slate-500">{t('waNoNumbers', 'companies')}</p>
        ) : (
          <div>
            <ul className="space-y-2">
              {status.senders.map((s) => (
                <li
                  key={s.phoneNumberId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                >
                  <span dir="ltr" className="font-medium">{s.displayPhone}</span>
                  {s.verifiedName && <span className="text-xs text-slate-500">{s.verifiedName}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">{t('waSharedHint', 'companies')}</p>
          </div>
        )}

        {status?.configured && !status.webhookReady && (
          <p className="text-xs text-amber-700">{t('waWebhookPending', 'companies')}</p>
        )}

        {isPlatformAdmin && overview?.configured && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <div>
              <h3 className="text-sm font-semibold">{t('waAdminTitle', 'companies')}</h3>
              <p className="text-xs text-slate-500">{t('waAdminHint', 'companies')}</p>
            </div>
            <ul className="space-y-2">
              {overview.numbers.map((n) => {
                const mine = n.assignedTo?.companyId === companyId;
                return (
                  <li
                    key={n.phoneNumberId}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span dir="ltr" className="font-medium">{n.displayPhone}</span>
                    {n.verifiedName && <span className="text-xs text-slate-500">{n.verifiedName}</span>}
                    <span className="text-xs text-slate-500">
                      {n.assignedTo
                        ? t('waAssignedTo', 'companies', { name: n.assignedTo.companyName || '—' })
                        : t('waUnassigned', 'companies')}
                    </span>
                    <span className="ms-auto">
                      {mine ? (
                        <button
                          type="button"
                          disabled={assign.isPending}
                          onClick={() => handleUnassign(n.phoneNumberId)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {t('waUnassign', 'companies')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={assign.isPending}
                          onClick={() => handleAssign(n.phoneNumberId, n.assignedTo)}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          {t('waAssignHere', 'companies')}
                          {companyName ? ` — ${companyName}` : ''}
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
