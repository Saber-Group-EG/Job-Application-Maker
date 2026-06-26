import React, { useMemo, useEffect, useState, useRef } from 'react';
import Label from '../form/Label';
import Select from '../form/Select';
import { useStatusSettings } from '../../hooks/useStatusSettings';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  statusForm: any;
  setStatusForm: (v: any) => void;
  statusError: string;
  setStatusError: (v: string) => void;
  handleStatusChange: (e: React.FormEvent) => void;
  isSubmittingStatus: boolean;
  companyId?: string;
  companySettings?: any;
  jobIds?: string[];
  jobs?: any[];
};

export default function StatusChangeModal({
  isOpen,
  onClose,
  statusForm,
  setStatusForm,
  statusError,
  setStatusError,
  handleStatusChange,
  isSubmittingStatus,
  companySettings,
  jobIds = [],
  jobs = [],
}: Props) {
  const { t } = useLocale();
  const resolvedCompanySettings = companySettings;

  const { statusOptions: rawStatusOptions, getDescription } = useStatusSettings(
    resolvedCompanySettings
  );

  const statusOptions = useMemo(
    () =>
      rawStatusOptions && rawStatusOptions.length > 0
        ? rawStatusOptions
        : [
            { value: 'pending',     label: t('pending', 'applicants'),     text: t('pending', 'applicants'),     color: '#FEF3C7', textColor: '#92400E', description: 'Pending leads awaiting triage.' },
            { value: 'approved',    label: t('approved', 'applicants'),    text: t('approved', 'applicants'),    color: '#D1FAE5', textColor: '#065F46', description: 'Approved leads ready for next steps.' },
            { value: 'interview',   label: t('interview', 'applicants'),   text: t('interview', 'applicants'),   color: '#DBEAFE', textColor: '#1E40AF', description: 'Scheduled for interview.' },
            { value: 'interviewed', label: t('interviewed', 'applicants'), text: t('interviewed', 'applicants'), color: '#DBEAFE', textColor: '#065F46', description: 'Interview completed.' },
            { value: 'rejected',    label: t('rejected', 'applicants'),    text: t('rejected', 'applicants'),    color: '#FEE2E2', textColor: '#991B1B', description: 'Not a fit / disqualified.' },
            { value: 'trashed',     label: t('trashed', 'applicants'),     text: t('trashed', 'applicants'),     color: '#6B7280', textColor: '#FFFFFF', description: 'Removed or archived applications.' },
          ],
    [rawStatusOptions, t]
  );

  // ─── Job-specific status filtering ───────────────────────────────────────────
  const filteredStatusOptions: typeof statusOptions = useMemo(() => {
    const uniqueJobIds = Array.from(new Set(jobIds.filter(Boolean)));
    if (uniqueJobIds.length !== 1) return statusOptions;

    const jobId = uniqueJobIds[0];

    const extractId = (j: any): string => {
      if (!j) return '';
      if (typeof j._id === 'string') return j._id;
      if (typeof j._id === 'object' && j._id) return j._id._id || j._id.id || '';
      if (typeof j.id === 'string') return j.id;
      return '';
    };

    const job = jobs.find((j: any) => extractId(j) === String(jobId));
    if (!job) return statusOptions;

    // allowedStatuses is an array of status _id strings
    const allowedStatusIds: string[] = Array.isArray(job.allowedStatuses)
      ? job.allowedStatuses
          .map((s: any) => String(s?._id || s?.id || s || '').trim())
          .filter(Boolean)
      : [];

    if (allowedStatusIds.length === 0) return statusOptions;

    // The company statuses list (with _id + name) can live at different depths
    const companyStatuses: any[] = (() => {
      const sources = [
        job?.companyId?.settings?.statuses,
        resolvedCompanySettings?.settings?.statuses,
        resolvedCompanySettings?.statuses,
      ];
      for (const s of sources) {
        if (Array.isArray(s) && s.length > 0) return s;
      }
      return [];
    })();

    // Resolve each allowed ID → lowercase status name
    const allowedNameSet = new Set<string>();
    if (companyStatuses.length > 0) {
      allowedStatusIds.forEach((allowedId) => {
        const match = companyStatuses.find(
          (s: any) => String(s?._id || s?.id || '').trim() === allowedId
        );
        if (match) {
          allowedNameSet.add(String(match.name || '').trim().toLowerCase());
        }
      });
    } else {
      // Fallback: treat the raw IDs as names (handles pre-populated data)
      allowedStatusIds.forEach((id) => allowedNameSet.add(id.toLowerCase()));
    }

    if (allowedNameSet.size === 0) return statusOptions;

    const filtered = statusOptions.filter((opt: any) => {
      const optValue = String(opt.value || '').trim().toLowerCase();
      const optLabel = String(opt.text || opt.label || '').trim().toLowerCase();
      return allowedNameSet.has(optValue) || allowedNameSet.has(optLabel);
    });

    return filtered.length > 0 ? filtered : statusOptions;
  }, [jobIds, jobs, statusOptions, resolvedCompanySettings]);
  // ─────────────────────────────────────────────────────────────────────────────

  const [customReasons, setCustomReasons] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const reasonOptions = useMemo(() => {
    const fromRoot = (resolvedCompanySettings as any)?.rejectReasons;
    const fromNested = (resolvedCompanySettings as any)?.settings?.rejectReasons;
    const list =
      Array.isArray(fromRoot) && fromRoot.length
        ? fromRoot
        : Array.isArray(fromNested)
          ? fromNested
          : [];
    return [...new Set([...list, ...customReasons])].map((r: any) => ({
      value: String(r ?? ''),
      text: String(r ?? ''),
    }));
  }, [resolvedCompanySettings, customReasons]);

  const isRejected = useMemo(
    () => Boolean(statusForm?.status && statusForm.status.toLowerCase() === 'rejected'),
    [statusForm?.status]
  );

  const selectedStatusDescription = statusForm?.status
    ? getDescription(statusForm.status)
    : '';

  const getFilteredOptions = (query: string) => {
    if (!query.trim()) return reasonOptions;
    const searchTerm = query.toLowerCase().trim();
    return [...reasonOptions]
      .filter((o) => o.text.toLowerCase().includes(searchTerm))
      .sort((a, b) => {
        const ai = a.text.toLowerCase().indexOf(searchTerm);
        const bi = b.text.toLowerCase().indexOf(searchTerm);
        if (ai !== bi) return ai - bi;
        return a.text.length - b.text.length;
      });
  };

  const filteredReasonOptions = getFilteredOptions(searchQuery);
  const hasExactMatch = filteredReasonOptions.some(
    (opt) => opt.text.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleStatusSelect = (value: any) => {
    const selectedValue = typeof value === 'object' ? value.value : value;
    let selectedLabel = typeof value === 'object' ? (value.text || value.label || '') : '';
    if (!selectedLabel) {
      const found = statusOptions.find((opt: any) => String(opt.value) === String(selectedValue));
      selectedLabel = found ? (found.text || found.label || '') : '';
    }
    const isRejectedStatus =
      String(selectedLabel).toLowerCase() === 'rejected' ||
      (typeof selectedValue === 'string' && selectedValue.toLowerCase() === 'rejected');

    setStatusForm({
      ...statusForm,
      status: selectedValue,
      ...(!isRejectedStatus ? { reasons: [] } : {}),
    });
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleReasonsChange = (selected: string[]) => {
    const originals = reasonOptions.map((opt) => opt.value);
    const newCustom = selected.filter((r) => !originals.includes(r));
    if (newCustom.length > 0) {
      setCustomReasons((prev) => [...new Set([...prev, ...newCustom])]);
    }
    setStatusForm({ ...statusForm, reasons: selected });
  };

  const handleCustomReasonAdd = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = statusForm.reasons || [];
    if (current.includes(trimmed)) {
      setSearchQuery('');
      setIsDropdownOpen(false);
      return;
    }
    if (!reasonOptions.some((opt) => opt.value === trimmed)) {
      setCustomReasons((prev) => [...prev, trimmed]);
    }
    setStatusForm({ ...statusForm, reasons: [...current, trimmed] });
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusForm?.status || statusForm.status.trim() === '') {
      setStatusError(t('pleaseSelectStatus', 'modals'));
      return;
    }
    handleStatusChange(e);
  };

  const handleSelect = (value: string) => {
    const current = statusForm.reasons || [];
    const next = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    if (!reasonOptions.map((o) => o.value).includes(value)) {
      setCustomReasons((prev) => [...new Set([...prev, value])]);
    }
    handleReasonsChange(next);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleRemove = (value: string) => {
    const next = (statusForm.reasons || []).filter((v: string) => v !== value);
    handleReasonsChange(next);
  };

  // Close modal on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close reason dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen]);

  const selectedValues: string[] = statusForm.reasons || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full mx-4"
        style={{ maxHeight: 'none', height: 'auto', overflow: 'visible' }}
      >
        <div className="p-6" style={{ maxHeight: 'none', height: 'auto', overflow: 'visible' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('changeStatus', 'modals')}</h2>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                ✕
              </button>
            </div>

            {/* Error */}
            {statusError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Error:</strong> {statusError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatusError('')}
                    className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Status selector */}
            <div>
              <Label htmlFor="status-select">{t('newStatus', 'modals')}</Label>
              <Select
                options={filteredStatusOptions}
                placeholder={t('selectNewStatus', 'modals')}
                value={statusForm?.status || ''}
                onChange={handleStatusSelect}
              />
              {selectedStatusDescription && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedStatusDescription}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="status-notes">{t('notesOptional', 'modals')}</Label>
              <textarea
                value={statusForm.notes || ''}
                onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                placeholder={t('notesPlaceholderStatus', 'modals')}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Rejection reasons */}
            {isRejected && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                <Label>{t('reasonsForRejection', 'modals')}</Label>

                {/* Selected chips */}
                <div className="flex flex-wrap gap-2 mt-2 mb-3 p-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[42px] bg-white dark:bg-gray-800">
                  {selectedValues.length === 0 ? (
                    <span className="text-gray-400 text-sm">{t('noReasonsSelected', 'modals')}</span>
                  ) : (
                    selectedValues.map((reason, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                      >
                        {reason}
                        <button
                          type="button"
                          onClick={() => handleRemove(reason)}
                          className="hover:text-red-500 ml-1 text-base font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Search + dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                    onClick={() => setIsDropdownOpen(true)}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={t('searchAddReason', 'modals')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                    disabled={isSubmittingStatus}
                  />

                  {isDropdownOpen && (reasonOptions.length > 0 || (searchQuery.trim() && !hasExactMatch)) && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredReasonOptions.map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors ${
                            selectedValues.includes(option.value)
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : ''
                          }`}
                        >
                          {option.text}
                          {selectedValues.includes(option.value) && (
                            <span className="float-right text-blue-500">✓</span>
                          )}
                        </button>
                      ))}

                      {searchQuery.trim() && !hasExactMatch && (
                        <button
                          type="button"
                          onClick={() => handleCustomReasonAdd(searchQuery.trim())}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-700"
                        >
                          {t('addAsNewReason', 'modals', { reason: searchQuery.trim() })}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('totalReasons', 'modals', { count: reasonOptions.length })}
                </p>
                {selectedValues.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('reasonsSelected', 'modals', { count: selectedValues.length })}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingStatus}
                className="rounded-lg border border-stroke px-6 py-2 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-gray-800"
              >
                {t('cancel', 'modals')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingStatus}
                className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingStatus ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t('updating', 'modals')}</span>
                  </>
                ) : (
                  <span>{t('updateStatusBtn', 'modals')}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}