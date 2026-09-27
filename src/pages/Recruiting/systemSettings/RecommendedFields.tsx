import { useState } from "react";
import Swal from '../../../utils/swal';
import PageMeta from "../../../components/common/PageMeta";
import { ChevronDown, ChevronRight, Inbox, Layers, ListChecks, Pencil, Plus, Save, SlidersHorizontal, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  IconButton,
  PageShell,
  SectionTitle,
  Switch,
  focusRing,
  inputClass,
  selectClass,
} from "../../../components/ui/kit";
import {
  useRecommendedFields,
  useCreateRecommendedField,
  useUpdateRecommendedField,
  useDeleteRecommendedField,
} from "../../../hooks/queries";
import type { FieldType } from "../../../types/fieldTypes";
import { useLocale } from '../../../context/LocaleContext';

type GroupField = {
  fieldId: string;
  label: string;
  labelAr?: string;
  inputType:
    | "text"
    | "number"
    | "email"
    | "date"
    | "checkbox"
    | "radio"
    | "dropdown"
    | "textarea"
    | "url"
    | "tags";
  isRequired: boolean;
  choices?: string[];
  choicesAr?: string[];
};

type FormField = {
  label: string;
  labelAr: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  optionsAr?: string[];
  defaultValue?: string;
  validation?: {
    min?: number | null;
    max?: number | null;
  };
  groupFields?: GroupField[];
};

const getInputTypeOptions = (t: any) => [
  { value: "text", label: t('typeText', 'systemSettings') },
  { value: "textarea", label: t('typeTextArea', 'systemSettings') },
  { value: "number", label: t('typeNumber', 'systemSettings') },
  { value: "email", label: t('typeEmail', 'systemSettings') },
  { value: "date", label: t('typeDate', 'systemSettings') },
  { value: "radio", label: t('typeRadio', 'systemSettings') },
  { value: "dropdown", label: t('typeDropdown', 'systemSettings') },
  { value: "checkbox", label: t('typeCheckbox', 'systemSettings') },
  { value: "url", label: t('typeUrl', 'systemSettings') },
  { value: "tags", label: t('typeTags', 'systemSettings') },
  { value: "repeatable_group", label: t('typeRepeatableGroup', 'systemSettings') },
];

const getSubFieldTypeOptions = (t: any) => [
  { value: "text", label: t('typeText', 'systemSettings') },
  { value: "textarea", label: t('typeTextArea', 'systemSettings') },
  { value: "number", label: t('typeNumber', 'systemSettings') },
  { value: "email", label: t('typeEmail', 'systemSettings') },
  { value: "date", label: t('typeDate', 'systemSettings') },
  { value: "radio", label: t('typeRadio', 'systemSettings') },
  { value: "dropdown", label: t('typeDropdown', 'systemSettings') },
  { value: "checkbox", label: t('typeCheckbox', 'systemSettings') },
  { value: "url", label: t('typeUrl', 'systemSettings') },
  { value: "tags", label: t('typeTags', 'systemSettings') },
];

