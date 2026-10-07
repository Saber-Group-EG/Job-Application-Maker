import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/modal';
import { useLocale } from '../../context/LocaleContext';
import { useSendMessage } from '../../hooks/queries';
import { toPlainString } from '../../utils/strings';
import { toWhatsAppNumber, whatsAppLink } from '../../utils/whatsapp';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicants: any[];
};

/** Fills {name} (first name), {fullName} and {job} for one applicant. */
const personalize = (template: string, applicant: any, locale: string) => {
  const fullName = String(applicant?.fullName || '').trim();
  const job = applicant?.jobPositionId?.title ?? applicant?.jobPositionNameSnapshot;
  return template
    .replaceAll('{name}', fullName.split(/\s+/)[0] || fullName)
    .replaceAll('{fullName}', fullName)
    .replaceAll('{job}', toPlainString(job, locale) || '');
};

/**
 * Bulk WhatsApp without the Business API: one personalised message per person,
 * each opened in the sender's own WhatsApp with the text typed in. Nothing is
 * sent by the server; each message is logged on the applicant once opened.
 */
export default function BulkWhatsAppModal({ isOpen, onClose, applicants }: Props) {
  const { t, locale } = useLocale();
  const sendMessage = useSendMessage();
  const [template, setTemplate] = useState('');
  const [sentIds, setSentIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setSentIds([]);
  }, [isOpen]);

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

  const open = async (row: (typeof rows)[number]) => {
    const text = personalize(template, row.applicant, locale);
    const link = whatsAppLink(row.applicant.phone, text);
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
    setSentIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
    try {
      await sendMessage.mutateAsync({ id: row.id, data: { type: 'whatsapp', content: text } });
    } catch {
      // WhatsApp is already open; a missing history entry isn't worth blocking the queue.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('bulkWhatsappTitle', 'modals')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('bulkWhatsappIntro', 'modals')}</p>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('bulkWhatsappMessage', 'modals')}
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={4}
            dir="auto"
            placeholder={t('bulkWhatsappPlaceholder', 'modals')}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-500">{t('bulkWhatsappVariables', 'modals')}</p>
        </div>

        <p className="text-xs text-slate-500">
          {t('bulkWhatsappProgress', 'modals', { sent: sentIds.length, total: reachable.length })}
        </p>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {rows.map((row) => {
            const sent = sentIds.includes(row.id);
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium text-slate-900 dark:text-white">{row.applicant.fullName}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {row.hasPhone ? row.applicant.phone : t('bulkWhatsappNoPhone', 'modals')}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={!row.hasPhone || !template.trim()}
                  onClick={() => open(row)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                    sent ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {sent ? t('bulkWhatsappSent', 'modals') : t('bulkWhatsappOpen', 'modals')}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
          >
            {t('close', 'common')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
