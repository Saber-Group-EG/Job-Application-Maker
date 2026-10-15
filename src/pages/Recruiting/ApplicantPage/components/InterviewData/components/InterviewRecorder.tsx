import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mic, Square } from 'lucide-react';
import { useLocale } from '../../../../../../context/LocaleContext';
import { applicantsService } from '../../../../../../services/applicantsService';
import { useInterviewRecording } from '../../../../../../hooks/queries/useInterviewRecording';
import { getErrorMessage } from '../../../../../../utils/errorHandler';
import { formatTimer } from '../utils/interviewUtils';

// Pieces of 5 minutes keep every upload small and let transcription run while
// the interview is still going. The next piece starts before the previous one
// stops, so no words fall in the gap.
const PIECE_MS = 5 * 60 * 1000;
const MIN_PIECE_SEC = 2;
const RETRY_DELAYS_MS = [1000, 3000, 8000];

type Piece = { blob: Blob; index: number; durationSec: number };

// Explicit width: the popup is positioned inside the narrow button group, so without it
// it shrinks to the button's width.
const POPUP_STYLE = { width: '18rem', maxWidth: 'calc(100vw - 2rem)' } as const;

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) =>
    MediaRecorder.isTypeSupported(m)
  );
};

const formatClock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export type InterviewRecorderHandle = {
  /** Stops recording, sends the last piece and waits for uploads. Resolves true if this interview has a recording. */
  stopAndFlush: () => Promise<boolean>;
};

type Props = {
  applicantId: string;
  interviewId: string;
  /** The interview's own clock: the recorder shows the same time instead of its own. */
  interviewElapsedMs?: number;
};

/**
 * Records the interview from the microphone and sends it for transcription as
 * it goes. Audio is never stored: only the transcript is kept (and can be
 * deleted). Lives in the interview header while the interview is running.
 */
