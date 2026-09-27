import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import {
	ClipboardList,
	PlusCircle,
	Save,
	Trash2,
	CircleCheckBig,
	Loader2,
	X,
} from "lucide-react";
import Swal from "../../../utils/swal";
import PageMeta from "../../../components/common/PageMeta";
import {
	Button,
	Card,
	CardToolbar,
	EmptyState,
	PageShell,
	SectionTitle,
	focusRing,
	inputClass,
	selectClass,
	StatStrip,
} from "../../../components/ui/kit";
import {
	useDeleteSavedQuestionGroup,
	useSavedQuestionGroups,
	useUpdateSavedQuestionGroups,
} from "../../../hooks/queries";
import type {
	SavedQuestion,
	SavedQuestionAnswerType,
	SavedQuestionGroup,
} from "../../../services/usersService";
import { normalizeChoices } from "../../../types/companies";

const ANSWER_TYPES: SavedQuestionAnswerType[] = [
	"text",
	"number",
	"radio",
	"checkbox",
	"dropdown",
	"tags",
];

const choicePct = (choiceScore: number, questionScore: number) =>
	questionScore > 0 ? Math.round((choiceScore / questionScore) * 100) : 0;

const autoFixChoiceScores = (question: any): any[] => {
	const choices = Array.isArray(question?.choices) ? question.choices : [];
	const questionScore = Number(question?.score) || 0;

	if (question?.answerType === 'checkbox' && questionScore > 0) {
		const sum = choices.reduce((s: number, c: any) => s + (Number(c.score) || 0), 0);
		if (sum > questionScore) {
			const scale = questionScore / sum;
			const fixed = choices.map((c: any) => ({
				...c,
				score: Math.round((Number(c.score) || 0) * scale),
			}));
			const fixedSum = fixed.reduce((s: number, c: any) => s + (Number(c.score) || 0), 0);
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
		return choices.map((c: any) => {
			const score = Number(c.score) || 0;
			return score > questionScore ? { ...c, score: questionScore } : c;
		});
	}

	return choices;
};

const EMPTY_QUESTION: SavedQuestion = {
	question: "",
	score: 0,
	answerType: "text",
	tags: [],
};

const normalizeGroups = (
	groups: SavedQuestionGroup[] | undefined | null
): SavedQuestionGroup[] => {
	if (!Array.isArray(groups)) return [];

	return groups.map((group: any) => ({
		_id: typeof group?._id === "string" ? group._id : undefined,
		name: String(group?.name ?? ""),
		questions: Array.isArray(group?.questions)
			? group.questions.map((question: any) => {
				const answerType = ANSWER_TYPES.includes(question?.answerType)
					? question.answerType
					: "text";
				const score = Number(question?.score);
				return {
					question: String(question?.question ?? ""),
					score: Number.isFinite(score) ? score : 0,
					answerType,
				choices: Array.isArray(question?.choices)
					? normalizeChoices(question.choices)
					: [],
				tags: Array.isArray(question?.tags)
					? (question.tags as any[]).map((tag) => String(tag ?? '')).filter(Boolean)
					: [],
				};
			})
			: [],
	}));
};

export default function SavedQuestionsPage() {
	const { t } = useLocale();
	const {
		data: groupsFromApi,
		isLoading: isGroupsLoading,
		isFetching: isGroupsFetching,
	} = useSavedQuestionGroups();
	const updateGroupsMutation = useUpdateSavedQuestionGroups();
	const deleteGroupMutation = useDeleteSavedQuestionGroup();

	const [groups, setGroups] = useState<SavedQuestionGroup[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [choiceBuffers, setChoiceBuffers] = useState<Record<string, string>>({});
	const [scoreBuffers, setScoreBuffers] = useState<Record<string, string>>({});
	const [tagBuffers, setTagBuffers] = useState<Record<string, string>>({});

	const isLoading = isGroupsLoading || isGroupsFetching;

	useEffect(() => {
		setGroups(normalizeGroups(groupsFromApi));
	}, [groupsFromApi]);

	const totalQuestions = useMemo(
		() => groups.reduce((acc, group) => acc + group.questions.length, 0),
		[groups]
	);

	const addGroup = () => {
		setGroups((prev) => [
			...prev,
			{
				name: t('interviewPerUser.defaultGroupName', 'settings', { number: prev.length + 1 }),
				questions: [{ ...EMPTY_QUESTION }],
			},
		]);
	};

	const removeGroup = async (groupIndex: number) => {
		const groupToRemove = groups[groupIndex];
		if (!groupToRemove) return;

		setGroups((prev) => prev.filter((_, index) => index !== groupIndex));

		if (!groupToRemove._id) return;

		try {
			await deleteGroupMutation.mutateAsync(groupToRemove._id);
		} catch (error: any) {
			setGroups((prev) => {
				if (prev.some((group) => group._id === groupToRemove._id)) {
					return prev;
				}

				const restored = [...prev];
				const insertIndex = Math.min(groupIndex, restored.length);
				restored.splice(insertIndex, 0, groupToRemove);
				return restored;
			});

			Swal.fire(
				t('interviewPerUser.swalDeleteFailed', 'settings'),
				error?.message || t('interviewPerUser.swalDeleteFailedMsg', 'settings'),
				"error"
			);
		}
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
		patch: Partial<SavedQuestion>
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

	const validateGroups = (): SavedQuestionGroup[] | null => {
		for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
			const group = groups[groupIndex];
			if (!group.name.trim()) {
				Swal.fire(
					t('commonValidation', 'settings'),
					t('interviewPerUser.validationGroupMustHaveName', 'settings', { number: groupIndex + 1 }),
					"warning"
				);
				return null;
			}

			for (let questionIndex = 0; questionIndex < group.questions.length; questionIndex += 1) {
				const question = group.questions[questionIndex];

				if (!question.question.trim()) {
					Swal.fire(
						t('commonValidation', 'settings'),
						t('interviewPerUser.validationQuestionNotEmpty', 'settings', { qNumber: questionIndex + 1, gNumber: groupIndex + 1 }),
						"warning"
					);
					return null;
				}

				if (!Number.isFinite(question.score)) {
					Swal.fire(
						t('commonValidation', 'settings'),
						t('interviewPerUser.validationQuestionNeedsScore', 'settings', { qNumber: questionIndex + 1, gNumber: groupIndex + 1 }),
						"warning"
					);
					return null;
				}

				if (
					(question.answerType === 'radio' || question.answerType === 'dropdown' || question.answerType === 'checkbox') &&
					(!Array.isArray(question.choices) || question.choices.length === 0)
				) {
					Swal.fire(
						t('commonValidation', 'settings'),
						t('interviewPerUser.validationChoiceRequired', 'settings', { qNumber: questionIndex + 1, gNumber: groupIndex + 1 }),
						"warning"
					);
					return null;
				}
			}
		}

		return groups.map((group) => ({
			name: group.name.trim(),
			questions: group.questions.map((question) => ({
				question: question.question.trim(),
				score: Number(question.score),
				answerType: question.answerType,
			choices: autoFixChoiceScores(question),
			tags: Array.isArray(question.tags) ? question.tags : [],
			})),
		}));
	};

	const handleSaveAll = async () => {
		const payloadGroups = validateGroups();
		if (!payloadGroups) return;

		setIsSaving(true);
		// Optimistic: immediately update local state so the UI reflects changes
		setGroups(normalizeGroups(payloadGroups));

		try {
			updateGroupsMutation.mutateAsync(payloadGroups).catch(() => {
				setGroups(normalizeGroups(groupsFromApi));
			});

			Swal.fire({
				title: t('interviewPerUser.swalSaved', 'settings'),
				text: t('interviewPerUser.swalSavedText', 'settings'),
				icon: "success",
				timer: 1200,
				showConfirmButton: false,
			});
		} catch (error: any) {
			setGroups(normalizeGroups(groupsFromApi));
			Swal.fire(
				t('interviewPerUser.swalSaveFailed', 'settings'),
				error?.message || t('interviewPerUser.swalSaveFailedMsg', 'settings'),
				"error"
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<PageShell
			title={t('interviewPerUser.title', 'settings')}
			subtitle={t('interviewPerUser.description', 'settings')}
			actions={
				<Button variant="primary" icon={<Save className="size-4" />} loading={isSaving} disabled={isLoading} onClick={handleSaveAll}>
					{t('interviewPerUser.saveAll', 'settings')}
				</Button>
			}
		>
			<PageMeta
				title={t('interviewPerUser.pageMetaTitle', 'settings')}
				description={t('interviewPerUser.pageMetaDesc', 'settings')}
			/>

			<Card>
				<StatStrip
					stats={[
						{ label: t('interviewPerUser.statQuestionGroups', 'settings'), value: groups.length },
						{ label: t('interviewPerUser.statTotalQuestions', 'settings'), value: totalQuestions },
						{
							label: t('interviewPerUser.statSaveStatus', 'settings'),
							value: (
								<>
									<CircleCheckBig className="size-4" /> {t('interviewPerUser.statReady', 'settings')}
								</>
							),
							tone: 'success',
						},
					]}
				/>
			</Card>

				<Card>
					<CardToolbar>
						<div>
							<SectionTitle icon={<ClipboardList className="size-4" />}>{t('interviewPerUser.groupsSectionTitle', 'settings')}</SectionTitle>
							<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('interviewPerUser.groupsSectionDesc', 'settings')}</p>
						</div>
						<Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={addGroup} disabled={isLoading}>
							{t('interviewPerUser.addGroup', 'settings')}
						</Button>
					</CardToolbar>

					<div className="space-y-4 p-4">
						{isLoading && (
							<div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
								<Loader2 className="size-4 animate-spin" />
								{t('interviewPerUser.loading', 'settings')}
							</div>
						)}

						{!isLoading && groups.length === 0 && (
							<EmptyState icon={<ClipboardList className="size-6" />} title={t('interviewPerUser.emptyState', 'settings')} />
						)}

						{groups.map((group, groupIndex) => (
							<div
								key={`${group.name}-${groupIndex}`}
								className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/30"
							>
								<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex-1">
										<label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
											{t('interviewPerUser.labelGroupName', 'settings')}
										</label>
										<input
											value={group.name}
											onChange={(e) => updateGroupName(groupIndex, e.target.value)}
											placeholder={t('interviewPerUser.groupNamePlaceholder', 'settings')}
											className={inputClass}
										/>
									</div>

									<button
										type="button"
										onClick={() => removeGroup(groupIndex)}
										className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
									>
										<Trash2 className="size-4" /> {t('interviewPerUser.removeGroup', 'settings')}
									</button>
								</div>

								<div className="space-y-3">
									{group.questions.map((question, questionIndex) => (
										<div
											key={`${groupIndex}-${questionIndex}`}
											className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[1fr_170px_120px_auto]"
										>
											<div>
												<label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
													{t('interviewPerUser.labelQuestion', 'settings')}
												</label>
												<input
													value={question.question}
													onChange={(e) =>
														updateQuestion(groupIndex, questionIndex, {
															question: e.target.value,
														})
													}
													placeholder={t('interviewPerUser.questionPlaceholder', 'settings')}
													className={inputClass}
												/>
											</div>

											<div>
												<label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
													{t('interviewPerUser.labelAnswerType', 'settings')}
												</label>
												<select
													value={question.answerType}
													onChange={(e) =>
														updateQuestion(groupIndex, questionIndex, {
																answerType: e.target.value as SavedQuestionAnswerType,
														})
													}
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
												<label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
													{t('interviewPerUser.labelScore', 'settings')}
												</label>
												<input
													type="text"
													inputMode="numeric"
													value={scoreBuffers[`${groupIndex}_${questionIndex}`] ?? String(question.score ?? 0)}
													onChange={(e) => {
														const key = `${groupIndex}_${questionIndex}`;
														const raw = e.target.value;
														if (raw === '') {
															setScoreBuffers((prev) => ({ ...prev, [key]: '' }));
															return;
														}
														const num = Number(raw);
														if (Number.isFinite(num)) {
															setScoreBuffers((prev) => ({ ...prev, [key]: raw }));
															updateQuestion(groupIndex, questionIndex, {
																score: num,
															});
														}
													}}
													onBlur={() => {
														const key = `${groupIndex}_${questionIndex}`;
														if ((scoreBuffers[key] ?? '') === '') {
															setScoreBuffers((prev) => ({ ...prev, [key]: '0' }));
															updateQuestion(groupIndex, questionIndex, { score: 0 });
														}
													}}
													className={inputClass}
												/>
											</div>

											<div className="flex items-end">
												<button
													type="button"
													onClick={() => removeQuestion(groupIndex, questionIndex)}
													className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
												>
													<Trash2 className="size-4" /> {t('interviewPerUser.remove', 'settings')}
												</button>
											</div>

											{(question.answerType === 'radio' || question.answerType === 'dropdown' || question.answerType === 'checkbox') && (
												<div className="lg:col-span-4">
													<label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
														{t('interviewPerUser.labelChoices', 'settings')}
													</label>
													<div className="space-y-2">
														{(Array.isArray(question.choices) ? question.choices : []).map((c: any, i: number) => {
															const label = String(c?.label ?? c ?? '');
															if (!label) return null;
															return (
																<div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
																	<span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{label}</span>
																	<span className="w-10 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
																		{choicePct(Number(c?.score) || 0, Number(question.score) || 0)}%
																	</span>
																	<input
																		type="range"
																		min={0}
																		max={100}
																		value={choicePct(Number(c?.score) || 0, Number(question.score) || 0)}
																		onChange={(e) => {
																			const pct = Number(e.target.value);
																			const updated = [...(Array.isArray(question.choices) ? question.choices : [])];
																			updated[i] = { ...updated[i], score: Math.round((pct / 100) * (Number(question.score) || 0)) };
																			updateQuestion(groupIndex, questionIndex, { choices: updated });
																		}}
																		className="w-24 accent-brand-500"
																	/>
																	<button
																		type="button"
																		onClick={() => {
																			const existing = Array.isArray(question.choices) ? question.choices : [];
																			const next = existing.filter((_: any, idx: number) => idx !== i);
																			updateQuestion(groupIndex, questionIndex, { choices: next });
																		}}
																		className={`rounded p-1 text-slate-400 transition hover:text-rose-500 ${focusRing}`}
																		aria-label={t('interviewPerUser.removeChoice', 'settings', { value: label })}
																	>
																		<X className="size-3.5" />
																	</button>
																</div>
															);
														})}
													</div>
													<div className="mt-2 flex items-center gap-2">
														<input
															type="text"
															value={choiceBuffers[`${groupIndex}_${questionIndex}`] ?? ''}
															onChange={(e) => setChoiceBuffers((prev) => ({ ...prev, [`${groupIndex}_${questionIndex}`]: e.target.value }))}
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	e.preventDefault();
																	const key = `${groupIndex}_${questionIndex}`;
																	const buf = (choiceBuffers[key] ?? '').trim();
																	if (!buf) return;
																	const existing = Array.isArray(question.choices) ? question.choices : [];
																	const scoreKey = `${groupIndex}_${questionIndex}_new`;
																	const rawScore = scoreBuffers[scoreKey] ?? '';
																	const score = rawScore === '' ? 0 : Number(rawScore);
																	const next = [...existing, { label: buf, score: Number.isFinite(score) ? score : 0 }];
																	updateQuestion(groupIndex, questionIndex, { choices: next });
																	setChoiceBuffers((prev) => ({ ...prev, [key]: '' }));
																	setScoreBuffers((prev) => ({ ...prev, [scoreKey]: '' }));
																}
															}}
															placeholder={t('interviewPerUser.choicePlaceholder', 'settings')}
															className={`${inputClass} flex-1`}
														/>
														<input
															type="text"
															inputMode="numeric"
															value={scoreBuffers[`${groupIndex}_${questionIndex}_new`] ?? ''}
															onChange={(e) => {
																const key = `${groupIndex}_${questionIndex}_new`;
																setScoreBuffers((prev) => ({ ...prev, [key]: e.target.value }));
															}}
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	e.preventDefault();
																	const key = `${groupIndex}_${questionIndex}`;
																	const buf = (choiceBuffers[key] ?? '').trim();
																	if (!buf) return;
																	const existing = Array.isArray(question.choices) ? question.choices : [];
																	const scoreKey = `${groupIndex}_${questionIndex}_new`;
																	const rawScore = scoreBuffers[scoreKey] ?? '';
																	const score = rawScore === '' ? 0 : Number(rawScore);
																	const next = [...existing, { label: buf, score: Number.isFinite(score) ? score : 0 }];
																	updateQuestion(groupIndex, questionIndex, { choices: next });
																	setChoiceBuffers((prev) => ({ ...prev, [key]: '' }));
																	setScoreBuffers((prev) => ({ ...prev, [scoreKey]: '' }));
																}
															}}
															placeholder={t('interviewPerUser.labelScore', 'settings')}
															aria-label={t('interviewPerUser.labelScore', 'settings')}
															className={`${inputClass} w-20 text-center tabular-nums`}
														/>
													</div>
												</div>
											)}

											<div className="lg:col-span-4">
												<label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
													{t('interviewPerUser.labelTags', 'settings')}
												</label>
												<div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900">
													{(Array.isArray(question.tags) ? question.tags : []).map((tag: string, i: number) => (
														<span
															key={`${tag}_${i}`}
															className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
														>
															{tag}
															<button
																type="button"
																onClick={() => {
																	const existing = Array.isArray(question.tags) ? question.tags : [];
																	const next = existing.filter((_: string, idx: number) => idx !== i);
																	updateQuestion(groupIndex, questionIndex, { tags: next });
																}}
																className={`rounded text-brand-500 transition hover:text-rose-500 ${focusRing}`}
																aria-label={t('interviewPerUser.removeTag', 'settings', { value: tag })}
															>
																<X className="size-3.5" />
															</button>
														</span>
													))}
													<input
														type="text"
														value={tagBuffers[`${groupIndex}_${questionIndex}`] ?? ''}
														onChange={(e) => setTagBuffers((prev) => ({ ...prev, [`${groupIndex}_${questionIndex}`]: e.target.value }))}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																const key = `${groupIndex}_${questionIndex}`;
																const value = (tagBuffers[key] ?? '').trim();
																if (!value) return;
																const existing = Array.isArray(question.tags) ? question.tags : [];
																if (!existing.includes(value)) {
																	updateQuestion(groupIndex, questionIndex, { tags: [...existing, value] });
																}
																setTagBuffers((prev) => ({ ...prev, [key]: '' }));
															}
														}}
														onBlur={() => {
															const key = `${groupIndex}_${questionIndex}`;
															const value = (tagBuffers[key] ?? '').trim();
															if (!value) return;
															const existing = Array.isArray(question.tags) ? question.tags : [];
															if (!existing.includes(value)) {
																updateQuestion(groupIndex, questionIndex, { tags: [...existing, value] });
															}
															setTagBuffers((prev) => ({ ...prev, [key]: '' }));
														}}
														placeholder={t('interviewPerUser.tagsPlaceholder', 'settings')}
														className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:ring-0"
													/>
												</div>
											</div>
										</div>
									))}

									<Button size="sm" icon={<PlusCircle className="size-4" />} onClick={() => addQuestion(groupIndex)}>
										{t('interviewPerUser.addQuestion', 'settings')}
									</Button>
								</div>
							</div>
						))}
					</div>
				</Card>
		</PageShell>
	);
}
