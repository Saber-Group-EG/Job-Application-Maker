import { AlertTriangle, User, Briefcase, Check, Zap } from 'lucide-react';
import { ApplicantObject } from '../JobOffersModal/EmailModule';

export type SalarySource = 'applicant' | 'position' | 'form' | 'custom';
export type PositionSource = 'applicant' | 'form' | 'custom';

export type ApplicantOverride = {
  salarySource: SalarySource;
  customSalary: number | '';
  positionSource: PositionSource;
  customPositionEn: string;
  customPositionAr: string;
};

export type BulkOverrideMap = Record<string, ApplicantOverride>;

// ── Resolvers ─────────────────────────────────────────────────────────────────

export function resolveApplicantSalary(
  a: ApplicantObject,
  override: ApplicantOverride
): number | null {
  if (override.salarySource === 'applicant')
    return (a as any).expectedSalary ?? null;
  if (override.salarySource === 'position')
    return (a as any).jobPositionId?.salary ?? null;
  if (override.salarySource === 'custom')
    return override.customSalary === '' ? null : Number(override.customSalary);
  if (override.salarySource === 'form') return null; // signals "use form default"
  return null;
}

export function resolveApplicantPosition(
  a: ApplicantObject,
  override: ApplicantOverride,
  formPosition: { en: string; ar: string }
): { en: string; ar: string } {
  if (override.positionSource === 'applicant')
    return {
      en: (a as any).jobPositionId?.title?.en ?? '',
      ar: (a as any).jobPositionId?.title?.ar ?? '',
    };
  if (override.positionSource === 'form') return formPosition;
  return {
    en: override.customPositionEn,
    ar: override.customPositionAr,
  };
}

