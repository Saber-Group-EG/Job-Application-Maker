// applicantPdfGenerator.ts
type ApplicantLike = any;

const escapeHtml = (text: any) => {
  if (text === null || text === undefined) return '';
  const s = String(text);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
      return c;
    });
};

const toPlainString = (val: any) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val?.en || val?.ar || val?.text || String(val) || '';
  }
  return String(val);
};
const formatDateLocale = (date?: string | number, lang: 'ar' | 'en' = 'en') => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  } catch {
    return String(date);
  }
};

const formatDuration = (start?: string | number, end?: string | number) => {
  if (!start || !end) return '';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return '';
  const totalSeconds = Math.floor((e - s) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

// Format custom response key like in ApplicantData.tsx (formatCustomResponseKeyLabel)
const formatCustomResponseKeyLabel = (key: string): string => {
  if (!key) return 'Custom Field';
  // Handle Arabic text
  if (/[\u0600-\u06FF]/.test(key)) {
    return key.replace(/[_-]+/g, ' ');
  }
  // Normalize common noisy prefixes and numeric suffixes (Temp 12345, temp_12345, sav_, rec_)
  let cleaned = String(key).trim();
  // remove common prefixes (case-insensitive)
  cleaned = cleaned.replace(/^rec[_\s-]*/i, '');
  cleaned = cleaned.replace(/^sav[_\s-]*/i, '');
  cleaned = cleaned.replace(/^temp[_\s-]*/i, '');
  // remove leftover ordinal numeric tokens like a long id
  cleaned = cleaned.replace(/\b\d{4,}\b/g, '');
  // Replace underscores and hyphens with spaces
  cleaned = cleaned.replace(/[_-]+/g, ' ');
  // Convert camelCase to spaces
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Capitalize first letter of each word
  const label = cleaned
    .split(' ')
    .map(word => word.trim())
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return label || 'Temporary Field';
};

// Format custom response value similar to how it appears in the UI
const formatCustomResponseValue = (value: any, level: number = 0): string => {
  if (value === null || value === undefined) return '<em>Not provided</em>';
  
  const indent = level * 12;
  
  if (typeof value === 'string') {
    if (value.match(/^https?:\/\//i)) {
      return `<a href="${escapeHtml(value)}" target="_blank" style="color: #4f46e5; text-decoration: underline;">${escapeHtml(value)}</a>`;
    }
    return escapeHtml(value);
  }
  
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '✓ Yes' : '✗ No';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '<em>No entries</em>';
    
    // Check if it's an array of objects (work experience, courses, etc.)
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const items = value.map((item, idx) => {
        const objHtml = Object.entries(item)
          .filter(([, val]) => val !== null && val !== undefined && val !== '')
          .map(([objKey, objVal]) => {
            const formattedKey = formatCustomResponseKeyLabel(objKey);
            let formattedVal;
            if (typeof objVal === 'object' && objVal !== null) {
              if ('answer' in objVal) {
                formattedVal = escapeHtml(String(objVal.answer));
              } else if ('type' in objVal && 'answer' in objVal) {
                formattedVal = escapeHtml(String(objVal.answer));
              } else {
                formattedVal = formatCustomResponseValue(objVal, level + 1);
              }
            } else {
              formattedVal = escapeHtml(String(objVal));
            }
            return `
              <div style="display: flex; gap: 8px; padding: 4px 0; margin-left: ${indent}px;">
                <span style="min-width: 100px; font-weight: 500; color: #6b7280; font-size: 9pt;">${escapeHtml(formattedKey)}:</span>
                <span style="color: #1f2937; flex: 1; font-size: 9pt;">${formattedVal}</span>
              </div>
            `;
          }).join('');
        
        return `
          <div style="background: #f9fafb; border-radius: 6px; margin-bottom: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: #f3f4f6; padding: 8px 12px; font-weight: 600; font-size: 9pt; color: #374151; border-bottom: 1px solid #e5e7eb;">Entry ${idx + 1}</div>
            <div style="padding: 10px 12px;">${objHtml}</div>
          </div>
        `;
      }).join('');
      return `<div style="display: flex; flex-direction: column; gap: 8px;">${items}</div>`;
    }
    
    // Simple array of strings/numbers
    return `<ul style="margin: 4px 0; padding-left: 20px;">${value.map(v => `<li style="margin-bottom: 4px; font-size: 9pt;">${escapeHtml(String(v))}</li>`).join('')}</ul>`;
  }
  
  if (typeof value === 'object') {
    if (Object.keys(value).length === 0) return '<em>Empty object</em>';
    
    // Handle objects with answer property (like institutionplace)
    if ('answer' in value && value.answer !== null && value.answer !== undefined) {
      return formatCustomResponseValue(value.answer, level);
    }
    if ('value' in value && value.value !== null && value.value !== undefined) {
      return formatCustomResponseValue(value.value, level);
    }
    
    const objHtml = Object.entries(value)
      .filter(([, val]) => val !== null && val !== undefined && val !== '')
      .map(([objKey, objVal]) => {
        const formattedKey = formatCustomResponseKeyLabel(objKey);
        const formattedVal = formatCustomResponseValue(objVal, level + 1);
        return `
          <div style="display: flex; gap: 8px; padding: 4px 0; margin-left: ${indent}px;">
            <span style="min-width: 100px; font-weight: 500; color: #6b7280; font-size: 9pt;">${escapeHtml(formattedKey)}:</span>
            <span style="color: #1f2937; flex: 1; font-size: 9pt;">${formattedVal}</span>
          </div>
        `;
      }).join('');
    
    return `<div style="display: flex; flex-direction: column;">${objHtml}</div>`;
  }
  
  return escapeHtml(String(value));
};

export const generateApplicantPDF = async (opts: { applicant: ApplicantLike; lang?: 'ar' | 'en' }) => {
  const { applicant, lang = 'en' } = opts;
  const isRTL = lang === 'ar';

  // Get company name from various possible locations
  const companyName = applicant?.jobPositionId?.companyId?.name?.en || 
                      applicant?.company?.name?.en || 
                      applicant?.company?.name || 
                      applicant?.companyName || 
                      '';

  // Get job title from various possible locations
  const jobTitle = applicant?.jobPositionId?.title?.en || 
                   applicant?.jobPosition?.title || 
                   applicant?.jobTitle || 
                   '';

  const interviews = Array.isArray(applicant?.interviews) ? applicant.interviews : [];
  
  // Handle custom responses - dynamic, no hardcoded labels
  const customResponses = applicant?.customResponses || applicant?.customFieldResponses || {};
  
  const jobPositionSpecs = applicant?.jobPositionId?.jobSpecs || [];

  // Try to find saved/custom field definitions on the applicant or job position
  const collectCustomFieldDefs = () => {
    const defs: any[] = [];
    if (Array.isArray(applicant?.customFieldDefinitions)) defs.push(...applicant.customFieldDefinitions);
    if (Array.isArray(applicant?.savedFields)) defs.push(...applicant.savedFields);
    if (Array.isArray(applicant?.jobPositionId?.customFields))
      defs.push(...applicant.jobPositionId.customFields);
    if (Array.isArray(applicant?.jobPosition?.customFields)) defs.push(...applicant.jobPosition.customFields);
    return defs;
  };

  const customFieldDefs = collectCustomFieldDefs();

  const findLabelForKey = (key: string) => {
    if (!key) return '';
    // exact match
    const exact = customFieldDefs.find((f: any) => String(f?.fieldId) === String(key) || String(f?.id) === String(key));
    if (exact) return toPlainString(exact?.label) || exact?.label?.en || exact?.label || exact?.text || '';
    // match by normalized key
    const normalized = String(key).replace(/[_\s-]+/g, '').toLowerCase();
    const fuzzy = customFieldDefs.find((f: any) => {
      const ids = [f?.fieldId, f?.id, f?.name, f?.label?.en, f?.label]?.filter(Boolean).map((v: any) => String(v).replace(/[_\s-]+/g, '').toLowerCase());
      return ids && ids.some((v: any) => v && v.includes(normalized));
    });
    if (fuzzy) return toPlainString(fuzzy?.label) || fuzzy?.label?.en || fuzzy?.label || fuzzy?.text || '';
    return '';
  };

  const keyPairs = [
    ['Applicant No', String(applicant?.applicantNo || '')],
    ['Full Name', String(applicant?.fullName || '')],
    ['Email', String(applicant?.email || '')],
    ['Phone', String(applicant?.phone || '')],
    ['Status', String(applicant?.status || '').charAt(0).toUpperCase() + String(applicant?.status || '').slice(1)],
    ['Gender', String(applicant?.gender || '')],
    ['Birth Date', applicant?.birthDate ? formatDateLocale(applicant.birthDate, lang).split(',')[0] : ''],
    ['Address', String(applicant?.address || '')],
    ['Expected Salary', applicant?.expectedSalary ? `${applicant.expectedSalary} EGP` : ''],
    ['Company', String(companyName || '')],
    ['Job Title', String(jobTitle || '')],
  ].filter(([, v]) => v && String(v).trim() !== '');

  const interviewsHtml = interviews
    .map((iv: any, idx: number) => {
      const rawQuestions = Array.isArray(iv.questions) ? iv.questions : [];
      const groups = new Map<string, any[]>();
      
      rawQuestions.forEach((q: any) => {
        const groupKey = q?.group || q?.groupTitle || q?.groupName || q?.companyGroup || 'General';
        const displayGroup = typeof groupKey === 'string' && groupKey ? groupKey : 'General';
        if (!groups.has(displayGroup)) groups.set(displayGroup, []);
        groups.get(displayGroup)!.push(q);
      });

      let interviewTotalScore = 0;
      let interviewAchievedScore = 0;
      rawQuestions.forEach((q: any) => {
        const total = Number(q?.score ?? 0);
        const achieved = Number(q?.achievedScore ?? 0);
        interviewTotalScore += total;
        interviewAchievedScore += achieved;
      });

      const groupsHtml = Array.from(groups.entries())
        .map(([groupTitle, qs]) => {
          let groupTotalScore = 0;
          let groupAchievedScore = 0;
          qs.forEach((q: any) => {
            groupTotalScore += Number(q?.score ?? 0);
            groupAchievedScore += Number(q?.achievedScore ?? 0);
          });
          
          const qHtml = qs
            .map((q: any, qidx: number) => {
              const qtext = escapeHtml(q?.question || q?.title || '');
              const score = Number(q?.achievedScore ?? q?.score ?? 0);
              const total = Number(q?.score ?? 0);
              const notes = escapeHtml(q?.notes || q?.answer || '');
              const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
              let scoreColor = '#6b7280';
              let scoreBg = '#f3f4f6';
              if (percentage >= 80) {
                scoreColor = '#065f46';
                scoreBg = '#d1fae5';
              } else if (percentage >= 60) {
                scoreColor = '#92400e';
                scoreBg = '#fed7aa';
              } else if (percentage > 0) {
                scoreColor = '#991b1b';
                scoreBg = '#fee2e2';
              }
              
              return `
                <div style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">
                  <div style="min-width: 28px; font-weight: 600; color: #9ca3af; font-size: 9pt;">${qidx + 1}</div>
                  <div style="flex: 1; font-size: 10pt; color: #374151;">${qtext}</div>
                  <div style="min-width: 70px; text-align: right; font-weight: 700; font-size: 10pt; padding: 2px 8px; border-radius: 12px; background: ${scoreBg}; color: ${scoreColor};">${score} / ${total}</div>
                  ${notes ? `<div style="flex-basis: 100%; margin-top: 6px; padding-left: 40px; font-size: 9pt; color: #6b7280; font-style: italic;">📝 ${notes}</div>` : ''}
                </div>`;
            })
            .join('');

          return `
            <div style="margin-bottom: 16px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 700; font-size: 10pt; color: #1e293b;">📋 ${escapeHtml(String(groupTitle))}</div>
                <div style="font-size: 9pt; font-weight: 600; padding: 2px 8px; border-radius: 12px; background: #e0e7ff; color: #4338ca;">${groupAchievedScore} / ${groupTotalScore}</div>
              </div>
              <div style="padding: 4px 0;">${qHtml}</div>
            </div>`;
        })
        .join('');

      const started = iv?.startedAt ? formatDateLocale(iv.startedAt, lang) : '';
      const ended = iv?.endedAt ? formatDateLocale(iv.endedAt, lang) : '';
      const duration = iv?.startedAt && iv?.endedAt ? formatDuration(iv.startedAt, iv.endedAt) : '';
      const scheduledAt = iv?.scheduledAt ? formatDateLocale(iv.scheduledAt, lang) : '';
      
      let statusBgColor = '#f3f4f6';
      let statusTextColor = '#374151';
      let statusIcon = '📋';
      if (iv?.status === 'completed') {
        statusBgColor = '#d1fae5';
        statusTextColor = '#065f46';
        statusIcon = '✅';
      } else if (iv?.status === 'scheduled') {
        statusBgColor = '#dbeafe';
        statusTextColor = '#1e40af';
        statusIcon = '📅';
      } else if (iv?.status === 'in_progress') {
        statusBgColor = '#fed7aa';
        statusTextColor = '#92400e';
        statusIcon = '⏳';
      } else if (iv?.status === 'cancelled') {
        statusBgColor = '#fee2e2';
        statusTextColor = '#991b1b';
        statusIcon = '❌';
      }

      const percentage = interviewTotalScore > 0 ? Math.round((interviewAchievedScore / interviewTotalScore) * 100) : 0;

      return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 24px; overflow: hidden; break-inside: avoid; page-break-inside: avoid;">
          <div style="background: #fafbfc; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; font-size: 12pt; color: #0f172a; display: flex; align-items: center; gap: 8px;">
              <span>🎯</span> Interview ${idx + 1}
            </div>
            <div style="padding: 4px 12px; border-radius: 20px; font-size: 8pt; font-weight: 600; display: flex; align-items: center; gap: 4px; background: ${statusBgColor}; color: ${statusTextColor};">
              <span>${statusIcon}</span> ${escapeHtml(iv?.status || 'pending')}
            </div>
          </div>
          <div style="padding: 12px 20px; background: #f8fafc; display: flex; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; color: #475569;">
            ${scheduledAt ? `<div style="display: flex; align-items: center; gap: 6px;">📅 Scheduled: ${escapeHtml(scheduledAt)}</div>` : ''}
            ${started ? `<div style="display: flex; align-items: center; gap: 6px;">▶ Started: ${escapeHtml(started)}</div>` : ''}
            ${ended ? `<div style="display: flex; align-items: center; gap: 6px;">⏹ Ended: ${escapeHtml(ended)}</div>` : ''}
            ${duration ? `<div style="display: flex; align-items: center; gap: 6px;">⏱ Duration: ${escapeHtml(duration)}</div>` : ''}
            ${iv?.type ? `<div style="display: flex; align-items: center; gap: 6px;">📞 Type: ${escapeHtml(iv.type)}</div>` : ''}
            ${iv?.scheduledBy?.fullName ? `<div style="display: flex; align-items: center; gap: 6px;">👤 Interviewer: ${escapeHtml(iv.scheduledBy.fullName)}</div>` : ''}
          </div>
          ${interviewTotalScore > 0 ? `
            <div style="padding: 12px 20px; background: #f0f9ff; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="font-weight: 600; color: #0c4a6e; font-size: 9pt;">Overall Score:</div>
                <div style="font-weight: 700; font-size: 14pt; color: #0284c7;">${interviewAchievedScore}</div>
                <div style="font-size: 10pt; color: #475569;">/ ${interviewTotalScore}</div>
                <div style="font-size: 9pt; font-weight: 600; padding: 2px 8px; border-radius: 12px; background: #dbeafe; color: #1e40af;">(${percentage}%)</div>
                <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; max-width: 200px;">
                  <div style="height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); border-radius: 3px; width: ${percentage}%;"></div>
                </div>
              </div>
            </div>
          ` : ''}
          <div style="padding: 16px 20px;">${groupsHtml}</div>
          ${iv?.notes ? `<div style="padding: 12px 20px; background: #fffbeb; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #b45309;">📌 Interview Notes: ${escapeHtml(iv.notes)}</div>` : ''}
        </div>`;
    })
    .join('');

  // Dynamic custom responses - using the same label formatting as ApplicantData
  const customHtml = Object.keys(customResponses || {})
    .filter(k => {
      const v = customResponses[k];
      return v !== null && v !== undefined && v !== '' && 
             !(Array.isArray(v) && v.length === 0) &&
             !(typeof v === 'object' && Object.keys(v).length === 0);
    })
    .map((k) => {
      const v = customResponses[k];
      const labelFromDef = findLabelForKey(k);
      const label = labelFromDef || formatCustomResponseKeyLabel(k);
      const formattedValue = formatCustomResponseValue(v);
      return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; break-inside: avoid; page-break-inside: avoid;">
          <div style="background: #f8fafc; padding: 10px 12px; font-weight: 600; font-size: 10pt; color: #1e293b; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px;">
            <span>📄</span> ${escapeHtml(label)}
          </div>
          <div style="padding: 12px; font-size: 9.5pt; color: #334155; background: white;">${formattedValue}</div>
        </div>`;
    })
    .join('');

  const specSources: any[] = (() => {
    if (jobPositionSpecs.length > 0) return jobPositionSpecs;
    if (Array.isArray(applicant?.jobSpecsWithDetails) && applicant.jobSpecsWithDetails.length)
      return applicant.jobSpecsWithDetails;
    if (Array.isArray(applicant?.jobSpecs) && applicant.jobSpecs.length)
      return applicant.jobSpecs;
    const populatedJobPos =
      typeof applicant?.jobPositionId === 'object'
        ? applicant.jobPositionId
        : typeof applicant?.jobPosition === 'object'
          ? applicant.jobPosition
          : null;
    if (populatedJobPos) {
      if (Array.isArray(populatedJobPos.jobSpecsWithDetails) && populatedJobPos.jobSpecsWithDetails.length)
        return populatedJobPos.jobSpecsWithDetails;
      if (Array.isArray(populatedJobPos.jobSpecs) && populatedJobPos.jobSpecs.length)
        return populatedJobPos.jobSpecs;
    }
    return [];
  })();

  const appSpecSources: any[] = (() => {
    if (Array.isArray(applicant?.jobSpecsWithDetails) && applicant.jobSpecsWithDetails.length)
      return applicant.jobSpecsWithDetails;
    if (Array.isArray(applicant?.jobSpecs) && applicant.jobSpecs.length)
      return applicant.jobSpecs;
    const populatedJobPos =
      typeof applicant?.jobPositionId === 'object'
        ? applicant.jobPositionId
        : typeof applicant?.jobPosition === 'object'
          ? applicant.jobPosition
          : null;
    if (populatedJobPos) {
      if (Array.isArray(populatedJobPos.jobSpecsWithDetails) && populatedJobPos.jobSpecsWithDetails.length)
        return populatedJobPos.jobSpecsWithDetails;
      if (Array.isArray(populatedJobPos.jobSpecs) && populatedJobPos.jobSpecs.length)
        return populatedJobPos.jobSpecs;
    }
    return [];
  })();

  const applicantAnswerMap: Record<string, boolean> = {};
  for (const s of appSpecSources) {
    if (!s) continue;
    const ids = [s._id, s.id, s.jobSpecId]
      .filter(Boolean)
      .map((x: any) =>
        typeof x === 'object' ? (x._id ?? x.id ?? String(x)) : String(x)
      );
    for (const specId of ids) {
      applicantAnswerMap[specId] =
        typeof s.answer === 'boolean' ? s.answer : Boolean(s.answer);
    }
  }

  const getSpecAnswer = (specEntry: any, idx: number): boolean => {
    if (!specEntry) return false;
    const specId = String(specEntry._id ?? specEntry.id ?? specEntry.jobSpecId ?? '');
    if (specId && applicantAnswerMap[specId] !== undefined) {
      return applicantAnswerMap[specId];
    }
    if (appSpecSources[idx] !== undefined) {
      const nextAnswer = appSpecSources[idx].answer;
      return typeof nextAnswer === 'boolean' ? nextAnswer : Boolean(nextAnswer);
    }
    return false;
  };

  const resolveSpecText = (specEntry: any, idx: number): string => {
    const appSpec = appSpecSources[idx];
    if (appSpec?.spec) {
      if (typeof appSpec.spec === 'string') return appSpec.spec;
      if (typeof appSpec.spec === 'object') {
        return appSpec.spec.en ?? appSpec.spec.ar ?? appSpec.spec.value ?? '';
      }
    }
    if (specEntry?.spec) {
      if (typeof specEntry.spec === 'string') return specEntry.spec;
      if (typeof specEntry.spec === 'object') {
        return specEntry.spec.en ?? specEntry.spec.ar ?? specEntry.spec.value ?? '';
      }
    }
    return '';
  };

  const jobSpecsHtml = specSources.length > 0
    ? specSources.map((s: any, idx: number) => {
        const specText = resolveSpecText(s, idx);
        const answered = getSpecAnswer(s, idx);
        const weight = typeof s?.weight === 'number' || s?.weight
          ? ` (${Number(s?.weight ?? 0)}%)`
          : '';
        return `
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12pt; font-weight: 700; ${answered ? 'background: #10b981; color: white;' : 'background: #e5e7eb; color: #6b7280;'}">${answered ? '✓' : '○'}</div>
            <div style="flex: 1; font-size: 10pt; color: #334155;">${escapeHtml(String(specText || '(no spec)'))}${weight}</div>
          </div>`;
      }).join('')
    : '<div style="color: #6b7280; text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">No job specifications available</div>';

  const generatedDate = formatDateLocale(new Date().toISOString(), lang);

  const html = `<!DOCTYPE html>
  <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Applicant ${escapeHtml(applicant?.fullName || '')}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        font-size: 10pt;
        color: #1e293b;
        padding: 15mm;
        line-height: 1.5;
        background: white;
      }
      @media print {
        body {
          padding: 10mm;
        }
        .page-break {
          page-break-before: always;
        }
        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
      a {
        color: #4f46e5;
        text-decoration: underline;
      }
      h1, h2, h3 {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <!-- Header Bar -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); height: 4px; margin-bottom: 20px;"></div>
    
    <!-- Header Section -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 6px; letter-spacing: -0.3px;">${escapeHtml(String(applicant?.fullName || 'Applicant'))}</h1>
        <div style="color: #64748b; font-size: 9pt; display: flex; gap: 16px; margin-top: 4px;">
          <span>📅 Generated: ${escapeHtml(generatedDate)}</span>
          ${applicant?.applicantNo ? `<span>🆔 ID: ${escapeHtml(String(applicant.applicantNo))}</span>` : ''}
        </div>
      </div>
      <div style="text-align: right; padding: 8px 16px; background: #f8fafc; border-radius: 8px;">
        ${companyName ? `<div style="font-weight: 600; color: #0f172a; font-size: 11pt;">🏢 ${escapeHtml(String(companyName))}</div>` : ''}
        ${jobTitle ? `<div style="color: #64748b; font-size: 9pt; margin-top: 4px;">💼 ${escapeHtml(String(jobTitle))}</div>` : ''}
      </div>
    </div>

    <!-- Summary Section -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
      <div style="font-size: 13pt; font-weight: 700; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>📋</span> Summary
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px;">
        ${keyPairs.map(([k, v]) => `
          <div style="display: flex; font-size: 10pt; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
            <strong style="min-width: 110px; font-weight: 600; color: #64748b;">${escapeHtml(k)}:</strong>
            <span style="color: #1e293b;">${escapeHtml(v)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Custom Responses Section -->
    ${customHtml ? `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13pt; font-weight: 700; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>📝</span> Custom Responses
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px;">
        ${customHtml}
      </div>
    </div>
    ` : ''}

    <!-- Job Specifications Section -->
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13pt; font-weight: 700; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>✓</span> Job Specifications
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${jobSpecsHtml}
      </div>
    </div>

    <!-- Interviews Section -->
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13pt; font-weight: 700; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>🎯</span> Interviews
      </div>
      ${interviewsHtml || '<div style="color: #64748b; text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px;">No interviews recorded</div>'}
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 8pt; border-top: 1px solid #e2e8f0;">
      Generated by Applicant Tracking System
    </div>
  </body>
  </html>`;

  return html;
};

export const downloadApplicantPDF = async (htmlContent: string, filename = 'applicant.pdf') => {
  return new Promise<void>(async (resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument!;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Wait for rendering
        await new Promise((r) => setTimeout(r, 800));

        const element = iframeDoc.body;
        if (!element) throw new Error('PDF element not found');

        const html2pdfModule: any = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;

        const opt = {
          margin: [0.3, 0.3, 0.3, 0.3],
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            letterRendering: true
          },
          jsPDF: { 
            unit: 'in', 
            format: 'a4', 
            orientation: 'portrait' 
          }
        };

        await html2pdf().set(opt).from(element).save();
        resolve();
      } catch (err) {
        console.error('PDF generation error:', err);
        reject(err);
      } finally {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }
    };

    iframe.src = 'about:blank';
  });
};