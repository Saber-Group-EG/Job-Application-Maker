// The job's own details: text, type, pay, application window, and which
// standard applicant fields the form asks for.
import { CalendarRange, FileText, Languages, ListChecks, Loader2, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocale } from '../../../../context/LocaleContext';
import { toPlainString } from '../../../../utils/strings';
import type { JobFieldConfig } from '../../../../types/jobPositions';
import {
  AdornedInput,
  Button,
  Card,
  CardToolbar,
  Field,
  SectionTitle,
  Switch,
  ToggleChip,
  inputClass,
  selectClass,
} from '../../../../components/ui/kit';
import BilingualField from './BilingualField';
import { SwitchRow } from './FormBits';
import type { CompanyStatusOption, JobForm, SetJobForm } from './types';

const set = <K extends keyof JobForm>(setForm: SetJobForm, key: K, value: JobForm[K]) =>
  setForm((prev) => ({ ...prev, [key]: value }));

function Section({ icon, title, hint, actions, children }: { icon: ReactNode; title: ReactNode; hint?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={icon}>{title}</SectionTitle>
          {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
        {actions}
      </CardToolbar>
      {children}
    </Card>
  );
}

export function JobDetailsCard({
  form,
  setForm,
  isEditMode,
  onTranslateAll,
  translatingAll,
}: {
  form: JobForm;
  setForm: SetJobForm;
  isEditMode: boolean;
  onTranslateAll: () => void;
  translatingAll: boolean;
}) {
  const { t } = useLocale();
  return (
    <Section
      icon={<FileText className="size-4" />}
      title={t('createBasicInfo', 'jobs')}
      hint={t('createBasicInfoDesc', 'jobs')}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {form.bilingual && (
            <Button
              size="sm"
              onClick={onTranslateAll}
              loading={translatingAll}
              icon={translatingAll ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
            >
              {t('createTranslateAll', 'jobs')}
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Switch checked={form.bilingual} onChange={(v) => set(setForm, 'bilingual', v)} label={t('createBilingual', 'jobs')} />
            {t('createBilingual', 'jobs')}
          </label>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        {!isEditMode && (
          <div className="max-w-sm">
            <Field label={t('createPositionCode', 'jobs')} htmlFor="cj-code" hint={t('createPositionCodeHelp', 'jobs')}>
              <input
                id="cj-code"
                required
                dir="ltr"
                value={form.jobCode}
                onChange={(e) => set(setForm, 'jobCode', e.target.value)}
                placeholder={t('createPositionCodePlaceholder', 'jobs')}
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
        )}
        <BilingualField
          label={t('createJobTitle', 'jobs')}
          en={form.title}
          ar={form.titleAr}
          onEn={(v) => set(setForm, 'title', v)}
          onAr={(v) => set(setForm, 'titleAr', v)}
          bilingual={form.bilingual}
          required
          placeholder={t('createJobTitlePlaceholder', 'jobs')}
          placeholderAr="مثال: مطور واجهة أمامية أول"
        />
        <BilingualField
          label={t('createJobDescLabel', 'jobs')}
          en={form.description}
          ar={form.descriptionAr}
          onEn={(v) => set(setForm, 'description', v)}
          onAr={(v) => set(setForm, 'descriptionAr', v)}
          bilingual={form.bilingual}
          multiline
          rows={6}
          placeholder={t('createJobDescPlaceholder', 'jobs')}
          placeholderAr="حدد المسؤوليات والأهداف الأساسية..."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('createEmploymentType', 'jobs')} htmlFor="cj-employment">
            <select
              id="cj-employment"
              required
              value={form.employmentType}
              onChange={(e) => set(setForm, 'employmentType', e.target.value as JobForm['employmentType'])}
              className={selectClass}
            >
              <option value="full-time">{t('createFullTime', 'jobs')}</option>
              <option value="part-time">{t('createPartTime', 'jobs')}</option>
              <option value="contract">{t('createContract', 'jobs')}</option>
              <option value="internship">{t('createInternship', 'jobs')}</option>
            </select>
          </Field>
          <Field label={t('createWorkspacePolicy', 'jobs')} htmlFor="cj-arrangement">
            <select
              id="cj-arrangement"
              required
              value={form.workArrangement}
              onChange={(e) => set(setForm, 'workArrangement', e.target.value as JobForm['workArrangement'])}
              className={selectClass}
            >
              <option value="on-site">{t('createOnSite', 'jobs')}</option>
              <option value="remote">{t('createRemote', 'jobs')}</option>
              <option value="hybrid">{t('createHybrid', 'jobs')}</option>
            </select>
          </Field>
        </div>
      </div>
    </Section>
  );
}

export function CompensationCard({ form, setForm }: { form: JobForm; setForm: SetJobForm }) {
  const { t } = useLocale();
  return (
    <Section icon={<Wallet className="size-4" />} title={t('createCompensation', 'jobs')}>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <Field label={t('createSalaryBase', 'jobs')} htmlFor="cj-salary">
          <AdornedInput
            id="cj-salary"
            unit="$"
            type="number"
            dir="ltr"
            value={form.salary}
            onChange={(e) => set(setForm, 'salary', Number(e.target.value))}
            placeholder={t('createSalaryPlaceholder', 'jobs')}
          />
        </Field>
        <Field label={t('createTotalVacancies', 'jobs')} htmlFor="cj-openings">
          <input
            id="cj-openings"
            type="number"
            min="1"
            dir="ltr"
            value={form.openPositions}
            onChange={(e) => set(setForm, 'openPositions', Number(e.target.value))}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <div className="md:col-span-2">
          <SwitchRow
            label={t('createSalaryVisible', 'jobs')}
            hint={t('createSalaryVisibleHelp', 'jobs')}
            checked={form.salaryVisible}
            onChange={(v) => set(setForm, 'salaryVisible', v)}
          />
        </div>
      </div>
    </Section>
  );
}

export function ApplicationWindowCard({
  form,
  setForm,
  statuses,
}: {
  form: JobForm;
  setForm: SetJobForm;
  statuses: CompanyStatusOption[];
}) {
  const { t } = useLocale();
  const options = statuses
    .map((s) => ({ value: String(s?._id || s?.id || '').trim(), label: toPlainString(s?.name), color: s.color }))
    .filter((o) => o.value);
  const toggleStatus = (id: string) =>
    setForm((prev) => ({
      ...prev,
      allowedStatuses: prev.allowedStatuses.includes(id)
        ? prev.allowedStatuses.filter((s) => s !== id)
        : [...prev.allowedStatuses, id],
    }));
  // Opens the native date picker on click, not only on the calendar icon.
  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.showPicker?.();

  return (
    <Section icon={<CalendarRange className="size-4" />} title={t('cjApplicationWindow', 'jobs')} hint={t('cjApplicationWindowHint', 'jobs')}>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('createRegOpen', 'jobs')} htmlFor="cj-start">
            <input
              id="cj-start"
              type="date"
              required
              value={form.registrationStart}
              onChange={(e) => set(setForm, 'registrationStart', e.target.value)}
              onClick={openPicker}
              className={inputClass}
            />
          </Field>
          <Field label={t('createRegDeadline', 'jobs')} htmlFor="cj-end">
            <input
              id="cj-end"
              type="date"
              required
              value={form.registrationEnd}
              onChange={(e) => set(setForm, 'registrationEnd', e.target.value)}
              onClick={openPicker}
              className={inputClass}
            />
          </Field>
        </div>
        <SwitchRow
          label={t('createHideAfterEnd', 'jobs')}
          hint={t('createHideAfterEndHelp', 'jobs')}
          checked={form.hideAfterRegistrationEnd}
          onChange={(v) => set(setForm, 'hideAfterRegistrationEnd', v)}
        />
        <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('createAllowedStatuses', 'jobs')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('cjAllowedStatusesHint', 'jobs')}</p>
          {!form.companyId ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('createSelectCompanyForStatuses', 'jobs')}</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('createNoStatuses', 'jobs')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <ToggleChip key={o.value} selected={form.allowedStatuses.includes(o.value)} onClick={() => toggleStatus(o.value)}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: o.color || '#94a3b8' }} aria-hidden="true" />
                    {o.label || o.value}
                  </span>
                </ToggleChip>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

const FIELD_KEYS: Array<{ key: keyof JobFieldConfig; label: string }> = [
  { key: 'fullName', label: 'createFieldFullName' },
  { key: 'email', label: 'createFieldEmail' },
  { key: 'phone', label: 'createFieldPhone' },
  { key: 'gender', label: 'createFieldGender' },
  { key: 'birthDate', label: 'createFieldBirthDate' },
  { key: 'address', label: 'createFieldAddress' },
  { key: 'profilePhoto', label: 'createFieldPhoto' },
  { key: 'cvFilePath', label: 'createFieldCv' },
  { key: 'expectedSalary', label: 'createFieldSalary' },
];

export function ApplicantFieldsCard({ form, setForm }: { form: JobForm; setForm: SetJobForm }) {
  const { t } = useLocale();
  // Hiding a field also makes it optional.
  const change = (field: keyof JobFieldConfig, prop: 'visible' | 'required', value: boolean) =>
    setForm((prev) => {
      const currentRule = prev.fieldConfig[field] ?? { visible: false, required: false };
      const nextRule = { ...currentRule, [prop]: value };
      if (prop === 'visible' && !value) nextRule.required = false;
      return { ...prev, fieldConfig: { ...prev.fieldConfig, [field]: nextRule } };
    });

  return (
    <Section icon={<ListChecks className="size-4" />} title={t('createFieldConfig', 'jobs')} hint={t('createFieldConfigDesc', 'jobs')}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('cjFieldColumn', 'jobs')}</th>
              <th scope="col" className="px-4 py-2.5 text-center font-medium">{t('createVisible', 'jobs')}</th>
              <th scope="col" className="px-4 py-2.5 text-center font-medium">{t('createRequired', 'jobs')}</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_KEYS.map(({ key, label }) => {
              const rule = form.fieldConfig[key];
              const name = t(label, 'jobs');
              return (
                <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{name}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex">
                      <Switch checked={rule.visible} onChange={(v) => change(key, 'visible', v)} label={`${name}: ${t('createVisible', 'jobs')}`} />
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex ${rule.visible ? '' : 'pointer-events-none opacity-40'}`}>
                      <Switch checked={rule.required} onChange={(v) => change(key, 'required', v)} label={`${name}: ${t('createRequired', 'jobs')}`} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

