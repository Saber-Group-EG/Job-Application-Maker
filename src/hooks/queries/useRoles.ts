// hooks/queries/useRoles.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesService } from "../../services/rolesService";
import type {
  CreateRoleRequest,
  UpdateRoleRequest,
  Role,
} from "../../types/roles";
import { ApiError } from "../../services/companiesService";
import Swal from "../../utils/swal";
import { useLocale } from "../../context/LocaleContext";

// Query keys
export const rolesKeys = {
  all: ["roles"] as const,
  lists: () => [...rolesKeys.all, "list"] as const,
  list: () => [...rolesKeys.lists()] as const,
  detail: (id: string) => [...rolesKeys.all, "detail", id] as const,
  permissions: () => [...rolesKeys.all, "permissions"] as const,
  rolePermissions: (roleId: string) => [...rolesKeys.permissions(), roleId] as const,
};

// Get all roles
export function useRoles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: rolesKeys.list(),
    queryFn: () => rolesService.getAllRoles(),
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// Get role by ID
export function useRole(id: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: rolesKeys.detail(id),
    queryFn: () => rolesService.getRoleById(id),
    enabled: options?.enabled ?? !!id,
    staleTime: 10 * 60 * 1000,
    initialData: () => {
      const cached = queryClient.getQueryData<Role[]>(rolesKeys.list());
      return cached?.find(role => role._id === id);
    },
  });
}

// Get all permissions
export function usePermissions() {
  return useQuery({
    queryKey: rolesKeys.permissions(),
    queryFn: () => rolesService.getAllPermissions(),
    staleTime: 10 * 60 * 1000,
  });
}

// Get permissions by role
export function useRolePermissions(roleId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: rolesKeys.rolePermissions(roleId),
    queryFn: () => rolesService.getPermissionsByRole(roleId),
    enabled: options?.enabled ?? !!roleId,
    staleTime: 10 * 60 * 1000,
  });
}

// Create role
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesService.createRole(data),
    onSuccess: (newRole) => {
      // Update list cache
      queryClient.setQueryData<Role[]>(rolesKeys.list(), (old) => {
        if (!old) return [newRole];
        return [...old.filter(role => !role._id?.startsWith('temp-')), newRole];
      });
      
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
      showSuccessToast(t('roleCreated', 'common'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('roleCreateFailed', 'common'), t);
    },
  });
}

// Update role
export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      rolesService.updateRole(id, data),
    onSuccess: (updatedRole, { id }) => {
      // Update detail cache
      queryClient.setQueryData(rolesKeys.detail(id), updatedRole);
      
      // Update list cache
      queryClient.setQueryData<Role[]>(rolesKeys.list(), (old) => {
        if (!old) return [updatedRole];
        return old.map(role => role._id === id ? updatedRole : role);
      });
      
      // Invalidate list to ensure fresh data on next navigation
      queryClient.invalidateQueries({ queryKey: rolesKeys.list() });
      
      showSuccessToast(t('roleUpdated', 'common'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('roleUpdateFailed', 'common'), t);
    },
  });
}

// Delete role
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => rolesService.deleteRole(id),
    onSuccess: (_, id) => {
      // Remove from list cache
      queryClient.setQueryData<Role[]>(rolesKeys.list(), (old) => {
        if (!old) return [];
        return old.filter(role => role._id !== id);
      });
      
      // Remove detail cache
      queryClient.removeQueries({ queryKey: rolesKeys.detail(id) });
      
      showSuccessToast(t('roleDeleted', 'common'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('roleDeleteFailed', 'common'), t);
    },
  });
}

// Assign permissions to role
export function useAssignPermissionsToRole() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      rolesService.assignPermissionsToRole(roleId, permissions),
    onSuccess: (updatedRole, { roleId }) => {
      // Invalidate permissions cache
      queryClient.invalidateQueries({ queryKey: rolesKeys.rolePermissions(roleId) });
      
      // Update role detail cache
      queryClient.setQueryData(rolesKeys.detail(roleId), updatedRole);
      
      showSuccessToast(t('permissionsAssigned', 'common'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('permissionsAssignFailed', 'common'), t);
    },
  });
}

// Remove permission from role
export function useRemovePermissionFromRole() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      rolesService.removePermissionFromRole(roleId, permissionId),
    onSuccess: (_, { roleId}) => {
      // Invalidate permissions cache
      queryClient.invalidateQueries({ queryKey: rolesKeys.rolePermissions(roleId) });
      
      showSuccessToast(t('permissionRemoved', 'common'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('permissionRemoveFailed', 'common'), t);
    },
  });
}

// ===== Toast Helpers =====
function showSuccessToast(message: string, t: (key: string, ns?: string) => string) {
  Swal.fire({
    title: t('success', 'common'),
    text: message,
    icon: "success",
    timer: 1500,
    showConfirmButton: false,
  });
}

function showErrorToast(message: string, fallback: string, t: (key: string, ns?: string) => string) {
  Swal.fire({
    title: t('error', 'common'),
    text: message || fallback,
    icon: "error",
  });
}