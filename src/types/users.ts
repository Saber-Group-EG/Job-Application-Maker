import type { FieldType, BilingualString, BilingualChoice } from './fieldTypes';

// User types

// The API returns references either as ids or, when populated, as documents.
type Localized = string | { en?: string; ar?: string };
export type UserRoleRef = string | {
  _id: string;
  name: string;
  permissions?: Array<string | { permission?: string | { _id?: string; name?: string } | null; access?: string[] }>;
};
export type UserCompanyRef = string | { _id: string; name?: Localized; departments?: Array<string | { _id?: string; name?: Localized }> };
export type UserDepartmentRef = string | { _id?: string; name?: Localized; departmentId?: string | { _id?: string } };

export interface User {
  _id: string;
  fullName?: string;
  name?: string;
  email: string;
  roleId?: UserRoleRef;
  phone?: string;
  department?: string;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  permissions?: Array<string | { permission?: string | { _id?: string; name?: string } | null; access?: string[] }>;
  companies?: {
    companyId: UserCompanyRef;
    departments?: UserDepartmentRef[];
    isPrimary?: boolean;
  }[];
  createdAt?: string;
  __v?: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  phone?: string;
  department?: string;
  companies?: Array<{
    companyId: string;
    departments?: string[];
    isPrimary?: boolean;
  }>;
  isActive?: boolean;
  permissions?: Array<{ permission: string; access?: string[] }>;
}

export interface UpdateUserRequest {
  name?: string;
  fullName?: string;
  email?: string;
  roleId?: string;
  permissions?: Array<{ permission: string; access?: string[] }>;
  isActive?: boolean;
  phone?: string;
  department?: string;
  companies?: Array<{
    companyId: string;
    departments?: string[];
  }>;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
}

// Company Access Types
export interface AddCompanyAccessRequest {
  companyId: string;
  role?: string;
  accessLevel?: string;
  departments?: string[];
}

export interface UpdateDepartmentsRequest {
  departments: string[];
  accessLevel?: string;
}

// Response Types
export interface UsersResponse {
  success: boolean;
  data: User[];
  page?: number | string;
  pageCount?: number | string;
  totalCount?: number | string;
  message?: string;
}

export interface UserResponse {
  success: boolean;
  data: User;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

// Saved Field types
export type SavedField = {
  fieldId: string;
  label: BilingualString | string;
  inputType: FieldType;
  defaultValue?: string;
  minValue?: number;
  maxValue?: number;
  isRequired?: boolean;
  choices?: BilingualChoice[] | string[];
  groupFields?: SavedField[];
};

export type CreateSavedFieldRequest = {
  fieldId: string;
  label: BilingualString | string;
  inputType: FieldType;
  defaultValue?: string;
  minValue?: number;
  maxValue?: number;
  isRequired?: boolean;
  choices?: BilingualChoice[] | string[];
  groupFields?: any[];
};

export type UpdateSavedFieldRequest = Partial<CreateSavedFieldRequest>;

// Saved Question Group Types
export type SavedQuestionAnswerType =
  | "text"
  | "number"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "tags";

export type SavedQuestion = {
  question: string;
  score: number;
  answerType: SavedQuestionAnswerType;
  choices?: { label: string; score: number }[];
  tags?: string[];
};

export type SavedQuestionGroup = {
  _id?: string;
  name: string;
  questions: SavedQuestion[];
};

// Users State Interface
export interface UsersState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isFetched: boolean;
}

// Saved Fields State Interface
export interface SavedFieldsState {
  fields: SavedField[];
  currentField: SavedField | null;
  loading: boolean;
  error: string | null;
  isFetched: boolean;
}