export function seedBulkOverrideMap(
  applicants: ApplicantObject[]
): BulkOverrideMap {
  const map: BulkOverrideMap = {};
  for (const a of applicants) {
    const hasApplicantSalary = (a as any).expectedSalary != null;
    const hasPositionSalary = (a as any).jobPositionId?.salary != null;
    const hasApplicantPosition = !!(a as any).jobPositionId?.title?.en;
    map[a._id] = {
      salarySource: hasApplicantSalary
        ? 'applicant'
        : hasPositionSalary
          ? 'position'
          : 'custom',
      customSalary: '',
      positionSource: hasApplicantPosition ? 'applicant' : 'form',
      customPositionEn: '',
      customPositionAr: '',
    };
  }
  return map;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function SourceBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs transition
        disabled:cursor-not-allowed disabled:opacity-40
        ${
          active
            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
        }`}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BulkSalaryReview({
  applicants,
  overrideMap,
  currency,
  formPosition,
  onChange,
  formSalary,
}: {
  applicants: ApplicantObject[];
  overrideMap: BulkOverrideMap;
  currency: string;
  formPosition: { en: string; ar: string };
  onChange: (map: BulkOverrideMap) => void;
  formSalary: number | '' | null;
}) {
  const patch = (id: string, p: Partial<ApplicantOverride>) =>
    onChange({ ...overrideMap, [id]: { ...overrideMap[id], ...p } });

  const setAllSalary = (source: SalarySource) => {
    const next = { ...overrideMap };
    for (const a of applicants) {
      const hasApplicant = (a as any).expectedSalary != null;
      const hasPosition = (a as any).jobPositionId?.salary != null;
      // only set if the source actually has data, else skip
      if (source === 'applicant' && !hasApplicant) continue;
      if (source === 'position' && !hasPosition) continue;
      next[a._id] = { ...next[a._id], salarySource: source };
    }
    onChange(next);
  };

  const setAllPosition = (source: PositionSource) => {
    const next = { ...overrideMap };
    for (const a of applicants) {
      const hasApplicantPosition = !!(a as any).jobPositionId?.title?.en;
      if (source === 'applicant' && !hasApplicantPosition) continue;
      next[a._id] = { ...next[a._id], positionSource: source };
    }
    onChange(next);
  };

  const unresolvedSalary = applicants.filter((a) => {
    const o = overrideMap[a._id];
    if (!o || o.salarySource === 'form') return false;
    return resolveApplicantSalary(a, o) === null;
  });

  const unresolvedPosition = applicants.filter((a) => {
    const o = overrideMap[a._id];
    if (!o) return true;
    const pos = resolveApplicantPosition(a, o, formPosition);
    return !pos.en.trim() && !pos.ar.trim();
  });

  return (
    <div className="space-y-3">
      {/* ── Warnings ── */}
      {unresolvedSalary.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>{unresolvedSalary.length}</strong> applicant
            {unresolvedSalary.length !== 1 ? 's' : ''} have no salary resolved —
            the form default will be used.
          </p>
        </div>
      )}
      {unresolvedPosition.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>{unresolvedPosition.length}</strong> applicant
            {unresolvedPosition.length !== 1 ? 's' : ''} have no position
            resolved — the form default will be used.
          </p>
        </div>
      )}

      {/* ── Set-all buttons ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Set all positions to:
        </span>
        <button
          type="button"
          onClick={() => setAllPosition('applicant')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <User className="size-3" />
          Job Position
        </button>
        <button
          type="button"
          onClick={() => setAllPosition('form')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Zap className="size-3" />
          Form Default
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Set all salaries to:
        </span>
        <button
          type="button"
          onClick={() => setAllSalary('applicant')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <User className="size-3" />
          Expected
        </button>
        <button
          type="button"
          onClick={() => setAllSalary('position')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Briefcase className="size-3" />
          Position
        </button>
        <button
          type="button"
          onClick={() => setAllSalary('form')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Zap className="size-3" />
          Form Default
        </button>
      </div>

      {/* ── Per-applicant rows ── */}
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700/60 dark:border-slate-700">
        {applicants.map((a) => {
          const o = overrideMap[a._id] ?? seedBulkOverrideMap([a])[a._id];
          const applicantSalary = (a as any).expectedSalary as
            | number
            | undefined;
          const positionSalary = (a as any).jobPositionId?.salary as
            | number
            | undefined;
          const applicantPositionEn = (a as any).jobPositionId?.title?.en as
            | string
            | undefined;
          const resolvedSalary = resolveApplicantSalary(a, o);
          const resolvedPos = resolveApplicantPosition(a, o, formPosition);
          const displayFormSalary =
            formSalary != null && formSalary !== '' ? Number(formSalary) : null;

          return (
            <div key={a._id} className="p-3 space-y-3">
              {/* Applicant header */}
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                  {a.fullName?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {a.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {applicantPositionEn ?? 'No position on record'}
                  </p>
                </div>
              </div>

              {/* ── Position source ── */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Position
                </p>
                <div className="flex gap-2">
                  <SourceBtn
                    active={o.positionSource === 'applicant'}
                    disabled={!applicantPositionEn}
                    onClick={() =>
                      patch(a._id, { positionSource: 'applicant' })
                    }
                  >
                    <User className="size-3 shrink-0" />
                    <span className="truncate">
                      {applicantPositionEn
                        ? `Job: ${applicantPositionEn}`
                        : 'No job position'}
                    </span>
                  </SourceBtn>
                  <SourceBtn
                    active={o.positionSource === 'form'}
                    onClick={() => patch(a._id, { positionSource: 'form' })}
                  >
                    <Zap className="size-3 shrink-0" />
                    <span className="truncate">
                      {formPosition.en
                        ? `Form: ${formPosition.en}`
                        : 'Form default'}
                    </span>
                  </SourceBtn>
                  <SourceBtn
                    active={o.positionSource === 'custom'}
                    onClick={() => patch(a._id, { positionSource: 'custom' })}
                  >
                    Custom
                  </SourceBtn>
                </div>
                {o.positionSource === 'custom' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      className={inputCls}
                      placeholder="Position (EN)"
                      value={o.customPositionEn}
                      onChange={(e) =>
                        patch(a._id, { customPositionEn: e.target.value })
                      }
                    />
                    <input
                      className={inputCls}
                      placeholder="المسمى الوظيفي"
                      dir="rtl"
                      value={o.customPositionAr}
                      onChange={(e) =>
                        patch(a._id, { customPositionAr: e.target.value })
                      }
                    />
                  </div>
                )}
                {/* Resolved position preview */}
                {(resolvedPos.en || resolvedPos.ar) && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" />
                    {resolvedPos.en || resolvedPos.ar}
                  </p>
                )}
              </div>

              {/* ── Salary source ── */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Salary
                </p>
                <div className="flex gap-2">
                  <SourceBtn
                    active={o.salarySource === 'applicant'}
                    disabled={applicantSalary == null}
                    onClick={() => patch(a._id, { salarySource: 'applicant' })}
                  >
                    <User className="size-3 shrink-0" />
                    <span className="truncate">
                      {applicantSalary != null
                        ? `Expected: ${applicantSalary.toLocaleString()}`
                        : 'No expected'}
                    </span>
                  </SourceBtn>
                  <SourceBtn
                    active={o.salarySource === 'position'}
                    disabled={positionSalary == null}
                    onClick={() => patch(a._id, { salarySource: 'position' })}
                  >
                    <Briefcase className="size-3 shrink-0" />
                    <span className="truncate">
                      {positionSalary != null
                        ? `Position: ${positionSalary.toLocaleString()}`
                        : 'No position salary'}
                    </span>
                  </SourceBtn>
                  <SourceBtn
                    active={o.salarySource === 'form'}
                    onClick={() => patch(a._id, { salarySource: 'form' })}
                  >
                    <Zap className="size-3 shrink-0" />
                    <span className="truncate">
                      {displayFormSalary != null
                        ? `Form: ${displayFormSalary.toLocaleString()}`
                        : 'Form default'}
                    </span>
                  </SourceBtn>
                  <SourceBtn
                    active={o.salarySource === 'custom'}
                    onClick={() => patch(a._id, { salarySource: 'custom' })}
                  >
                    Custom
                  </SourceBtn>
                </div>
                {o.salarySource === 'form' && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <Zap className="size-3" />
                    Uses form salary (
                    {displayFormSalary != null
                      ? `${displayFormSalary.toLocaleString()} ${currency}`
                      : 'not set'}
                    )
                  </p>
                )}
                {o.salarySource === 'custom' && (
                  <input
                    type="number"
                    min={0}
                    className={`${inputCls} mt-2`}
                    placeholder={`Salary in ${currency}`}
                    value={o.customSalary}
                    onChange={(e) =>
                      patch(a._id, {
                        customSalary:
                          e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') e.preventDefault();
                    }}
                  />
                )}
                {resolvedSalary != null && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" />
                    {resolvedSalary.toLocaleString()} {currency}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
