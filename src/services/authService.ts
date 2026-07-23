// services/authService.ts
import { tokenStorage } from "../config/api";
import type {
  LoginRequest,
  RegisterRequest,
  User,
  AuthResponse,
  UserProfileResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  Setup2FAResponse,
  Verify2FASetupRequest,
  Disable2FARequest,
  Verify2FALoginRequest,
  LoginResult,
} from "../types/auth";
import { ApiError } from "../types/auth";

// ===== API Client (reusable, clean) =====
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const url = `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth header if required
    if (requiresAuth) {
      const token = tokenStorage.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    // Merge with any custom headers from options
    if (options.headers) {
      const customHeaders = options.headers as Record<string, string>;
      Object.assign(headers, customHeaders);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || "An error occurred",
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error instanceof Error ? error.message : "Network error occurred"
      );
    }
  }

  get<T>(endpoint: string, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, requiresAuth);
  }

  post<T>(endpoint: string, data?: any, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      requiresAuth
    );
  }

  put<T>(endpoint: string, data?: any, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      requiresAuth
    );
  }

  delete<T>(endpoint: string, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, requiresAuth);
  }
}

// ===== Auth Service =====
class AuthService {
  private api = new ApiClient();

  private extractTokens(response: AuthResponse): { accessToken?: string; refreshToken?: string } {
    const accessToken = response.data?.accessToken || (response as any).accessToken;
    const refreshToken = response.data?.refreshToken || (response as any).refreshToken;
    
    if (!accessToken && !refreshToken) {
      console.warn("Tokens missing in response", response);
    }
    
    return { accessToken, refreshToken };
  }

  async login(credentials: LoginRequest): Promise<LoginResult> {
    try {
      const response = await this.api.post<any>("/auth/login", credentials, false);

      const body = response.data || response;
      if (body.twoFactorRequired) {
        return { type: '2fa', tempToken: body.tempToken };
      }

      const { accessToken, refreshToken } = this.extractTokens(response);
      tokenStorage.setTokens(accessToken, refreshToken);
      return { type: 'success', user: response.data?.user || response.user };
    } catch (error) {
      if (error instanceof ApiError) {
        const errBody = (error.data as any)?.data || error.data;
        if (errBody?.twoFactorRequired) {
          return { type: '2fa', tempToken: errBody.tempToken };
        }
      }
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await this.api.post<AuthResponse>("/auth/register", userData, false);
    const { accessToken, refreshToken } = this.extractTokens(response);
    
    tokenStorage.setTokens(accessToken, refreshToken);
    
    return response.data.user;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<UserProfileResponse>(
      "/auth/me?populate=roleId.permissions.permission",
      true
    );
    return response.data;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError("No refresh token available");
    }

    const response = await this.api.post<AuthResponse>(
      "/auth/refresh-token",
      { refreshToken },
      false
    );
    
    const { accessToken, refreshToken: newRefreshToken } = this.extractTokens(response);
    
    tokenStorage.setTokens(accessToken, newRefreshToken);
  }

  async changePassword(passwords: ChangePasswordRequest): Promise<void> {
    await this.api.put("/auth/change-password", passwords, true);
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await this.api.post("/auth/forgot-password", data, false);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await this.api.post("/auth/reset-password", data, false);
  }

  async setup2FA(): Promise<Setup2FAResponse> {
    return this.api.post<Setup2FAResponse>("/auth/2fa/setup", {}, true);
  }

  async verify2FASetup(data: Verify2FASetupRequest): Promise<void> {
    await this.api.post("/auth/2fa/verify-setup", data, true);
  }

  async disable2FA(data: Disable2FARequest): Promise<void> {
    await this.api.post("/auth/2fa/disable", data, true);
  }

  async verify2FALogin(data: Verify2FALoginRequest): Promise<User> {
    const response = await this.api.post<any>("/auth/2fa/verify-login", data, false);
    const { accessToken, refreshToken } = this.extractTokens(response);
    tokenStorage.setTokens(accessToken, refreshToken);
    return response.data?.user || response.user;
  }

  logout(): void {
    tokenStorage.clearTokens();
  }
}

// ===== Singleton Export =====
export const authService = new AuthService();