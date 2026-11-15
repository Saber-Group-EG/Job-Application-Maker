// How a company status counts in the hiring reports. Mirrors the backend's
// default rule (application-maker: services/reports/hiringPath.js) so the
// Statuses tab shows what the reports will actually use.
export type ReportRole = 'step' | 'exit' | 'ignore';

const DEFAULT_STEPS = new Set(['pending', 'interview', 'interviewed', 'approve', 'approved', 'hired']);

export const defaultReportRole = (name?: string): ReportRole => {
  const n = String(name ?? '').trim().toLowerCase();
  if (DEFAULT_STEPS.has(n)) return 'step';
  if (n === 'trashed' || n.includes('reject')) return 'exit';
  return 'ignore';
};

export const effectiveReportRole = (status: { name?: string; reportRole?: ReportRole }): ReportRole =>
  status.reportRole ?? defaultReportRole(status.name);
