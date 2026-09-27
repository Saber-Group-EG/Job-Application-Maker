import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Ban,
  ClipboardList,
  PlusCircle,
  Save,
  Trash2,
  Loader2,
  X,
  CircleCheckBig,
  Settings,
  Mail,
  Layout,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import Swal from '../../../utils/swal';
import PageMeta from '../../../components/common/PageMeta';
import {
  Button,
  Card,
  CardToolbar,
  EmptyState,
  IconButton,
  NoAccess,
  PageShell,
  SectionTitle,
  TabBar,
  focusRing,
  inputClass,
  selectClass,
} from '../../../components/ui/kit';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import {
  companiesKeys,
  useCompanies,
  useCompanyInterviewSettings,
  useDraftInterviewQuestionsWithAi,
  useUpdateCompanyInterviewSettings,
} from '../../../hooks/queries/useCompanies';
import { queryClient } from '../../../lib/queryClient';
import RejectionTab from './Rejectiontab';
import StatusSettings from './StatusSettings';
import EmailTemplates from './MailTemplate';
import type {
  InterviewAnswerType,
  InterviewGroup,
  InterviewQuestion,
  ChoiceItem,
} from '../../../services/companiesService';
import {
  normalizeChoices,
  normalizeChoicesToServer,
} from '../../../services/companiesService';
import ApplicantPagesSettings from './ApplicantsPagesTab';
import JobOffersTab from './JobOffersTab';
import ContractsTab from './ContractsTab';
import { useJobPositions } from '../../../hooks/queries';
import AiFeaturesTab from './AiFeaturesTab';

type QuestionItem = InterviewQuestion & { _id: string };

const uid = () => `q_${Math.random().toString(36).slice(2, 9)}`;

type CompanyShape = {
  _id: string;
  name?: string | { en?: string; ar?: string };
  interviewSettings?: {
    groups?: InterviewGroup[];
  };
  settings?: {
    _id?: string;
    company?: string;
    interviewSettings?: {
      groups?: InterviewGroup[];
    };
  };
};

const ANSWER_TYPES: InterviewAnswerType[] = [
  'text',
  'number',
  'radio',
  'checkbox',
  'dropdown',
  'tags',
];

const EMPTY_QUESTION: QuestionItem = {
  _id: uid(),
  question: '',
  score: 0,
  answerType: 'text',
  tags: [],
};

const choicePct = (choiceScore: number, questionScore: number) =>
  questionScore > 0 ? Math.round((choiceScore / questionScore) * 100) : 0;

const autoFixChoiceScores = (question: any): ChoiceItem[] => {
  const choices = Array.isArray(question?.choices)
    ? (question.choices as ChoiceItem[])
    : [];
  const questionScore = Number(question?.score) || 0;

  if (question?.answerType === 'checkbox' && questionScore > 0) {
    const sum = choices.reduce((s, c) => s + (Number(c.score) || 0), 0);
    if (sum > questionScore) {
      const scale = questionScore / sum;
      const fixed = choices.map((c) => ({
        ...c,
        score: Math.round((Number(c.score) || 0) * scale),
      }));
      const fixedSum = fixed.reduce((s, c) => s + (Number(c.score) || 0), 0);
      const diff = questionScore - fixedSum;
      if (fixed.length > 0) {
        const last = fixed[fixed.length - 1];
        fixed[fixed.length - 1] = {
          ...last,
          score: Math.max(0, (Number(last.score) || 0) + diff),
        };
      }
      return fixed;
    }
    return choices;
  }

  if (question?.answerType === 'dropdown' && questionScore > 0) {
    return choices.map((c) => {
      const score = Number(c.score) || 0;
      return score > questionScore ? { ...c, score: questionScore } : c;
    });
  }

  return choices;
};

const normalizeQuestion = (
  question: Partial<InterviewQuestion & { _id?: string }> | undefined
): QuestionItem => {
  const answerType =
    question?.answerType && ANSWER_TYPES.includes(question.answerType)
      ? question.answerType
      : 'text';

  const score = Number(question?.score);
  return {
    _id: question?._id ?? uid(),
    question: String(question?.question ?? ''),
    score: Number.isFinite(score) ? score : 0,
    answerType,
    choices: normalizeChoices((question as any)?.choices),
    tags: Array.isArray((question as any)?.tags)
      ? ((question as any).tags as any[])
          .map((tag) => String(tag ?? ''))
          .filter(Boolean)
      : [],
  };
};

const normalizeGroups = (
  groups: InterviewGroup[] | undefined | null
): InterviewGroup[] => {
  if (!Array.isArray(groups)) return [];

  return groups.map((group) => ({
    name: String(group?.name ?? ''),
    questions: Array.isArray(group?.questions)
      ? group.questions.map((question: any) => normalizeQuestion(question))
      : [],
  }));
};

const getCompanyName = (
  company: CompanyShape | undefined,
  locale?: string
): string => {
  if (!company) return '';
  const companyData = (company as any)?.companyId || company;
  if (typeof companyData.name === 'string') return companyData.name;
  if (locale === 'ar')
    return companyData.name?.ar || companyData.name?.en || '';
  return companyData.name?.en || companyData.name?.ar || '';
};

