import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, X } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useApplicants, useCompanies } from '../../../hooks/queries';

type ApplicantOption = {
  _id: string;
  fullName: string;
  email: string;
};

export function ApplicantSelect({
  value,
  onChange,
  inputCls,
}: {
  value: string | null;
  onChange: (id: string | null, applicant: ApplicantOption | null) => void;
  inputCls?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  // ── cache the selected applicant object so we can display it without re-fetching
  const [selectedApplicant, setSelectedApplicant] =
    useState<ApplicantOption | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 500);
  const { data: companiesData } = useCompanies();
  const companyId = companiesData?.map((c) => c._id);
  const { data, isFetching } = useApplicants({
    companyId: companyId,
    search: debouncedSearch,
    enabled: open && !!debouncedSearch.trim(),
    fields: '_id,fullName,email,jobPositionId', // only fetch fields we need for display
    skipPopulation: false, // we only want raw applicant data, no need to populate related fields
  });

  const applicants = (data ?? []) as ApplicantOption[];

  // If editing an existing offer, value is set but selectedApplicant is null.
  // Try to resolve it from the current search results or fetch once.
  const { data: prefetchData } = useApplicants({
    companyId: companyId,
    search: value ?? '',
    enabled: !!value && !selectedApplicant,
    fields: '_id,fullName,email',
    skipPopulation: true, // we only want raw applicant data, no need to populate related fields
  });

  // Once prefetch resolves, hydrate selectedApplicant from it
  useEffect(() => {
    if (value && !selectedApplicant && prefetchData) {
      const match = (prefetchData as ApplicantOption[]).find(
        (a) => a._id === value
      );
      if (match) setSelectedApplicant(match);
    }
  }, [prefetchData, value, selectedApplicant]);

  // If value is cleared externally, clear cached applicant too
  useEffect(() => {
    if (!value) setSelectedApplicant(null);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (a: ApplicantOption) => {
    onChange(a._id, a); // pass full object up
    setSelectedApplicant(a); // ← cache immediately, no re-fetch needed
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSelectedApplicant(null);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        {selectedApplicant ? (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
              {selectedApplicant.fullName?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-sm text-slate-800 dark:text-slate-100">
              {selectedApplicant.fullName}
            </span>
            <span className="shrink-0 text-xs text-slate-400">
              {selectedApplicant.email}
            </span>
          </div>
        ) : (
          <span className="text-slate-400">Select applicant...</span>
        )}
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={handleClear}
              className="flex size-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown
            className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-2 dark:border-slate-700">
            <div className="relative">
              <input
                autoFocus
                className={inputCls}
                placeholder="Type to search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {!debouncedSearch.trim() ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                Start typing to search applicants
              </p>
            ) : isFetching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-slate-400" />
              </div>
            ) : applicants.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                No applicants found for "{debouncedSearch}"
              </p>
            ) : (
              applicants.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    value === a._id ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                  }`}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {a.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {a.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-400">{a.email}</p>
                  </div>
                  {value === a._id && (
                    <CheckCircle2 className="ml-auto size-4 shrink-0 text-brand-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
