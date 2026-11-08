import type { FormEvent } from "react";
import { useId, useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import { useFormDraft } from "../../../hooks/useFormDraft";
import DraftBanner from "../../../components/common/DraftBanner";
import { Button, Field, inputClass, selectClass } from "../../../components/ui/kit";

export type DepartmentForm = {
  companyId: string;
  name: { en: string; ar: string; };
  description: { en: string; ar: string; };
};

export default function DepartmentModalForm({
  isEdit,
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  companies,
  draftKey,
}: {
  isEdit: boolean;
  form: DepartmentForm;
  setForm: React.Dispatch<React.SetStateAction<DepartmentForm>>;
  /** Resolve to true once saved, so the unsaved-work draft is dropped. */
  onSubmit: (e: FormEvent) => void | Promise<boolean | void>;
  onCancel: () => void;
  saving: boolean;
  /** When given, shows a company picker (used by the Departments page). */
  companies?: Array<{ id: string; label: string }>;
  /** e.g. `department:new:<companyId>` / `department:edit:<id>`; keeps unsaved input across a refresh. */
  draftKey?: string | null;
}) {
  const { t } = useLocale();
  const id = useId();
  // The modal mounts this fresh on every open, so the form as it is now is the
  // untouched starting point.
  const [baseline] = useState(form);
  const draft = useFormDraft({
    key: draftKey ?? null,
    value: form,
    baseline,
    onRestore: (saved) => setForm({ ...baseline, ...saved, companyId: baseline.companyId || saved.companyId }),
  });
  const handleSubmit = async (e: FormEvent) => {
    const saved = await onSubmit(e);
    if (saved === true) draft.clear();
  };
  return (
    // The shared Modal pads its scroll box; -m-4 cancels that so the header
    // and footer sit flush.
    <form onSubmit={handleSubmit} className="-m-4 flex max-h-[85vh] flex-col">
      <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isEdit ? t('editDepartment', 'companies') : t('createDepartmentTitle', 'companies')}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('deptModalSubtitle', 'companies')}</p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <DraftBanner draft={draft} onDiscard={() => setForm(baseline)} className="sm:col-span-2" />
        {companies && (
          <div className="sm:col-span-2">
            <Field label={t('deptCompany', 'companies')} htmlFor={`${id}-company`}>
              <select
                id={`${id}-company`}
                required
                disabled={isEdit}
                value={form.companyId}
                onChange={(e) => setForm(p => ({ ...p, companyId: e.target.value }))}
                className={selectClass}
              >
                <option value="" disabled>{t('deptSelectCompany', 'companies')}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
        <Field label={t('deptDivisionNameEn', 'companies')} htmlFor={`${id}-name-en`}>
          <input
            id={`${id}-name-en`}
            required
            dir="ltr"
            autoFocus
            value={form.name.en}
            onChange={(e) => setForm(p => ({ ...p, name: { ...p.name, en: e.target.value } }))}
            className={inputClass}
          />
        </Field>
        <Field label={t('deptDivisionNameAr', 'companies')} htmlFor={`${id}-name-ar`}>
          <input
            id={`${id}-name-ar`}
            required
            dir="rtl"
            value={form.name.ar}
            onChange={(e) => setForm(p => ({ ...p, name: { ...p.name, ar: e.target.value } }))}
            className={inputClass}
          />
        </Field>
        <Field label={t('deptDescEn', 'companies')} htmlFor={`${id}-desc-en`} optional>
          <textarea
            id={`${id}-desc-en`}
            dir="ltr"
            rows={4}
            value={form.description.en}
            onChange={(e) => setForm(p => ({ ...p, description: { ...p.description, en: e.target.value } }))}
            className={`${inputClass} resize-y`}
          />
        </Field>
        <Field label={t('deptDescAr', 'companies')} htmlFor={`${id}-desc-ar`} optional>
          <textarea
            id={`${id}-desc-ar`}
            dir="rtl"
            rows={4}
            value={form.description.ar}
            onChange={(e) => setForm(p => ({ ...p, description: { ...p.description, ar: e.target.value } }))}
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
        <Button onClick={onCancel}>{t('cancel', 'companies')}</Button>
        <Button type="submit" variant="primary" loading={saving}>
          {isEdit ? t('saveChanges', 'companies') : t('createDepartment', 'companies')}
        </Button>
      </div>
    </form>
  );
}
