import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';
import { applicantsKeys } from '../../hooks/queries/useApplicants';
import { useWhatsAppStatus } from '../../hooks/queries/useCompanies';
import { applicantsService } from '../../services/applicantsService';
import { getErrorMessage } from '../../utils/errorHandler';
import { toWhatsAppNumber } from '../../utils/whatsapp';
import type { WhatsAppEventKey } from '../../types/companies';

type Props = {
  applicantId: string;
  applicant: { phone?: string } | null | undefined;
  companyId: string;
  onSent: () => void;
  onCancel: () => void;
};

/**
 * Sends one of the applicant updates by hand from the platform WhatsApp number
 * ("SG Hiring"). Updates the company's plan doesn't include are shown locked.
 */
export default function WhatsAppUpdateForm({ applicantId, applicant, companyId, onSent, onCancel }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { data: status } = useWhatsAppStatus(companyId);
  const [event, setEvent] = useState<WhatsAppEventKey | ''>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const hasPhone = Boolean(toWhatsAppNumber(applicant?.phone));
  const events = status?.events || [];

  const send = async () => {
    if (!event) return;
    setSending(true);
    setError('');
    try {
      await applicantsService.sendWhatsAppUpdate(applicantId, event);
      await queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      Swal.fire({ icon: 'success', title: t('waUpdateSent', 'modals'), timer: 1600, showConfirmButton: false });
      onSent();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t('waUpdateIntro', 'modals').replace('{name}', status?.sender?.verifiedName || 'SG Hiring')}
      </p>

      {!hasPhone && <p className="text-sm text-amber-700 dark:text-amber-400">{t('waNoPhone', 'modals')}</p>}

      <div role="radiogroup" className="space-y-2">
        {events.map((ev) => (
          <label
            key={ev.key}
            className={`flex items-start gap-3 rounded-lg border p-3 text-sm transition ${
              !ev.allowedByPlan
                ? 'cursor-not-allowed border-slate-200 opacity-60 dark:border-slate-700'
                : event === ev.key
                  ? 'cursor-pointer border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-500/10'
                  : 'cursor-pointer border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <input
              type="radio"
              name="waUpdate"
              className="mt-0.5"
              disabled={!ev.allowedByPlan}
              checked={event === ev.key}
              onChange={() => setEvent(ev.key)}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800 dark:text-slate-100">{t(`waEvent_${ev.key}`, 'companies')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t(`waEventHint_${ev.key}`, 'companies')}</span>
            </span>
            {!ev.allowedByPlan && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Lock className="size-3" />
                {t('waNotOnPlan', 'companies')}
              </span>
            )}
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t('cancel', 'common')}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={!event || !hasPhone || sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {sending ? t('sending', 'modals') : t('waSendUpdate', 'modals')}
        </button>
      </div>
    </div>
  );
}
