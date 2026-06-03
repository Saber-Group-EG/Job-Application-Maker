import React, { useMemo } from 'react';
import { Layers, CheckCircle2, XCircle, AlertCircle, Percent } from 'lucide-react';
import type { JobSpecItem, JobSpecProps } from '../../../../../types/applicants';

const COLORS = [
  { bg: 'bg-white', text: 'text-[#FBBF24]', border: 'border-[#FEF3C7]', iconBg: 'bg-[#FEF3C7]' },
  { bg: 'bg-white', text: 'text-[#22C55E]', border: 'border-[#DCFCE7]', iconBg: 'bg-[#DCFCE7]' },
  { bg: 'bg-white', text: 'text-[#F43F5E]', border: 'border-[#FFE4E6]', iconBg: 'bg-[#FFE4E6]' },
  { bg: 'bg-white', text: 'text-[#7C3AED]', border: 'border-[#E9E4FF]', iconBg: 'bg-[#E9E4FF]' },
];

const normalizeId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { _id?: string; id?: string };
    return obj?._id || obj?.id || '';
  }
  return '';
};

const getSpecText = (item: any): string => {
  if (!item) return '';
  if (typeof item.spec === 'string') return item.spec.trim().toLowerCase();
  if (item.spec && typeof item.spec === 'object') {
    return String(item.spec.en ?? item.spec.value ?? '').trim().toLowerCase();
  }
  return String(item.title ?? item.label ?? item.name ?? '').trim().toLowerCase();
};

const JobSpec: React.FC<JobSpecProps> = ({ specs: providedSpecs, jobPosition }) => {
  // ── Build weight map from jobPosition ONLY (ignores item.weight) ──
  // Keyed by spec TEXT (not ID) because applicant.jobSpecsWithDetails.jobSpecId
  // does NOT match jobPosition.jobSpecs._id in the API payload.
  const weightMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!jobPosition) return map;

    const jpRaw: any = (jobPosition as any).jobPosition ?? jobPosition;
    const jpSpecs: any[] = (() => {
      if (Array.isArray(jpRaw?.jobSpecsWithDetails) && jpRaw.jobSpecsWithDetails.length)
        return jpRaw.jobSpecsWithDetails;
      if (Array.isArray(jpRaw?.jobSpecs) && jpRaw.jobSpecs.length) return jpRaw.jobSpecs;
      return [];
    })();

    for (const jp of jpSpecs) {
      if (!jp) continue;
      const w = typeof jp.weight === 'number' ? jp.weight : Number(jp.weight ?? 0);
      // Index by spec text (primary)
      const text = getSpecText(jp);
      if (text && !map.has(text)) map.set(text, w);
      // Also index by IDs as a fallback
      const ids = [jp._id, jp.id, jp.jobSpecId]
        .map((x: any) => normalizeId(x))
        .filter(Boolean);
      for (const id of ids) {
        if (!map.has(id)) map.set(id, w);
      }
    }
    return map;
  }, [jobPosition]);

  // ── Build specs with weights looked up from jobPosition (NOT from item.weight) ──
  const specs: JobSpecItem[] = useMemo(() => {
    if (!providedSpecs) return [];
    return providedSpecs.map((item) => {
      // Try spec-text lookup first (handles ID mismatch between applicant
      // jobSpecsWithDetails.jobSpecId and jobPosition.jobSpecs._id)
      const text = getSpecText(item);
      let weight = text ? (weightMap.get(text) ?? -1) : -1;
      if (weight < 0) {
        // Fall back to ID lookup
        const itemId = normalizeId(item._id) || normalizeId(item.id) || normalizeId(item.jobSpecId);
        weight = itemId ? (weightMap.get(itemId) ?? 0) : 0;
      }
      return { ...item, weight };
    });
  }, [providedSpecs, weightMap]);

  // Validate that total weight equals 100%
  const { totalWeight, isValid, achievedScore } = useMemo(() => {
    const total = specs.reduce((sum, item) => sum + item.weight, 0);
    const isValidWeight = total === 100;

    // Calculate achieved score based on answers (if answer is false, weight contribution is 0)
    const achieved = specs.reduce((sum, item) => {
      return sum + (item.answer ? item.weight : 0);
    }, 0);

    const achievedPercentage = total > 0 ? (achieved / total) * 100 : 0;

    return {
      totalWeight: total,
      isValid: isValidWeight,
      achievedScore: achieved,
      totalAchievedPercentage: achievedPercentage
    };
  }, [specs]);

  // Warning message if total weight is not 100%
  const weightWarning = !isValid && (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-red-500" />
      <p className="text-sm text-red-700">
        Warning: Total weight is {totalWeight}%. It should be exactly 100% for proper evaluation.
      </p>
    </div>
  );

  if (specs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <Layers className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-gray-700">No job specifications</h3>
        <p className="text-xs text-gray-400 mt-1">
          This job position has no specifications configured yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Compatibility Score</h3>
          </div>
          <span className={`text-2xl font-bold ${achievedScore === totalWeight ? 'text-green-600' : 'text-orange-600'}`}>
            {achievedScore}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-gray-600">
                Requirements Met
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-gray-600">
                {achievedScore}% / {totalWeight}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
            <div
              style={{ width: `${(achievedScore / totalWeight) * 100}%` }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                achievedScore === totalWeight ? 'bg-green-500' : 'bg-orange-500'
              }`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Weight Warning */}
      {weightWarning}

      {/* Job Specifications List */}
      <div className="flex flex-col gap-3">
        {specs.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          const isMet = item.answer === true;
          const earnedWeight = isMet ? item.weight : 0;
          
          return (
            <div 
              key={item.id} 
              className={`group relative p-4 rounded-xl ${color.bg} border ${color.border} transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${color.iconBg} ${color.text}`}>
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-800">{item.spec.en}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-medium text-gray-500">Weight: {item.weight}%</span>
                      {isMet ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Met
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" />
                          Not Met
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-bold ${isMet ? color.text : 'text-gray-400'}`}>
                    {isMet ? `+${earnedWeight}%` : '0%'}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    of {item.weight}%
                  </div>
                </div>
              </div>

              {/* Mini progress bar for each spec */}
              <div className="mt-3">
                <div className="overflow-hidden h-1 text-xs flex rounded-full bg-white/50">
                  <div
                    style={{ width: isMet ? '100%' : '0%' }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                      isMet ? color.text.replace('text', 'bg') : 'bg-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      {isValid && achievedScore === totalWeight && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700">
            Perfect match! Candidate meets all job requirements.
          </p>
        </div>
      )}

     

      {isValid && achievedScore === 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">
            Candidate does not meet any requirements.
          </p>
        </div>
      )}
    </div>
  );
};

export default JobSpec;