function SortableQuestionItem({
  question,
  canEdit,
  onUpdate,
  onRemove,
}: {
  question: any;
  questionIndex: number;
  groupIndex: number;
  canEdit: boolean;
  onUpdate: (patch: Partial<InterviewQuestion>) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const [scoreStr, setScoreStr] = useState(() => String(question.score ?? 0));
  useEffect(() => {
    setScoreStr(String(question.score ?? 0));
  }, [question.score]);
  const [addChoiceLabel, setAddChoiceLabel] = useState('');
  const [addChoiceScore, setAddChoiceScore] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    const existing = Array.isArray(question.tags) ? question.tags : [];
    if (!existing.includes(value)) {
      onUpdate({ tags: [...existing, value] });
    }
    setTagInput('');
  };

  const handleAddChoice = () => {
    const label = addChoiceLabel.trim();
    if (!label) return;
    const existing = Array.isArray(question.choices) ? question.choices : [];
    const pct = addChoiceScore === '' ? 0 : Number(addChoiceScore);
    const score = Math.round((pct / 100) * (Number(question.score) || 0));
    onUpdate({
      choices: [
        ...existing,
        { label, score: Number.isFinite(score) ? score : 0 },
      ],
    });
    setAddChoiceLabel('');
    setAddChoiceScore('');
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: question._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging
      ? 'none'
      : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-[auto_1fr_150px_130px_auto] ${
        isDragging
          ? 'border-brand-400 bg-white shadow-lg ring-2 ring-brand-500 dark:bg-slate-800'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex cursor-grab touch-none items-center justify-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300 ${focusRing}`}
      >
        <GripVertical className="size-4" />
      </div>

      <div>
        <input
          value={question.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          disabled={!canEdit}
          placeholder={t('interviewCompany.questionPlaceholder', 'settings')}
          aria-label={t('interviewCompany.dragOverlayQuestion', 'settings')}
          className={inputClass}
        />
      </div>

      <div>
        <select
          value={question.answerType}
          onChange={(e) =>
            onUpdate({ answerType: e.target.value as InterviewAnswerType })
          }
          disabled={!canEdit}
          aria-label={t('interviewCompany.dragOverlayType', 'settings')}
          className={selectClass}
        >
          {ANSWER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <input
          type="text"
          inputMode="numeric"
          value={scoreStr}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              setScoreStr('');
              return;
            }
            const num = Number(raw);
            if (Number.isFinite(num)) {
              setScoreStr(raw);
              onUpdate({ score: num });
            }
          }}
          onBlur={() => {
            if (scoreStr === '') {
              setScoreStr('0');
              onUpdate({ score: 0 });
            }
          }}
          disabled={!canEdit}
          aria-label={t('interviewCompany.dragOverlayScore', 'settings')}
          className={`${inputClass} tabular-nums`}
        />
      </div>

      <div className="flex items-end">
        <IconButton
          tone="danger"
          label={t('interviewCompany.remove', 'settings')}
          onClick={onRemove}
          disabled={!canEdit}
          className="size-10"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      {(question.answerType === 'radio' ||
        question.answerType === 'dropdown' ||
        question.answerType === 'checkbox') && (
        <div className="lg:col-span-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('interviewCompany.labelChoices', 'settings')}
          </label>
          <div className="space-y-2">
            {(Array.isArray(question.choices) ? question.choices : []).map(
              (c: ChoiceItem, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <input
                    type="text"
                    value={c.label}
                    onChange={(e) => {
                      const updated = [
                        ...(Array.isArray(question.choices)
                          ? question.choices
                          : []),
                      ];
                      updated[i] = { ...updated[i], label: e.target.value };
                      onUpdate({ choices: updated });
                    }}
                    disabled={!canEdit}
                    className="min-w-0 flex-1 truncate rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-200 dark:hover:border-slate-600"
                  />
                  <span className="w-10 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {choicePct(
                      Number(c.score) || 0,
                      Number(question.score) || 0
                    )}
                    %
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={choicePct(
                      Number(c.score) || 0,
                      Number(question.score) || 0
                    )}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      const updated = [
                        ...(Array.isArray(question.choices)
                          ? question.choices
                          : []),
                      ];
                      updated[i] = {
                        ...updated[i],
                        score: Math.round(
                          (pct / 100) * (Number(question.score) || 0)
                        ),
                      };
                      onUpdate({ choices: updated });
                    }}
                    disabled={!canEdit}
                    className="w-24 accent-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const existing = Array.isArray(question.choices)
                        ? question.choices
                        : [];
                      onUpdate({
                        choices: existing.filter(
                          (_: ChoiceItem, idx: number) => idx !== i
                        ),
                      });
                    }}
                    disabled={!canEdit}
                    className={`rounded p-1 text-slate-400 transition hover:text-rose-500 disabled:opacity-50 ${focusRing}`}
                    aria-label={t('interviewCompany.removeChoice', 'settings', {
                      value: c.label,
                    })}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={addChoiceLabel}
              onChange={(e) => setAddChoiceLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChoice();
                }
              }}
              disabled={!canEdit}
              placeholder={t('interviewCompany.choicesPlaceholder', 'settings')}
              className={`${inputClass} flex-1`}
            />
            <span className="w-10 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
              {addChoiceScore === '' ? 0 : Number(addChoiceScore)}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={addChoiceScore === '' ? 0 : Number(addChoiceScore)}
              onChange={(e) => setAddChoiceScore(e.target.value)}
              disabled={!canEdit}
              className="w-24 accent-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      )}

      <div className="lg:col-span-5">
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('interviewCompany.labelTags', 'settings')}
        </label>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900">
          {(Array.isArray(question.tags) ? question.tags : []).map(
            (tag: string, i: number) => (
              <span
                key={`${tag}_${i}`}
                className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => {
                    const existing = Array.isArray(question.tags)
                      ? question.tags
                      : [];
                    onUpdate({
                      tags: existing.filter(
                        (_: string, idx: number) => idx !== i
                      ),
                    });
                  }}
                  disabled={!canEdit}
                  className={`rounded text-brand-500 transition hover:text-rose-500 disabled:opacity-50 ${focusRing}`}
                  aria-label={t('interviewCompany.removeTag', 'settings', {
                    value: tag,
                  })}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            )
          )}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            onBlur={handleAddTag}
            disabled={!canEdit}
            placeholder={t('interviewCompany.tagsPlaceholder', 'settings')}
            className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
      </div>
    </div>
  );
}

function SortableGroupItem({
  group,
  groupIndex,
  canEdit,
  collapsedGroupIds,
  onToggleCollapse,
  onUpdateGroupName,
  onRemoveGroup,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  activeQuestionId,
  onQuestionDragStart,
  onQuestionDragEnd,
  onQuestionDragCancel,
  sensors,
  dropAnimation,
  t,
  isFlashing,
  onFlashDismiss,
}: {
  group: any;
  groupIndex: number;
  canEdit: boolean;
  collapsedGroupIds: Set<string>;
  onToggleCollapse: () => void;
  onUpdateGroupName: (name: string) => void;
  onRemoveGroup: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (
    questionIndex: number,
    patch: Partial<InterviewQuestion>
  ) => void;
  onRemoveQuestion: (questionIndex: number) => void;
  activeQuestionId: string | null;
  onQuestionDragStart: (event: DragStartEvent) => void;
  onQuestionDragEnd: (event: DragEndEvent) => void;
  onQuestionDragCancel: () => void;
  sensors: any;
  dropAnimation: any;
  t: (key: string, ...args: any[]) => string;
  isFlashing: boolean;
  onFlashDismiss: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: group._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging
      ? 'none'
      : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

  const isCollapsed = collapsedGroupIds.has(group._id);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const updateHeight = () => setContentHeight(el.scrollHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => {
        if (isFlashing) onFlashDismiss();
      }}
      className={`rounded-xl border ${
        isDragging
          ? 'border-brand-400 bg-white shadow-lg ring-2 ring-brand-500 dark:bg-slate-800'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      } ${isCollapsed ? 'overflow-hidden' : ''} ${
        isFlashing ? 'animate-flash-group' : ''
      }`}
    >
      <div className="flex items-center gap-3 rounded-t-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <div
          {...attributes}
          {...listeners}
          className={`flex cursor-grab touch-none items-center justify-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300 ${focusRing}`}
        >
          <GripVertical className="size-4" />
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          className={`flex w-full items-center gap-3 rounded-lg text-start ${focusRing}`}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4 shrink-0 text-slate-400 rtl:rotate-180" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0 flex-1">
            <input
              value={group.name}
              onChange={(e) => onUpdateGroupName(e.target.value)}
              disabled={!canEdit}
              placeholder={t(
                'interviewCompany.groupNamePlaceholder',
                'settings'
              )}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('interviewCompany.groupNamePlaceholder', 'settings')}
              className={inputClass}
            />
          </div>
          <span className="shrink-0 text-xs text-slate-400">
            {t('interviewCompany.questionCount', 'settings', {
              count: group.questions.length,
            })}
          </span>
        </button>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="size-4" />}
          onClick={onRemoveGroup}
          disabled={!canEdit}
        >
          {t('interviewCompany.remove', 'settings')}
        </Button>
      </div>

      <div
        style={{
          maxHeight: isCollapsed ? 0 : contentHeight,
          opacity: isCollapsed ? 0 : 1,
          overflow: isCollapsed ? 'hidden' : 'visible',
          transition:
            'max-height 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <div
          ref={contentRef}
          className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onQuestionDragStart}
            onDragEnd={onQuestionDragEnd}
            onDragCancel={onQuestionDragCancel}
          >
            <SortableContext
              items={group.questions.map((q: any) => q._id)}
              strategy={verticalListSortingStrategy}
            >
              {group.questions.map((question: any, questionIndex: number) => (
                <SortableQuestionItem
                  key={question._id}
                  question={question}
                  questionIndex={questionIndex}
                  groupIndex={groupIndex}
                  canEdit={canEdit}
                  onUpdate={(patch) => onUpdateQuestion(questionIndex, patch)}
                  onRemove={() => onRemoveQuestion(questionIndex)}
                />
              ))}
            </SortableContext>
            {activeQuestionId &&
              (() => {
                const found = group.questions?.find(
                  (q: any) => q._id === activeQuestionId
                );
                if (!found) return null;
                return createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-brand-400 bg-white p-3 shadow-xl dark:bg-slate-800 lg:grid-cols-[auto_1fr_150px_130px_auto]">
                      <div className="flex items-center justify-center">
                        <GripVertical className="size-4 text-brand-500" />
                      </div>
                      <div>
                        <div className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t(
                            'interviewCompany.dragOverlayQuestion',
                            'settings'
                          )}
                        </div>
                        <div className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-brand-700 dark:bg-slate-900 dark:text-slate-300">
                          {found.question ||
                            t('interviewCompany.emptyQuestion', 'settings')}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('interviewCompany.dragOverlayType', 'settings')}
                        </div>
                        <div className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-brand-700 dark:bg-slate-900 dark:text-slate-300">
                          {found.answerType}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('interviewCompany.dragOverlayScore', 'settings')}
                        </div>
                        <div className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-brand-700 dark:bg-slate-900 dark:text-slate-300">
                          {found.score}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <div className="inline-flex h-10 items-center rounded-lg bg-red-100 px-3 text-red-400 opacity-50 dark:bg-red-500/10">
                          <Trash2 className="size-4" />
                        </div>
                      </div>
                    </div>
                  </DragOverlay>,
                  document.body
                );
              })()}
          </DndContext>

          <Button
            size="sm"
            icon={<PlusCircle className="size-4" />}
            onClick={onAddQuestion}
            disabled={!canEdit}
          >
            {t('interviewCompany.addQuestion', 'settings')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InterviewCompanySettingsPage() {
  const { user, hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const { data: companies = [], isLoading: isCompaniesLoading } =
    useCompanies();

  const isSuperAdmin = !!user?.roleId?.name
    ?.toString()
    .toLowerCase()
    .includes('admin');

  const canRead =
    hasPermission('Company Management', 'read') ||
    hasPermission('Settings Management', 'read');
  const canEdit =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write') ||
    hasPermission('Settings Management', 'create');

  const { selectedCompanyId } = useCompanyFilter();
  const [groups, setGroups] = useState<(InterviewGroup & { _id: string })[]>(
    []
  );
  const effectiveCompanyId =
    selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;
  const selectedCompany = useMemo(
    () =>
      (companies as CompanyShape[]).find(
        (company) => company._id === effectiveCompanyId
      ),
    [companies, effectiveCompanyId]
  );

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [flashGroupIds, setFlashGroupIds] = useState<Set<string>>(new Set());
  const { data: jobPositions = [], isFetching: jobsFetching } = useJobPositions(
    effectiveCompanyId ? [effectiveCompanyId] : undefined,
    false,
    undefined,
    { enabled: !!effectiveCompanyId }
  ) as unknown as { data: any[]; isFetching: boolean };

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiJobTitle, setAiJobTitle] = useState('');
  const [aiJobDescription, setAiJobDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const draftInterviewQuestionsMutation = useDraftInterviewQuestionsWithAi();

  const getJobTitle = (jp: any) =>
    jp.title?.en || jp.title?.ar || jp.title || '';
  const getJobDescription = (jp: any) =>
    jp.description?.en || jp.description?.ar || jp.description || '';

  const filteredJobPositions = useMemo(() => {
    const q = aiJobTitle.trim().toLowerCase();
    if (!q) return jobPositions.slice(0, 8);
    return jobPositions
      .filter((jp) => getJobTitle(jp).toLowerCase().includes(q))
      .slice(0, 8);
  }, [jobPositions, aiJobTitle]);

  const handleGenerateWithAi = async () => {
    if (!effectiveCompanyId) return;
    if (!aiJobTitle.trim()) {
      Swal.fire(
        t('commonValidation', 'settings'),
        t('interviewCompany.aiValidationTitleRequired', 'settings'),
        'warning'
      );
      return;
    }

    try {
      const result = await draftInterviewQuestionsMutation.mutateAsync({
        companyId: effectiveCompanyId,
        jobTitle: aiJobTitle.trim(),
        jobDescription: aiJobDescription.trim() || undefined,
        prompt: aiPrompt.trim() || undefined,
      });

      const [normalized] = normalizeGroups([result]);
      const newGroup = { ...normalized, _id: uid() };

      setGroups((prev) => [newGroup, ...prev]);
      setFlashGroupIds((prev) => new Set(prev).add(newGroup._id));
      // deliberately NOT added to collapsedGroupIds — starts open for review
      setShowAiPanel(false);
      setAiJobTitle('');
      setAiJobDescription('');
      setAiPrompt('');
    } catch {
      // onError toast already handled by the mutation hook
    }
  };

  // Safety net: stop flashing a newly added group after a while even if the
  // user never hovers it.
  useEffect(() => {
    if (flashGroupIds.size === 0) return;
    const timer = window.setTimeout(() => {
      setFlashGroupIds(new Set());
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [flashGroupIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.4' } },
    }),
    duration: 200,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  };
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState<
    | 'interview-groups'
    | 'rejection-reasons'
    | 'lead-statuses'
    | 'email-templates'
    | 'applicant-pages'
    | 'job-offers'
    | 'contracts'
    | 'ai-features'
  >('interview-groups');

  const isInterviewGroupsTab = activeTab === 'interview-groups';
  const isRejectionTab = activeTab === 'rejection-reasons';
  const isApplicantStatusTab = activeTab === 'lead-statuses';
  const isEmailTemplatesTab = activeTab === 'email-templates';
  const isApplicantPagesTab = activeTab === 'applicant-pages';
  const isOffersTab = activeTab === 'job-offers';
  const isContractsTab = activeTab === 'contracts';
  const isAiFeaturesTab = activeTab === 'ai-features';

  const updateInterviewMutation = useUpdateCompanyInterviewSettings();

  const {
    data: interviewSettingsFromQuery,
    isLoading: isInterviewLoading,
    isFetching: isInterviewFetching,
  } = useCompanyInterviewSettings(effectiveCompanyId, {
    enabled: !!effectiveCompanyId && !isSuperAdmin,
  });

  // Fixed: Use correct precedence with parentheses
  const derivedInterviewSettings = isSuperAdmin
    ? ((selectedCompany as any)?.settings?.interviewSettings ??
      (selectedCompany as any)?.interviewSettings ??
      null)
    : interviewSettingsFromQuery;

  const isLoading = isSuperAdmin
    ? isCompaniesLoading
    : isInterviewLoading || isInterviewFetching;

  const hasInitializedCollapsed = useRef(false);

  useEffect(() => {
    const hasGroupsField =
      !!derivedInterviewSettings &&
      'groups' in (derivedInterviewSettings as any);
    if (!hasGroupsField) return;
    const normalized = normalizeGroups(
      (derivedInterviewSettings as any)?.groups
    );
    setGroups((prev) =>
      normalized.map((g, i) => ({
        ...g,
        _id: prev[i]?._id || uid(),
      }))
    );
  }, [derivedInterviewSettings]);

  useEffect(() => {
    if (groups.length > 0 && !hasInitializedCollapsed.current) {
      setCollapsedGroupIds(new Set(groups.map((g) => g._id)));
      hasInitializedCollapsed.current = true;
    }
  }, [groups]);

  const totalQuestions = useMemo(
    () => groups.reduce((acc, group) => acc + group.questions.length, 0),
    [groups]
  );

  const addGroup = () => {
    const newId = uid();
    setGroups((prev) => [
      {
        _id: newId,
        name: t('interviewCompany.defaultGroupName', 'settings', {
          number: prev.length + 1,
        }),
        questions: [{ ...EMPTY_QUESTION }],
      },
      ...prev,
    ]);
    setCollapsedGroupIds((prev) => new Set(prev).add(newId));
    setFlashGroupIds((prev) => new Set(prev).add(newId));
  };

  const removeGroup = (groupIndex: number) => {
    setGroups((prev) => prev.filter((_, index) => index !== groupIndex));
  };

  const updateGroupName = (groupIndex: number, name: string) => {
    setGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex ? { ...group, name } : group
      )
    );
  };

  const addQuestion = (groupIndex: number) => {
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index !== groupIndex) return group;
        return {
          ...group,
          questions: [...group.questions, { ...EMPTY_QUESTION }],
        };
      })
    );
  };

  const removeQuestion = (groupIndex: number, questionIndex: number) => {
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index !== groupIndex) return group;
        return {
          ...group,
          questions: group.questions.filter((_, idx) => idx !== questionIndex),
        };
      })
    );
  };

  const updateQuestion = (
    groupIndex: number,
    questionIndex: number,
    patch: Partial<InterviewQuestion>
  ) => {
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index !== groupIndex) return group;

        return {
          ...group,
          questions: group.questions.map((question, qIndex) =>
            qIndex === questionIndex ? { ...question, ...patch } : question
          ),
        };
      })
    );
  };
  const handleQuestionDragStart = useCallback((event: DragStartEvent) => {
    setActiveQuestionId(event.active.id as string);
  }, []);

  const handleQuestionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveQuestionId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setGroups((prev) =>
      prev.map((group) => {
        const qIds = group.questions.map((q: any) => q._id);
        const oldIndex = qIds.indexOf(activeId);
        const newIndex = qIds.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return group;
        return {
          ...group,
          questions: arrayMove(group.questions, oldIndex, newIndex),
        };
      })
    );
  }, []);

  const handleQuestionDragCancel = useCallback(() => {
    setActiveQuestionId(null);
  }, []);

  const handleGroupDragStart = useCallback((event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  }, []);

  const handleGroupDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroupId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setGroups((prev) => {
      const oldIndex = prev.findIndex((g) => g._id === activeId);
      const newIndex = prev.findIndex((g) => g._id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleGroupDragCancel = useCallback(() => {
    setActiveGroupId(null);
  }, []);

  const validateGroups = (): InterviewGroup[] | null => {
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      if (!group.name.trim()) {
        Swal.fire(
          t('commonValidation', 'settings'),
          t('interviewCompany.validationGroupMustHaveName', 'settings', {
            number: groupIndex + 1,
          }),
          'warning'
        );
        return null;
      }

      for (
        let questionIndex = 0;
        questionIndex < group.questions.length;
        questionIndex += 1
      ) {
        const question = group.questions[questionIndex];

        if (!question.question.trim()) {
          Swal.fire(
            t('commonValidation', 'settings'),
            t('interviewCompany.validationQuestionNotEmpty', 'settings', {
              qNumber: questionIndex + 1,
              gNumber: groupIndex + 1,
            }),
            'warning'
          );
          return null;
        }

        if (!Number.isFinite(question.score)) {
          Swal.fire(
            t('commonValidation', 'settings'),
            t('interviewCompany.validationQuestionNeedsScore', 'settings', {
              qNumber: questionIndex + 1,
              gNumber: groupIndex + 1,
            }),
            'warning'
          );
          return null;
        }

        if (
          (question.answerType === 'radio' ||
            question.answerType === 'dropdown' ||
            question.answerType === 'checkbox') &&
          (!Array.isArray(question.choices) || question.choices.length === 0)
        ) {
          Swal.fire(
            t('commonValidation', 'settings'),
            t('interviewCompany.validationChoiceRequired', 'settings', {
              qNumber: questionIndex + 1,
              gNumber: groupIndex + 1,
            }),
            'warning'
          );
          return null;
        }
        if (
          question.answerType === 'checkbox' &&
          Array.isArray(question.choices)
        ) {
          const sum = (question.choices as ChoiceItem[]).reduce(
            (s, c) => s + (Number(c.score) || 0),
            0
          );
          if (sum > Number(question.score)) {
            Swal.fire(
              t('commonValidation', 'settings'),
              t(
                'interviewCompany.validationCheckboxScoreExceeded',
                'settings',
                { qNumber: questionIndex + 1, gNumber: groupIndex + 1 }
              ),
              'warning'
            );
            return null;
          }
        }

        if (
          question.answerType === 'dropdown' &&
          Array.isArray(question.choices)
        ) {
          const exceeded = (question.choices as ChoiceItem[]).find(
            (c) => (Number(c.score) || 0) > Number(question.score)
          );
          if (exceeded) {
            Swal.fire(
              t('commonValidation', 'settings'),
              t(
                'interviewCompany.validationDropdownScoreExceeded',
                'settings',
                {
                  qNumber: questionIndex + 1,
                  gNumber: groupIndex + 1,
                  choice: exceeded.label,
                }
              ),
              'warning'
            );
            return null;
          }
        }
      }
    }

    return groups.map((group) => ({
      name: group.name.trim(),
      questions: group.questions.map((question: any) => ({
        question: question.question.trim(),
        score: Number(question.score),
        answerType: question.answerType,
        choices: autoFixChoiceScores(question),
        tags: Array.isArray(question.tags) ? question.tags : [],
      })),
    }));
  };

  const handleSaveAll = async () => {
    if (!effectiveCompanyId) {
      Swal.fire(
        t('commonValidation', 'settings'),
        t('interviewCompany.validationSelectCompany', 'settings'),
        'warning'
      );
      return;
    }

    const payloadGroups = validateGroups();
    if (!payloadGroups) return;

    const settingsId = selectedCompany?.settings?._id;

    if (!settingsId) {
      Swal.fire(
        t('commonValidation', 'settings'),
        t('interviewCompany.validationSettingsNotFound', 'settings'),
        'warning'
      );
      return;
    }

    setIsSaving(true);
    const optimisticGroups = payloadGroups.map((g, i) => ({
      ...g,
      _id: groups[i]?._id ?? uid(),
    }));
    setGroups(optimisticGroups);
    if (isSuperAdmin) {
      queryClient.setQueryData(companiesKeys.list(), (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((c: any) => {
            if (!c || c._id !== effectiveCompanyId) return c;
            return {
              ...c,
              interviewSettings: { groups: optimisticGroups },
              settings: {
                ...(c.settings ?? {}),
                interviewSettings: { groups: optimisticGroups },
              },
            };
          });
        }
        return old;
      });
    } else {
      queryClient.setQueryData(
        companiesKeys.interviewSettings(effectiveCompanyId),
        {
          groups: optimisticGroups,
        }
      );
    }

    try {
      const serverGroups = payloadGroups.map((g) => ({
        ...g,
        questions: g.questions.map((q) => ({
          ...q,
          choices: Array.isArray(q.choices)
            ? normalizeChoicesToServer(q.choices)
            : [],
        })),
      }));
      await updateInterviewMutation.mutateAsync({
        settingsId,
        companyId: effectiveCompanyId,
        data: { interviewSettings: { groups: serverGroups } } as any,
      });

    updateInterviewMutation.mutateAsync({
      settingsId,
      companyId: effectiveCompanyId,
      data: { interviewSettings: { groups: serverGroups } } as any,
    }).then(() => {
      Swal.fire({
        title: t('commonSaved', 'settings'),
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });
    }).catch((error: any) => {
      setGroups(prev => prev === optimisticGroups ? normalizeGroups(derivedInterviewSettings?.groups).map((g, i) => ({ ...g, _id: prev[i]?._id ?? uid() })) as (InterviewGroup & { _id: string })[] : prev);
      Swal.fire(
        t('interviewCompany.swalSaveFailed', 'settings'),
        error?.message || t('interviewCompany.swalSaveFailedMsg', 'settings'),
        'error'
      );
    }).finally(() => {
      setIsSaving(false);
    });
  } catch (error: any) {
      setGroups(prev => prev === optimisticGroups ? normalizeGroups(derivedInterviewSettings?.groups).map((g, i) => ({ ...g, _id: prev[i]?._id ?? uid() })) as (InterviewGroup & { _id: string })[] : prev);
      Swal.fire(
        t('interviewCompany.swalSaveFailed', 'settings'),
        error?.message || t('interviewCompany.swalSaveFailedMsg', 'settings'),
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!canRead) {
    return (
      <NoAccess
        title={t('interviewCompany.noPermissionTitle', 'settings')}
        text={t('interviewCompany.noPermissionDesc', 'settings')}
      />
    );
  }

  const tabs = [
    { value: 'interview-groups' as const, label: t('interviewCompany.tabInterviewGroups', 'settings'), icon: <ClipboardList className="size-4" /> },
    { value: 'rejection-reasons' as const, label: t('interviewCompany.tabRejectionReasons', 'settings'), icon: <Ban className="size-4" /> },
    { value: 'lead-statuses' as const, label: t('interviewCompany.tabStatuses', 'settings'), icon: <Settings className="size-4" /> },
    { value: 'email-templates' as const, label: t('interviewCompany.tabEmailTemplates', 'settings'), icon: <Mail className="size-4" /> },
    { value: 'applicant-pages' as const, label: t('interviewCompany.tabApplicantPages', 'settings'), icon: <Layout className="size-4" /> },
    { value: 'job-offers' as const, label: t('interviewCompany.tabOfferTemplates', 'settings'), icon: <FileText className="size-4" /> },
    { value: 'contracts' as const, label: t('interviewCompany.tabContractTemplates', 'settings'), icon: <FileText className="size-4" /> },
    { value: 'ai-features' as const, label: t('interviewCompany.tabAiFeatures', 'settings'), icon: <Sparkles className="size-4" /> },
  ];

  return (
    <PageShell
      title={t('interviewCompany.title', 'settings')}
      subtitle={t('interviewCompany.description', 'settings')}
      actions={
        isInterviewGroupsTab && (
          <Button
            variant="primary"
            icon={<Save className="size-4" />}
            loading={isSaving}
            disabled={isLoading || !canEdit}
            onClick={handleSaveAll}
          >
            {t('interviewCompany.saveAll', 'settings')}
          </Button>
        )
      }
    >
      <PageMeta
        title={t('interviewCompany.pageMetaTitle', 'settings')}
        description={t('interviewCompany.pageMetaDesc', 'settings')}
      />

      <Card>
        <TabBar
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel={t('interviewCompany.sectionTitle', 'settings')}
        />
        {isInterviewGroupsTab && (
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
            {[
              { label: t('interviewCompany.statCompany', 'settings'), value: getCompanyName(selectedCompany, locale) || t('interviewCompany.statNoCompany', 'settings') },
              { label: t('interviewCompany.statInterviewGroups', 'settings'), value: groups.length },
              { label: t('interviewCompany.statTotalQuestions', 'settings'), value: totalQuestions },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            ))}
            <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('interviewCompany.statSaveStatus', 'settings')}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CircleCheckBig className="size-4" />
                {t('interviewCompany.statReady', 'settings')}
              </p>
            </div>
          </div>
        )}
      </Card>

            <div key={activeTab} className="animate-fade-slide-in">
              {isInterviewGroupsTab ? (
                <Card>
                  <CardToolbar>
                    <div>
                      <SectionTitle icon={<ClipboardList className="size-4" />}>
                        {t('interviewCompany.interviewGroupsTitle', 'settings')}
                      </SectionTitle>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t('interviewCompany.interviewGroupsDesc', 'settings')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        icon={<Sparkles className="size-4" />}
                        onClick={() => setShowAiPanel((v) => !v)}
                        disabled={!canEdit}
                        aria-expanded={showAiPanel}
                      >
                        {t('interviewCompany.generateWithAi', 'settings')}
                      </Button>
                      <Button
                        variant="primary"
                        icon={<PlusCircle className="size-4" />}
                        onClick={addGroup}
                        disabled={!canEdit}
                      >
                        {t('interviewCompany.addGroup', 'settings')}
                      </Button>
                    </div>
                  </CardToolbar>
                  {showAiPanel && (
                    <div className="mx-4 mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
                      <div className="relative">
                        <input
                          value={aiJobTitle}
                          onChange={(e) => {
                            setAiJobTitle(e.target.value);
                            setAiDropdownOpen(true);
                          }}
                          onFocus={() => setAiDropdownOpen(true)}
                          onBlur={() => {
                            // slight delay so a click on a dropdown item registers before it unmounts
                            setTimeout(() => setAiDropdownOpen(false), 150);
                          }}
                          placeholder={t(
                            'interviewCompany.aiJobTitlePlaceholder',
                            'settings'
                          )}
                          aria-label={t('interviewCompany.aiJobTitlePlaceholder', 'settings')}
                          className={inputClass}
                        />
                        {aiDropdownOpen && aiJobTitle.trim() && (
                          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                            {jobsFetching ? (
                              <div className="px-3 py-2 text-sm text-slate-400">
                                {t(
                                  'interviewCompany.aiJobSearchLoading',
                                  'settings'
                                )}
                              </div>
                            ) : filteredJobPositions.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-slate-400">
                                {t(
                                  'interviewCompany.aiJobSearchNoResults',
                                  'settings'
                                )}
                              </div>
                            ) : (
                              filteredJobPositions.map((jp) => (
                                <button
                                  key={jp._id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't fire first
                                  onClick={() => {
                                    setAiJobTitle(getJobTitle(jp));
                                    setAiJobDescription(getJobDescription(jp));
                                    setAiDropdownOpen(false);
                                  }}
                                  className="block w-full px-3 py-2 text-start text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  {getJobTitle(jp)}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <textarea
                        value={aiJobDescription}
                        onChange={(e) => setAiJobDescription(e.target.value)}
                        placeholder={t(
                          'interviewCompany.aiJobDescriptionPlaceholder',
                          'settings'
                        )}
                        rows={2}
                        className={inputClass}
                      />
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={t(
                          'interviewCompany.aiPromptPlaceholder',
                          'settings'
                        )}
                        rows={2}
                        className={inputClass}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowAiPanel(false)}>
                          {t('interviewCompany.cancel', 'settings')}
                        </Button>
                        <Button
                          variant="primary"
                          icon={<Sparkles className="size-4" />}
                          loading={draftInterviewQuestionsMutation.isPending}
                          onClick={handleGenerateWithAi}
                        >
                          {t('interviewCompany.generate', 'settings')}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 p-4">
                    {isLoading && (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400" role="status">
                        <Loader2 className="size-4 animate-spin" />
                        {t('interviewCompany.loading', 'settings')}
                      </div>
                    )}

                    {!isLoading && groups.length === 0 && (
                      <EmptyState
                        icon={<ClipboardList className="size-6" />}
                        title={t('interviewCompany.emptyState', 'settings')}
                      />
                    )}

                    {groups.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleGroupDragStart}
                        onDragEnd={handleGroupDragEnd}
                        onDragCancel={handleGroupDragCancel}
                      >
                        <SortableContext
                          items={groups.map((g) => g._id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {groups.map((group, groupIndex) => (
                            <SortableGroupItem
                              key={group._id}
                              group={group}
                              groupIndex={groupIndex}
                              canEdit={canEdit}
                              collapsedGroupIds={collapsedGroupIds}
                              onToggleCollapse={() => {
                                setCollapsedGroupIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(group._id)) {
                                    next.delete(group._id);
                                  } else {
                                    next.add(group._id);
                                  }
                                  return next;
                                });
                              }}
                              onUpdateGroupName={(name) =>
                                updateGroupName(groupIndex, name)
                              }
                              onRemoveGroup={() => removeGroup(groupIndex)}
                              onAddQuestion={() => addQuestion(groupIndex)}
                              onUpdateQuestion={(questionIndex, patch) =>
                                updateQuestion(groupIndex, questionIndex, patch)
                              }
                              onRemoveQuestion={(questionIndex) =>
                                removeQuestion(groupIndex, questionIndex)
                              }
                              activeQuestionId={activeQuestionId}
                              onQuestionDragStart={handleQuestionDragStart}
                              onQuestionDragEnd={handleQuestionDragEnd}
                              onQuestionDragCancel={handleQuestionDragCancel}
                              sensors={sensors}
                              dropAnimation={dropAnimation}
                              t={t}
                              isFlashing={flashGroupIds.has(group._id)}
                              onFlashDismiss={() => {
                                setFlashGroupIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(group._id);
                                  return next;
                                });
                              }}
                            />
                          ))}
                        </SortableContext>
                        {activeGroupId &&
                          createPortal(
                            <DragOverlay dropAnimation={dropAnimation}>
                              <div className="flex items-center gap-3 rounded-xl border border-brand-400 bg-white px-4 py-3 shadow-xl dark:bg-slate-800">
                                <GripVertical className="size-4 shrink-0 text-brand-500" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">
                                    {groups.find((g) => g._id === activeGroupId)
                                      ?.name || ''}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs text-slate-400">
                                  {(() => {
                                    const g = groups.find(
                                      (g) => g._id === activeGroupId
                                    );
                                    return g
                                      ? t(
                                          'interviewCompany.questionCount',
                                          'settings',
                                          { count: g.questions.length }
                                        )
                                      : '';
                                  })()}
                                </span>
                              </div>
                            </DragOverlay>,
                            document.body
                          )}
                      </DndContext>
                    )}
                  </div>
                </Card>
              ) : isRejectionTab ? (
                <RejectionTab embedded />
              ) : isApplicantStatusTab ? (
                <StatusSettings embedded />
              ) : isEmailTemplatesTab ? (
                <EmailTemplates embedded />
              ) : isApplicantPagesTab ? (
                <ApplicantPagesSettings
                  companyId={effectiveCompanyId}
                  hideCompanySelector={true}
                  embedded
                />
              ) : isContractsTab ? (
                <ContractsTab
                  companyId={effectiveCompanyId!}
                  hideCompanySelector={true}
                  embedded
                />
              ) : isOffersTab ? (
                <JobOffersTab
                  companyId={effectiveCompanyId!}
                  hideCompanySelector={true}
                  embedded
                />
              ) : isAiFeaturesTab ? (
                <AiFeaturesTab embedded />
              ) : null}
            </div>
    </PageShell>
  );
}