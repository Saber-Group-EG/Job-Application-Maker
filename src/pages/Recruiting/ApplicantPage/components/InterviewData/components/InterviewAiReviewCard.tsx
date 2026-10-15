import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Mic, Sparkles, Trash2, Upload } from 'lucide-react';
import Swal from '../../../../../../utils/swal';
import { useLocale } from '../../../../../../context/LocaleContext';
import { applicantsService } from '../../../../../../services/applicantsService';
import { getErrorMessage } from '../../../../../../utils/errorHandler';
import {
  interviewRecordingKeys,
  useApplyInterviewReview,
  useDeleteInterviewRecording,
  useInterviewRecording,
  useRunInterviewReview,
  useSaveRecordingTranscript,
} from '../../../../../../hooks/queries/useInterviewRecording';
import { useQueryClient } from '@tanstack/react-query';
import type { InterviewAnswer } from '../../../../../../types/applicants';
import type { ApplyOverrides, ExtraQuestion, ReviewItem } from '../../../../../../types/interviewRecording';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const measureDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const fallback = Math.max(1, Math.round(file.size / 12000));
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : fallback);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(fallback);
      };
      audio.src = url;
    } catch {
      resolve(fallback);
    }
  });

const isEmptyAnswer = (q?: InterviewAnswer) => !String(q?.notes ?? '').trim() && !Number(q?.achievedScore || 0);

const confidenceClass: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-red-50 text-red-700',
};

type TFn = ReturnType<typeof useLocale>['t'];
type ItemEdit = { score?: number; notes?: string };
type ExtraEdit = { question?: string; score?: number; notes?: string };

const fieldClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500';

const clampScore = (raw: string, max: number): number | undefined =>
  raw === '' ? undefined : Math.max(0, Math.min(max, Math.round(Number(raw)) || 0));

