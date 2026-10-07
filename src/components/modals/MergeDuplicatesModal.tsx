import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/modal';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';
import { applicantsService } from '../../services/applicantsService';
import { applicantsKeys } from '../../hooks/queries/useApplicants';
import { getErrorMessage } from '../../utils/errorHandler';
import { toPlainString } from '../../utils/strings';
import { formatSourceLabel } from '../../utils/publicJobLinks';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicantId: string;
};

const formatDate = (value?: string, locale?: string) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
};

/**
 * Lists other applications by the same person (same email or phone) and merges
 * the chosen ones into the open applicant: their comments, interviews, messages,
 * mail, offers and contracts move here, and the merged records are archived.
 */
export default function MergeDuplicatesModal({ isOpen, onClose, applicantId }: Props) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data: duplicates = [], isLoading, error } = useQuery({
    queryKey: [...applicantsKeys.all, 'duplicates', applicantId],
    queryFn: () => applicantsService.getDuplicates(applicantId),
    enabled: isOpen && Boolean(applicantId),
  });

  useEffect(() => {
    if (isOpen) setSelected([]);
  }, [isOpen, applicantId]);

  const merge = useMutation({
    mutationFn: () => applicantsService.mergeApplicants(applicantId, selected),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
      onClose();
      await Swal.fire({
        icon: 'success',
        title: t('mergeDone', 'applicantDetails'),
        text: t('mergeDoneDesc', 'applicantDetails', { count: result.mergedCount }),
        timer: 2500,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      Swal.fire({ icon: 'error', title: t('mergeFailed', 'applicantDetails'), text: getErrorMessage(err) });
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const confirmMerge = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: t('mergeConfirmTitle', 'applicantDetails', { count: selected.length }),
      text: t('mergeConfirmText', 'applicantDetails'),
      showCancelButton: true,
      confirmButtonText: t('mergeButton', 'applicantDetails'),
    });
    if (isConfirmed) merge.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('mergeTitle', 'applicantDetails')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('mergeIntro', 'applicantDetails')}</p>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('loading', 'common')}</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-600">{getErrorMessage(error)}</p>
        ) : duplicates.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('mergeNone', 'applicantDetails')}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {duplicates.map((d) => (
              <li key={d._id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(d._id)}
                    onChange={() => toggle(d._id)}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium text-slate-900 dark:text-white">
                      {d.fullName}
                      {d.applicantNo != null && <span className="ms-2 text-xs text-slate-400">#{d.applicantNo}</span>}
                    </span>
                    <span className="block text-slate-600 dark:text-slate-300">
                      {toPlainString(d.jobTitle, locale) || '-'} · {d.status} · {formatDate(d.submittedAt, locale)}
                      {d.source ? ` · ${formatSourceLabel(d.source)}` : ''}
                    </span>
                    <span className="block break-all text-xs text-slate-500">
                      {d.email} · {d.phone} · {t('mergeMatchedBy', 'applicantDetails')}: {d.matchedBy.join(' + ')}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
          >
            {t('cancel', 'common')}
          </button>
          <button
            type="button"
            disabled={selected.length === 0 || merge.isPending}
            onClick={confirmMerge}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {merge.isPending ? t('mergeMerging', 'applicantDetails') : `${t('mergeButton', 'applicantDetails')} (${selected.length})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
