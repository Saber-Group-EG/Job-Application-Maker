import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import html2canvas from 'html2canvas';
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GlobeIcon,
  Loader2Icon,
  SendIcon,
  SparklesIcon,
} from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Dialog, Segmented, textareaClass } from '../ui/kit';
import { buildJobLink } from '../../utils/publicJobLinks';
import {
  useJobDistribution,
  usePostJobToTelegram,
  useTelegramChannels,
  useWriteJobPosts,
} from '../../hooks/queries/useJobDistribution';
import type { SharePlatform } from '../../services/jobDistributionService';
import { paths } from '../../router/Paths';

type Lang = 'en' | 'ar';

const PLATFORMS: { value: SharePlatform; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'x', label: 'X' },
  { value: 'telegram', label: 'Telegram' },
];

const textOf = (value: any, lang: Lang): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return (value[lang] || value.en || value.ar || '').trim();
};

const WORDS = {
  en: {
    hiring: "We're hiring",
    type: { 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', internship: 'Internship' } as Record<string, string>,
    arrangement: { 'on-site': 'On-site', remote: 'Remote', hybrid: 'Hybrid' } as Record<string, string>,
    deadline: 'Apply by',
    apply: 'Apply here',
    applyBio: 'Apply through the link in our bio',
    tags: '#hiring #jobs #careers',
  },
  ar: {
    hiring: 'مطلوب',
    type: { 'full-time': 'دوام كامل', 'part-time': 'دوام جزئي', contract: 'عقد', internship: 'تدريب' } as Record<string, string>,
    arrangement: { 'on-site': 'من المقر', remote: 'عن بُعد', hybrid: 'هجين' } as Record<string, string>,
    deadline: 'آخر موعد للتقديم',
    apply: 'للتقديم',
    applyBio: 'قدّم من الرابط في البايو',
    tags: '#وظائف #وظائف_شاغرة #توظيف',
  },
};

/** Ready-to-post text without AI, from the job's own facts. */
const templatePost = (job: any, platform: SharePlatform, lang: Lang): string => {
  const w = WORDS[lang];
  const title = textOf(job.title, lang);
  const company = textOf(job.companyId?.name, lang);
  const details = [w.type[job.employmentType], w.arrangement[job.workArrangement], job.location?.city]
    .filter(Boolean)
    .join(' · ');
  const deadline = job.registrationEnd
    ? new Date(job.registrationEnd).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const description = textOf(job.description, lang).replace(/\s+/g, ' ').slice(0, 280);

  if (platform === 'x') {
    return `${w.hiring}: ${title}${company ? ` @ ${company}` : ''}${details ? ` (${details})` : ''} ${lang === 'ar' ? '#وظائف' : '#hiring'}`;
  }
  const bold = platform === 'whatsapp' ? (s: string) => `*${s}*` : (s: string) => s;
  const lines = [
    `${bold(`${w.hiring}: ${title}`)}`,
    company ? `🏢 ${company}` : '',
    details ? `📍 ${details}` : '',
    deadline ? `🗓 ${w.deadline}: ${deadline}` : '',
    description && platform !== 'whatsapp' ? `\n${description}${description.length >= 280 ? '…' : ''}` : '',
    platform === 'instagram' ? `\n👉 ${w.applyBio}` : '',
    platform === 'linkedin' || platform === 'instagram' ? `\n${w.tags}` : '',
  ];
  return lines.filter(Boolean).join('\n');
};

/** The platform's own "share" page, filled in where it allows. */
const shareUrl = (platform: SharePlatform, text: string, link: string): string | null => {
  const e = encodeURIComponent;
  switch (platform) {
    case 'linkedin':
      return `https://www.linkedin.com/feed/?shareActive=true&text=${e(`${text}\n\n${link}`)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${e(link)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${e(`${text}\n\n${link}`)}`;
    case 'x':
      return `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(link)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${e(link)}&text=${e(text)}`;
    default:
      return null; // Instagram has no web share page
  }
};

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    window.prompt('Copy:', value);
    return false;
  }
};

interface Props {
  job: any | null;
  open: boolean;
  onClose: () => void;
}

/**
 * "Promote job": where the platform posts it by itself (Telegram channels,
 * Google for Jobs) and a share kit for everywhere else: a ready post per
 * platform (template, or written by AI), the tracked link, the platform's
 * share page, and a square job card image for Instagram/Facebook.
 */
