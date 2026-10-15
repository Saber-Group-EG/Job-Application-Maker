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

type Props = {
  applicantId: string;
  interviewId: string;
  questions: InterviewAnswer[];
};

/**
 * AI review of a finished interview: the transcript of its recording, and
 * suggested answers/scores for the interview's own questions. Nothing is
 * written to the interview until the interviewer ticks suggestions and applies.
 */
export const InterviewAiReviewCard = ({ applicantId, interviewId, questions }: Props) => {
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
    if (!indexes.length && !extraIndexes.length) return;
    const confirm = await Swal.fire({
      icon: 'question',
      title: t('recApplyConfirmTitle', 'interview', { count: indexes.length + extraIndexes.length }),
      text: t('recApplyConfirmText', 'interview'),
      showCancelButton: true,
      confirmButtonText: t('recApply', 'interview'),
      cancelButtonText: t('cancel', 'common'),
    });
    if (!confirm.isConfirmed) return;
    try {
      const result = await applyReview.mutateAsync({ questionIndexes: indexes, extraIndexes });
      await Swal.fire({
        icon: result.applied ? 'success' : 'info',
        title: t('recApplied', 'interview', { count: result.applied }),
        text: result.skipped ? t('recAppliedSkipped', 'interview', { count: result.skipped }) : undefined,
        timer: result.skipped ? undefined : 2000,
        showConfirmButton: Boolean(result.skipped),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
      ) : rec && !rec.transcriptionConfigured ? (
        <p className="text-sm text-gray-500">{t('recNotConfigured', 'interview')}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('recReviewIntro', 'interview')}</p>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* Upload a recording made elsewhere (e.g. a Meet/Zoom recording) */}
          {!hasSegments && (
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
                  {items.map((item) => {
                    const q = questions[item.questionIndex];
                    const canApply = item.covered && (item.proposed.notes !== null || item.proposed.achievedScore !== null);
                    const max = Number(q?.score || 0);
                    const currentNotes = String(q?.notes ?? '').trim();
                    return (
                      <li key={item.questionIndex} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            disabled={!canApply}
                            checked={selected.has(item.questionIndex)}
                            onChange={() => toggle(item.questionIndex)}
                            className="mt-1 h-4 w-4 accent-purple-600"
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-sm font-medium text-gray-800" dir="auto">
                              {item.questionIndex + 1}. {item.questionText}
                            </p>
                            {item.covered ? (
                              <>
                                <p className="whitespace-pre-wrap text-sm text-gray-700" dir="auto">{item.answerSummary}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  {item.suggestedScore !== null && (
                                    <span className="rounded-full bg-purple-50 px-2 py-0.5 font-semibold text-purple-700">
                                      {t('recSuggestedScore', 'interview')}: {item.proposed.achievedScore ?? item.suggestedScore} / {max}
                                    </span>
                                  )}
                                  <span className={`rounded-full px-2 py-0.5 font-medium ${confidenceClass[item.confidence]}`}>
                                    {t(`recConfidence_${item.confidence}`, 'interview')}
                                  </span>
                                </div>
                                {item.evidence && (
                                  <p className="border-s-2 border-gray-200 ps-2 text-xs italic text-gray-500" dir="auto">
                                    {item.evidence}
                                  </p>
                                )}
                                {!isEmptyAnswer(q) && (
                                  <p className="text-xs text-amber-700" dir="auto">
                                    {t('recCurrent', 'interview')}: {currentNotes || '—'} ({Number(q?.achievedScore || 0)}/{max})
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs italic text-gray-400">{t('recNotCovered', 'interview')}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
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
                    {review.extraQuestions.map((e, i) => {
                      const added = review.appliedExtra.includes(i);
                      return (
                        <li key={i} className="rounded-lg border border-gray-100 p-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              disabled={added}
                              checked={selectedExtra.has(i)}
                              onChange={() => toggleExtra(i)}
                              className="mt-1 h-4 w-4 accent-purple-600"
                            />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <p className="text-sm font-medium text-gray-800" dir="auto">{e.question}</p>
                              <p className="whitespace-pre-wrap text-sm text-gray-700" dir="auto">{e.answerSummary}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-purple-50 px-2 py-0.5 font-semibold text-purple-700">
                                  {t('recSuggestedScore', 'interview')}: {e.suggestedScore} / {e.maxScore}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 font-medium ${confidenceClass[e.confidence]}`}>
                                  {t(`recConfidence_${e.confidence}`, 'interview')}
                                </span>
                                {added && (
                                  <span className="inline-flex items-center gap-1 text-emerald-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('recAddedToInterview', 'interview')}
                                  </span>
                                )}
                              </div>
                              {e.evidence && (
                                <p className="border-s-2 border-gray-200 ps-2 text-xs italic text-gray-500" dir="auto">{e.evidence}</p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

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
                    disabled={(!selected.size && !selectedExtra.size) || applyReview.isPending}
                    className={`${button} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    {applyReview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('recApplySelected', 'interview', { count: selected.size + selectedExtra.size })}
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
