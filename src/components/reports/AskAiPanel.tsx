// "Ask AI" on the Reports page: the user describes the chart they want in
// plain words (any language), sees it, switches how it's shown, asks
// follow-ups that change the latest chart, gets written takeaways, and saves
// charts to their own reports. The AI only picks a chart description; the
// server computes the numbers within the user's access.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookmarkPlus, Check, Lightbulb, Send, Sparkles } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { Button } from '../ui/kit';
import { reportBuilderService, type ChartControl, type ChartView, type CustomResult, type CustomSpec } from '../../services/reportsService';
import { useReportWidgetMutations } from '../../hooks/queries/useReports';
import { ChartCard, fitView, withControl, type JobOption } from './CustomChart';

type AiTurn = {
  id: number;
  role: 'user' | 'ai';
  text: string;
  spec?: CustomSpec | null;
  result?: CustomResult | null;
  view?: ChartView;
  insights?: string[];
  explaining?: boolean;
  saved?: boolean;
  error?: boolean;
};

export default function AskAiPanel({ companyId, enabled, days, jobs = [] }: { companyId: string | null; enabled: boolean; days: number; jobs?: JobOption[] }) {
  const { t, locale } = useLocale();
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { save } = useReportWidgetMutations(companyId);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  // A new company starts a new conversation.
  useEffect(() => {
    setTurns([]);
  }, [companyId]);
  // Charts follow the page's date range: re-run them (no AI) when it changes.
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const shownDays = useRef(days);
  useEffect(() => {
    if (shownDays.current === days || !companyId) return;
    shownDays.current = days;
    turnsRef.current.forEach((turn) => {
      if (turn.role !== 'ai' || !turn.spec) return;
      reportBuilderService
        .run({ companyId, spec: turn.spec, locale, days })
        .then((result) => patch(turn.id, { result, insights: undefined }))
        .catch(() => undefined);
    });
  }, [days, companyId, locale]);
  // Braces matter: scrollIntoView returns a Promise in current browsers, and
  // an effect must not return anything but a clean-up function.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns.length]);

  const lastSpec = [...turns].reverse().find((x) => x.role === 'ai' && x.spec)?.spec ?? null;
  const patch = (id: number, p: Partial<AiTurn>) => setTurns((all) => all.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || !companyId || busy) return;
    setMessage('');
    setTurns((all) => [...all, { id: nextId.current++, role: 'user', text: q }]);
    setBusy(true);
    try {
      const r = await reportBuilderService.ask({ companyId, message: q, previousSpec: lastSpec, locale, days });
      setTurns((all) => [
        ...all,
        { id: nextId.current++, role: 'ai', text: r.reply, spec: r.spec, result: r.result, view: r.result ? fitView(r.result, r.spec?.view ?? 'bar') : undefined },
      ]);
    } catch (err: any) {
      setTurns((all) => [...all, { id: nextId.current++, role: 'ai', text: err?.message || t('aiError', 'reports'), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  // A menu on the chart changed (job, source…): re-run it without asking the AI.
  const setControl = async (turn: AiTurn, control: ChartControl, value: string | null) => {
    if (!companyId || !turn.spec) return;
    const spec = withControl(turn.spec, control, value);
    try {
      const result = await reportBuilderService.run({ companyId, spec, locale, days });
      patch(turn.id, { spec: result.spec, result, insights: undefined, saved: false });
    } catch (err: any) {
      patch(turn.id, { insights: [err?.message || t('aiError', 'reports')] });
    }
  };

  const explain = async (turn: AiTurn) => {
    if (!companyId || !turn.spec) return;
    patch(turn.id, { explaining: true });
    try {
      const r = await reportBuilderService.explain({ companyId, spec: turn.spec, locale, days });
      patch(turn.id, { insights: r.insights.length ? r.insights : [t('noInsights', 'reports')], explaining: false });
    } catch (err: any) {
      patch(turn.id, { insights: [err?.message || t('aiError', 'reports')], explaining: false });
    }
  };

  const saveTurn = async (turn: AiTurn) => {
    if (!companyId || !turn.spec || !turn.result) return;
    const view = fitView(turn.result, turn.view ?? turn.spec.view);
    try {
      await save.mutateAsync({ companyId, title: turn.spec.title, spec: { ...turn.spec, view }, view });
      patch(turn.id, { saved: true });
    } catch (err: any) {
      patch(turn.id, { insights: [err?.message || t('aiError', 'reports')] });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(message);
  };

  const examples = [t('example1', 'reports'), t('example2', 'reports'), t('example3', 'reports'), t('example4', 'reports')];

  return (
    <section className="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50/60 to-white dark:border-brand-500/20 dark:from-brand-500/5 dark:to-slate-900">
      <header className="flex items-center gap-2 px-5 pt-4">
        <Sparkles className="size-4 text-brand-600 dark:text-brand-400" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('askTitle', 'reports')}</h2>
      </header>
      <div className="space-y-4 p-5 pt-2">
        {!enabled ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('askDisabled', 'reports')}</p>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('askIntro', 'reports')}</p>

            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => send(ex)}
                    disabled={!companyId || busy}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {turns.length > 0 && (
              <ol className="space-y-4" aria-live="polite">
                {turns.map((turn) =>
                  turn.role === 'user' ? (
                    <li key={turn.id} className="flex justify-end">
                      <p className="max-w-[80%] rounded-2xl rounded-ee-sm bg-brand-600 px-4 py-2 text-sm text-white">{turn.text}</p>
                    </li>
                  ) : (
                    <li key={turn.id} className="space-y-3">
                      <p className={`max-w-[85%] rounded-2xl rounded-es-sm px-4 py-2 text-sm ${turn.error ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100'}`}>
                        {turn.text}
                      </p>
                      {turn.result && turn.spec && (
                        <ChartCard
                          title={turn.spec.title}
                          result={turn.result}
                          view={turn.view ?? turn.spec.view}
                          onViewChange={(v) => patch(turn.id, { view: v })}
                          jobs={jobs}
                          onControlChange={(c, v) => setControl(turn, c, v)}
                          days={days}
                          actions={
                            <>
                              <Button size="sm" icon={<Lightbulb className="size-4" />} loading={turn.explaining} onClick={() => explain(turn)}>
                                {t('explain', 'reports')}
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={turn.saved ? <Check className="size-4" /> : <BookmarkPlus className="size-4" />}
                                disabled={turn.saved || save.isPending}
                                onClick={() => saveTurn(turn)}
                              >
                                {turn.saved ? t('saved', 'reports') : t('save', 'reports')}
                              </Button>
                            </>
                          }
                          footer={
                            turn.insights?.length ? (
                              <ul className="mt-4 space-y-1.5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                                {turn.insights.map((s, i) => (
                                  <li key={i} className="flex gap-2">
                                    <Lightbulb className="mt-0.5 size-4 shrink-0" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null
                          }
                        />
                      )}
                    </li>
                  )
                )}
                {busy && (
                  <li className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="size-2 animate-pulse rounded-full bg-brand-500" />
                    {t('thinking', 'reports')}
                  </li>
                )}
                <div ref={endRef} />
              </ol>
            )}

            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(message);
                  }
                }}
                rows={1}
                maxLength={1000}
                dir="auto"
                placeholder={lastSpec ? t('askFollowUp', 'reports') : t('askPlaceholder', 'reports')}
                aria-label={t('askTitle', 'reports')}
                disabled={!companyId}
                className="min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <Button variant="primary" icon={<Send className="size-4" />} loading={busy} disabled={!message.trim() || !companyId} type="submit">
                {t('ask', 'reports')}
              </Button>
            </form>
            {turns.length > 0 && (
              <button type="button" onClick={() => setTurns([])} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
                {t('newConversation', 'reports')}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