export default function PromoteJobDialog({ job, open, onClose }: Props) {
  const { t } = useLocale();
  const { hasPermission } = useAuth();
  const jobId: string | undefined = job?._id;
  const companyId: string | undefined = job?.companyId?._id ?? (typeof job?.companyId === 'string' ? job.companyId : undefined);
  const canPost = !!hasPermission && hasPermission('Job Position Management', 'write');

  const defaultLang: Lang = job?.language === 'ar' && !job?.bilingual ? 'ar' : 'en';
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [platform, setPlatform] = useState<SharePlatform>('linkedin');
  const [drafts, setDrafts] = useState<Partial<Record<string, string>>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: telegram } = useTelegramChannels(companyId, open);
  const { data: dist } = useJobDistribution(jobId, open);
  const postTelegram = usePostJobToTelegram();
  const writePosts = useWriteJobPosts();

  useEffect(() => {
    if (!open) return;
    setLang(defaultLang);
    setPlatform('linkedin');
    setDrafts({});
    setCopied(null);
    writePosts.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId]);

  const key = `${platform}:${lang}`;
  const text = drafts[key] ?? (job ? templatePost(job, platform, lang) : '');
  const link = job ? buildJobLink(job, platform) : '';
  const hasArabic = Boolean(job && (job.bilingual || job.language === 'ar'));
  const hasEnglish = Boolean(job && (job.bilingual || job.language !== 'ar'));

  const googleEntry = dist?.distribution.find((d) => d.channel === 'google');
  const telegramEntries = useMemo(
    () => new Map((dist?.distribution || []).filter((d) => d.channel === 'telegram').map((d) => [d.target, d])),
    [dist]
  );

  if (!job) return null;

  const flash = (id: string) => {
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  };

  const onCopy = async () => {
    await copyText(platform === 'instagram' ? text : `${text}\n\n${link}`);
    flash('text');
  };

  const onOpen = async () => {
    // Facebook's share page can't be pre-filled with text: copy it first.
    await copyText(`${text}\n\n${link}`);
    const url = shareUrl(platform, text, link);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    flash('open');
  };

  const onWriteWithAi = async () => {
    if (!companyId) return;
    try {
      const result = await writePosts.mutateAsync({
        jobId: job._id,
        companyId,
        platforms: PLATFORMS.map((p) => p.value),
        language: lang,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        for (const [p, value] of Object.entries(result.posts)) if (value) next[`${p}:${result.language}`] = value;
        return next;
      });
    } catch {
      /* error shown below */
    }
  };

  const onDownloadImage = async () => {
    if (!cardRef.current) return;
    setImageBusy(true);
    try {
      const render = () =>
        html2canvas(cardRef.current!, { scale: 1, useCORS: true, backgroundColor: null, logging: false });
      let canvas: HTMLCanvasElement;
      try {
        canvas = await render();
        canvas.toDataURL(); // throws when a cross-origin logo tainted it
      } catch {
        cardRef.current.querySelector('img')?.remove();
        canvas = await render();
      }
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${job.slug || 'job'}-${lang}.png`;
      a.click();
    } finally {
      setImageBusy(false);
    }
  };

  const title = textOf(job.title, lang);
  const company = textOf(job.companyId?.name, lang);
  const w = WORDS[lang];
  const channels = telegram?.channels || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('promoteTitle', 'jobs')}
      description={title}
    >
      <div className="space-y-6">
        {/* ── Posted automatically ─────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('promoteAutoTitle', 'jobs')}</h3>

          <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <GlobeIcon className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-slate-800 dark:text-slate-100">Google for Jobs</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dist && !dist.open
                  ? t('promoteGoogleClosed', 'jobs')
                  : googleEntry?.status === 'posted'
                    ? t('promoteGoogleSent', 'jobs', { date: new Date(googleEntry.postedAt || '').toLocaleDateString() })
                    : t('promoteGoogleSitemap', 'jobs')}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3 p-3">
              <SendIcon className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-slate-800 dark:text-slate-100">Telegram</p>
                {telegram && !telegram.configured ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('promoteTgNotSetUp', 'jobs')}</p>
                ) : telegram && !telegram.allowedByPlan ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('promoteTgNotOnPlan', 'jobs')}</p>
                ) : channels.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('promoteTgNoChannels', 'jobs')}{' '}
                    <Link to={paths.recruiting.companySettings} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                      {t('promoteTgConnect', 'jobs')}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
            {channels.length > 0 && telegram?.allowedByPlan && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {channels.map((c) => {
                  const entry = telegramEntries.get(c.chatId);
                  const busy = postTelegram.isPending && postTelegram.variables?.chatId === c.chatId;
                  return (
                    <li key={c._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 text-sm">
                        <p className="truncate text-slate-700 dark:text-slate-200">{c.title || c.username}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {entry?.status === 'posted' ? (
                            <>
                              {t('promoteTgPosted', 'jobs', { date: new Date(entry.postedAt || '').toLocaleString() })}
                              {entry.url && (
                                <a href={entry.url} target="_blank" rel="noopener noreferrer" className="ms-1 inline-flex items-center gap-0.5 text-brand-600 hover:underline dark:text-brand-400">
                                  {t('promoteView', 'jobs')} <ExternalLinkIcon className="size-3" />
                                </a>
                              )}
                            </>
                          ) : entry?.status === 'failed' ? (
                            <span className="text-amber-700 dark:text-amber-400">{entry.error}</span>
                          ) : c.autoPost ? (
                            t('promoteTgAuto', 'jobs')
                          ) : (
                            t('promoteTgNotPosted', 'jobs')
                          )}
                        </p>
                      </div>
                      {canPost && (
                        <Button
                          size="sm"
                          loading={busy}
                          disabled={dist ? !dist.open : false}
                          onClick={() => postTelegram.mutate({ jobId: job._id, chatId: c.chatId, companyId: companyId! })}
                        >
                          {entry?.status === 'posted' ? t('promotePostAgain', 'jobs') : t('promotePostNow', 'jobs')}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {postTelegram.isError && (
              <p className="border-t border-slate-100 px-3 py-2 text-xs text-rose-600 dark:border-slate-800">
                {(postTelegram.error as Error)?.message}
              </p>
            )}
          </div>
        </section>

        {/* ── Share kit ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('promoteShareTitle', 'jobs')}</h3>
            {hasArabic && hasEnglish && (
              <Segmented<Lang>
                ariaLabel={t('promoteLanguage', 'jobs')}
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية' },
                ]}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('promoteShareHint', 'jobs')}</p>

          <div className="-mx-1 flex flex-wrap gap-1">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlatform(p.value)}
                aria-pressed={platform === p.value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  platform === p.value
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            value={text}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={9}
            aria-label={t('promotePostText', 'jobs')}
            className={textareaClass}
          />
          <p className="truncate text-xs text-slate-500 dark:text-slate-400" dir="ltr">
            🔗 {link}
          </p>
          {platform === 'instagram' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('promoteInstagramHint', 'jobs')}</p>
          )}
          {platform === 'facebook' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('promoteFacebookHint', 'jobs')}</p>
          )}
          {writePosts.isError && (
            <p className="text-xs text-rose-600">{(writePosts.error as Error)?.message}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={writePosts.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
              disabled={writePosts.isPending || !companyId}
              onClick={onWriteWithAi}
            >
              {t('promoteWriteAi', 'jobs')}
            </Button>
            <Button icon={copied === 'text' ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />} onClick={onCopy}>
              {platform === 'instagram' ? t('promoteCopyCaption', 'jobs') : t('promoteCopy', 'jobs')}
            </Button>
            {platform !== 'instagram' && (
              <Button variant="primary" icon={<ExternalLinkIcon className="size-4" />} onClick={onOpen}>
                {t('promoteOpen', 'jobs', { platform: PLATFORMS.find((p) => p.value === platform)?.label ?? '' })}
              </Button>
            )}
            {(platform === 'instagram' || platform === 'facebook' || platform === 'linkedin') && (
              <Button icon={<DownloadIcon className="size-4" />} loading={imageBusy} onClick={onDownloadImage}>
                {t('promoteDownloadImage', 'jobs')}
              </Button>
            )}
          </div>
          {copied === 'open' && <Badge tone="green">{t('promoteCopiedOpen', 'jobs')}</Badge>}
        </section>
      </div>

      {/* Off-screen square card rendered to PNG by html2canvas. */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        <div
          ref={cardRef}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          style={{
            width: 1080,
            height: 1080,
            padding: 96,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            fontFamily: lang === 'ar' ? 'Tahoma, Arial, sans-serif' : 'Inter, Arial, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {job.companyId?.logoPath && (
              <img
                src={job.companyId.logoPath}
                crossOrigin="anonymous"
                alt=""
                style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 24, background: '#ffffff', padding: 12 }}
              />
            )}
            <div style={{ fontSize: 44, fontWeight: 600, opacity: 0.9 }}>{company}</div>
          </div>
          <div>
            <div style={{ fontSize: 48, fontWeight: 600, color: '#93c5fd', marginBottom: 24 }}>{w.hiring}</div>
            <div style={{ fontSize: title.length > 40 ? 76 : 96, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
            <div style={{ marginTop: 40, fontSize: 40, opacity: 0.85 }}>
              {[w.type[job.employmentType], w.arrangement[job.workArrangement], job.location?.city].filter(Boolean).join('  ·  ')}
            </div>
          </div>
          <div
            style={{
              alignSelf: 'flex-start',
              background: '#ffffff',
              color: '#1e3a8a',
              fontSize: 44,
              fontWeight: 700,
              padding: '24px 48px',
              borderRadius: 999,
            }}
          >
            {lang === 'ar' ? 'قدّم الآن' : 'Apply now'}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
