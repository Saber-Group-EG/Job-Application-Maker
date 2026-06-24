// ─── Commission row ───────────────────────────────────────────────────────────

import { Copy, Trash2, GripVertical, Languages } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormCommission } from './JobOffersModal';
import Label from '../../form/Label';
import { CommissionType } from '../../../services/jobOffersService';
import { translateText } from '../../../utils/translate';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

// add textareaCls constant next to inputCls
const textareaCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 resize-none';

export function CommissionRow({
  comm,
  index,
  onChange,
  onRemove,
  onDuplicate,
}: {
  comm: FormCommission;
  index: number;
  onChange: (patch: Partial<FormCommission>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: comm._id });

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
            Tier {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            tabIndex={0}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            tabIndex={0}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.6fr_110px_110px]">
        {' '}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:col-span-1">
          <div>
            <Label>Label (EN)</Label>

            <input
              className={inputCls}
              value={comm.label.en}
              onChange={(e) =>
                onChange({
                  label: {
                    ...comm.label,
                    en: e.target.value,
                  },
                })
              }
              placeholder="e.g. Base Commission"
              tabIndex={0}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Label (AR)</Label>
              <button
                type="button"
                onClick={async () => {
                  if (comm.label.en.trim()) {
                    const t = await translateText(comm.label.en, 'en', 'ar');
                    if (t) onChange({ label: { ...comm.label, ar: t } });
                  } else if (comm.label.ar.trim()) {
                    const t = await translateText(comm.label.ar, 'ar', 'en');
                    if (t) onChange({ label: { ...comm.label, en: t } });
                  }
                }}
                disabled={!comm.label.en.trim() && !comm.label.ar.trim()}
                className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                title={comm.label.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
              >
                <Languages className="size-3" />
              </button>
            </div>

            <input
              className={inputCls}
              dir="rtl"
              value={comm.label.ar}
              onChange={(e) =>
                onChange({
                  label: {
                    ...comm.label,
                    ar: e.target.value,
                  },
                })
              }
              placeholder="العمولة الأساسية"
              tabIndex={0}
            />
          </div>
        </div>
        <div>
          <Label>Value</Label>
          <input
            className={inputCls}
            type="number"
            min={0}
            value={comm.value}
            onChange={(e) =>
              onChange({
                value: e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder="0"
            tabIndex={0}
          />
        </div>
        <div>
          <Label>Type</Label>
          <select
            className={selectCls}
            value={comm.type}
            onChange={(e) =>
              onChange({ type: e.target.value as CommissionType })
            }
            tabIndex={0}
          >
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage %</option>
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Condition (EN)</Label>

          <textarea
            className={textareaCls}
            rows={2}
            value={comm.condition.en}
            onChange={(e) =>
              onChange({
                condition: {
                  ...comm.condition,
                  en: e.target.value,
                },
              })
            }
            placeholder='e.g. "for deals under 15,000 EGP"'
            tabIndex={0}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Condition (AR)</Label>
            <button
              type="button"
              onClick={async () => {
                if (comm.condition.en.trim()) {
                  const t = await translateText(comm.condition.en, 'en', 'ar');
                  if (t) onChange({ condition: { ...comm.condition, ar: t } });
                } else if (comm.condition.ar.trim()) {
                  const t = await translateText(comm.condition.ar, 'ar', 'en');
                  if (t) onChange({ condition: { ...comm.condition, en: t } });
                }
              }}
              disabled={!comm.condition.en.trim() && !comm.condition.ar.trim()}
              className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
              title={comm.condition.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
            >
              <Languages className="size-3" />
            </button>
          </div>

          <textarea
            className={textareaCls}
            dir="rtl"
            rows={2}
            value={comm.condition.ar}
            onChange={(e) =>
              onChange({
                condition: {
                  ...comm.condition,
                  ar: e.target.value,
                },
              })
            }
            placeholder="للصفقات الأقل من ١٥٬٠٠٠ جنيه"
            tabIndex={0}
          />
        </div>
      </div>
    </div>
  );
}
