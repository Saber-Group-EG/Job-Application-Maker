// Shared by the offer and contract editors: Undo for removals and helpers
// for deciding whether a draft holds anything the user typed.
import type { BulkOverrideMap } from './BulkSalaryReview';

export { useRemoveWithUndo } from '../../../hooks/useRemoveWithUndo';

type SectionLike = { _id: string; items: { _id: string }[] };

/** What SectionsEditor's onChange removed, if anything. */
export function detectSectionRemoval(
  prev: SectionLike[],
  next: SectionLike[]
): 'section' | 'item' | null {
  const nextIds = new Set(next.map((s) => s._id));
  if (prev.some((s) => !nextIds.has(s._id))) return 'section';
  for (const s of next) {
    const before = prev.find((p) => p._id === s._id);
    if (before && s.items.length < before.items.length) return 'item';
  }
  return null;
}

const hasText = (v: unknown): boolean => {
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.values(v).some(hasText);
  return false;
};

/** True when none of the values hold user-written content. */
export const allBlank = (...values: unknown[]) => !values.some(hasText);

/** True when the bulk salary/position review holds typed custom values. */
export const hasCustomBulkValues = (map: BulkOverrideMap) =>
  Object.values(map).some(
    (o) =>
      o.customSalary !== '' ||
      o.customPositionEn.trim() !== '' ||
      o.customPositionAr.trim() !== ''
  );