/** A suggestion for one of the interview's own questions. Score and note are editable. */
const SheetItemRow = ({
  item, question, checked, onToggle, edit, onEdit, t,
}: {
  item: ReviewItem;
  question?: InterviewAnswer;
  checked: boolean;
  onToggle: () => void;
  edit?: ItemEdit;
  onEdit: (patch: ItemEdit) => void;
  t: TFn;
}) => {
  const max = Number(question?.score || 0);
  const type = question?.answerType || 'text';
  // A typed note only fits free-text answers; choice answers keep the chosen choice.
  const noteEditable = type === 'text' || type === 'number';
  const aiScore = item.proposed.achievedScore ?? item.suggestedScore;
  const hasEdit = edit?.score !== undefined || edit?.notes !== undefined;
  const canApply = (item.covered && (item.proposed.notes !== null || item.proposed.achievedScore !== null)) || hasEdit;
  const currentNotes = String(question?.notes ?? '').trim();
  const noteValue = edit?.notes ?? (item.covered ? item.proposed.notes ?? item.answerSummary : '');
  return (
    <li className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          disabled={!canApply}
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 accent-purple-600"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-gray-800" dir="auto">
            {item.questionIndex + 1}. {item.questionText}
          </p>
          {!item.covered && <p className="text-xs italic text-gray-400">{t('recNotCovered', 'interview')}</p>}
          {item.covered && !noteEditable && (
            <p className="whitespace-pre-wrap text-sm text-gray-700" dir="auto">{item.answerSummary}</p>
          )}
          {noteEditable && (
            <textarea
              value={noteValue ?? ''}
              onChange={(e) => onEdit({ notes: e.target.value })}
              rows={2}
              dir="auto"
              placeholder={t('recYourNote', 'interview')}
              className={fieldClass}
            />
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1.5 text-gray-600">
              {t('recYourScore', 'interview')}
              <input
                type="number"
                min={0}
                max={max}
                step={1}
                value={edit?.score ?? aiScore ?? ''}
                onChange={(e) => onEdit({ score: clampScore(e.target.value, max) })}
                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none"
              />
              / {max}
            </label>
            {item.covered && aiScore !== null && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 font-semibold text-purple-700">
                {t('recAiSuggested', 'interview')}: {aiScore}
              </span>
            )}
            {item.covered && (
              <span className={`rounded-full px-2 py-0.5 font-medium ${confidenceClass[item.confidence]}`}>
                {t(`recConfidence_${item.confidence}`, 'interview')}
              </span>
            )}
          </div>
          {item.covered && item.evidence && (
            <p className="border-s-2 border-gray-200 ps-2 text-xs italic text-gray-500" dir="auto">{item.evidence}</p>
          )}
          {!isEmptyAnswer(question) && (
            <p className="text-xs text-amber-700" dir="auto">
              {t('recCurrent', 'interview')}: {currentNotes || '—'} ({Number(question?.achievedScore || 0)}/{max})
            </p>
          )}
        </div>
      </div>
    </li>
  );
};

/** A question found in the recording that is not on the sheet. Wording, note and score are editable. */
const ExtraItemRow = ({
  extra, added, checked, onToggle, edit, onEdit, t,
}: {
  extra: ExtraQuestion;
  added: boolean;
  checked: boolean;
  onToggle: () => void;
  edit?: ExtraEdit;
  onEdit: (patch: ExtraEdit) => void;
  t: TFn;
}) => (
  <li className="rounded-lg border border-gray-100 p-3">
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        disabled={added}
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 accent-purple-600"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <input
          value={edit?.question ?? extra.question}
          onChange={(e) => onEdit({ question: e.target.value })}
          disabled={added}
          dir="auto"
          className={`${fieldClass} font-medium`}
        />
        <textarea
          value={edit?.notes ?? extra.answerSummary}
          onChange={(e) => onEdit({ notes: e.target.value })}
          disabled={added}
          rows={2}
          dir="auto"
          placeholder={t('recYourNote', 'interview')}
          className={fieldClass}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1.5 text-gray-600">
            {t('recYourScore', 'interview')}
            <input
              type="number"
              min={0}
              max={extra.maxScore}
              step={1}
              disabled={added}
              value={edit?.score ?? extra.suggestedScore}
              onChange={(e) => onEdit({ score: clampScore(e.target.value, extra.maxScore) })}
              className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-purple-500 focus:outline-none"
            />
            / {extra.maxScore}
          </label>
          <span className="rounded-full bg-purple-50 px-2 py-0.5 font-semibold text-purple-700">
            {t('recAiSuggested', 'interview')}: {extra.suggestedScore}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${confidenceClass[extra.confidence]}`}>
            {t(`recConfidence_${extra.confidence}`, 'interview')}
          </span>
          {added && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              {t('recAddedToInterview', 'interview')}
            </span>
          )}
        </div>
        {extra.evidence && (
          <p className="border-s-2 border-gray-200 ps-2 text-xs italic text-gray-500" dir="auto">{extra.evidence}</p>
        )}
      </div>
    </div>
  </li>
);

// Merge one field change into the per-question edits; an emptied edit is removed.
function patchEdit<T extends object>(prev: Record<number, T>, index: number, patch: Partial<T>): Record<number, T> {
  const merged = { ...(prev[index] ?? {}), ...patch } as Record<string, unknown>;
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);
  const next = { ...prev };
  if (Object.keys(merged).length) next[index] = merged as T;
  else delete next[index];
  return next;
}

type Props = {
  applicantId: string;
  interviewId: string;
  questions: InterviewAnswer[];
  /** Just ended a recorded interview: analyse as soon as the transcript is ready, without a click. */
  autoAnalyze?: boolean;
};

/**
 * AI review of a finished interview: the transcript of its recording, and
 * suggested answers/scores for the interview's own questions. Nothing is
 * written to the interview until the interviewer ticks suggestions and applies.
 */
export const InterviewAiReviewCard = ({ applicantId, interviewId, questions, autoAnalyze = false }: Props) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { data: rec, isLoading } = useInterviewRecording(applicantId, interviewId);
  const saveTranscript = useSaveRecordingTranscript(applicantId, interviewId);
  const runReview = useRunInterviewReview(applicantId, interviewId);
  const applyReview = useApplyInterviewReview(applicantId, interviewId);
  const deleteRecording = useDeleteInterviewRecording(applicantId, interviewId);

  const [draft, setDraft] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedExtra, setSelectedExtra] = useState<Set<number>>(new Set());
  // The interviewer's own changes on top of the AI's suggestions (sent with Apply).
  const [edits, setEdits] = useState<Record<number, ItemEdit>>({});
  const [extraEdits, setExtraEdits] = useState<Record<number, ExtraEdit>>({});
  const [interviewNote, setInterviewNote] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const transcript = rec?.transcript ?? '';
  useEffect(() => setDraft(transcript), [transcript]);

  const review = rec?.review;
  const items = review?.status === 'ready' ? review.items : [];

  // Pre-tick suggestions for questions that have no answer yet, so nothing the
  // interviewer already wrote is overwritten by default.
  useEffect(() => {
    if (!items.length) {
      setSelected(new Set());
      return;
    }
    setSelected(
      new Set(
        items
          .filter((i) => i.covered && (i.proposed.notes !== null || i.proposed.achievedScore !== null) && isEmptyAnswer(questions[i.questionIndex]))
          .map((i) => i.questionIndex)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.generatedAt]);

  // With no prepared sheet the recording IS the interview: tick every question found in it.
  // With a sheet, extra questions are optional, so nothing is ticked by default.
  useEffect(() => {
    const applied = new Set(review?.appliedExtra ?? []);
    setSelectedExtra(
      new Set(
        questions.length === 0
          ? (review?.extraQuestions ?? []).map((_, i) => i).filter((i) => !applied.has(i))
          : []
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.generatedAt]);

  // After a recorded interview the results appear by themselves: wait for the
  // transcription to finish, then analyse once.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoAnalyze || autoStartedRef.current || isLoading || !rec) return;
    if (rec.processing || !transcript) return;
    autoStartedRef.current = true;
    if (rec.review.status === 'ready') return;
    runReview.mutateAsync().catch((err) => setError(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, isLoading, rec?.processing, transcript, rec?.review.status]);

  // A new analysis starts from the AI's suggestions again.
  useEffect(() => {
    setEdits({});
    setExtraEdits({});
    setInterviewNote('');
  }, [review?.generatedAt]);

  const failedPieces = useMemo(() => rec?.segments.filter((s) => s.status === 'failed') ?? [], [rec?.segments]);
  const hasSegments = (rec?.segments.length ?? 0) > 0;
  const consentOk = Boolean(rec?.consent.given) || consent;

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t('recFileTooLarge', 'interview'));
      return;
    }
    setUploading(true);
    try {
      const nextIndex = rec?.segments.length ? Math.max(...rec.segments.map((s) => s.index)) + 1 : 0;
      await applicantsService.uploadRecordingPiece(applicantId, interviewId, file, {
        index: nextIndex,
        durationSec: await measureDuration(file),
        consent: true,
      });
      await queryClient.invalidateQueries({ queryKey: interviewRecordingKeys.detail(applicantId, interviewId) });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleSaveTranscript = async () => {
    setError('');
    try {
      await saveTranscript.mutateAsync(draft);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleAnalyze = async () => {
    setError('');
    try {
      await runReview.mutateAsync();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: t('recDeleteConfirmTitle', 'interview'),
      text: t('recDeleteConfirmText', 'interview'),
      showCancelButton: true,
      confirmButtonText: t('recDelete', 'interview'),
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;
    try {
      await deleteRecording.mutateAsync();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleApply = async () => {
    const indexes = [...selected];
    const extraIndexes = [...selectedExtra];
    const note = interviewNote.trim();
    if (!indexes.length && !extraIndexes.length && !note) return;
    // Only what the interviewer changed is sent; the rest stays as the AI suggested.
    const overrides: ApplyOverrides = {};
    const own = Object.fromEntries(indexes.filter((i) => edits[i]).map((i) => [i, edits[i]]));
    const ownExtra = Object.fromEntries(extraIndexes.filter((i) => extraEdits[i]).map((i) => [i, extraEdits[i]]));
    if (Object.keys(own).length) overrides.questions = own;
    if (Object.keys(ownExtra).length) overrides.extra = ownExtra;
    if (note) overrides.interviewNote = note;
    const confirm = await Swal.fire({
      icon: 'question',
      title: t('recApplyConfirmTitle', 'interview', { count: indexes.length + extraIndexes.length + (note ? 1 : 0) }),
      text: t('recApplyConfirmText', 'interview'),
      showCancelButton: true,
      confirmButtonText: t('recApply', 'interview'),
      cancelButtonText: t('cancel', 'common'),
    });
    if (!confirm.isConfirmed) return;
    try {
      const result = await applyReview.mutateAsync({ questionIndexes: indexes, extraIndexes, overrides });
      await Swal.fire({
        icon: result.applied ? 'success' : 'info',
        title: result.applied || !result.noteSaved ? t('recApplied', 'interview', { count: result.applied }) : t('recNoteSaved', 'interview'),
        text: result.skipped ? t('recAppliedSkipped', 'interview', { count: result.skipped }) : undefined,
        timer: result.skipped ? undefined : 2000,
        showConfirmButton: Boolean(result.skipped),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Changing a score or note ticks the item: the interviewer clearly wants it applied.
  const editItem = (index: number, patch: ItemEdit) => {
    setEdits((prev) => patchEdit(prev, index, patch));
    if (Object.values(patch).some((v) => v !== undefined)) setSelected((prev) => new Set(prev).add(index));
  };
  const editExtra = (index: number, patch: ExtraEdit) => {
    setExtraEdits((prev) => patchEdit(prev, index, patch));
    if (Object.values(patch).some((v) => v !== undefined)) setSelectedExtra((prev) => new Set(prev).add(index));
  };

  const toggleExtra = (index: number) =>
    setSelectedExtra((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const card = 'rounded-xl border border-gray-100 bg-white p-5';
  const button =
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-gray-800">{t('recReviewTitle', 'interview')}</h2>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-700">
            {t('recBeta', 'interview')}
          </span>
        </div>
        {hasSegments && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteRecording.isPending}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('recDelete', 'interview')}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('loading', 'common')}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('recReviewIntro', 'interview')}</p>
          {rec && !rec.transcriptionConfigured && (
            <p className="text-xs text-amber-700">{t('recNotConfigured', 'interview')}</p>
          )}

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* Upload a recording made elsewhere (e.g. a Meet/Zoom recording) */}
          {!hasSegments && rec?.transcriptionConfigured !== false && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <Mic className="h-4 w-4 text-gray-400" />
                {t('recUploadTitle', 'interview')}
              </p>
              <p className="mt-1 text-xs text-gray-500">{t('recUploadHint', 'interview')}</p>
              {!rec?.consent.given && (
                <label className="mt-3 flex items-start gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-purple-600"
                  />
                  <span>{t('recConsentCheck', 'interview')}</span>
                </label>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="audio/*,video/webm,video/mp4,.m4a,.mp3,.wav,.webm,.ogg"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={!consentOk || uploading}
                onClick={() => fileInput.current?.click()}
                className={`${button} mt-3 bg-purple-600 text-white hover:bg-purple-700`}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? t('recUploading', 'interview') : t('recUploadChoose', 'interview')}
              </button>
            </div>
          )}

          {rec?.processing && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('recTranscribing', 'interview', { count: rec.segments.filter((s) => s.status === 'processing').length })}
            </p>
          )}
          {failedPieces.length > 0 && (
            <p className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {t('recPiecesFailed', 'interview', { count: failedPieces.length })}: {failedPieces[0].error}
            </p>
          )}

          {/* No transcript yet (nothing recorded, or transcription failed): paste one made elsewhere */}
          {!transcript && !rec?.processing && (
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-800">{t('recPasteTitle', 'interview')}</p>
              <p className="mt-1 text-xs text-gray-500">{t('recPasteHint', 'interview')}</p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                dir="auto"
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleSaveTranscript}
                disabled={draft.trim().length < 20 || saveTranscript.isPending}
                className={`${button} mt-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
              >
                {t('recSaveTranscript', 'interview')}
              </button>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="rounded-lg border border-gray-100">
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-800"
              >
                <span>{t('recTranscriptTitle', 'interview')}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
              </button>
              {showTranscript && (
                <div className="space-y-2 border-t border-gray-100 p-4">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={10}
                    dir="auto"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTranscript}
                    disabled={draft === transcript || saveTranscript.isPending}
                    className={`${button} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}
                  >
                    {t('recSaveTranscript', 'interview')}
                  </button>
                </div>
              )}
            </div>
          )}

          {transcript && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={runReview.isPending || rec?.processing || draft !== transcript}
                className={`${button} bg-purple-600 text-white hover:bg-purple-700`}
              >
                {runReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {runReview.isPending
                  ? t('recAnalyzing', 'interview')
                  : review?.status === 'ready'
                    ? t('recRerun', 'interview')
                    : t('recAnalyze', 'interview')}
              </button>
              {draft !== transcript && <span className="text-xs text-amber-600">{t('recSaveFirst', 'interview')}</span>}
            </div>
          )}

          {/* Review */}
          {review?.status === 'ready' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              {review.summary && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('recSummary', 'interview')}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800" dir="auto">{review.summary}</p>
                </div>
              )}
              {(review.strengths.length > 0 || review.concerns.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {review.strengths.length > 0 && (
                    <div className="rounded-lg bg-emerald-50/60 p-3">
                      <h3 className="text-xs font-semibold text-emerald-700">{t('recStrengths', 'interview')}</h3>
                      <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm text-gray-700" dir="auto">
                        {review.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {review.concerns.length > 0 && (
                    <div className="rounded-lg bg-amber-50/60 p-3">
                      <h3 className="text-xs font-semibold text-amber-700">{t('recConcerns', 'interview')}</h3>
                      <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm text-gray-700" dir="auto">
                        {review.concerns.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {items.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('recSuggestions', 'interview')}</h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <SheetItemRow
                      key={item.questionIndex}
                      item={item}
                      question={questions[item.questionIndex]}
                      checked={selected.has(item.questionIndex)}
                      onToggle={() => toggle(item.questionIndex)}
                      edit={edits[item.questionIndex]}
                      onEdit={(patch) => editItem(item.questionIndex, patch)}
                      t={t}
                    />
                  ))}
                </ul>
              </div>
              )}

              {review.extraQuestions.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t(questions.length === 0 ? 'recExtraAsked' : 'recExtraQuestions', 'interview')}
                  </h3>
                  <p className="mb-2 text-xs text-gray-500">
                    {t(questions.length === 0 ? 'recExtraAskedHint' : 'recExtraHint', 'interview')}
                  </p>
                  <ul className="space-y-2">
                    {review.extraQuestions.map((e, i) => (
                      <ExtraItemRow
                        key={i}
                        extra={e}
                        added={review.appliedExtra.includes(i)}
                        checked={selectedExtra.has(i)}
                        onToggle={() => toggleExtra(i)}
                        edit={extraEdits[i]}
                        onEdit={(patch) => editExtra(i, patch)}
                        t={t}
                      />
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('recInterviewNote', 'interview')}</h3>
                  {review.summary && (
                    <button
                      type="button"
                      onClick={() => setInterviewNote(review.summary)}
                      className="text-xs font-medium text-purple-600 hover:underline"
                    >
                      {t('recUseSummary', 'interview')}
                    </button>
                  )}
                </div>
                <textarea
                  value={interviewNote}
                  onChange={(e) => setInterviewNote(e.target.value)}
                  rows={3}
                  dir="auto"
                  placeholder={t('recInterviewNoteHint', 'interview')}
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">{t('recAiNote', 'interview')}</p>
                <div className="flex items-center gap-3">
                  {review.appliedAt && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('recAppliedBefore', 'interview')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={(!selected.size && !selectedExtra.size && !interviewNote.trim()) || applyReview.isPending}
                    className={`${button} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    {applyReview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('recApplySelected', 'interview', { count: selected.size + selectedExtra.size + (interviewNote.trim() ? 1 : 0) })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default InterviewAiReviewCard;
