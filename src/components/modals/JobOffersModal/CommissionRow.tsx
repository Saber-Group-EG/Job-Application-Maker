// ─── Commission row ───────────────────────────────────────────────────────────

import { Copy, Trash2 } from 'lucide-react';
import { FormCommission } from './JobOffersModal';
import Label from '../../form/Label';
import { CommissionType } from '../../../services/jobOffersService';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function CommissionRow({
  comm,
  index,
  onChange,
  onRemove,
  onDuplicate, // ← add
}: {
  comm: FormCommission;
  index: number;
  onChange: (patch: Partial<FormCommission>) => void;
  onRemove: () => void;
  onDuplicate: () => void; // ← add
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Tier {index + 1}
        </span>
        <div className="flex items-center gap-1">
          {' '}
          {/* ← wrap in div */}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px_110px]">
        <div>
          <Label>Label</Label>
          <input
            className={inputCls}
            value={comm.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="e.g. Base Commission"
            tabIndex={0}
          />
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

      <div className="mt-3">
        <Label>Condition (optional)</Label>
        <input
          className={inputCls}
          value={comm.condition}
          onChange={(e) => onChange({ condition: e.target.value })}
          placeholder='e.g. "for deals under 15,000 EGP"'
          tabIndex={0}
        />
      </div>
    </div>
  );
}
