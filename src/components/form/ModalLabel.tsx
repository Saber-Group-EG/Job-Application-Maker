export function ModalLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}
