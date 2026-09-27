import { describeError } from '../../../lib/userErrors';
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

// The message to show for a failed user request (see lib/userErrors).
export function readApiErrorMessage(err: unknown): string | undefined {
  return describeError(err).message;
}
