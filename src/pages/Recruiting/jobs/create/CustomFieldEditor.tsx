// One custom question on the application form: a sortable, collapsible card
// with its label, type, validation, options and (for groups) sub-questions.
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { Badge, Button, Field, IconButton, inputClass, selectClass } from '../../../../components/ui/kit';
import BilingualField from './BilingualField';
import { ChoiceListEditor, SwitchRow } from './FormBits';
import type { CustomFieldDraft, CustomFieldInputType, GroupFieldInputType, SubFieldDraft, Translate } from './types';

const CHOICE_TYPES = new Set(['checkbox', 'radio', 'dropdown']);

const fieldTypeOptions = (t: Translate): Array<{ value: CustomFieldInputType; label: string }> => [
  { value: 'text', label: t('createInputTypeText', 'jobs') },
  { value: 'number', label: t('createInputTypeNumber', 'jobs') },
  { value: 'email', label: t('createInputTypeEmail', 'jobs') },
  { value: 'date', label: t('createInputTypeDate', 'jobs') },
  { value: 'url', label: t('createInputTypeUrl', 'jobs') },
  { value: 'checkbox', label: t('createInputTypeCheckbox', 'jobs') },
  { value: 'radio', label: t('createInputTypeRadio', 'jobs') },
  { value: 'dropdown', label: t('createInputTypeDropdown', 'jobs') },
  { value: 'textarea', label: t('createInputTypeTextarea', 'jobs') },
  { value: 'tags', label: t('createInputTypeTags', 'jobs') },
  { value: 'repeatable_group', label: t('createInputTypeGroup', 'jobs') },
];

const subFieldTypeOptions = (t: Translate): Array<{ value: GroupFieldInputType; label: string }> => [
  { value: 'text', label: t('createInputTypeText', 'jobs') },
  { value: 'textarea', label: t('createInputTypeTextarea', 'jobs') },
  { value: 'number', label: t('createInputTypeNumber', 'jobs') },
  { value: 'email', label: t('createInputTypeEmail', 'jobs') },
  { value: 'date', label: t('createInputTypeDate', 'jobs') },
  { value: 'radio', label: t('createInputTypeRadio', 'jobs') },
  { value: 'dropdown', label: t('createInputTypeDropdown', 'jobs') },
  { value: 'checkbox', label: t('createInputTypeCheckbox', 'jobs') },
  { value: 'url', label: t('createInputTypeUrl', 'jobs') },
  { value: 'tags', label: t('createInputTypeTags', 'jobs') },
];

