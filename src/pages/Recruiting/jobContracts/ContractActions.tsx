// ContractActions.tsx
import { useState, useEffect, useRef } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { JobContract } from '../../../services/contractsService';
import { useLocale } from '../../../context/LocaleContext';
import { downloadContractAsPdf } from '../../../utils/contractPdfGenerator';

export function ContractActions({ contract }: { contract: JobContract }) {
  const { t } = useLocale();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPopoverOpen, setPdfPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfPopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPdfPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pdfPopoverOpen]);

  const handleDownloadPdf = async (lang: 'en' | 'ar') => {
    setPdfPopoverOpen(false);
    setPdfLoading(true);
    try {
      await downloadContractAsPdf(contract, lang);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setPdfPopoverOpen((v) => !v)}
        disabled={pdfLoading}
        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
        title={t('downloadPdf', 'jobContracts')}
      >
        {pdfLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FileDown className="size-3.5" />
        )}
      </button>

      {pdfPopoverOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-max w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {t('pdfLanguage', 'jobContracts')}
          </p>
          {(['en', 'ar'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleDownloadPdf(lang)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>{lang === 'en' ? t('english', 'jobContracts') : t('arabic', 'jobContracts')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}