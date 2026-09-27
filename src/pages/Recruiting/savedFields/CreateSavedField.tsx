import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import { Check, ChevronDown, ChevronRight, Layers, ListChecks, Pencil, Plus, Save, SlidersHorizontal, Trash2, X } from "lucide-react";
import { BackLink,
  Badge,
  Button,
  Card,
  CardToolbar,
  Field,
  IconButton,
  PageShell,
  SectionTitle,
  Switch,
  focusRing,
  inputClass,
  selectClass,
} from "../../../components/ui/kit";
import { useCreateSavedField, useUpdateSavedField } from "../../../hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import { savedFieldsKeys } from "../../../hooks/queries/useUsers";
import Swal from '../../../utils/swal';
import { getErrorResponse} from "../../../utils/errorHandler";
import { useLocale } from '../../../context/LocaleContext';

export default function CreateSavedField() {
  const { t } = useLocale();
  const { state } = useLocation();
  const navigate = useNavigate();
  const editingField = state?.field;

  const [labelEn, setLabelEn] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [inputType, setInputType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");
  const [minValue, setMinValue] = useState<number | undefined>(undefined);
  const [maxValue, setMaxValue] = useState<number | undefined>(undefined);

  const [choices, setChoices] = useState<Array<{ en: string; ar?: string }>>([]);
  const [newChoiceEn, setNewChoiceEn] = useState("");
  const [newChoiceAr, setNewChoiceAr] = useState("");
  const [editingChoiceIndex, setEditingChoiceIndex] = useState<number | null>(null);
  const [editChoiceEn, setEditChoiceEn] = useState("");
  const [editChoiceAr, setEditChoiceAr] = useState("");

  const [subFields, setSubFields] = useState<any[]>([]);
  const [collapsedSubFields, setCollapsedSubFields] = useState<Set<number>>(new Set());

  const createMutation = useCreateSavedField();
  const updateMutation = useUpdateSavedField();
  const qc = useQueryClient();

  useEffect(() => {
    if (!editingField) return;
    if (editingField.label && typeof editingField.label === "object") {
      setLabelEn(editingField.label.en || "");
      setLabelAr(editingField.label.ar || editingField.label.en || "");
    } else {
      setLabelEn(editingField.label || "");
      setLabelAr(editingField.label || editingField.label?.en || "");
    }
    setInputType(editingField.inputType || "text");
    setIsRequired(!!editingField.isRequired);
    setDefaultValue(editingField.defaultValue || "");
    setMinValue(editingField.minValue ?? undefined);
    setMaxValue(editingField.maxValue ?? undefined);
    if (Array.isArray(editingField.choices)) {
      setChoices(
        editingField.choices.map((c: any) =>
          typeof c === "string"
            ? { en: c, ar: c }
            : { en: c.en || "", ar: c.ar || c.en || "" }
        )
      );
    }
    if (Array.isArray(editingField.groupFields)) {
      setSubFields(editingField.groupFields || []);
      setCollapsedSubFields(new Set(editingField.groupFields.map((_: any, i: number) => i)));
    }
  }, [editingField]);

  const toggleSubFieldCollapse = (index: number) => {
    setCollapsedSubFields((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const generateFieldId = (label: string) => {
    const normalized = (label || "").trim().toLowerCase();
    if (normalized === "have a mobile") return "have_a_mobile";
    const slug = normalized
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (slug) return slug;
    return `field_${Date.now()}`;
  };

  const addChoice = () => {
    if (!newChoiceEn.trim() || !newChoiceAr.trim()) return;
    setChoices((s) => [...s, { en: newChoiceEn.trim(), ar: newChoiceAr.trim() }]);
    setNewChoiceEn("");
    setNewChoiceAr("");
  };

  const handleEditChoice = (index: number) => {
    const c = choices[index];
    setEditingChoiceIndex(index);
    setEditChoiceEn(c?.en || "");
    setEditChoiceAr(c?.ar || c?.en || "");
  };

  const handleUpdateChoice = () => {
    if (editingChoiceIndex === null) return;
    const idx = editingChoiceIndex;
    const next = choices.map((c, i) => (i === idx ? { en: editChoiceEn.trim(), ar: editChoiceAr.trim() || editChoiceEn.trim() } : c));
    setChoices(next);
    setEditingChoiceIndex(null);
    setEditChoiceEn("");
    setEditChoiceAr("");
  };

  const handleCancelEditChoice = () => {
    setEditingChoiceIndex(null);
    setEditChoiceEn("");
    setEditChoiceAr("");
  };

  const removeChoice = (index: number) => {
    setChoices((s) => s.filter((_, i) => i !== index));
  };

  const addSubField = () => {
    setSubFields((s) => [
      ...s,
      {
        fieldId: `sub_${Date.now()}_${Math.random()}`,
        label: { en: "", ar: "" },
        inputType: "text",
        isRequired: false,
      },
    ]);
  };

  const updateSubField = (index: number, patch: any) => {
    setSubFields((s) => s.map((sf, i) => (i === index ? { ...sf, ...patch } : sf)));
  };

  const removeSubField = (index: number) => {
    setSubFields((s) => s.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: any) => { e.preventDefault();
    const finalFieldId = editingField?.fieldId || generateFieldId(labelEn);
    const choiceTypes = ["radio", "dropdown", "checkbox"];
    if (choiceTypes.includes(inputType)) {
      if (!choices || choices.length === 0) {
        Swal.fire({ title: t('validationError', 'savedFields'), text: t('validationChoiceRequired', 'savedFields'), icon: "warning" });
        return;
      }
    }
    for (let i = 0; i < (subFields || []).length; i++) {
      const sf = subFields[i] || {};
      if (choiceTypes.includes(sf.inputType)) {
        if (!Array.isArray(sf.choices) || sf.choices.length === 0) {
          const label = typeof sf.label === "string" ? sf.label : (sf.label?.en || sf.label?.ar || `#${i + 1}`);
          Swal.fire({ title: t('validationError', 'savedFields'), text: t('validationGroupChoiceRequired', 'savedFields', { label }), icon: "warning" });
          return;
        }
      }
    }
    const payload: any = {
      fieldId: finalFieldId,
      label: { en: labelEn, ar: labelAr || labelEn },
      inputType,
      isRequired,
      defaultValue,
      choices: (choices || []).map((c) => ({ en: c.en || "", ar: c.ar || c.en || "" })),
      groupFields: (subFields || []).map((sf: any) => ({
        fieldId: sf.fieldId,
        label: {
          en: typeof sf.label === "string" ? sf.label : (sf.label?.en || ""),
          ar: typeof sf.label === "string" ? sf.label : (sf.label?.ar || sf.label?.en || ""),
        },
        inputType: sf.inputType,
        isRequired: !!sf.isRequired,
        choices: (sf.choices || []).map((c: any) => ({ en: c.en || c || "", ar: c.ar || c.en || c || "" })),
        defaultValue: sf.defaultValue ?? null,
        minValue: sf.minValue,
        maxValue: sf.maxValue,
      })),
    };
    if (minValue !== undefined) payload.minValue = minValue;
    if (maxValue !== undefined) payload.maxValue = maxValue;
    try {
      if (editingField) {
        const updated = await updateMutation.mutateAsync({ fieldId: editingField.fieldId, data: payload });
        qc.setQueryData(savedFieldsKeys.list(), (old: any) => (old || []).map((f: any) => (f.fieldId === editingField.fieldId ? { ...f, ...updated } : f)));
        Swal.fire({ title: t('updatedSuccess', 'savedFields'), icon: "success", timer: 1000, showConfirmButton: false });
        navigate(-1);
      } else {
        const created = await createMutation.mutateAsync(payload);
        qc.setQueryData(savedFieldsKeys.list(), (old: any) => [created, ...(old || [])]);
        Swal.fire({ title: t('createdSuccess', 'savedFields'), icon: "success", timer: 1000, showConfirmButton: false });
        navigate(-1);
      }
    } catch (err: any) {
      const resp = getErrorResponse(err);
      Swal.fire({ title: t('errorGeneric', 'savedFields'), text: resp.message || String(err), icon: "error" });
    }
  };

  const addSubChoice = (idx: number) => {
    const sf = subFields[idx] || {};
    const en = (sf._newChoiceEn || "").trim();
    const ar = (sf._newChoiceAr || "").trim();
    if (!en || !ar) return;
    const nextChoices = (sf.choices || []).concat([{ en, ar }]);
    updateSubField(idx, { choices: nextChoices, _newChoiceEn: "", _newChoiceAr: "" });
  };

  const typeOptions = [
    { value: "text", label: t('typeText', 'savedFields') },
    { value: "textarea", label: t('typeTextarea', 'savedFields') },
    { value: "number", label: t('typeNumber', 'savedFields') },
    { value: "email", label: t('typeEmail', 'savedFields') },
    { value: "date", label: t('typeDate', 'savedFields') },
    { value: "url", label: t('typeUrl', 'savedFields') },
    { value: "checkbox", label: t('typeCheckbox', 'savedFields') },
    { value: "radio", label: t('typeRadio', 'savedFields') },
    { value: "dropdown", label: t('typeDropdown', 'savedFields') },
    { value: "tags", label: t('typeTags', 'savedFields') },
  ];
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const pageTitle = editingField ? t('editMetaTitle', 'savedFields') : t('createMetaTitle', 'savedFields');

  return (
    <PageShell
      title={pageTitle}
      back={<BackLink onClick={() => navigate(-1)}>{t('cancelButton', 'savedFields')}</BackLink>}
    >
      <PageMeta title={pageTitle} description={t('createMetaDescription', 'savedFields')} />

      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6 pb-4">
        <Card>
          <CardToolbar>
            <div>
              <SectionTitle icon={<SlidersHorizontal className="size-4" />}>{t('fieldConfiguration', 'savedFields')}</SectionTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('fieldConfigurationDesc', 'savedFields')}</p>
            </div>
          </CardToolbar>
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t('displayLabelEn', 'savedFields')} htmlFor="labelEn">
                <input
                  id="labelEn"
                  dir="ltr"
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                  placeholder={t('labelEnPlaceholder', 'savedFields')}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label={t('displayLabelAr', 'savedFields')} htmlFor="labelAr">
                <input
                  id="labelAr"
                  dir="rtl"
                  value={labelAr}
                  onChange={(e) => setLabelAr(e.target.value)}
                  placeholder={t('labelArPlaceholder', 'savedFields')}
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t('dataType', 'savedFields')} htmlFor="inputType" hint={t('dataTypeHint', 'savedFields')}>
                <select id="inputType" value={inputType} onChange={(e) => setInputType(e.target.value)} className={selectClass}>
                  {[...typeOptions, { value: "repeatable_group", label: t('typeRepeatableGroup', 'savedFields') }].map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:mt-7">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('requiredField', 'savedFields')}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('requiredHint', 'savedFields')}</p>
                </div>
                <Switch checked={isRequired} onChange={setIsRequired} label={t('requiredField', 'savedFields')} />
              </div>
            </div>

            {inputType === "number" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={t('minimumAllowed', 'savedFields')} htmlFor="minValue">
                  <input
                    id="minValue"
                    type="number"
                    value={minValue ?? ""}
                    onChange={(e) => setMinValue(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={t('nonePlaceholder', 'savedFields')}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('maximumAllowed', 'savedFields')} htmlFor="maxValue">
                  <input
                    id="maxValue"
                    type="number"
                    value={maxValue ?? ""}
                    onChange={(e) => setMaxValue(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={t('nonePlaceholder', 'savedFields')}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </div>
        </Card>

        {(inputType === "radio" || inputType === "dropdown" || inputType === "checkbox" || inputType === "tags") && (
          <Card>
            <CardToolbar>
              <div>
                <SectionTitle icon={<ListChecks className="size-4" />}>{t('optionsChoices', 'savedFields')}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('optionsChoicesDesc', 'savedFields')}</p>
              </div>
              <Badge tone="slate">{choices.length}</Badge>
            </CardToolbar>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Field label={t('newChoiceEn', 'savedFields')} htmlFor="newChoiceEn">
                  <input
                    id="newChoiceEn"
                    dir="ltr"
                    placeholder={t('newChoiceEnPlaceholder', 'savedFields')}
                    value={newChoiceEn}
                    onChange={(e) => setNewChoiceEn(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChoice(); } }}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('newChoiceAr', 'savedFields')} htmlFor="newChoiceAr">
                  <input
                    id="newChoiceAr"
                    dir="rtl"
                    placeholder={t('newChoiceArPlaceholder', 'savedFields')}
                    value={newChoiceAr}
                    onChange={(e) => setNewChoiceAr(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChoice(); } }}
                    className={inputClass}
                  />
                </Field>
                <Button icon={<Plus className="size-4" />} onClick={addChoice}>
                  {t('appendChoice', 'savedFields')}
                </Button>
              </div>

              {choices.length > 0 && (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {choices.map((c, idx) => (
                    <li key={idx} className="px-3 py-2">
                      {editingChoiceIndex === idx ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input
                              dir="ltr"
                              aria-label={t('newChoiceEn', 'savedFields')}
                              value={editChoiceEn}
                              onChange={(e) => setEditChoiceEn(e.target.value)}
                              className={inputClass}
                              autoFocus
                            />
                            <input
                              dir="rtl"
                              aria-label={t('newChoiceAr', 'savedFields')}
                              value={editChoiceAr}
                              onChange={(e) => setEditChoiceAr(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="success" icon={<Check className="size-4" />} onClick={handleUpdateChoice}>
                              {t('saveChoice', 'savedFields')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEditChoice}>
                              {t('cancelChoice', 'savedFields')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.en}</p>
                            <p className="truncate text-start text-xs text-slate-500 dark:text-slate-400" dir="rtl">{c.ar}</p>
                          </div>
                          <IconButton label={t('saveChoice', 'savedFields')} onClick={() => handleEditChoice(idx)}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton tone="danger" label={t('delete', 'common')} onClick={() => removeChoice(idx)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}

        {inputType === "repeatable_group" && (
          <Card>
            <CardToolbar>
              <div>
                <SectionTitle icon={<Layers className="size-4" />}>{t('nestedFieldsConfig', 'savedFields')}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('nestedFieldsConfigDesc', 'savedFields')}</p>
              </div>
            </CardToolbar>
            <div className="space-y-3 p-4">
              {subFields.map((sf, idx) => {
                const collapsed = collapsedSubFields.has(idx);
                return (
                  <div key={sf.fieldId} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                      <button
                        type="button"
                        onClick={() => toggleSubFieldCollapse(idx)}
                        aria-expanded={!collapsed}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start ${focusRing}`}
                      >
                        {collapsed ? <ChevronRight className="size-4 shrink-0 text-slate-400 rtl:rotate-180" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          {idx + 1}
                        </span>
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {(typeof sf.label === "string" ? sf.label : sf.label?.en) || t('untitledSubField', 'savedFields', { index: idx + 1 })}
                        </span>
                        <Badge tone="slate">{sf.inputType}</Badge>
                      </button>
                      <IconButton tone="danger" label={t('delete', 'common')} onClick={() => removeSubField(idx)}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>

                    {!collapsed && (
                      <div className="space-y-4 p-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Field label={t('labelEn', 'savedFields')} htmlFor={`sf-en-${idx}`}>
                            <input
                              id={`sf-en-${idx}`}
                              dir="ltr"
                              value={typeof sf.label === "string" ? sf.label : (sf.label?.en || "")}
                              onChange={(e) => {
                                const base = typeof sf.label === "string" ? { en: sf.label } : (sf.label || {});
                                updateSubField(idx, { label: { ...base, en: e.target.value } });
                              }}
                              placeholder={t('labelEnPlaceholder', 'savedFields')}
                              className={inputClass}
                            />
                          </Field>
                          <Field label={t('labelAr', 'savedFields')} htmlFor={`sf-ar-${idx}`}>
                            <input
                              id={`sf-ar-${idx}`}
                              dir="rtl"
                              value={typeof sf.label === "string" ? "" : (sf.label?.ar ?? "")}
                              onChange={(e) => {
                                const base = typeof sf.label === "string" ? { en: sf.label } : (sf.label || {});
                                updateSubField(idx, { label: { ...base, ar: e.target.value } });
                              }}
                              className={inputClass}
                            />
                          </Field>
                          <Field label={t('fieldType', 'savedFields')} htmlFor={`sf-type-${idx}`}>
                            <select
                              id={`sf-type-${idx}`}
                              value={sf.inputType}
                              onChange={(e) => updateSubField(idx, { inputType: e.target.value })}
                              className={selectClass}
                            >
                              {typeOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:mt-7">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{t('isRequired', 'savedFields')}</span>
                            <Switch
                              label={t('isRequired', 'savedFields')}
                              checked={!!sf.isRequired}
                              onChange={(val) => updateSubField(idx, { isRequired: val })}
                            />
                          </div>
                        </div>

                        {(sf.inputType === "radio" || sf.inputType === "dropdown" || sf.inputType === "checkbox") && (
                          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('optionManagement', 'savedFields')}</p>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                              <input
                                dir="ltr"
                                aria-label={t('choiceEnPlaceholder', 'savedFields')}
                                placeholder={t('choiceEnPlaceholder', 'savedFields')}
                                value={sf._newChoiceEn || ""}
                                onChange={(e) => updateSubField(idx, { _newChoiceEn: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubChoice(idx); } }}
                                className={inputClass}
                              />
                              <input
                                dir="rtl"
                                aria-label={t('choiceArPlaceholder', 'savedFields')}
                                placeholder={t('choiceArPlaceholder', 'savedFields')}
                                value={sf._newChoiceAr || ""}
                                onChange={(e) => updateSubField(idx, { _newChoiceAr: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubChoice(idx); } }}
                                className={inputClass}
                              />
                              <Button icon={<Plus className="size-4" />} onClick={() => addSubChoice(idx)}>
                                {t('addSubOption', 'savedFields')}
                              </Button>
                            </div>
                            {(sf.choices || []).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {(sf.choices || []).map((c: any, cidx: number) => {
                                  const label = typeof c === "string" ? c : c.en;
                                  return (
                                    <span key={cidx} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white py-0.5 pe-1 ps-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                      {label}
                                      <button
                                        type="button"
                                        aria-label={`${t('delete', 'common')} ${label}`}
                                        onClick={() => {
                                          const next = sf.choices.filter((_: any, i: number) => i !== cidx);
                                          updateSubField(idx, { choices: next });
                                        }}
                                        className={`rounded p-0.5 text-slate-400 hover:text-rose-500 ${focusRing}`}
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {sf.inputType === "number" && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label={t('minValue', 'savedFields')} htmlFor={`sf-min-${idx}`}>
                              <input id={`sf-min-${idx}`} type="number" value={sf.minValue ?? ""} onChange={(e) => updateSubField(idx, { minValue: e.target.value ? Number(e.target.value) : undefined })} placeholder={t('nonePlaceholder', 'savedFields')} className={inputClass} />
                            </Field>
                            <Field label={t('maxValue', 'savedFields')} htmlFor={`sf-max-${idx}`}>
                              <input id={`sf-max-${idx}`} type="number" value={sf.maxValue ?? ""} onChange={(e) => updateSubField(idx, { maxValue: e.target.value ? Number(e.target.value) : undefined })} placeholder={t('nonePlaceholder', 'savedFields')} className={inputClass} />
                            </Field>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button className="w-full" icon={<Plus className="size-4" />} onClick={addSubField}>
                {t('addGroupField', 'savedFields')}
              </Button>
            </div>
          </Card>
        )}

        <div className="sticky bottom-4 z-20 flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('cancelButton', 'savedFields')}
          </Button>
          <Button type="submit" variant="primary" icon={<Save className="size-4" />} loading={isSaving}>
            {isSaving ? t('savingButton', 'savedFields') : editingField ? t('updateFieldButton', 'savedFields') : t('saveFieldButton', 'savedFields')}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
