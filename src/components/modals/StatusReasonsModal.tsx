import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Modal } from '../ui/modal';
import { useLocale } from '../../context/LocaleContext';
import { applicantsKeys } from '../../hooks/queries/useApplicants';
import { applicantsService } from '../../services/applicantsService';
import { getErrorMessage } from '../../utils/errorHandler';
import Swal from '../../utils/swal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
  entryId: string;
  status: string;
  initialReasons?: string[];
  // The company's saved reasons for this status (no-show or rejection).
  suggestions: string[];
  kind: 'noShow' | 'rejected';
};

/**
 * Adds or changes the reasons of a past status change, for when they are only
 * known later (e.g. the applicant explains why they didn't show up).
 */
export default function StatusReasonsModal({
  isOpen,
  onClose,
  applicantId,
  entryId,
  status,
  initialReasons = [],
  suggestions,
  kind,
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<string[]>(initialReasons);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReasons(initialReasons);
      setDraft('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entryId]);

  const add = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setReasons((prev) => (prev.some((r) => r.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
    setDraft('');
  };
  const toggle = (value: string) =>
    setReasons((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));

  const save = async () => {
    const final = draft.trim() ? [...reasons, draft.trim()] : reasons;
    setSaving(true);
    setError('');
    try {
      const updated = await applicantsService.updateStatusHistoryEntry(applicantId, entryId, {
        reasons: [...new Set(final)],
      });
      if (updated && typeof updated === 'object' && (updated as any)._id) {
        queryClient.setQueryData(applicantsKeys.detail(applicantId), updated);
      }
      await queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      Swal.fire({ icon: 'success', title: t('reasonsSaved', 'modals'), timer: 1400, showConfirmButton: false });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unused = suggestions.filter((s) => !reasons.includes(s));

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} className="max-w-md p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {kind === 'noShow' ? t('reasonsForNoShow', 'modals') : t('reasonsForRejection', 'modals')}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('reasonsForStatusChange', 'modals', { status })}</p>
        </div>

        <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
          {reasons.length === 0 ? (
            <span className="text-sm text-slate-400">{t('noReasonsSelected', 'modals')}</span>
          ) : (
            reasons.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {r}
                <button type="button" onClick={() => toggle(r)} aria-label={t('remove', 'common')} className="hover:text-red-500">
                  <X className="size-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {unused.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {unused.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                + {s}
              </button>
            ))}
          </div>
        )}

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={t('typeReasonEnter', 'modals')}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800"
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('cancel', 'modals')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? t('saving', 'modals') : t('saveReasons', 'modals')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