export const InterviewRecorder = forwardRef<InterviewRecorderHandle, Props>(function InterviewRecorder(
  { applicantId, interviewId, interviewElapsedMs },
  ref
) {
  const { t } = useLocale();
  const { data: recording } = useInterviewRecording(applicantId, interviewId);

  const [state, setState] = useState<'idle' | 'recording'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<Piece[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const currentRef = useRef<{ rec: MediaRecorder; index: number } | null>(null);
  const activePiecesRef = useRef(0);
  const pieceTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const nextIndexRef = useRef(0);
  const stoppingRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Pieces the server accepted but has not transcribed yet: kept in this browser so a failed
  // transcription can be retried (the server does not store audio).
  const sentRef = useRef<Map<number, Piece>>(new Map());
  const recordedAnyRef = useRef(false);

  const maxIndex = recording?.segments?.length ? Math.max(...recording.segments.map((s) => s.index)) : -1;
  const processing = recording?.segments?.filter((s) => s.status === 'processing').length ?? 0;
  const done = recording?.segments?.filter((s) => s.status === 'done').length ?? 0;
  const failedSegs = recording?.segments?.filter((s) => s.status === 'failed') ?? [];
  const failedKey = failedSegs.map((s) => s.index).join(',');

  const sendPiece = useCallback(
    async (piece: Piece): Promise<boolean> => {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          await applicantsService.uploadRecordingPiece(applicantId, interviewId, piece.blob, {
            index: piece.index,
            durationSec: piece.durationSec,
            consent: true,
          });
          sentRef.current.set(piece.index, piece);
          return true;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          // Refused for good (no access, AI off, limit reached): retrying won't help.
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            setError(getErrorMessage(err));
            return false;
          }
          if (attempt < RETRY_DELAYS_MS.length) {
            await new Promise((r) => window.setTimeout(r, RETRY_DELAYS_MS[attempt]));
          } else {
            setError(getErrorMessage(err));
          }
        }
      }
      return false;
    },
    [applicantId, interviewId]
  );

  const enqueue = useCallback(
    (piece: Piece) => {
      setPending((n) => n + 1);
      queueRef.current = queueRef.current.then(async () => {
        const ok = await sendPiece(piece);
        if (!ok) setFailed((prev) => [...prev.filter((p) => p.index !== piece.index), piece]);
        setPending((n) => Math.max(0, n - 1));
      });
    },
    [sendPiece]
  );

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startPiece = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
    const chunks: Blob[] = [];
    const index = nextIndexRef.current;
    nextIndexRef.current += 1;
    const startedAt = Date.now();
    activePiecesRef.current += 1;

    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      activePiecesRef.current -= 1;
      const durationSec = (Date.now() - startedAt) / 1000;
      if (durationSec >= MIN_PIECE_SEC && chunks.length) {
        enqueue({ blob: new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' }), index, durationSec });
      }
      if (stoppingRef.current && activePiecesRef.current === 0) releaseStream();
    };
    rec.start(1000);
    currentRef.current = { rec, index };
    pieceTimerRef.current = window.setTimeout(() => {
      const old = currentRef.current;
      startPiece(); // the new piece is already recording when the old one stops
      old?.rec.stop();
    }, PIECE_MS);
  }, [enqueue]);

  const stopRecording = useCallback(() => {
    stoppingRef.current = true;
    if (pieceTimerRef.current) window.clearTimeout(pieceTimerRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    pieceTimerRef.current = null;
    tickRef.current = null;
    const current = currentRef.current;
    currentRef.current = null;
    if (current && current.rec.state !== 'inactive') current.rec.stop();
    else if (activePiecesRef.current === 0) releaseStream();
    setState('idle');
  }, []);

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('recMicUnsupported', 'interview'));
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      setError(t('recMicDenied', 'interview'));
      return;
    }
    stoppingRef.current = false;
    recordedAnyRef.current = true;
    nextIndexRef.current = Math.max(nextIndexRef.current, maxIndex + 1);
    setShowConsent(false);
    setElapsed(0);
    setState('recording');
    startPiece();
    tickRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const handleRecordClick = () => {
    if (recording?.consent.given || consentChecked) {
      void startRecording();
    } else {
      setShowConsent(true);
    }
  };

  const retryFailed = () => {
    const pieces = failed;
    setFailed([]);
    setError('');
    pieces.forEach(enqueue);
  };

  useEffect(() => {
    recording?.segments?.forEach((seg) => {
      if (seg.status === 'done') sentRef.current.delete(seg.index);
    });
  }, [recording?.segments]);

  useEffect(() => {
    if (failedSegs.length && failedSegs[0].error) setError(failedSegs[0].error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedKey]);

  const retryTranscription = () => {
    setError('');
    let lost = 0;
    failedSegs.forEach((seg) => {
      const piece = sentRef.current.get(seg.index);
      if (piece) enqueue(piece);
      else lost += 1;
    });
    if (lost) setError(t('recFailedNoAudio', 'interview'));
  };

  useImperativeHandle(
    ref,
    () => ({
      stopAndFlush: async () => {
        if (currentRef.current || activePiecesRef.current > 0) stopRecording();
        // The last piece is handed over when the browser's recorder reports it has stopped.
        const deadline = Date.now() + 15000;
        while (activePiecesRef.current > 0 && Date.now() < deadline) {
          await new Promise((r) => window.setTimeout(r, 100));
        }
        await queueRef.current;
        return recordedAnyRef.current || (recording?.segments?.length ?? 0) > 0;
      },
    }),
    [stopRecording, recording?.segments?.length]
  );

  // Leaving the page (or ending the interview) stops the recording; the last piece is still sent.
  useEffect(
    () => () => {
      if (currentRef.current) stopRecording();
    },
    [stopRecording]
  );

  useEffect(() => {
    if (state !== 'recording' && pending === 0) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state, pending]);

  if (recording && !recording.transcriptionConfigured) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium"
        title={t('recNotConfigured', 'interview')}
      >
        <Mic className="h-3.5 w-3.5" />
        {t('recRecord', 'interview')}
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      {state === 'recording' ? (
        <button
          type="button"
          onClick={stopRecording}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors shadow-sm"
          title={t('recStop', 'interview')}
        >
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="tabular-nums">
            {interviewElapsedMs !== undefined ? formatTimer(interviewElapsedMs) : formatClock(elapsed)}
          </span>
          <Square className="h-3 w-3 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleRecordClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors shadow-sm"
          title={t('recRecordHint', 'interview')}
        >
          <Mic className="h-3.5 w-3.5" />
          {t('recRecord', 'interview')}
        </button>
      )}

      {(pending > 0 || processing > 0) && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-[11px] font-medium">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('recTranscribing', 'interview', { count: pending + processing })}
        </span>
      )}
      {pending === 0 && processing === 0 && state === 'idle' && done > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/20 text-emerald-50 text-[11px] font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {t('recTranscribed', 'interview')}
        </span>
      )}
      {failed.length > 0 && (
        <button
          type="button"
          onClick={retryFailed}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-400/25 text-red-50 text-[11px] font-semibold hover:bg-red-400/40"
        >
          <AlertCircle className="h-3 w-3" />
          {t('recRetry', 'interview', { count: failed.length })}
        </button>
      )}

      {failedSegs.length > 0 && processing === 0 && pending === 0 && (
        <button
          type="button"
          onClick={retryTranscription}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-400/25 text-red-50 text-[11px] font-semibold hover:bg-red-400/40"
          title={failedSegs[0].error ?? undefined}
        >
          <AlertCircle className="h-3 w-3" />
          {t('recTranscriptionFailed', 'interview')} · {t('recRetryPiece', 'interview')}
        </button>
      )}

      {showConsent && (
        <div
          className="absolute end-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-xl"
          style={POPUP_STYLE}
        >
          <p className="text-sm font-semibold text-slate-900">{t('recConsentTitle', 'interview')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('recConsentText', 'interview')}</p>
          <label className="mt-3 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-blue-600"
            />
            <span>{t('recConsentCheck', 'interview')}</span>
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConsent(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
            >
              {t('cancel', 'common')}
            </button>
            <button
              type="button"
              disabled={!consentChecked}
              onClick={() => void startRecording()}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40"
            >
              {t('recConsentStart', 'interview')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="absolute end-0 top-full z-30 mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 shadow-lg"
          style={POPUP_STYLE}
        >
          <div className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default InterviewRecorder;
