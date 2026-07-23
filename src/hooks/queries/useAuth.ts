// hooks/queries/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../services/authService";
import type { 
  LoginRequest, 
  RegisterRequest, 
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  Verify2FASetupRequest,
  Disable2FARequest,
  Verify2FALoginRequest,
  User,
  ApiError,
  LoginResult,
} from "../../types/auth";
import { tokenStorage } from "../../config/api";
import Swal from "../../utils/swal";
import { useLocale } from "../../context/LocaleContext";

// ===== Query Keys =====
export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  currentUser: () => [...authKeys.user(), "current"] as const,
};

// ===== QUERIES =====

export function useCurrentUser(options?: { enabled?: boolean }) {
  const hasToken = !!tokenStorage.getAccessToken();

  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    enabled: options?.enabled ?? hasToken,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    // ✅ Add refetch on mount to ensure fresh data
    refetchOnMount: true,
    // ✅ Don't use cached data if token exists but user might be different
    refetchOnWindowFocus: true,
  });
}

// ===== MUTATIONS =====

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: async (result: LoginResult) => {
      if (result.type === '2fa') return;
      queryClient.setQueryData(authKeys.currentUser(), result.user);
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: ApiError) => {
      queryClient.removeQueries({ queryKey: authKeys.currentUser() });
      showErrorToast(error.message, t('loginFailed', 'common'), t);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authService.register(userData),
    onSuccess: async (user: User) => {
      queryClient.setQueryData(authKeys.currentUser(), user);
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: ApiError) => {
      queryClient.removeQueries({ queryKey: authKeys.currentUser() });
      showErrorToast(error.message, t('registrationFailed', 'common'), t);
    },
  });
}

// hooks/queries/useAuth.ts - Update the logout mutation
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: async () => {
      // Clear tokens first
      tokenStorage.clearTokens();
      // Call logout (if it makes API call)
      authService.logout();
      
      // ✅ Also clear localStorage session if exists
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
    },
    onSuccess: () => {
      // ✅ Method 1: Reset all queries (resets to initial state)
      queryClient.resetQueries();
      
      // ✅ Method 2: Clear all cached data
      queryClient.clear();
      
      // ✅ Method 3: Specifically remove auth queries
      queryClient.removeQueries({ queryKey: authKeys.all });
      
      // ✅ Method 4: Cancel all ongoing queries
      queryClient.cancelQueries();
      
      
      // ✅ Don't navigate here - let the AuthProvider handle it
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('logoutFailed', 'common'), t);
      // Still try to clear on error
      tokenStorage.clearTokens();
      queryClient.clear();
    },
  });
}
export function useChangePasswordMutation() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (passwords: ChangePasswordRequest) => authService.changePassword(passwords),
    onSuccess: () => {
      // ✅ After password change, invalidate user data to refresh
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });

    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('changePasswordFailed', 'common'), t);
    },
  });
}

export function useRefreshTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.refreshToken(),
    onSuccess: () => {
      // ✅ After token refresh, refresh user data
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
    onError: (error: ApiError) => {
      console.error("Token refresh failed:", error.message);
      // ✅ If refresh fails, log the user out
      tokenStorage.clearTokens();
      queryClient.clear();
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authService.forgotPassword(data),
  });
}

export function useResetPasswordMutation() {
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authService.resetPassword(data),
    onError: (error: ApiError) => {
      if (error.statusCode === 400) {
        Swal.fire({
          title: t('error', 'common'),
          text: t('invalidResetLink', 'common'),
          icon: 'error',
        });
      }
    },
  });
}

export function useSetup2FAMutation() {
  return useMutation({
    mutationFn: () => authService.setup2FA(),
  });
}

export function useVerify2FASetupMutation() {
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: Verify2FASetupRequest) => authService.verify2FASetup(data),
    onError: (error: ApiError) => {
      if (error.statusCode === 400) {
        Swal.fire({
          title: t('error', 'common'),
          text: t('invalidVerificationCode', 'common'),
          icon: 'error',
        });
      } else if (error.statusCode === 429) {
        Swal.fire({
          title: t('error', 'common'),
          text: t('tooManyAttempts', 'common'),
          icon: 'error',
        });
      }
    },
  });
}

export function useDisable2FAMutation() {
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: Disable2FARequest) => authService.disable2FA(data),
    onError: (error: ApiError) => {
      if (error.statusCode === 400) {
        Swal.fire({
          title: t('error', 'common'),
          text: t('incorrectPassword', 'common'),
          icon: 'error',
        });
      }
    },
  });
}

export function useVerify2FALoginMutation() {
  return useMutation({
    mutationFn: (data: Verify2FALoginRequest) => authService.verify2FALogin(data),
  });
}


// ===== Toast Helpers =====
function showErrorToast(message: string, fallback: string, t: (key: string, ns?: string) => string) {
  Swal.fire({
    title: t('error', 'common'),
    text: message || fallback,
    icon: "error",
  });
}