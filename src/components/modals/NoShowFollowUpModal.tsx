import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarX, Flag, Mail, MessageCircle } from 'lucide-react';
import { Modal } from '../ui/modal';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';
import { applicantsKeys } from '../../hooks/queries/useApplicants';
import { useWhatsAppStatus } from '../../hooks/queries/useCompanies';
import { applicantsService } from '../../services/applicantsService';
import { getErrorMessage } from '../../utils/errorHandler';
import { toWhatsAppNumber } from '../../utils/whatsapp';
import type { Interview } from '../../types/applicants';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  applicant: { fullName?: string; phone?: string; email?: string; interviews?: Interview[] } | null | undefined;
  companyId?: string;
  // All the times this person didn't show up, this one included.
  noShowTotal?: number;
  // Opens the message window with a "we missed you" email written.
  onEmail: () => void;
};

/**
 * Shown right after an applicant is moved to the company's no-show status:
 * says which interview was marked missed and offers to let the applicant know
 * on WhatsApp (platform number, "interviewMissed" update) or by email.
 */
export default function NoShowFollowUpModal({ isOpen, onClose, applicantId, applicant, companyId, noShowTotal = 0, onEmail }: Props) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { data: waStatus } = useWhatsAppStatus(companyId, isOpen);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [waSent, setWaSent] = useState(false);

  const missed = (applicant?.interviews || [])
    .filter((i) => i.status === 'missed')
    .sort((a, b) => new Date(b.missedAt || b.scheduledAt || 0).getTime() - new Date(a.missedAt || a.scheduledAt || 0).getTime())[0];
  const missedWhen = missed?.scheduledAt
    ? new Date(missed.scheduledAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const waEvent = waStatus?.events?.find((e) => e.key === 'interviewMissed');
  const hasPhone = Boolean(toWhatsAppNumber(applicant?.phone));
  const waAuto = waEvent?.mode === 'auto' && waEvent.allowedByPlan;
  // Why WhatsApp can't be sent from here, if it can't.
  const waBlocked = !waStatus?.connected
    ? t('noShowWaNotConnected', 'modals')
    : !waEvent?.allowedByPlan
      ? t('waNotOnPlan', 'companies')
      : !hasPhone
        ? t('waNoPhone', 'modals')
        : '';

  const close = () => {
    setError('');
    setWaSent(false);
    onClose();
  };

  const sendWhatsApp = async () => {
    setSending(true);
    setError('');
    try {
      await applicantsService.sendWhatsAppUpdate(applicantId, 'interviewMissed');
      await queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      setWaSent(true);
      Swal.fire({ icon: 'success', title: t('waUpdateSent', 'modals'), timer: 1600, showConfirmButton: false });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const name = applicant?.fullName?.split(/\s+/)[0] || t('noShowTheApplicant', 'modals');

  return (
    <Modal isOpen={isOpen} onClose={close} className="max-w-md p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <CalendarX className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('noShowFollowUpTitle', 'modals', { name })}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {missed
                ? missedWhen
                  ? t('noShowInterviewMarked', 'modals', { when: missedWhen })
                  : t('noShowInterviewMarkedNoDate', 'modals')
                : t('noShowNoInterview', 'modals')}
            </p>
          </div>
        </div>

        {noShowTotal > 1 && (
          <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <Flag className="size-4 shrink-0 fill-current" aria-hidden="true" />
            {t('noShowRepeat', 'modals', { count: noShowTotal })}
          </p>
        )}

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
              disabled={Boolean(waBlocked) || sending || waSent}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-start text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <MessageCircle className="size-4 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800 dark:text-slate-100">
                  {waSent ? t('waUpdateSent', 'modals') : sending ? t('sending', 'modals') : t('noShowSendWhatsApp', 'modals')}
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
            disabled={!applicant?.email}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-start text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Mail className="size-4 shrink-0 text-brand-600" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800 dark:text-slate-100">{t('noShowSendEmail', 'modals')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t('noShowEmailHint', 'modals')}</span>
            </span>
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {waSent ? t('close', 'common') : t('noShowNotNow', 'modals')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
