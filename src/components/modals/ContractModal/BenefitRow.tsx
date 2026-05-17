// ─── Benefit Row ──────────────────────────────────────────────────────────────

import { Copy, Trash2 } from "lucide-react";
import { FormBenefit } from "./ContractModal";
import { ModalLabel } from "../../form/ModalLabel";

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const textareaCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 resize-none';
  
export function BenefitRow({
  benefit,
  index,
  onChange,
  onRemove,
  onDuplicate,
}: {
  benefit: FormBenefit;
  index: number;
  onChange: (patch: Partial<FormBenefit>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Benefit {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <ModalLabel>Label (EN)</ModalLabel>
          <input
            className={inputCls}
            value={benefit.labelEn}
            onChange={(e) => onChange({ labelEn: e.target.value })}
            placeholder="e.g. Health Insurance"
          />
        </div>
        <div>
          <ModalLabel>Label (AR)</ModalLabel>
          <input
            className={inputCls}
            value={benefit.labelAr}
            onChange={(e) => onChange({ labelAr: e.target.value })}
            placeholder="التأمين الصحي"
            dir="rtl"
          />
        </div>
      </div>
      <div className="mt-3">
        <ModalLabel>Value</ModalLabel>
        <textarea
          className={textareaCls}
          rows={3}
          value={benefit.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="e.g. Full coverage"
        />
      </div>
    </div>
  );
}
