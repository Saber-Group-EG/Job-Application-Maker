// ─── Sidebar Nav Item (mirrors MailPreview) ───────────────────────────────────

export function SidebarNavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            active
              ? 'bg-brand-200 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
}
