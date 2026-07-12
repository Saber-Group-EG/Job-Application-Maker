## Goal
- Add Arabic (RTL) translation support with a locale toggle, translating key pages.

## Constraints & Preferences
- Custom `LocaleContext` with `t(key, namespace, params?)` — no i18n library
- Plurals via `key` / conditional; `dir` on `<html>`, persisted in localStorage (default `'en'`)
- New locale files imported statically in `LocaleContext.tsx`
- Build must compile without errors

## Done
- Created `locales/en/{sidebar,common,home,interview,rejection,applicants}.json`
- Created `locales/ar/{sidebar,common,home,interview,rejection,applicants}.json`
- `src/context/LocaleContext.tsx` — provider, `t()`, `dir`/`lang` on `<html>`, localStorage, `applicants` namespace
- `src/main.tsx` — wrapped with `<LocaleProvider>`
- `src/layout/AppHeader.tsx` — language toggle button ("AR"/"EN")
- `src/layout/AppSidebar.tsx` — all menu text uses `t()`, directional classes conditional on `dir`; fixed pre-existing TS error (`tKey: undefined` on dynamic items, `filterSubItems` type)
- `src/layout/AppLayout.tsx` — RTL-aware content padding
- `src/pages/Dashboard/Home.tsx` — all visible strings use `t()`; status cards English-only (API data)
- `src/components/charts/MyInterviewWidget.tsx` — translated
- `src/components/charts/RejectionInsightsChart.tsx` — all strings `t()`, chart NOT RTL-flipped (bars LTR), grid `dir="ltr"` with sidebar on left always
- `src/pages/Recruiting/applicants/Table/ApplicantsTable.tsx` (2840 lines) — all column headers, toolbar, bulk actions, Swal dialogs, download/restore, time-relative, interview preview, PageMeta/Breadcrumb/ComponentCard use `t()` with `applicants` namespace
- `src/pages/Recruiting/applicants/Table/components/StatusCell.tsx` — fallback tooltip uses `t()`
- `src/pages/Recruiting/applicants/Table/components/ColumnMultiSelectHeader.tsx` — "Clear" and "No options available" use `t()`
- `src/pages/Recruiting/applicants/Table/ApplicantsMobilePage.tsx` (1565 lines) — all visible strings use `t()`
- Build compiles with 0 TS errors

## Key Decisions
- Reverted all RTL chart direction changes — bars remain LTR in both modes
- Grid layout for chart+sidebar uses `dir="ltr"` on container, `dir={dir}` on children — sidebar stays on left
- Action button labels removed `{count}` template (caused key collisions between desktop and mobile); use template literals `\`${t(key)} (${count})\`` instead
- Export notification now uses inline `Swal.fire` with `t()` instead of `showExportNotification` helper

## Not Yet Translated
- Jobs page
- Company Settings page
- User Settings page
- Mail Preview

## Relevant Files
- `locales/{en,ar}/*.json`
- `src/context/LocaleContext.tsx`
- `src/layout/{AppSidebar,AppHeader,AppLayout}.tsx`
- `src/pages/Dashboard/Home.tsx`
- `src/components/charts/{MyInterviewWidget,RejectionInsightsChart}.tsx`
- `src/pages/Recruiting/applicants/Table/{ApplicantsTable,ApplicantsMobilePage}.tsx`
- `src/pages/Recruiting/applicants/Table/components/{StatusCell,ColumnMultiSelectHeader}.tsx`