const RecommendedFields = () => {
  const { t } = useLocale();
  const inputTypeOptions = getInputTypeOptions(t);
  const subFieldTypeOptions = getSubFieldTypeOptions(t);
  const { data: recommendedFields = [], isLoading: loading } = useRecommendedFields();
  const createFieldMutation = useCreateRecommendedField();
  const updateFieldMutation = useUpdateRecommendedField();
  const deleteFieldMutation = useDeleteRecommendedField();

  const [showForm, setShowForm] = useState(false);
  const [newChoice, setNewChoice] = useState("");
  const [newChoiceAr, setNewChoiceAr] = useState("");
  const [form, setForm] = useState<FormField>({
    label: "",
    labelAr: "",
    type: "text",
    required: false,
    options: [],
    optionsAr: [],
    validation: {},
    groupFields: [],
  });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [isDeletingField, setIsDeletingField] = useState<string | null>(null);
  const [collapsedSubFields, setCollapsedSubFields] = useState<Set<number>>(new Set());

  const handleInputChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      label: "",
      labelAr: "",
      type: "text",
      required: false,
      options: [],
      optionsAr: [],
      validation: {},
      groupFields: [],
    });
    setEditFieldId(null);
    setShowForm(false);
    setCollapsedSubFields(new Set());
  };

  const handleEdit = (field: any) => {
    setEditFieldId(field.fieldId);
    setForm({
      label: typeof field.label === "string" ? field.label : (field.label?.en || ""),
      labelAr: typeof field.label === "string" ? (field.labelAr || "") : (field.label?.ar || ""),
      type: field.inputType || "text",
      required: field.isRequired || false,
      options: field.choices || [],
      optionsAr: field.choicesAr || [],
      validation: {
        min: field.minValue,
        max: field.maxValue,
      },
      groupFields: field.groupFields || [],
    });
    setCollapsedSubFields(new Set((field.groupFields || []).map((_: any, i: number) => i)));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateFieldId = (label: string) => {
    return (label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `field_${Date.now()}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalFieldId = editFieldId || generateFieldId(form.label);
    
    const pendingChoice = newChoice.trim();
    const pendingChoiceAr = newChoiceAr.trim();
    const hasPending = pendingChoice || pendingChoiceAr;
    const finalOptions = hasPending ? [...(form.options || []), pendingChoice || pendingChoiceAr] : form.options;
    const finalOptionsAr = hasPending ? [...(form.optionsAr || []), pendingChoiceAr || pendingChoice] : form.optionsAr;

    const buildChoices = (choices?: any[], choicesAr?: any[]) =>
      (choices || []).map((c: any, i: number) => {
        const en = typeof c === "string" ? c : (c as any)?.en || "";
        const ar = (Array.isArray(choicesAr) ? (choicesAr[i] ?? "") : (c as any)?.ar ?? "").toString().trim() || en;
        return { en, ar };
      });

    const payload: any = {
      fieldId: finalFieldId,
      label: {
        en: form.label,
        ar: form.labelAr || form.label,
      },
      inputType: form.type,
      isRequired: form.required,
      choices: buildChoices(finalOptions, finalOptionsAr),
      minValue: form.validation?.min,
      maxValue: form.validation?.max,
      groupFields: (form.groupFields || []).map(gf => ({
        ...gf,
        label: {
          en: typeof gf.label === "string" ? gf.label : (gf.label as any)?.en || "",
          ar: typeof gf.label === "string" ? gf.labelAr || gf.label : (gf.label as any)?.ar || (gf.label as any)?.en || "",
        },
        choices: buildChoices(gf.choices || [], gf.choicesAr)
      }))
    };

    try {
      if (editFieldId) {
        await updateFieldMutation.mutateAsync({ fieldId: editFieldId, data: payload });
        Swal.fire({ title: t('updatedSuccess', 'systemSettings'), icon: "success", timer: 1000, showConfirmButton: false });
      } else {
        await createFieldMutation.mutateAsync(payload);
        Swal.fire({ title: t('createdSuccess', 'systemSettings'), icon: "success", timer: 1000, showConfirmButton: false });
      }
      resetForm();
    } catch (err: any) {
      Swal.fire({ title: t('saveError', 'systemSettings'), text: err.response?.data?.message || t('saveErrorText', 'systemSettings'), icon: "error" });
    }
  };

  const handleDelete = async (fieldId: string) => {
    const result = await Swal.fire({
      title: t('deleteConfirmTitle', 'systemSettings'),
      text: t('deleteConfirmText', 'systemSettings'),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: t('deleteConfirmButton', 'systemSettings'),
      cancelButtonText: t('cancel', 'common'),
    });
    if (!result.isConfirmed) return;

    setIsDeletingField(fieldId);
    try {
      await deleteFieldMutation.mutateAsync(fieldId);
      Swal.fire({ title: t('deletedSuccess', 'systemSettings'), icon: "success", timer: 1000, showConfirmButton: false });
    } catch {
      Swal.fire({ title: t('deleteError', 'systemSettings'), text: t('deleteErrorText', 'systemSettings'), icon: "error" });
    } finally {
      setIsDeletingField(null);
    }
  };

  const handleAddChoice = () => {
    if (newChoice.trim()) {
      setForm((prev) => ({
        ...prev,
        options: [...(prev.options || []), newChoice.trim()],
        optionsAr: [...(prev.optionsAr || []), newChoiceAr.trim() || newChoice.trim()],
      }));
      setNewChoice("");
      setNewChoiceAr("");
    }
  };

  const toggleSubFieldCollapse = (index: number) => {
    setCollapsedSubFields((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateGroupField = (idx: number, patch: Partial<GroupField>) => {
    const next = [...(form.groupFields || [])];
    next[idx] = { ...next[idx], ...patch };
    handleInputChange("groupFields", next);
  };

  const removeOption = (i: number) => {
    handleInputChange("options", form.options?.filter((_, idx) => idx !== i));
    handleInputChange("optionsAr", form.optionsAr?.filter((_, idx) => idx !== i));
  };

  const visibleFields = recommendedFields.filter((f) => f.fieldId !== isDeletingField);

  return (
    <PageShell
      title={t('pageTitle', 'systemSettings')}
      actions={
        !showForm && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setShowForm(true)}>
            {t('addNewPreset', 'systemSettings')}
          </Button>
        )
      }
    >
      <PageMeta title={t('metaTitle', 'systemSettings')} description={t('metaDescription', 'systemSettings')} />

      {showForm && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardToolbar>
              <div>
                <SectionTitle icon={<SlidersHorizontal className="size-4" />}>
                  {editFieldId ? t('editPresetTitle', 'systemSettings') : t('createPresetTitle', 'systemSettings')}
                </SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('presetSubtitle', 'systemSettings')}</p>
              </div>
              <IconButton label={t('cancelButton', 'systemSettings')} onClick={resetForm}>
                <X className="size-4" />
              </IconButton>
            </CardToolbar>
            <div className="space-y-5 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t('labelEn', 'systemSettings')} htmlFor="label">
                  <input
                    id="label"
                    dir="ltr"
                    value={form.label}
                    onChange={(e) => handleInputChange("label", e.target.value)}
                    placeholder={t('labelEnPlaceholder', 'systemSettings')}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label={t('labelAr', 'systemSettings')} htmlFor="labelAr">
                  <input
                    id="labelAr"
                    dir="rtl"
                    value={form.labelAr}
                    onChange={(e) => handleInputChange("labelAr", e.target.value)}
                    placeholder={t('labelArPlaceholder', 'systemSettings')}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label={t('dataType', 'systemSettings')} htmlFor="dataType">
                  <select id="dataType" value={form.type} onChange={(e) => handleInputChange("type", e.target.value)} className={selectClass}>
                    {inputTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:mt-7">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{t('mandatoryByDefault', 'systemSettings')}</span>
                  <Switch checked={form.required} onChange={(val) => handleInputChange("required", val)} label={t('mandatoryByDefault', 'systemSettings')} />
                </div>
              </div>

              {form.type === "number" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={t('minimum', 'systemSettings')} htmlFor="rf-min">
                    <input id="rf-min" type="number" className={inputClass} value={form.validation?.min ?? ""} onChange={(e) => handleInputChange("validation", { ...form.validation, min: e.target.value ? Number(e.target.value) : null })} />
                  </Field>
                  <Field label={t('maximum', 'systemSettings')} htmlFor="rf-max">
                    <input id="rf-max" type="number" className={inputClass} value={form.validation?.max ?? ""} onChange={(e) => handleInputChange("validation", { ...form.validation, max: e.target.value ? Number(e.target.value) : null })} />
                  </Field>
                </div>
              )}
            </div>
          </Card>

          {["radio", "dropdown", "checkbox", "tags"].includes(form.type) && (
            <Card>
              <CardToolbar>
                <SectionTitle icon={<ListChecks className="size-4" />}>{t('manageOptions', 'systemSettings')}</SectionTitle>
                <Badge tone="slate">{form.options?.length ?? 0}</Badge>
              </CardToolbar>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input dir="ltr" aria-label={t('optionEnPlaceholder', 'systemSettings')} placeholder={t('optionEnPlaceholder', 'systemSettings')} value={newChoice} onChange={(e) => setNewChoice(e.target.value)} className={inputClass} />
                  <input dir="rtl" aria-label={t('optionArPlaceholder', 'systemSettings')} placeholder={t('optionArPlaceholder', 'systemSettings')} value={newChoiceAr} onChange={(e) => setNewChoiceAr(e.target.value)} className={inputClass} />
                  <Button icon={<Plus className="size-4" />} onClick={handleAddChoice}>
                    {t('addOption', 'systemSettings')}
                  </Button>
                </div>
                {(form.options?.length ?? 0) > 0 && (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {form.options?.map((opt, i) => {
                      const en = typeof opt === 'string' ? opt : ((opt as any)?.en || '');
                      const arRaw = form.optionsAr?.[i];
                      const ar = typeof arRaw === 'string' ? arRaw : ((arRaw as any)?.ar || '');
                      return (
                        <li key={i} className="flex items-center gap-3 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{en}</p>
                            <p dir="rtl" className="truncate text-start text-xs text-slate-500 dark:text-slate-400">{ar}</p>
                          </div>
                          <IconButton
                            label={t('addOption', 'systemSettings')}
                            onClick={() => {
                              setNewChoice(en);
                              setNewChoiceAr(form.optionsAr?.[i] || '');
                              removeOption(i);
                            }}
                          >
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton tone="danger" label={t('delete', 'common')} onClick={() => removeOption(i)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          )}

          {form.type === "repeatable_group" && (
            <Card>
              <CardToolbar>
                <SectionTitle icon={<Layers className="size-4" />}>{t('groupSchema', 'systemSettings')}</SectionTitle>
                <Button
                  size="sm"
                  icon={<Plus className="size-4" />}
                  onClick={() => handleInputChange("groupFields", [...(form.groupFields || []), { fieldId: `gf_${Date.now()}`, label: "", inputType: "text", isRequired: false }])}
                >
                  {t('addNestedField', 'systemSettings')}
                </Button>
              </CardToolbar>
              <div className="space-y-3 p-4">
                {form.groupFields?.map((gf, idx) => {
                  const collapsed = collapsedSubFields.has(idx);
                  return (
                    <div key={gf.fieldId} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                        <button
                          type="button"
                          onClick={() => toggleSubFieldCollapse(idx)}
                          aria-expanded={!collapsed}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg text-start ${focusRing}`}
                        >
                          {collapsed ? <ChevronRight className="size-4 shrink-0 text-slate-400 rtl:rotate-180" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
                          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {typeof gf.label === 'string' ? gf.label || t('unnamedNestedField', 'systemSettings') : ((gf.label as any)?.en || t('unnamedNestedField', 'systemSettings'))}
                          </span>
                          <Badge tone="slate">{gf.inputType}</Badge>
                        </button>
                        <IconButton tone="danger" label={t('delete', 'common')} onClick={() => handleInputChange("groupFields", form.groupFields?.filter((_, i) => i !== idx))}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                      {!collapsed && (
                        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                          <input
                            dir="ltr"
                            aria-label={t('labelEnPlaceholderShort', 'systemSettings')}
                            placeholder={t('labelEnPlaceholderShort', 'systemSettings')}
                            value={typeof gf.label === 'string' ? (gf.label as string) : ((gf.label as any)?.en || '')}
                            onChange={(e) => updateGroupField(idx, { label: e.target.value })}
                            className={inputClass}
                          />
                          <input
                            dir="rtl"
                            aria-label={t('labelArPlaceholderShort', 'systemSettings')}
                            placeholder={t('labelArPlaceholderShort', 'systemSettings')}
                            value={typeof gf.label === 'string' ? (gf.labelAr || '') : ((gf.label as any)?.ar || '')}
                            onChange={(e) => updateGroupField(idx, { labelAr: e.target.value })}
                            className={inputClass}
                          />
                          <select
                            aria-label={t('dataType', 'systemSettings')}
                            value={gf.inputType}
                            onChange={(e) => updateGroupField(idx, { inputType: e.target.value as GroupField['inputType'] })}
                            className={selectClass}
                          >
                            {subFieldTypeOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                            <span className="text-sm text-slate-700 dark:text-slate-300">{t('required', 'systemSettings')}</span>
                            <Switch checked={gf.isRequired} onChange={(val) => updateGroupField(idx, { isRequired: val })} label={t('required', 'systemSettings')} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={resetForm}>
              {t('cancelButton', 'systemSettings')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="size-4" />}
              loading={createFieldMutation.isPending || updateFieldMutation.isPending}
            >
              {editFieldId ? t('saveChanges', 'systemSettings') : t('createPreset', 'systemSettings')}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
          ))}
          <span className="sr-only" role="status">{t('loadingMessage', 'systemSettings')}</span>
        </div>
      ) : visibleFields.length === 0 ? (
        !showForm && (
          <Card>
            <EmptyState icon={<Inbox className="size-6" />} title={t('pageTitle', 'systemSettings')} />
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleFields.map((f: any) => (
            <Card key={f.fieldId} className="flex items-start gap-3 p-4 transition hover:border-slate-300 dark:hover:border-slate-700">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="blue">{f.inputType.replace("_", " ")}</Badge>
                  {f.isRequired && <Badge tone="red">{t('requiredBadge', 'systemSettings')}</Badge>}
                </div>
                <div>
                  <h3 className="truncate text-sm font-semibold capitalize text-slate-900 dark:text-white">
                    {typeof f.label === "string" ? f.label : (f.label?.en || t('unnamedField', 'systemSettings'))}
                  </h3>
                  <p className="mt-0.5 truncate text-start text-sm text-slate-500 dark:text-slate-400" dir="rtl">
                    {typeof f.label === "string" ? f.labelAr : (f.label?.ar || "")}
                  </p>
                </div>
                {(f.choices?.length > 0 || f.groupFields?.length > 0) && (
                  <p className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {f.choices?.length > 0 && <span>{t('optionsCount', 'systemSettings', { count: f.choices.length })}</span>}
                    {f.groupFields?.length > 0 && <span>{t('nestedFieldsCount', 'systemSettings', { count: f.groupFields.length })}</span>}
                  </p>
                )}
              </div>
              <div className="-me-1.5 -mt-1 flex shrink-0">
                <IconButton label={t('editPresetTitle', 'systemSettings')} onClick={() => handleEdit(f)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton tone="danger" label={t('delete', 'common')} onClick={() => handleDelete(f.fieldId)}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default RecommendedFields;
