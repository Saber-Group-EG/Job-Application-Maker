// Permission and department pickers shared by the Create and Edit user pages.
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { KeyRound, Plus, Search, X } from "lucide-react";
import { useLocale } from "../../../../context/LocaleContext";
import { toPlainString } from "../../../../utils/strings";
import {
  Button,
  Card,
  CardToolbar,
  EmptyState,
  IconButton,
  SectionTitle,
  Segmented,
  Table,
  Td,
  Th,
  focusRing,
  inputClass,
  rowClass,
  selectClass,
} from "../../../../components/ui/kit";

export type UserPermission = {
  permission: string;
  access: string[];
};

const MATRIX_ACTIONS = ["read", "write", "create"] as const;

const checkboxClass =
  "size-4 cursor-pointer rounded border-slate-300 accent-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600";

// A toggleable pill, used for permission actions and departments.
export function ChipToggle({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${focusRing} ${
        selected
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400/60 dark:bg-brand-500/15 dark:text-brand-300"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

export function DepartmentPicker({
  departments,
  selected,
  onChange,
  emptyText,
}: {
  departments: any[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText: string;
}) {
  if (departments.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {departments.map((d: any) => {
        const isSelected = selected.includes(d._id);
        return (
          <ChipToggle
            key={d._id}
            selected={isSelected}
            onClick={() =>
              onChange(isSelected ? selected.filter((id) => id !== d._id) : [...selected, d._id])
            }
          >
            {toPlainString(d.name)}
          </ChipToggle>
        );
      })}
    </div>
  );
}

export function UserPermissionsEditor({
  catalog,
  value,
  onChange,
  getDefaultAccess,
}: {
  catalog: any[];
  value: UserPermission[];
  onChange: Dispatch<SetStateAction<UserPermission[]>>;
  getDefaultAccess: (permissionId: string) => string[];
}) {
  const { t } = useLocale();
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
  const [search, setSearch] = useState("");
  const [toAdd, setToAdd] = useState("");

  const available = useMemo(() => {
    const selectedIds = new Set(value.map((item) => item.permission));
    return catalog.filter((perm: any) => !selectedIds.has(perm._id));
  }, [catalog, value]);

  // A role change can preload the module that was picked in the dropdown;
  // treat it as cleared once it's no longer available.
  const addValue = available.some((perm: any) => perm._id === toAdd) ? toAdd : "";

  const selectedMap = useMemo(
    () => new Map(value.map((item) => [item.permission, item.access])),
    [value]
  );

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalog;
    return catalog.filter((perm: any) =>
      toPlainString(perm.name || "").toLowerCase().includes(term)
    );
  }, [catalog, search]);

  const add = () => {
    if (!addValue) return;
    onChange((prev) => {
      if (prev.some((item) => item.permission === addValue)) return prev;
      return [...prev, { permission: addValue, access: getDefaultAccess(addValue) }];
    });
    setToAdd("");
  };

  const remove = (permissionId: string) =>
    onChange((prev) => prev.filter((item) => item.permission !== permissionId));

  const toggleAccess = (permissionId: string, action: string) =>
    onChange((prev) =>
      prev.map((item) => {
        if (item.permission !== permissionId) return item;
        const hasAccess = item.access.includes(action);
        return {
          ...item,
          access: hasAccess ? item.access.filter((acc) => acc !== action) : [...item.access, action],
        };
      })
    );

  const setSelection = (permissionId: string, selected: boolean) => {
    if (!selected) {
      remove(permissionId);
      return;
    }
    onChange((prev) => {
      if (prev.some((item) => item.permission === permissionId)) return prev;
      return [...prev, { permission: permissionId, access: getDefaultAccess(permissionId) }];
    });
  };

  const setAction = (permissionId: string, action: string, enabled: boolean) =>
    onChange((prev) => {
      const existing = prev.find((item) => item.permission === permissionId);
      if (!existing) {
        if (!enabled) return prev;
        return [...prev, { permission: permissionId, access: [action] }];
      }
      const nextAccess = enabled
        ? Array.from(new Set([...existing.access, action]))
        : existing.access.filter((acc) => acc !== action);
      return prev.map((item) =>
        item.permission === permissionId ? { ...item, access: nextAccess } : item
      );
    });

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<KeyRound className="size-4" />}>
            {t('permEditorTitle', 'users')}
          </SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('permEditorHint', 'users')}
          </p>
        </div>
        <Segmented
          ariaLabel={t('permEditorViewLabel', 'users')}
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "cards", label: t('permEditorViewList', 'users') },
            { value: "matrix", label: t('permEditorViewMatrix', 'users') },
          ]}
        />
      </CardToolbar>

      {viewMode === "cards" && (
        <div className="space-y-4 p-4">
          <div className="flex gap-2">
            <select
              value={addValue}
              onChange={(e) => setToAdd(e.target.value)}
              aria-label={t('permEditorAddPlaceholder', 'users')}
              className={selectClass}
            >
              <option value="">{t('permEditorAddPlaceholder', 'users')}</option>
              {available.map((perm: any) => (
                <option key={perm._id} value={perm._id}>
                  {toPlainString(perm.name)}
                </option>
              ))}
            </select>
            <Button onClick={add} disabled={!addValue} icon={<Plus className="size-4" />}>
              {t('permEditorAdd', 'users')}
            </Button>
          </div>

          {value.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="size-6" />}
              title={t('permEditorEmptyTitle', 'users')}
              text={t('permEditorEmptyText', 'users')}
            />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {value.map((permItem) => {
                const permObj = catalog.find((perm: any) => perm._id === permItem.permission);
                const name = toPlainString(permObj?.name || t('permEditorUnknown', 'users'));
                const actions = Array.from(
                  new Set([
                    ...MATRIX_ACTIONS,
                    ...getDefaultAccess(permItem.permission),
                    ...permItem.access,
                  ])
                );
                return (
                  <li
                    key={permItem.permission}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {actions.map((action) => (
                        <ChipToggle
                          key={action}
                          selected={permItem.access.includes(action)}
                          onClick={() => toggleAccess(permItem.permission, action)}
                        >
                          <span className="capitalize">{action}</span>
                        </ChipToggle>
                      ))}
                      <IconButton
                        tone="danger"
                        label={t('permEditorRemove', 'users', { name })}
                        onClick={() => remove(permItem.permission)}
                      >
                        <X className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {viewMode === "matrix" && (
        <>
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('permEditorSearch', 'users')}
                aria-label={t('permEditorSearch', 'users')}
                className={`${inputClass} ps-9`}
              />
            </div>
          </div>
          <Table minWidth={560}>
            <thead>
              <tr>
                <Th>{t('permEditorColModule', 'users')}</Th>
                <Th>{t('permEditorColUse', 'users')}</Th>
                <Th>{t('permEditorColRead', 'users')}</Th>
                <Th>{t('permEditorColWrite', 'users')}</Th>
                <Th>{t('permEditorColCreate', 'users')}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((perm: any) => {
                const permissionId = String(perm._id);
                const name = toPlainString(perm.name);
                const selectedAccess = selectedMap.get(permissionId) || [];
                const isSelected = selectedMap.has(permissionId);
                return (
                  <tr key={permissionId} className={rowClass}>
                    <Td className="font-medium text-slate-900 dark:text-white">{name}</Td>
                    <Td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => setSelection(permissionId, e.target.checked)}
                        aria-label={`${name}: ${t('permEditorColUse', 'users')}`}
                        className={checkboxClass}
                      />
                    </Td>
                    {MATRIX_ACTIONS.map((action) => (
                      <Td key={action}>
                        <input
                          type="checkbox"
                          disabled={!isSelected}
                          checked={selectedAccess.includes(action)}
                          onChange={(e) => setAction(permissionId, action, e.target.checked)}
                          aria-label={`${name}: ${action}`}
                          className={checkboxClass}
                        />
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {filteredCatalog.length === 0 && (
            <EmptyState
              icon={<Search className="size-6" />}
              title={t('permEditorNoMatches', 'users')}
            />
          )}
        </>
      )}
    </Card>
  );
}
