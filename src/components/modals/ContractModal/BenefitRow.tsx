// ─── Benefit Row ──────────────────────────────────────────────────────────────

import { Copy, Trash2, GripVertical, Languages } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormBenefit } from "./ContractModal";
import { ModalLabel } from "../../form/ModalLabel";
import { translateText } from "../../../utils/translate";

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: benefit._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-4 ${
        isDragging
          ? 'border-brand-400 shadow-lg ring-2 ring-brand-500'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="flex cursor-grab items-center justify-center rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <GripVertical className="size-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Benefit {index + 1}
          </span>
        </div>
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
          <div className="flex items-center justify-between">
            <ModalLabel>Label (AR)</ModalLabel>
            <button
              type="button"
              onClick={async () => {
                if (benefit.labelEn.trim()) {
                  const t = await translateText(benefit.labelEn, 'en', 'ar');
                  if (t) onChange({ labelAr: t });
                } else if (benefit.labelAr.trim()) {
                  const t = await translateText(benefit.labelAr, 'ar', 'en');
                  if (t) onChange({ labelEn: t });
                }
              }}
              disabled={!benefit.labelEn.trim() && !benefit.labelAr.trim()}
              className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
              title={benefit.labelEn.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
            >
              <Languages className="size-3" />
            </button>
          </div>
          <input
            className={inputCls}
            value={benefit.labelAr}
            onChange={(e) => onChange({ labelAr: e.target.value })}
            placeholder="التأمين الصحي"
            dir="rtl"
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <ModalLabel>Value (EN)</ModalLabel>

          <textarea
            className={textareaCls}
            rows={3}
            value={benefit.value.en}
            onChange={(e) =>
              onChange({
                value: {
                  ...benefit.value,
                  en: e.target.value,
                },
              })
            }
            placeholder="e.g. Full coverage"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <ModalLabel>Value (AR)</ModalLabel>
            <button
              type="button"
              onClick={async () => {
                if (benefit.value.en.trim()) {
                  const t = await translateText(benefit.value.en, 'en', 'ar');
                  if (t) onChange({ value: { ...benefit.value, ar: t } });
                } else if (benefit.value.ar.trim()) {
                  const t = await translateText(benefit.value.ar, 'ar', 'en');
                  if (t) onChange({ value: { ...benefit.value, en: t } });
                }
              }}
              disabled={!benefit.value.en.trim() && !benefit.value.ar.trim()}
              className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
              title={benefit.value.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
            >
              <Languages className="size-3" />
            </button>
          </div>

          <textarea
            className={textareaCls}
            dir="rtl"
            rows={3}
            value={benefit.value.ar}
            onChange={(e) =>
              onChange({
                value: {
                  ...benefit.value,
                  ar: e.target.value,
                },
              })
            }
            placeholder="تغطية كاملة"
          />
        </div>
      </div>
    </div>
  );
}
