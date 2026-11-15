// Which of a company's statuses means "the applicant didn't show up".
// Mirrors the backend (application-maker: src/utils/noShow.js). Keep the two in step.
//
// settings.noShow.mode:
//   'status' → the status named in noShow.status (picked in Settings → Statuses)
//   'off'    → no status is a no-show
//   'auto'   → (default) guess from the status names
// A picked status that no longer exists falls back to the guess.

export type NoShowMode = 'auto' | 'status' | 'off';
export type NoShowSetting = { mode: NoShowMode; status?: string | null };

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
const simplify = (s: unknown) =>
  norm(s).replace(/[’'`´]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const NO_SHOW_NAME =
  /\bno ?shows?\b|\bdid ?n(?:o)?t (?:attend|attent|atend|show|come|turn up)|\babsent\b|\bmissed\b|\bnot attended\b|لم ?ي?حضر|غياب|غائب|تغيب|عدم الحضور/;

export const looksLikeNoShow = (name: unknown) => NO_SHOW_NAME.test(simplify(name));

type StatusLike = { name?: string };
type SettingsLike = { statuses?: StatusLike[]; noShow?: Partial<NoShowSetting> | null } | null | undefined;

/** The status the name guess would pick, or null. */
export const guessedNoShowStatus = (statuses: StatusLike[] = []) =>
  statuses.find((s) => looksLikeNoShow(s?.name))?.name ?? null;

/** The company's no-show status name, or null when it has none. */
export function noShowStatusName(settings: SettingsLike): string | null {
  const statuses = settings?.statuses || [];
  const mode = settings?.noShow?.mode || 'auto';
  if (mode === 'off') return null;
  if (mode === 'status' && settings?.noShow?.status) {
    const picked = statuses.find((s) => norm(s?.name) === norm(settings.noShow?.status));
    if (picked?.name) return picked.name;
  }
  return guessedNoShowStatus(statuses);
}

export const isNoShowStatus = (settings: SettingsLike, status: unknown) => {
  if (!status) return false;
  const name = noShowStatusName(settings);
  return Boolean(name) && norm(name) === norm(status);
};

/** Settings may arrive as the company (with .settings) or the settings object itself. */
export const settingsOf = (companyOrSettings: any): SettingsLike =>
  companyOrSettings?.settings?.statuses ? companyOrSettings.settings : companyOrSettings;

export const noShowReasonsOf = (companyOrSettings: any): string[] => {
  const s = settingsOf(companyOrSettings) as any;
  const list = s?.noShowReasons ?? companyOrSettings?.noShowReasons;
  return Array.isArray(list) ? list.map((r: unknown) => String(r ?? '').trim()).filter(Boolean) : [];
};
