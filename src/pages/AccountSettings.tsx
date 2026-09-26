import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import {
  useSavedFields,
  useDeleteSavedField,
  useSavedQuestionGroups,
  useUpdateSavedQuestionGroups,
  useDeleteSavedQuestionGroup,
} from "../hooks/queries";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { Check, ClipboardList, Inbox, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  IconButton,
  PageShell,
  Segmented,
  SectionTitle,
  focusRing,
  inputClass,
  selectClass,
} from "../components/ui/kit";
import Swal from "../utils/swal";

type SavedQuestionAnswerType = "text" | "number" | "radio" | "checkbox" | "dropdown" | "tags";

interface SavedQuestion {
  question: string;
  score: number;
  answerType: SavedQuestionAnswerType;
  choices?: string[];
}

interface SavedQuestionGroup {
  _id?: string;
  name: string;
  questions: SavedQuestion[];
}

const ANSWER_TYPES: SavedQuestionAnswerType[] = [
  "text", "number", "radio", "checkbox", "dropdown", "tags",
];

const EMPTY_QUESTION: SavedQuestion = {
  question: "",
  score: 0,
  answerType: "text",
};

function SavedFieldsSection() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { data, isLoading } = useSavedFields();
  const deleteMutation = useDeleteSavedField();
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const fields = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : [];
  }, [data]);

  const activeFields = fields.filter((f: any) => !deletingIds[f.fieldId]);

  const handleEdit = (field: any) => {
    navigate("/recruiting/saved-fields/create", { state: { field } });
  };

  const handleDelete = async (fieldId: string) => {
    const result = await Swal.fire({
      title: t('deleteField', 'common'),
      text: t('deleteFieldConfirm', 'common'),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: t('delete', 'common'),
    });
    if (!result.isConfirmed) return;

    setDeletingIds((s) => ({ ...s, [fieldId]: true }));
    deleteMutation.mutate(fieldId, {
      onError: () => {
        setDeletingIds((s) => {
          const copy = { ...s };
          delete copy[fieldId];
          return copy;
        });
      },
      onSettled: () => {
        setDeletingIds((s) => {
          const copy = { ...s };
          delete copy[fieldId];
          return copy;
        });
      },
    });
  };

  const answerTypeLabel = (type: string) => {
    const key = `acctFieldType_${type}`;
    const label = t(key, 'common');
    return label === key ? type.replace(/_/g, " ") : label;
  };

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<Inbox className="size-4" />}>{t('customFieldTemplates', 'common')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('templatesSaved', 'common', { count: activeFields.length })}
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate("/recruiting/saved-fields/create")}>
          {t('newField', 'common')}
        </Button>
      </CardToolbar>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          {t('loadingSavedFields', 'common')}
        </div>
      ) : activeFields.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          title={t('noSavedFields', 'common')}
          text={t('createFirstField', 'common')}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {activeFields.map((f: any) => {
            const label = typeof f.label === "string" ? f.label : f.label?.en || t('untitled', 'common');
            return (
              <li key={f.fieldId} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    to={`/recruiting/saved-fields/preview/${encodeURIComponent(f.fieldId)}`}
                    state={{ field: f }}
                    className={`block truncate rounded text-sm font-medium text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400 ${focusRing}`}
                  >
                    {label}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{answerTypeLabel(f.inputType || "text")}</span>
                    {(f.choices || []).length > 0 && <span>{t('optionsCount', 'common', { count: f.choices.length })}</span>}
                    {(f.groupFields || []).length > 0 && <span>{t('subFieldsCount', 'common', { count: f.groupFields.length })}</span>}
                    {f.isRequired && <Badge tone="amber">{t('required', 'common')}</Badge>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton label={t('acctEditField', 'common', { name: label })} onClick={() => handleEdit(f)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    tone="danger"
                    label={t('acctDeleteField', 'common', { name: label })}
                    onClick={() => handleDelete(f.fieldId)}
                    disabled={deletingIds[f.fieldId]}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function SavedQuestionsSection() {
  const { t } = useLocale();
  const { data: groupsFromApi, isLoading: isGroupsLoading, isFetching } = useSavedQuestionGroups();
  const updateGroupsMutation = useUpdateSavedQuestionGroups();
  const deleteGroupMutation = useDeleteSavedQuestionGroup();

  const [groups, setGroups] = useState<SavedQuestionGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [choiceBuffers, setChoiceBuffers] = useState<Record<string, string>>({});

  const isLoading = isGroupsLoading || isFetching;

  const normalizeGroups = (g: any[]): SavedQuestionGroup[] => {
    if (!Array.isArray(g)) return [];
    return g.map((group: any) => ({
      _id: typeof group?._id === "string" ? group._id : undefined,
      name: String(group?.name ?? ""),
      questions: Array.isArray(group?.questions)
        ? group.questions.map((q: any) => {
            const answerType = ANSWER_TYPES.includes(q?.answerType) ? q.answerType : "text";
            const score = Number(q?.score);
            return {
              question: String(q?.question ?? ""),
              score: Number.isFinite(score) ? score : 0,
              answerType,
              choices: Array.isArray(q?.choices)
                ? q.choices.map((c: any) => String(c ?? "").trim()).filter(Boolean)
                : [],
            };
          })
        : [],
    }));
  };

  useEffect(() => {
    setGroups(normalizeGroups(groupsFromApi as any));
  }, [groupsFromApi]);

  const totalQuestions = useMemo(
    () => groups.reduce((acc, g) => acc + g.questions.length, 0),
    [groups]
  );

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      { name: `${t('groupName', 'common')} ${prev.length + 1}`, questions: [{ ...EMPTY_QUESTION }] },
    ]);
  };

  const removeGroup = async (groupIndex: number) => {
    const target = groups[groupIndex];
    if (!target) return;
    setGroups((prev) => prev.filter((_, i) => i !== groupIndex));
    if (!target._id) return;
    try {
      await deleteGroupMutation.mutateAsync(target._id);
    } catch {
      setGroups((prev) => {
        if (prev.some((g) => g._id === target._id)) return prev;
        const restored = [...prev];
        restored.splice(Math.min(groupIndex, restored.length), 0, target);
        return restored;
      });
    }
  };

  const updateGroupName = (groupIndex: number, name: string) => {
    setGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, name } : g)));
  };

  const addQuestion = (groupIndex: number) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, questions: [...g.questions, { ...EMPTY_QUESTION }] } : g
      )
    );
  };

  const removeQuestion = (groupIndex: number, questionIndex: number) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, questions: g.questions.filter((_, qi) => qi !== questionIndex) }
          : g
      )
    );
  };

  const updateQuestion = (
    groupIndex: number,
    questionIndex: number,
    patch: Partial<SavedQuestion>
  ) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              questions: g.questions.map((q, qi) =>
                qi === questionIndex ? { ...q, ...patch } : q
              ),
            }
          : g
      )
    );
  };

  const validateGroups = (): SavedQuestionGroup[] | null => {
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      if (!group.name.trim()) {
        Swal.fire(t('validation', 'common'), t('groupMustHaveName', 'common', { index: gi + 1 }), "warning");
        return null;
      }
      for (let qi = 0; qi < group.questions.length; qi++) {
        const q = group.questions[qi];
        if (!q.question.trim()) {
          Swal.fire(t('validation', 'common'), t('questionCannotBeEmpty', 'common', { qIndex: qi + 1, gIndex: gi + 1 }), "warning");
          return null;
        }
        if (!Number.isFinite(q.score)) {
          Swal.fire(t('validation', 'common'), t('questionNeedsScore', 'common', { qIndex: qi + 1, gIndex: gi + 1 }), "warning");
          return null;
        }
        if (
          (q.answerType === "radio" || q.answerType === "dropdown") &&
          (!Array.isArray(q.choices) || q.choices.length === 0)
        ) {
          Swal.fire(t('validation', 'common'), t('questionNeedsChoice', 'common', { qIndex: qi + 1, gIndex: gi + 1 }), "warning");
          return null;
        }
      }
    }
    return groups.map((g) => ({
      name: g.name.trim(),
      questions: g.questions.map((q) => ({
        question: q.question.trim(),
        score: Number(q.score),
        answerType: q.answerType,
        choices: Array.isArray(q.choices)
          ? q.choices.map((c: any) => String(c ?? "").trim()).filter(Boolean)
          : [],
      })),
    }));
  };

  const handleSaveAll = async () => {
    const payload = validateGroups();
    if (!payload) return;
    setIsSaving(true);
    try {
      const saved = await updateGroupsMutation.mutateAsync(payload as any);
      setGroups(normalizeGroups(saved as any));
      Swal.fire({ title: t('saved', 'common'), text: t('questionGroupsSaved', 'common'), icon: "success", timer: 1200, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire(t('error', 'common'), err?.message || t('failedToSave', 'common'), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const answerTypeLabel = (type: string) => {
    const key = `acctFieldType_${type}`;
    const label = t(key, 'common');
    return label === key ? type : label;
  };

  const commitChoice = (groupIndex: number, questionIndex: number, question: SavedQuestion) => {
    const key = `${groupIndex}_${questionIndex}`;
    const buf = (choiceBuffers[key] ?? "").trim();
    if (!buf) return;
    const existing = Array.isArray(question.choices) ? question.choices : [];
    updateQuestion(groupIndex, questionIndex, { choices: [...existing, buf] });
    setChoiceBuffers((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardToolbar>
          <div>
            <SectionTitle icon={<ClipboardList className="size-4" />}>{t('interviewQuestionGroups', 'common')}</SectionTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t('groupsCount', 'common', { count: groups.length })} · {t('questionsCount', 'common', { count: totalQuestions })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Plus className="size-4" />} onClick={addGroup} disabled={isLoading}>
              {t('addGroup', 'common')}
            </Button>
            <Button variant="primary" icon={<Check className="size-4" />} onClick={handleSaveAll} loading={isSaving} disabled={isLoading}>
              {t('saveAll', 'common')}
            </Button>
          </div>
        </CardToolbar>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            {t('loading', 'common')}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title={t('noQuestionGroups', 'common')}
            text={t('acctNoGroupsHint', 'common')}
            action={<Button icon={<Plus className="size-4" />} onClick={addGroup}>{t('addGroup', 'common')}</Button>}
          />
        ) : (
          <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{t('acctSaveHint', 'common')}</p>
        )}
      </Card>

      {!isLoading && groups.map((group, groupIndex) => (
        // Keyed by position: keying by name would remount the card (and drop
        // focus) on every keystroke in the name field.
        <Card key={group._id ?? `new-${groupIndex}`}>
          <CardToolbar>
            <div className="w-full max-w-md">
              <Field label={t('groupName', 'common')} htmlFor={`qg-name-${groupIndex}`}>
                <input
                  id={`qg-name-${groupIndex}`}
                  value={group.name}
                  onChange={(e) => updateGroupName(groupIndex, e.target.value)}
                  placeholder={t('enterGroupName', 'common')}
                  className={inputClass}
                />
              </Field>
            </div>
            <Button variant="danger" size="sm" className="self-start lg:self-auto" icon={<Trash2 className="size-4" />} onClick={() => removeGroup(groupIndex)}>
              {t('acctRemoveGroup', 'common')}
            </Button>
          </CardToolbar>

          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {group.questions.map((question, questionIndex) => {
              const qid = `qg-${groupIndex}-q-${questionIndex}`;
              const needsChoices = question.answerType === "radio" || question.answerType === "dropdown";
              return (
                <li key={questionIndex} className="space-y-3 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_6rem_auto] sm:items-end">
                    <Field label={t('questionLabel', 'common')} htmlFor={`${qid}-text`}>
                      <input
                        id={`${qid}-text`}
                        dir="auto"
                        value={question.question}
                        onChange={(e) => updateQuestion(groupIndex, questionIndex, { question: e.target.value })}
                        placeholder={t('enterQuestion', 'common')}
                        className={inputClass}
                      />
                    </Field>
                    <Field label={t('type', 'common')} htmlFor={`${qid}-type`}>
                      <select
                        id={`${qid}-type`}
                        value={question.answerType}
                        onChange={(e) =>
                          updateQuestion(groupIndex, questionIndex, {
                            answerType: e.target.value as SavedQuestionAnswerType,
                          })
                        }
                        className={selectClass}
                      >
                        {ANSWER_TYPES.map((type) => (
                          <option key={type} value={type}>{answerTypeLabel(type)}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t('score', 'common')} htmlFor={`${qid}-score`}>
                      <input
                        id={`${qid}-score`}
                        type="number"
                        value={question.score}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateQuestion(groupIndex, questionIndex, { score: Number.isFinite(v) ? v : 0 });
                        }}
                        className={`${inputClass} tabular-nums`}
                      />
                    </Field>
                    <IconButton
                      tone="danger"
                      label={t('acctRemoveQuestion', 'common', { n: questionIndex + 1 })}
                      onClick={() => removeQuestion(groupIndex, questionIndex)}
                      className="sm:mb-1"
                    >
                      <X className="size-4" />
                    </IconButton>
                  </div>

                  {needsChoices && (
                    <Field label={t('choices', 'common')} htmlFor={`${qid}-choice`} hint={t('choicePlaceholder', 'common')}>
                      <div className="space-y-2">
                        {(Array.isArray(question.choices) ? question.choices : []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {(question.choices || []).map((c) => (
                              <span
                                key={c}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-0.5 pe-1 ps-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <bdi>{c}</bdi>
                                <button
                                  type="button"
                                  aria-label={t('acctRemoveChoice', 'common', { name: c })}
                                  onClick={() => {
                                    const existing = Array.isArray(question.choices) ? question.choices : [];
                                    updateQuestion(groupIndex, questionIndex, {
                                      choices: existing.filter((x) => String(x) !== String(c)),
                                    });
                                  }}
                                  className={`rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${focusRing}`}
                                >
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          id={`${qid}-choice`}
                          type="text"
                          dir="auto"
                          value={choiceBuffers[`${groupIndex}_${questionIndex}`] ?? ""}
                          onChange={(e) =>
                            setChoiceBuffers((prev) => ({ ...prev, [`${groupIndex}_${questionIndex}`]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitChoice(groupIndex, questionIndex, question);
                            }
                          }}
                          onBlur={() => commitChoice(groupIndex, questionIndex, question)}
                          className={inputClass}
                        />
                      </div>
                    </Field>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => addQuestion(groupIndex)}>
              {t('addQuestion', 'common')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function AccountSettings() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<"fields" | "questions">("fields");

  return (
    <>
      <PageMeta
        title={t('accountSettingsPageTitle', 'common')}
        description={t('accountSettingsPageDesc', 'common')}
      />
      <PageShell
        title={t('accountSettings', 'common')}
        subtitle={user?.fullName ? t('acctSubtitleFor', 'common', { name: user.fullName }) : t('manageTemplates', 'common')}
        actions={
          <Segmented
            role="tablist"
            ariaLabel={t('accountSettings', 'common')}
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "fields", label: t('savedFields', 'common'), icon: <Inbox className="size-4" /> },
              { value: "questions", label: t('savedQuestions', 'common'), icon: <ClipboardList className="size-4" /> },
            ]}
          />
        }
      >
        {activeTab === "fields" ? <SavedFieldsSection /> : <SavedQuestionsSection />}
      </PageShell>
    </>
  );
}
