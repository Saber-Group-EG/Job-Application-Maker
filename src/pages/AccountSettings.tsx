import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  useSavedFields,
  useDeleteSavedField,
  useSavedQuestionGroups,
  useUpdateSavedQuestionGroups,
  useDeleteSavedQuestionGroup,
} from "../hooks/queries";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../icons";
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

  if (isLoading) {
    return <LoadingSpinner fullPage message={t('loadingSavedFields', 'common')} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600/80 dark:text-brand-300">
            {t('customFieldTemplates', 'common')}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t('templatesSaved', 'common', { count: activeFields.length })}
          </p>
        </div>
        <button
          onClick={() => navigate("/recruiting/saved-fields/create")}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 hover:shadow-brand-500/30 active:scale-95"
        >
          <PlusIcon className="size-4" />
          {t('newField', 'common')}
        </button>
      </div>

      {activeFields.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
          <div className="rounded-full bg-gray-50 p-5 dark:bg-gray-800">
            <svg className="size-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h4 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{t('noSavedFields', 'common')}</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('createFirstField', 'common')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeFields.map((f: any) => (
            <div
              key={f.fieldId}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-gray-50 px-2.5 py-1 dark:bg-gray-800">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {f.inputType === "repeatable_group" ? "GRP" : f.inputType?.substring(0, 3) || "TXT"}
                      </span>
                    </div>
                    {f.isRequired && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400 uppercase">
                        {t('required', 'common')}
                      </span>
                    )}
                  </div>
                  <h4 className="truncate text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                    {typeof f.label === "string" ? f.label : f.label?.en || t('untitled', 'common')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-blue-50/50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      {f.inputType?.replace(/_/g, " ") || "text"}
                    </span>
                    {(f.choices || []).length > 0 && (
                      <span className="rounded-lg bg-amber-50/50 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        {t('optionsCount', 'common', { count: f.choices.length })}
                      </span>
                    )}
                    {(f.groupFields || []).length > 0 && (
                      <span className="rounded-lg bg-purple-50/50 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                        {t('subFieldsCount', 'common', { count: f.groupFields.length })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 ml-3">
                  <button
                    onClick={() => handleEdit(f)}
                    className="rounded-lg p-2 text-gray-400 bg-gray-50 hover:bg-brand-50 hover:text-brand-600 transition-all dark:bg-gray-800 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(f.fieldId)}
                    disabled={deletingIds[f.fieldId]}
                    className="rounded-lg p-2 text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-all dark:bg-gray-800 dark:hover:bg-red-500/10 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    <TrashBinIcon className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600/80 dark:text-brand-300">
            {t('interviewQuestionGroups', 'common')}
          </p>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t('groupsCount', 'common', { count: groups.length })} &middot; {t('questionsCount', 'common', { count: totalQuestions })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addGroup}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t('addGroup', 'common')}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 hover:shadow-brand-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {t('saveAll', 'common')}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
          {t('loading', 'common')}
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
          <svg className="mx-auto mb-3 size-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('noQuestionGroups', 'common')}</p>
        </div>
      )}

      {groups.map((group, groupIndex) => (
        <div
          key={`${group.name}-${groupIndex}`}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/30"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('groupName', 'common')}</label>
              <input
                value={group.name}
                onChange={(e) => updateGroupName(groupIndex, e.target.value)}
                placeholder={t('enterGroupName', 'common')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <button
              type="button"
              onClick={() => removeGroup(groupIndex)}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('remove', 'common')}
            </button>
          </div>

          <div className="space-y-3">
            {group.questions.map((question, questionIndex) => (
              <div
                key={`${groupIndex}-${questionIndex}`}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/60 lg:grid-cols-[1fr_160px_100px_auto]"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('questionLabel', 'common')}</label>
                  <input
                    value={question.question}
                    onChange={(e) => updateQuestion(groupIndex, questionIndex, { question: e.target.value })}
                    placeholder={t('enterQuestion', 'common')}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('type', 'common')}</label>
                  <select
                    value={question.answerType}
                    onChange={(e) =>
                      updateQuestion(groupIndex, questionIndex, {
                        answerType: e.target.value as SavedQuestionAnswerType,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900"
                  >
                    {ANSWER_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('score', 'common')}</label>
                  <input
                    type="number"
                    value={question.score}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateQuestion(groupIndex, questionIndex, { score: Number.isFinite(v) ? v : 0 });
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeQuestion(groupIndex, questionIndex)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {(question.answerType === "radio" || question.answerType === "dropdown") && (
                  <div className="lg:col-span-4">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('choices', 'common')}</label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {(Array.isArray(question.choices) ? question.choices : []).map((c) => (
                        <div
                          key={c}
                          className="group flex items-center rounded-full bg-gray-100 py-1 pl-2.5 pr-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-white/90"
                        >
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const existing = Array.isArray(question.choices) ? question.choices : [];
                              updateQuestion(groupIndex, questionIndex, {
                                choices: existing.filter((x) => String(x) !== String(c)),
                              });
                            }}
                            className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg className="fill-current" width="14" height="14" viewBox="0 0 14 14">
                              <path fillRule="evenodd" clipRule="evenodd" d="M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={choiceBuffers[`${groupIndex}_${questionIndex}`] ?? ""}
                      onChange={(e) =>
                        setChoiceBuffers((prev) => ({ ...prev, [`${groupIndex}_${questionIndex}`]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const key = `${groupIndex}_${questionIndex}`;
                          const buf = (choiceBuffers[key] ?? "").trim();
                          if (!buf) return;
                          const existing = Array.isArray(question.choices) ? question.choices : [];
                          updateQuestion(groupIndex, questionIndex, { choices: [...existing, buf] });
                          setChoiceBuffers((prev) => ({ ...prev, [key]: "" }));
                        }
                      }}
                      onBlur={() => {
                        const key = `${groupIndex}_${questionIndex}`;
                        const buf = (choiceBuffers[key] ?? "").trim();
                        if (!buf) return;
                        const existing = Array.isArray(question.choices) ? question.choices : [];
                        updateQuestion(groupIndex, questionIndex, { choices: [...existing, buf] });
                        setChoiceBuffers((prev) => ({ ...prev, [key]: "" }));
                      }}
                      placeholder={t('choicePlaceholder', 'common')}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900"
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => addQuestion(groupIndex)}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {t('addQuestion', 'common')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccountSettings() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<"fields" | "questions">("fields");

  return (
    <div className="space-y-6">
      <PageMeta
        title={t('accountSettingsPageTitle', 'common')}
        description={t('accountSettingsPageDesc', 'common')}
      />
      <PageBreadcrumb pageTitle={t('accountSettings', 'common')} />

      {/* User Info Bar */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-[2.5rem] bg-gradient-to-b from-brand-500 to-brand-300" />
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5Z" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
              {user?.fullName || t('user', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('manageTemplates', 'common')}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("fields")}
          className={`relative pb-3 text-sm font-semibold transition-all ${
            activeTab === "fields"
              ? "text-brand-600 dark:text-brand-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('savedFields', 'common')}
          </div>
          {activeTab === "fields" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`relative pb-3 text-sm font-semibold transition-all ${
            activeTab === "questions"
              ? "text-brand-600 dark:text-brand-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.879 7.52c1.33-1.33 3.55-1.33 4.88 0M15.05 3.35c-2.01-2-5.28-2-7.28 0M17.18 13.65A7.81 7.81 0 0012 11.5c-1.96 0-3.76.72-5.18 1.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 20.5a2 2 0 100-4 2 2 0 000 4z" fill="currentColor" />
            </svg>
            {t('savedQuestions', 'common')}
          </div>
          {activeTab === "questions" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        {activeTab === "fields" ? <SavedFieldsSection /> : <SavedQuestionsSection />}
      </div>
    </div>
  );
}
