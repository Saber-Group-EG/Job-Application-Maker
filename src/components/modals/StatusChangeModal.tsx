import React, { useMemo, useEffect, useState, useRef } from 'react';
import Label from '../form/Label';
import Select from '../form/Select';
import { useStatusSettings } from '../../hooks/useStatusSettings';
import { useLocale } from '../../context/LocaleContext';
import { useMatch } from 'react-router';
import { useUndo } from '../../context/UndoContext';
import type { FormDraft } from '../../hooks/useFormDraft';
import ModalDraft from './ModalDraft';
import { ExternalLink, Flag, Mail, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { companiesKeys } from '../../hooks/queries/useCompanies';
import { paths } from '../../router/Paths';
import { useWhatsAppStatus } from '../../hooks/queries/useCompanies';
import { isNoShowStatus, reasonsForStatus, settingsOf } from '../../utils/noShow';

type StatusDraft = { status: string; notes: string; reasons: string[] };

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
  // Applicants (of this one or the selection) who didn't show up before:
  // a red warning when the no-show status is picked.
  noShowFlagged?: Array<{ id: string; name: string; count: number; lastAt?: string | null }>;
  // Bulk only: take applicants out of the selection from the warning.
  onDeselectApplicants?: (ids: string[]) => void;
  // How many applicants the change is for (1 on an applicant's page).
  applicantCount?: number;
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
  companyId,
  noShowFlagged = [],
  onDeselectApplicants,
  applicantCount = 1,
}: Props) {
  const { t } = useLocale();
  const { offerUndo } = useUndo();
  const { hasPermission } = useAuth();
  const canManageLists =
    hasPermission('Interview Settings Management', 'read') ||
    hasPermission('Company Management', 'read') ||
    hasPermission('Settings Management', 'read');
  // Statuses and reasons are edited in a new tab; reload them when the person comes back.
  const queryClient = useQueryClient();
  const openedManage = useRef(false);
  useEffect(() => {
    const onFocus = () => {
      if (!openedManage.current) return;
      openedManage.current = false;
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [queryClient]);
  const manageLink = (to: string) =>
    canManageLists ? (
      <Link
        to={to}
        target="_blank"
        rel="noopener"
        onClick={() => (openedManage.current = true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        {t('manageList', 'modals')}
        <ExternalLink className="size-3" />
      </Link>
    ) : null;
  const resolvedCompanySettings = companySettings;

  // Notes and rejection reasons survive a refresh or closing the modal. Only on
  // a single applicant's page: the bulk table's selection changes between
  // opens, and a restored status there could hit the wrong applicants.
  const applicantMatch = useMatch('/applicant-details/:id');
  const applicantIdForDraft = applicantMatch?.params.id;
  const draftRef = useRef<FormDraft | null>(null);
  const startFormRef = useRef<StatusDraft | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const statusFormRef = useRef(statusForm);
  statusFormRef.current = statusForm;
  const statusDraftValue = useMemo<StatusDraft>(
    () => ({
      status: String(statusForm?.status || ''),
      notes: String(statusForm?.notes || ''),
      reasons: Array.isArray(statusForm?.reasons) ? statusForm.reasons : [],
    }),
    [statusForm?.status, statusForm?.notes, statusForm?.reasons]
  );
  const restoreStatusDraft = (saved: StatusDraft) => {
    startFormRef.current = statusDraftValue;
    setStatusForm({
      ...statusForm,
      status: saved.status || statusForm?.status || '',
      notes: saved.notes || '',
      reasons: Array.isArray(saved.reasons) ? saved.reasons : [],
    });
  };
  const discardStatusDraft = () => {
    const start = startFormRef.current;
    setStatusForm({ ...statusForm, ...(start ?? { notes: '', reasons: [] }) });
    setStatusError('');
  };

  const { statusOptions: rawStatusOptions, getDescription } = useStatusSettings(
    resolvedCompanySettings
  );

  const statusOptions = useMemo(
    () =>
      rawStatusOptions && rawStatusOptions.length > 0
        ? rawStatusOptions
        : [
            { value: 'pending',     label: t('pending', 'applicants'),     text: t('pending', 'applicants'),     color: '#FEF3C7', textColor: '#92400E', description: t('pendingDesc', 'applicants') },
            { value: 'approved',    label: t('approved', 'applicants'),    text: t('approved', 'applicants'),    color: '#D1FAE5', textColor: '#065F46', description: t('approvedDesc', 'applicants') },
            { value: 'interview',   label: t('interview', 'applicants'),   text: t('interview', 'applicants'),   color: '#DBEAFE', textColor: '#1E40AF', description: t('interviewDesc', 'applicants') },
            { value: 'interviewed', label: t('interviewed', 'applicants'), text: t('interviewed', 'applicants'), color: '#DBEAFE', textColor: '#065F46', description: t('interviewedDesc', 'applicants') },
            { value: 'rejected',    label: t('rejected', 'applicants'),    text: t('rejected', 'applicants'),    color: '#FEE2E2', textColor: '#991B1B', description: t('rejectedDesc', 'applicants') },
            { value: 'trashed',     label: t('trashed', 'applicants'),     text: t('trashed', 'applicants'),     color: '#6B7280', textColor: '#FFFFFF', description: t('trashedDesc', 'applicants') },
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

  const isRejected = useMemo(
    () => Boolean(statusForm?.status && statusForm.status.toLowerCase() === 'rejected'),
    [statusForm?.status]
  );
  // The company's "didn't show up" status: optional reasons (often only known
  // later; they can be added from the applicant's activity).
  const isNoShow = useMemo(
    () => !isRejected && isNoShowStatus(settingsOf(resolvedCompanySettings), statusForm?.status),
    [isRejected, resolvedCompanySettings, statusForm?.status]
  );

  // Any status can have reasons (Settings → Statuses; rejected: Rejection Reasons).
  const statusReasons = useMemo(
    () => reasonsForStatus(resolvedCompanySettings, statusForm?.status),
    [resolvedCompanySettings, statusForm?.status]
  );
  const showReasons = isRejected || isNoShow || statusReasons.length > 0;

  const reasonOptions = useMemo(
    () =>
      [...new Set([...statusReasons, ...customReasons])].map((r: any) => ({
        value: String(r ?? ''),
        text: String(r ?? ''),
      })),
    [statusReasons, customReasons]
  );

  // "Let them know" (no-show): the Missed interview WhatsApp update and an email.
  const { data: waStatus } = useWhatsAppStatus(companyId, isOpen && isNoShow);
  const waEvent = waStatus?.events?.find((e) => e.key === 'interviewMissed');
  const waAuto = waEvent?.mode === 'auto' && waEvent.allowedByPlan;
  const waBlocked = !companyId
    ? t('noShowBulkOneCompany', 'modals')
    : !waStatus?.connected
      ? t('noShowWaNotConnected', 'modals')
      : !waEvent?.allowedByPlan
        ? t('waNotOnPlan', 'companies')
        : '';
  const toggleEmail = (on: boolean) =>
    setStatusForm({
      ...statusForm,
      notifyEmail: on,
      ...(on && !statusForm?.emailSubject ? { emailSubject: t('noShowEmailSubject', 'modals') } : {}),
      ...(on && !statusForm?.emailBody ? { emailBody: t('noShowEmailBodyText', 'modals') } : {}),
    });
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

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
    // Reasons belong to one status (rejected, no-show): a different status starts empty.
    const changed = String(selectedValue ?? '') !== String(statusForm?.status ?? '');
    setStatusForm({
      ...statusForm,
      status: selectedValue,
      ...(changed ? { reasons: [] } : {}),
      // "Let them know" choices only apply to the no-show status.
      ...(changed ? { notifyWhatsApp: false, notifyEmail: false } : {}),
    });
    if (changed) setCustomReasons([]);
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
    const result: unknown = handleStatusChange(e);
    // The page closes the modal once the status is saved and keeps it open on
    // failure; forget the draft only in the first case.
    Promise.resolve(result)
      .then(() => new Promise((resolve) => setTimeout(resolve, 100)))
      .then(() => {
        if (!isOpenRef.current) draftRef.current?.clear();
      })
      .catch(() => {
        /* failed: keep the draft */
      });
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
    const before: string[] = statusForm.reasons || [];
    const next = before.filter((v: string) => v !== value);
    handleReasonsChange(next);
    offerUndo(t('undoItemRemoved', 'common'), () =>
      setStatusForm({ ...statusFormRef.current, reasons: before })
    );
  };

  // Close modal on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Clicks on the Undo toast (an aria-live region outside the modal) don't close it.
      if ((e.target as Element | null)?.closest?.('[aria-live]')) return;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center py-6">
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full mx-4"
        style={{ maxHeight: 'none', height: 'auto', overflow: 'visible' }}
      >
        <div className="p-6" style={{ maxHeight: 'none', height: 'auto', overflow: 'visible' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('changeStatus', 'modals')}</h2>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                ✕
              </button>
            </div>

            {applicantIdForDraft && (
              <ModalDraft
                draftKey={`status:${applicantIdForDraft}`}
                value={statusDraftValue}
                isEmpty={(v) => !v.notes.trim() && v.reasons.length === 0}
                onRestore={restoreStatusDraft}
                onDiscard={discardStatusDraft}
                draftRef={draftRef}
              />
            )}

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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="status-select">{t('newStatus', 'modals')}</Label>
                {manageLink(paths.applicants.statuses)}
              </div>
              <Select
                options={filteredStatusOptions}
                placeholder={t('selectNewStatus', 'modals')}
                value={statusForm?.status || ''}
                onChange={handleStatusSelect}
              />
              {selectedStatusDescription && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {isNoShow && noShowFlagged.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <p className="flex items-start gap-2 font-medium">
                  <Flag className="mt-0.5 size-4 shrink-0 fill-current" aria-hidden="true" />
                  {applicantCount > 1
                    ? t('noShowBulkWarning', 'applicants', { count: noShowFlagged.length })
                    : noShowFlagged[0].lastAt
                      ? t('noShowSingleWarningLast', 'applicants', { count: noShowFlagged[0].count, date: fmtDate(noShowFlagged[0].lastAt) })
                      : t('noShowSingleWarning', 'applicants', { count: noShowFlagged[0].count })}
                </p>
                {applicantCount > 1 && (
                  <>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto ps-6">
                      {noShowFlagged.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            {a.name}{' '}
                            <span className="text-xs opacity-80">
                              ({a.count}×{a.lastAt ? `, ${fmtDate(a.lastAt)}` : ''})
                            </span>
                          </span>
                          {onDeselectApplicants && (
                            <button
                              type="button"
                              onClick={() => onDeselectApplicants([a.id])}
                              title={t('noShowDeselectOne', 'applicants')}
                              aria-label={t('noShowDeselectOne', 'applicants')}
                              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20"
                            >
                              <X className="size-3.5" />
                              {t('noShowDeselectShort', 'applicants')}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {onDeselectApplicants && (
                      <button
                        type="button"
                        onClick={() => onDeselectApplicants(noShowFlagged.map((a) => a.id))}
                        className="mt-2 ms-6 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/20"
                      >
                        {t('noShowDeselectAll', 'applicants', { count: noShowFlagged.length })}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            {isNoShow && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {t('noShowStatusHint', 'modals')}
              </p>
            )}

            {/* Reasons (rejected, no-show, or any status the company gave reasons) */}
            {showReasons && (
              <div
                className={`p-4 rounded-lg border ${
                  isRejected
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    {isRejected
                      ? t('reasonsForRejection', 'modals')
                      : isNoShow
                        ? t('reasonsForNoShow', 'modals')
                        : t('reasonsOptional', 'modals')}
                  </Label>
                  {manageLink(paths.applicants.rejectionReasons)}
                </div>

                {/* Selected chips */}
                <div className="flex flex-wrap gap-2 mt-2 mb-3 p-2 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[42px] bg-white dark:bg-slate-800">
                  {selectedValues.length === 0 ? (
                    <span className="text-slate-400 text-sm">{t('noReasonsSelected', 'modals')}</span>
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
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                    disabled={isSubmittingStatus}
                  />

                  {isDropdownOpen && (reasonOptions.length > 0 || (searchQuery.trim() && !hasExactMatch)) && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredReasonOptions.map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition-colors ${
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
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-blue-600 dark:text-blue-400 border-t border-slate-200 dark:border-slate-700"
                        >
                          {t('addAsNewReason', 'modals', { reason: searchQuery.trim() })}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('totalReasons', 'modals', { count: reasonOptions.length })}
                </p>
                {selectedValues.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t('reasonsSelected', 'modals', { count: selectedValues.length })}
                  </p>
                )}
              </div>
            )}

            {/* Let them know (no-show): sent right after the status is saved */}
            {isNoShow && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <Label>{t('noShowNotifyTitle', 'modals')}</Label>
                {waAuto ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <MessageCircle className="size-4 shrink-0" />
                    {t('noShowWaAuto', 'modals')}
                  </p>
                ) : (
                  <label className={`flex items-start gap-2 text-sm ${waBlocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-brand-500"
                      checked={Boolean(statusForm?.notifyWhatsApp) && !waBlocked}
                      disabled={Boolean(waBlocked)}
                      onChange={(e) => setStatusForm({ ...statusForm, notifyWhatsApp: e.target.checked })}
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                        <MessageCircle className="size-4 text-emerald-600" />
                        {applicantCount > 1
                          ? t('noShowBulkSendWhatsApp', 'modals', { count: applicantCount })
                          : t('noShowSendWhatsApp', 'modals')}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{waBlocked || t('noShowWaHint', 'modals')}</span>
                    </span>
                  </label>
                )}

                <label className={`flex items-start gap-2 text-sm ${companyId ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-brand-500"
                    checked={Boolean(statusForm?.notifyEmail) && Boolean(companyId)}
                    disabled={!companyId}
                    onChange={(e) => toggleEmail(e.target.checked)}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                      <Mail className="size-4 text-brand-600" />
                      {applicantCount > 1
                        ? t('noShowBulkSendEmail', 'modals', { count: applicantCount })
                        : t('noShowSendEmail', 'modals')}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {companyId ? t('noShowEmailInlineHint', 'modals') : t('noShowBulkOneCompany', 'modals')}
                    </span>
                  </span>
                </label>
                {statusForm?.notifyEmail && companyId && (
                  <div className="space-y-2 ps-6">
                    <input
                      value={statusForm.emailSubject || ''}
                      onChange={(e) => setStatusForm({ ...statusForm, emailSubject: e.target.value })}
                      aria-label={t('subject', 'modals')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <textarea
                      value={statusForm.emailBody || ''}
                      onChange={(e) => setStatusForm({ ...statusForm, emailBody: e.target.value })}
                      rows={6}
                      aria-label={t('messageBody', 'modals')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('availableVariables', 'modals')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingStatus}
                className="rounded-lg border border-stroke px-6 py-2 hover:bg-slate-100 dark:border-strokedark dark:hover:bg-slate-800"
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
    </div>
  );
}