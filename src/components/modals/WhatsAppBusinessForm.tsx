import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';
import { applicantsKeys } from '../../hooks/queries/useApplicants';
import { useWhatsAppStatus, useWhatsAppTemplates } from '../../hooks/queries/useCompanies';
import { applicantsService } from '../../services/applicantsService';
import { getErrorMessage } from '../../utils/errorHandler';
import { toPlainString } from '../../utils/strings';
import { toWhatsAppNumber } from '../../utils/whatsapp';

type ParamSource = 'firstName' | 'fullName' | 'job' | 'custom';
type ParamChoice = { source: ParamSource; custom: string };

const DAY_MS = 24 * 60 * 60 * 1000;

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white';

type Props = {
  applicantId: string;
  applicant: any;
  companyId: string;
  onSent: () => void;
  onCancel: () => void;
};

/**
 * Sends a WhatsApp message from the app's WhatsApp Business number. Only an
 * approved template can start a conversation; free text is allowed for 24 hours
 * after the applicant last wrote to us.
 */
export default function WhatsAppBusinessForm({ applicantId, applicant, companyId, onSent, onCancel }: Props) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { data: status } = useWhatsAppStatus(companyId);
  const { data: templates = [], isLoading: templatesLoading } = useWhatsAppTemplates(Boolean(status?.connected));

  const [senderId, setSenderId] = useState('');
  const [mode, setMode] = useState<'template' | 'text'>('template');
  const [templateKey, setTemplateKey] = useState('');
  const [paramChoices, setParamChoices] = useState<ParamChoice[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const hasPhone = Boolean(toWhatsAppNumber(applicant?.phone));

  // The applicant wrote to us on WhatsApp in the last 24h: free text is allowed.
  const canFreeText = useMemo(
    () =>
      (applicant?.messages || []).some(
        (m: any) =>
          m.type === 'whatsapp' &&
          m.direction === 'inbound' &&
          m.sentAt &&
          Date.now() - new Date(m.sentAt).getTime() < DAY_MS
      ),
    [applicant?.messages]
  );

  useEffect(() => {
    setMode(canFreeText ? 'text' : 'template');
  }, [canFreeText]);

  useEffect(() => {
    if (status?.connected) {
      setSenderId((prev) => prev || status.defaultSenderId || status.senders[0]?.phoneNumberId || '');
    }
  }, [status]);

  const template = templates.find((tpl) => `${tpl.name}|${tpl.language}` === templateKey);

  useEffect(() => {
    setParamChoices(
      Array.from({ length: template?.paramCount ?? 0 }, (_, i) => ({
        source: (i === 0 ? 'firstName' : 'custom') as ParamSource,
        custom: '',
      }))
    );
  }, [template?.name, template?.language, template?.paramCount]);

  const fullName = String(applicant?.fullName || '').trim();
  const firstName = fullName.split(/\s+/)[0] || fullName;
  const job = toPlainString(applicant?.jobPositionId?.title ?? applicant?.jobPositionNameSnapshot, locale) || '';
  const valueFor = (choice: ParamChoice) =>
    ({ firstName, fullName, job, custom: choice.custom })[choice.source];

  const params = paramChoices.map(valueFor);
  const preview = template ? params.reduce((acc, value, i) => acc.replaceAll(`{{${i + 1}}}`, value), template.body) : '';
  const paramsReady = paramChoices.every((c) => c.source !== 'custom' || c.custom.trim());
  const canSend =
    hasPhone &&
    Boolean(senderId) &&
    !sending &&
    (mode === 'text' ? Boolean(text.trim()) : Boolean(template) && paramsReady);

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      await applicantsService.sendWhatsApp(
        applicantId,
        mode === 'text'
          ? { senderId, text: text.trim() }
          : { senderId, template: { name: template!.name, language: template!.language, params }, content: preview }
      );
      await queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      onSent();
      Swal.fire({
        title: t('success', 'modals'),
        text: t('waBizSent', 'modals'),
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const label = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('waBizIntro', 'modals')}</p>

      {!hasPhone && <p className="text-sm text-amber-700">{t('whatsappNeedsPhone', 'modals')}</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div>
        <label className={label}>{t('bulkWhatsappFrom', 'modals')}</label>
        <select value={senderId} onChange={(e) => setSenderId(e.target.value)} disabled={sending} className={selectClass}>
          {(status?.senders || []).map((s) => (
            <option key={s.phoneNumberId} value={s.phoneNumberId}>
              {s.displayPhone}
              {s.verifiedName ? ` — ${s.verifiedName}` : ''}
            </option>
          ))}
        </select>
      </div>

      {canFreeText && (
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm dark:border-slate-700">
          {(['text', 'template'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {m === 'text' ? t('waBizReply', 'modals') : t('bulkWhatsappTemplate', 'modals')}
            </button>
          ))}
        </div>
      )}

      {mode === 'text' ? (
        <div>
          <label className={label}>{t('messageBody', 'modals')}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            dir="auto"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-500">{t('waBizReplyHint', 'modals')}</p>
        </div>
      ) : (
        <>
          <div>
            <label className={label}>{t('bulkWhatsappTemplate', 'modals')}</label>
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              disabled={sending || templatesLoading}
              className={selectClass}
            >
              <option value="">{templatesLoading ? t('loading', 'common') : t('bulkWhatsappPickTemplate', 'modals')}</option>
              {templates.map((tpl) => (
                <option key={`${tpl.name}|${tpl.language}`} value={`${tpl.name}|${tpl.language}`}>
                  {tpl.name} ({tpl.language})
                </option>
              ))}
            </select>
            {!templatesLoading && templates.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">{t('bulkWhatsappNoTemplates', 'modals')}</p>
            )}
          </div>

          {template && (
            <>
              <p
                className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                dir="auto"
              >
                {template.body}
              </p>
              {paramChoices.map((choice, i) => (
                <div key={i} className="grid items-center gap-2 sm:grid-cols-[6rem_1fr_1fr]">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300" dir="ltr">{`{{${i + 1}}}`}</span>
                  <select
                    value={choice.source}
                    disabled={sending}
                    onChange={(e) =>
                      setParamChoices((prev) =>
                        prev.map((c, idx) => (idx === i ? { ...c, source: e.target.value as ParamSource } : c))
                      )
                    }
                    className={selectClass}
                  >
                    <option value="firstName">{t('bulkWhatsappParamFirstName', 'modals')}</option>
                    <option value="fullName">{t('bulkWhatsappParamFullName', 'modals')}</option>
                    <option value="job">{t('bulkWhatsappParamJob', 'modals')}</option>
                    <option value="custom">{t('bulkWhatsappParamCustom', 'modals')}</option>
                  </select>
                  {choice.source === 'custom' && (
                    <input
                      value={choice.custom}
                      disabled={sending}
                      onChange={(e) =>
                        setParamChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, custom: e.target.value } : c)))
                      }
                      className={selectClass}
                      dir="auto"
                    />
                  )}
                </div>
              ))}
              <p className="text-xs text-slate-500" dir="auto">
                {t('bulkWhatsappExample', 'modals')}: {preview}
              </p>
            </>
          )}
        </>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="rounded-lg border border-stroke px-6 py-2 hover:bg-slate-100 dark:border-strokedark dark:hover:bg-slate-800"
        >
          {t('cancel', 'modals')}
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? t('sending', 'modals') : t('waBizSend', 'modals')}
        </button>
      </div>
    </div>
  );
}
