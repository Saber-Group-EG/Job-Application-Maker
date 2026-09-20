import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

interface RoleProtectedRouteProps {
  roles: string[]; // role names (matched case-insensitively) allowed to pass
}

/**
 * Mirrors PermissionProtectedRoute, but gates on role names instead of
 * permission strings — used for the promo-code sections where the backend
 * enforces access by role (admin/super-admin, or "HR Manager"). This is
 * UX-only; the backend is the real source of truth.
 */
export default function RoleProtectedRoute({ roles }: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const roleName = String(
    user?.roleId?.name || user?.role || ''
  ).toLowerCase();
  const hasAccess = roles.some((role) => role.toLowerCase() === roleName);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}