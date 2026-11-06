import { recentErrorRef } from "../lib/userErrors";
// types/auth.ts

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface TableLayout {
  columnVisibility: Record<string, boolean>;
  columnSizing: Record<string, number>;
  columnOrder: string[];
  excludeColumns?: string[];
}

export interface User {
  _id?: string;
  id?: string;
  email: string;
  fullName?: string;
  name?: string;
  // /auth/me populates the role (name, isSystemRole) and, with
  // ?populate=roleId.permissions.permission, its permissions.
  roleId?: {
    _id: string;
    name: string;
    isSystemRole?: boolean;
    permissions?: Array<{
      permission: {
        _id: string;
        name: string;
      };
      access?: string[];
    }>;
  };
  role?: 'admin' | 'company_user';
  assignedcompanyId?: string[];
  companies?: Array<{
    _id?: string;
    companyId: {
      _id: string;
      name: string;
    };
    departments?: Array<{
      _id: string;
      name: string;
    }>;
  }>;
  profilePhoto?: string;
  avatar?: string;
  location?: string;
  address?: string;
  phone?: string;
  bio?: string;
  twoFactorEnabled?: boolean;
  twoFactorChannel?: OtpChannel;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  country?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  taxId?: string;
  tablePreferences: Record<string, TableLayout>;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken?: string;
    refreshToken?: string;
  };
}

export interface UserProfileResponse {
  success: boolean;
  data: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export type OtpChannel = 'email' | 'whatsapp';

/** What the server says about a one-time code it just sent. */
export interface OtpSent {
  channel: OtpChannel;
  /** Masked email or phone, e.g. "am***@x.com" or "+20 ••••5678". */
  destination?: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds until another code can be requested. */
  resendIn: number;
}

/** Password accepted; a two-step code was sent. */
export interface TwoFactorChallenge extends OtpSent {
  tempToken: string;
  /** Channels the code can be re-sent on. */
  channels: Record<OtpChannel, boolean>;
  /** WhatsApp failed, so the code went by email instead. */
  fellBack?: boolean;
}

export interface Setup2FARequest {
  channel: OtpChannel;
}

export interface Setup2FAResponse {
  success: boolean;
  message: string;
  data?: OtpSent;
}

export type LoginOtpTarget =
  | { channel: 'email'; email: string }
  | { channel: 'whatsapp'; phone: string };

export interface Verify2FASetupRequest {
  code: string;
}

export interface Disable2FARequest {
  password: string;
}

export interface Verify2FALoginRequest {
  tempToken: string;
  code: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    accessToken?: string;
    refreshToken?: string;
  };
  twoFactorRequired?: boolean;
  tempToken?: string;
}

export type LoginResult =
  | { type: 'success'; user: User }
  | { type: '2fa'; tempToken: string; challenge?: TwoFactorChallenge };

// API Error class
export class ApiError extends Error {
  ref?: string;

  constructor(
    message: string,
    public statusCode?: number,
    public data?: unknown,
    public code?: string,
    public featurePath?: string
  ) {
    super(message);
    this.name = "ApiError";
    // Services re-throw axios failures as ApiError; keep the failed request's
    // reference (status, endpoint, time) so error screens can still show it.
    this.ref = recentErrorRef(2000);
  }
}