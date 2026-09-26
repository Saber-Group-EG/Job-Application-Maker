// Helpers shared by the Create and Edit user pages.

export type UserPermission = {
  permission: string;
  access: string[];
};

// How a permission shows up on a role or user from the API: a bare id, or
// an entry whose `permission` is an id or a populated document.
export type PermissionRef =
  | string
  | {
      permission?: string | { _id?: string } | null;
      access?: string[];
    };

// Merge raw permission refs into one entry per permission, lower-casing the
// actions. Entries without explicit access get the permission's defaults.
export function normalizePermissionRefs(
  raw: unknown,
  getDefaultAccess: (permissionId: string) => string[]
): UserPermission[] {
  const refs: PermissionRef[] = Array.isArray(raw) ? raw : [];
  const merged = new Map<string, Set<string>>();

  refs.forEach((ref) => {
    const permissionId =
      typeof ref === "string"
        ? ref
        : typeof ref?.permission === "string"
          ? ref.permission
          : ref?.permission?._id || "";

    if (!permissionId) return;

    const explicit = typeof ref === "string" ? undefined : ref?.access;
    const accessList =
      Array.isArray(explicit) && explicit.length > 0
        ? explicit.map((action) => String(action).toLowerCase())
        : getDefaultAccess(permissionId);

    const existing = merged.get(permissionId) || new Set<string>();
    accessList.forEach((action) => existing.add(action));
    merged.set(permissionId, existing);
  });

  return Array.from(merged.entries()).map(([permission, accessSet]) => ({
    permission,
    access: Array.from(accessSet),
  }));
}

type ApiErrorBody =
  | string
  | {
      message?: string;
      error?: { message?: string };
      errors?: Array<{ message?: string } | string>;
      details?: Array<{ message?: string } | string>;
    };

type ErrorLike = {
  message?: string;
  response?: { data?: ApiErrorBody };
};

const firstMessage = (item: { message?: string } | string) =>
  typeof item === "string" ? item : item.message || String(item);

// The most specific message an API error carries, or undefined when the
// response has a body we don't recognize (callers show their own fallback).
export function readApiErrorMessage(err: unknown): string | undefined {
  const e = (err ?? {}) as ErrorLike;
  const data = e.response?.data;
  if (data) {
    if (typeof data === "string") return data;
    if (data.message) return data.message;
    if (data.error?.message) return data.error.message;
    if (Array.isArray(data.errors) && data.errors.length > 0) return firstMessage(data.errors[0]);
    if (Array.isArray(data.details) && data.details.length > 0) return firstMessage(data.details[0]);
    return undefined;
  }
  return e.message || undefined;
}
