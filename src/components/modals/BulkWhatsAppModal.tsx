import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../ui/modal';
import { useLocale } from '../../context/LocaleContext';
import { useSendMessage } from '../../hooks/queries';
import { useWhatsAppStatus, useWhatsAppTemplates } from '../../hooks/queries/useCompanies';
import { applicantsService } from '../../services/applicantsService';
import { getErrorMessage } from '../../utils/errorHandler';
import { toPlainString } from '../../utils/strings';
import { toWhatsAppNumber, whatsAppLink } from '../../utils/whatsapp';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicants: any[];
  /** CompanySettings id of the selected applicants' company (for WhatsApp Business). */
  settingsId?: string;
};

type ParamSource = 'firstName' | 'fullName' | 'job' | 'custom';
type ParamChoice = { source: ParamSource; custom: string };
type Result = { state: 'sending' | 'sent' | 'failed'; error?: string };

const CONCURRENCY = 4;

const personalizeText = (template: string, applicant: any, locale: string) => {
  const fullName = String(applicant?.fullName || '').trim();
  const job = applicant?.jobPositionId?.title ?? applicant?.jobPositionNameSnapshot;
  return template
    .replaceAll('{name}', fullName.split(/\s+/)[0] || fullName)
    .replaceAll('{fullName}', fullName)
    .replaceAll('{job}', toPlainString(job, locale) || '');
};

const paramValue = (choice: ParamChoice, applicant: any, locale: string) =>
  personalizeText(
    { firstName: '{name}', fullName: '{fullName}', job: '{job}', custom: choice.custom }[choice.source],
    applicant,
    locale
  );

/**
 * Bulk WhatsApp. With the company's WhatsApp Business account connected, every
 * selected applicant gets an approved template sent by the system, with
 * progress and a result per person. Without it, the old click-to-chat queue
 * (opens your own WhatsApp once per person) is offered.
 */
