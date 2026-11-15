import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarX, Mail, MessageCircle } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useLocale } from '../../context/LocaleContext';
import { applicantsKeys } from '../../hooks/queries/useApplicants';
import { useWhatsAppStatus } from '../../hooks/queries/useCompanies';
import { applicantsService } from '../../services/applicantsService';
import { getErrorMessage } from '../../utils/errorHandler';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicantIds: string[];
  companyId?: string;
  // Opens the bulk email window with a "we missed you" email written.
  onEmail: () => void;
};

/**
 * Shown after several applicants are moved to the company's no-show status at
 * once: their interviews were marked missed; offers to let them know on
 * WhatsApp ("interviewMissed" update, one per applicant) or by one email.
 */
export default function BulkNoShowFollowUpModal({ isOpen, onClose, applicantIds, companyId, onEmail }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { data: waStatus } = useWhatsAppStatus(companyId, isOpen);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ sent: number; failed: number; firstError: string } | null>(null);

  const count = applicantIds.length;
  const waEvent = waStatus?.events?.find((e) => e.key === 'interviewMissed');
  const waAuto = waEvent?.mode === 'auto' && waEvent.allowedByPlan;
  const waBlocked = !companyId
    ? t('noShowBulkOneCompany', 'modals')
    : !waStatus?.connected
      ? t('noShowWaNotConnected', 'modals')
      : !waEvent?.allowedByPlan
        ? t('waNotOnPlan', 'companies')
        : '';

  const close = () => {
    if (sending) return;
    setResult(null);
    setProgress(0);
    onClose();
  };

  const sendWhatsApp = async () => {
    setSending(true);
    setResult(null);
    let sent = 0;
    let failed = 0;
    let firstError = '';
    // One at a time: each is its own WhatsApp message, and errors are per applicant
    // (no phone number, template not approved...).
    for (let i = 0; i < applicantIds.length; i += 1) {
      try {
        await applicantsService.sendWhatsAppUpdate(applicantIds[i], 'interviewMissed');
        sent += 1;
      } catch (err) {
        failed += 1;
        if (!firstError) firstError = getErrorMessage(err);
      }
      setProgress(i + 1);
    }
    setResult({ sent, failed, firstError });
    setSending(false);
    queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
  };

  return (
    <Modal isOpen={isOpen} onClose={close} className="max-w-md p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <CalendarX className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('noShowBulkTitle', 'modals', { count })}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('noShowBulkMarked', 'modals')}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">{t('noShowAskNotify', 'modals')}</p>

        <div className="space-y-2">
          {waAuto ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <MessageCircle className="size-4 shrink-0" />
              {t('noShowWaAuto', 'modals')}
            </p>
          ) : (
            <button
              type="button"
              onClick={sendWhatsApp}
              disabled={Boolean(waBlocked) || sending || Boolean(result)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-start text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <MessageCircle className="size-4 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800 dark:text-slate-100">
                  {sending
                    ? t('noShowBulkSending', 'modals', { done: progress, count })
                    : t('noShowBulkSendWhatsApp', 'modals', { count })}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {waBlocked || t('noShowWaHint', 'modals')}
                </span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onEmail}
            disabled={sending}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-start text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Mail className="size-4 shrink-0 text-brand-600" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800 dark:text-slate-100">{t('noShowSendEmail', 'modals')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t('noShowEmailHint', 'modals')}</span>
            </span>
          </button>
        </div>

        {result && (
          <div
            className={`rounded-lg p-3 text-sm ${
              result.failed
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
            }`}
          >
            <p>{t('noShowBulkResult', 'modals', { sent: result.sent, failed: result.failed })}</p>
            {result.firstError && <p className="mt-1 text-xs">{result.firstError}</p>}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            disabled={sending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {result ? t('close', 'common') : t('noShowNotNow', 'modals')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
