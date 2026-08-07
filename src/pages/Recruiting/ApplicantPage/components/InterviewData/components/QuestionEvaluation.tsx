import { useState } from 'react';
import { useLocale } from '../../../../../../context/LocaleContext';
import { CheckLineIcon, SadCircleIcon, ShootingStarIcon, SmileCircleIcon } from '../../../../../../icons';

const QuestionEvaluation = ({
  percentage,
  onEvaluate,
  disabled = false,
}: {
  percentage: number;
  onEvaluate: (value: number) => void;
  disabled?: boolean;
}) => {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<number | null>(null);

  const ratings = [
    { label: t('poor', 'interview'), value: 0, active: 'border-red-400 bg-red-50 text-red-600', icon: SadCircleIcon },
    { label: t('fair', 'interview'), value: 25, active: 'border-orange-400 bg-orange-50 text-orange-600', icon: SadCircleIcon },
    { label: t('good', 'interview'), value: 50, active: 'border-yellow-400 bg-yellow-50 text-yellow-700', icon: SmileCircleIcon },
    { label: t('excellent', 'interview'), value: 75, active: 'border-green-400 bg-green-50 text-green-700', icon: CheckLineIcon },
    { label: t('outstanding', 'interview'), value: 100, active: 'border-purple-400 bg-purple-50 text-purple-700', icon: ShootingStarIcon },
  ];

  const getActiveIndex = (pct: number) => {
    if (pct === 0) return 0;
    if (pct <= 25) return 1;
    if (pct <= 50) return 2;
    if (pct <= 75) return 3;
    return 4;
  };

  // The evaluation level is independent from the percentage: it initializes
  // from the loaded value once, then only changes when the user clicks a
  // rating. Dragging the slider (or a choice click) must not alter it.
  const [selected, setSelected] = useState<number | null>(() =>
    percentage > 0 ? getActiveIndex(percentage) : null
  );

  const handleSelect = (index: number) => {
    setSelected(index);
    onEvaluate(ratings[index].value);
  };

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <span className="text-xs font-semibold text-slate-700">
        {t('yourEvaluation', 'interview')}
      </span>
      <div
        className="flex gap-2.5 mt-2"
        style={{ fontFamily: "Cairo, Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}
      >
        {ratings.map((rating, index) => {
          const isActive = index === selected;
          const isPreviewed = index === hovered && !isActive;
          return (
            <button
              key={index}
              type="button"
              onClick={() => !disabled && handleSelect(index)}
              onMouseEnter={() => !disabled && setHovered(index)}
              onMouseLeave={() => !disabled && setHovered(null)}
              disabled={disabled}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border transition-all duration-200
                ${isActive
                  ? `border-2 ${rating.active} shadow-sm scale-[1.02]`
                  : isPreviewed
                    ? 'border-slate-300 bg-slate-50 text-slate-600'
                    : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                }
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              <rating.icon className="size-5 shrink-0" />
              <span className="text-[13px] font-semibold leading-none tracking-wide whitespace-nowrap">
                {rating.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionEvaluation;