export default function BulkWhatsAppModal({ isOpen, onClose, applicants, settingsId }: Props) {
  const { t, locale } = useLocale();
  const { data: status } = useWhatsAppStatus(isOpen ? settingsId : undefined);
  const connected = Boolean(status?.connected);
  const { data: templates = [], isLoading: templatesLoading } = useWhatsAppTemplates(settingsId, isOpen && connected);
  const sendMessage = useSendMessage();

  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [senderId, setSenderId] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [paramChoices, setParamChoices] = useState<ParamChoice[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  // manual (click-to-chat) state
  const [manualText, setManualText] = useState('');
  const [openedIds, setOpenedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setResults({});
    setOpenedIds([]);
    setRunning(false);
    cancelRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (status?.connected) {
      setMode('auto');
      setSenderId((prev) => prev || status.defaultSenderId || status.senders[0]?.phoneNumberId || '');
    } else if (status) {
      setMode('manual');
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

  const rows = useMemo(
    () =>
      applicants.map((a) => ({
        id: String(a._id || a.id),
        applicant: a,
        hasPhone: Boolean(toWhatsAppNumber(a.phone)),
      })),
    [applicants]
  );
  const reachable = rows.filter((r) => r.hasPhone);

  const renderPreview = (applicant: any) => {
    if (!template) return '';
    let text = template.body;
    paramChoices.forEach((choice, i) => {
      text = text.replaceAll(`{{${i + 1}}}`, paramValue(choice, applicant, locale));
    });
    return text;
  };

  const paramsReady = paramChoices.every((c) => c.source !== 'custom' || c.custom.trim());
  const canSendAuto = connected && Boolean(template) && Boolean(senderId) && paramsReady && reachable.length > 0;

  const sendOne = async (row: (typeof rows)[number]) => {
    setResults((prev) => ({ ...prev, [row.id]: { state: 'sending' } }));
    try {
      await applicantsService.sendWhatsApp(row.id, {
        senderId,
        template: {
          name: template!.name,
          language: template!.language,
          params: paramChoices.map((c) => paramValue(c, row.applicant, locale)),
        },
        content: renderPreview(row.applicant),
      });
      setResults((prev) => ({ ...prev, [row.id]: { state: 'sent' } }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [row.id]: { state: 'failed', error: getErrorMessage(err) } }));
    }
  };

  const runBatch = async (targets: typeof rows) => {
    setRunning(true);
    cancelRef.current = false;
    const queue = [...targets];
    const worker = async () => {
      while (queue.length && !cancelRef.current) {
        const next = queue.shift()!;
        await sendOne(next);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
  };

  const sentCount = Object.values(results).filter((r) => r.state === 'sent').length;
  const failedRows = reachable.filter((r) => results[r.id]?.state === 'failed');
  const pendingRows = reachable.filter((r) => !results[r.id] || results[r.id].state === 'failed');

  // ── manual click-to-chat ──
  const openManual = async (row: (typeof rows)[number]) => {
    const text = personalizeText(manualText, row.applicant, locale);
    const link = whatsAppLink(row.applicant.phone, text);
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
    setOpenedIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
    try {
      await sendMessage.mutateAsync({ id: row.id, data: { type: 'whatsapp', content: text } });
    } catch {
      // WhatsApp is already open; a missing history entry isn't worth blocking the queue.
    }
  };

  const selectClass =
    'w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white';

  return (
    <Modal isOpen={isOpen} onClose={() => !running && onClose()} className="max-w-2xl p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('bulkWhatsappTitle', 'modals')}</h2>

        {connected && (
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm dark:border-slate-700">
            {(['auto', 'manual'] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={running}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                {m === 'auto' ? t('bulkWhatsappModeAuto', 'modals') : t('bulkWhatsappModeManual', 'modals')}
              </button>
            ))}
          </div>
        )}

        {mode === 'auto' && connected ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('bulkWhatsappAutoIntro', 'modals')}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t('bulkWhatsappFrom', 'modals')}</label>
                <select value={senderId} onChange={(e) => setSenderId(e.target.value)} disabled={running} className={selectClass}>
                  {status!.senders.map((s) => (
                    <option key={s.phoneNumberId} value={s.phoneNumberId}>
                      {s.label ? `${s.label} — ` : ''}{s.displayPhone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t('bulkWhatsappTemplate', 'modals')}</label>
                <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} disabled={running || templatesLoading} className={selectClass}>
                  <option value="">{templatesLoading ? t('loading', 'common') : t('bulkWhatsappPickTemplate', 'modals')}</option>
                  {templates.map((tpl) => (
                    <option key={`${tpl.name}|${tpl.language}`} value={`${tpl.name}|${tpl.language}`}>
                      {tpl.name} ({tpl.language})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!templatesLoading && templates.length === 0 && (
              <p className="text-xs text-amber-700">{t('bulkWhatsappNoTemplates', 'modals')}</p>
            )}

            {template && (
              <>
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200" dir="auto">
                  {template.body}
                </p>
                {paramChoices.map((choice, i) => (
                  <div key={i} className="grid items-center gap-2 sm:grid-cols-[6rem_1fr_1fr]">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300" dir="ltr">{`{{${i + 1}}}`}</span>
                    <select
                      value={choice.source}
                      disabled={running}
                      onChange={(e) =>
                        setParamChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, source: e.target.value as ParamSource } : c)))
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
                        disabled={running}
                        onChange={(e) =>
                          setParamChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, custom: e.target.value } : c)))
                        }
                        className={selectClass}
                        dir="auto"
                      />
                    )}
                  </div>
                ))}
                {reachable[0] && (
                  <p className="text-xs text-slate-500" dir="auto">
                    {t('bulkWhatsappExample', 'modals')}: {renderPreview(reachable[0].applicant)}
                  </p>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {t('bulkWhatsappProgress', 'modals', { sent: sentCount, total: reachable.length })}
                {failedRows.length > 0 && ` · ${t('bulkWhatsappFailedCount', 'modals', { count: failedRows.length })}`}
              </p>
              {running ? (
                <button type="button" onClick={() => { cancelRef.current = true; }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
                  {t('bulkWhatsappStop', 'modals')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canSendAuto || pendingRows.length === 0}
                  onClick={() => runBatch(pendingRows)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {failedRows.length > 0 && sentCount > 0
                    ? t('bulkWhatsappRetry', 'modals', { count: failedRows.length })
                    : t('bulkWhatsappSendAll', 'modals', { count: pendingRows.length })}
                </button>
              )}
            </div>

            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {rows.map((row) => {
                const result = results[row.id];
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium text-slate-900 dark:text-white">{row.applicant.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {row.hasPhone ? row.applicant.phone : t('bulkWhatsappNoPhone', 'modals')}
                      </span>
                      {result?.state === 'failed' && <span className="block truncate text-xs text-red-600" title={result.error}>{result.error}</span>}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        result?.state === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : result?.state === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : result?.state === 'sending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {result?.state === 'sent'
                        ? t('bulkWhatsappSent2', 'modals')
                        : result?.state === 'failed'
                          ? t('bulkWhatsappFailed', 'modals')
                          : result?.state === 'sending'
                            ? t('bulkWhatsappSending', 'modals')
                            : row.hasPhone
                              ? t('bulkWhatsappWaiting', 'modals')
                              : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('bulkWhatsappIntro', 'modals')}</p>
            {!connected && <p className="text-xs text-slate-500">{t('bulkWhatsappConnectHint', 'modals')}</p>}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t('bulkWhatsappMessage', 'modals')}</label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={4}
                dir="auto"
                placeholder={t('bulkWhatsappPlaceholder', 'modals')}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500">{t('bulkWhatsappVariables', 'modals')}</p>
            </div>
            <p className="text-xs text-slate-500">{t('bulkWhatsappProgress', 'modals', { sent: openedIds.length, total: reachable.length })}</p>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {rows.map((row) => {
                const opened = openedIds.includes(row.id);
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium text-slate-900 dark:text-white">{row.applicant.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">{row.hasPhone ? row.applicant.phone : t('bulkWhatsappNoPhone', 'modals')}</span>
                    </span>
                    <button
                      type="button"
                      disabled={!row.hasPhone || !manualText.trim()}
                      onClick={() => openManual(row)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${opened ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                      {opened ? t('bulkWhatsappSent', 'modals') : t('bulkWhatsappOpen', 'modals')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
          >
            {t('close', 'common')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