function SubFieldEditor({
  sub,
  index,
  bilingual,
  onChange,
  onRemove,
}: {
  sub: SubFieldDraft;
  index: number;
  bilingual: boolean;
  onChange: (patch: Partial<SubFieldDraft>) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  return (
    <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('createSubField', 'jobs', { number: index + 1 })}
        </span>
        <IconButton tone="danger" label={t('cjRemoveSubField', 'jobs', { number: index + 1 })} onClick={onRemove}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
      <BilingualField
        label={t('cjQuestionLabel', 'jobs')}
        en={sub.label}
        ar={sub.labelAr || ''}
        onEn={(v) => onChange({ label: v })}
        onAr={(v) => onChange({ labelAr: v })}
        bilingual={bilingual}
        placeholder={t('createSubFieldLabelPlaceholder', 'jobs')}
        placeholderAr="السؤال بالعربية..."
        size="sm"
      />
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
        <Field label={t('createSubFieldInputType', 'jobs')}>
          <select
            value={sub.inputType}
            onChange={(e) => onChange({ inputType: e.target.value as GroupFieldInputType })}
            aria-label={t('createSubFieldInputType', 'jobs')}
            className={`${selectClass} !py-1.5`}
          >
            {subFieldTypeOptions(t).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="pb-1.5">
          <SwitchRow label={t('createRequired', 'jobs')} checked={sub.isRequired} onChange={(v) => onChange({ isRequired: v })} />
        </div>
      </div>
      {CHOICE_TYPES.has(sub.inputType) && (
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <ChoiceListEditor
            size="sm"
            choices={sub.choices || []}
            choicesAr={sub.choicesAr}
            bilingual={bilingual}
            onAdd={(en, ar) =>
              onChange({
                choices: [...(sub.choices || []), en],
                choicesAr: bilingual ? [...(sub.choicesAr || []), ar.trim()] : sub.choicesAr,
              })
            }
            onRemove={(i) =>
              onChange({
                choices: sub.choices?.filter((_, ci) => ci !== i),
                choicesAr: sub.choicesAr?.filter((_, ci) => ci !== i),
              })
            }
          />
        </div>
      )}
    </li>
  );
}

export default function CustomFieldEditor({
  field,
  index,
  bilingual,
  collapsed,
  onToggle,
  onChange,
  onRemove,
}: {
  field: CustomFieldDraft;
  index: number;
  bilingual: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CustomFieldDraft>) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.fieldId });
  const typeLabel = fieldTypeOptions(t).find((o) => o.value === field.inputType)?.label || field.inputType;
  const bodyId = `cj-field-body-${index}`;

  const patchSub = (subIndex: number, patch: Partial<SubFieldDraft>) =>
    onChange({ subFields: field.subFields?.map((sf, si) => (si === subIndex ? { ...sf, ...patch } : sf)) });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-white dark:bg-slate-900 ${
        isDragging ? 'relative z-10 border-brand-300 shadow-lg' : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <span
          {...attributes}
          {...listeners}
          aria-label={t('cjDragField', 'jobs')}
          title={t('cjDragField', 'jobs')}
          className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800"
        >
          <GripVertical className="size-4" />
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <ChevronRight className={`size-4 shrink-0 text-slate-400 transition-transform rtl:rotate-180 ${collapsed ? '' : 'rotate-90 rtl:rotate-90'}`} />
          <span className="text-xs font-medium tabular-nums text-slate-400">{index + 1}.</span>
          <span className={`truncate text-sm font-medium ${field.label ? 'text-slate-900 dark:text-white' : 'italic text-slate-400'}`}>
            {field.label || t('createUntitledField', 'jobs')}
          </span>
          <span className="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline">
            {typeLabel}
          </span>
        </button>
        {field.isRequired && <Badge tone="amber">{t('createRequiredBadge', 'jobs')}</Badge>}
        <IconButton tone="danger" label={t('cjRemoveField', 'jobs', { number: index + 1 })} onClick={onRemove}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      {!collapsed && (
        <div id={bodyId} className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
          <BilingualField
            label={t('createDisplayLabel', 'jobs')}
            en={field.label}
            ar={field.labelAr || ''}
            onEn={(v) => onChange({ label: v })}
            onAr={(v) => onChange({ labelAr: v })}
            bilingual={bilingual}
            placeholder={t('createLabelPlaceholder', 'jobs')}
            placeholderAr="مثال: سنوات الخبرة"
          />

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
            <Field label={t('createFieldType', 'jobs')} htmlFor={`cj-field-type-${index}`}>
              <select
                id={`cj-field-type-${index}`}
                value={field.inputType}
                onChange={(e) => onChange({ inputType: e.target.value as CustomFieldInputType })}
                className={selectClass}
              >
                {fieldTypeOptions(t).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('createSequence', 'jobs')} htmlFor={`cj-field-order-${index}`}>
              <input
                id={`cj-field-order-${index}`}
                type="number"
                min="1"
                dir="ltr"
                value={field.displayOrder}
                onChange={(e) => onChange({ displayOrder: Number(e.target.value) })}
                className={`${inputClass} tabular-nums`}
              />
            </Field>
            <div className="pb-2">
              <SwitchRow label={t('createRequired', 'jobs')} checked={field.isRequired} onChange={(v) => onChange({ isRequired: v })} />
            </div>
          </div>

          {field.inputType === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('createMinThreshold', 'jobs')} htmlFor={`cj-field-min-${index}`}>
                <input
                  id={`cj-field-min-${index}`}
                  type="number"
                  dir="ltr"
                  value={field.minValue || ''}
                  onChange={(e) => onChange({ minValue: Number(e.target.value) })}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label={t('createMaxLimit', 'jobs')} htmlFor={`cj-field-max-${index}`}>
                <input
                  id={`cj-field-max-${index}`}
                  type="number"
                  dir="ltr"
                  value={field.maxValue || ''}
                  onChange={(e) => onChange({ maxValue: Number(e.target.value) })}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </div>
          )}

          {CHOICE_TYPES.has(field.inputType) && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('createResponseOptions', 'jobs')}</p>
              <ChoiceListEditor
                choices={field.choices || []}
                choicesAr={field.choicesAr}
                bilingual={bilingual}
                onAdd={(en, ar) =>
                  onChange({
                    choices: [...(field.choices || []), en],
                    choicesAr: bilingual ? [...(field.choicesAr || []), ar.trim()] : field.choicesAr,
                  })
                }
                onRemove={(i) =>
                  onChange({
                    choices: field.choices?.filter((_, ci) => ci !== i),
                    choicesAr: field.choicesAr?.filter((_, ci) => ci !== i),
                  })
                }
              />
            </div>
          )}

          {field.inputType === 'repeatable_group' && (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('createSubQuestionMatrix', 'jobs')}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('createSubQuestionDesc', 'jobs')}</p>
                </div>
                <Button
                  size="sm"
                  icon={<Plus className="size-4" />}
                  onClick={() =>
                    onChange({
                      subFields: [
                        ...(field.subFields || []),
                        { fieldId: `subfield_${Date.now()}`, label: '', inputType: 'text', isRequired: false },
                      ],
                    })
                  }
                >
                  {t('createAddSubField', 'jobs')}
                </Button>
              </div>
              {(field.subFields || []).length > 0 && (
                <ul className="space-y-2">
                  {field.subFields!.map((sub, si) => (
                    <SubFieldEditor
                      key={sub.fieldId}
                      sub={sub}
                      index={si}
                      bilingual={bilingual}
                      onChange={(patch) => patchSub(si, patch)}
                      onRemove={() => onChange({ subFields: field.subFields?.filter((_, i) => i !== si) })}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
