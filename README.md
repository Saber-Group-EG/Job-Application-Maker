# Job Application Maker

Job Application Maker is a React + TypeScript + Vite frontend for recruiting workflows. It manages applicants, interviews, job positions, companies, users, and departments with a complex multi-company, multi-department, role-based permission system.

**This README describes YOUR codebase specifically.** Real code patterns, real file examples, real folder structure. Use it to find things, understand conventions, and add features without confusion.

---

## Key Patterns in Your Project

| Pattern             | Location                                    | Example                                                               |
| ------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| **Domain queries**  | `hooks/queries/`                            | `useApplicants()`, `useCompanies()` wrap React Query                  |
| **HTTP calls**      | `services/`                                 | `applicantsService.ts` exports async functions, no React, no state    |
| **Type contracts**  | `types/`                                    | `applicants.ts`, `companies.ts`, `users.ts`                           |
| **Page containers** | `pages/Recruiting/<domain>/`                | Large components that manage state + compose UI                       |
| **UI components**   | `components/`                               | Small, focused, receive props, no API calls                           |
| **Global state**    | `context/` + `store/`                       | `AuthContext` (session), `SidebarContext` (UI), Redux `authSlice`     |
| **Server state**    | React Query via hooks                       | All applicant, company, job data flows through query hooks            |
| **Error handling**  | `utils/errorHandler.ts` → `config/axios.ts` | Axios interceptor normalizes API errors, utilities format them for UI |

---

## Your Actual Folder Structure (Current State)

```text
src/
├── config/
│   ├── api.ts                    # API_CONFIG, TOKEN_KEYS, tokenStorage
│   └── axios.ts                  # axios instance, interceptors, error normalization
├── services/
│   ├── applicantsService.ts      # fetchApplicants, updateInterview, scheduleInterview, etc.
│   ├── companiesService.ts       # company CRUD, settings, interview settings
│   ├── jobPositionsService.ts    # job position CRUD
│   ├── usersService.ts           # user management
│   ├── rolesService.ts           # roles/permissions
│   ├── departmentsService.ts     # departments
│   ├── systemSettingsService.ts  # system-wide config
│   └── authService.ts            # login, logout
├── types/
│   ├── applicants.ts             # Applicant, Interview, Message, Comment
│   ├── companies.ts              # Company, CompanySettings
│   ├── jobPositions.ts           # JobPosition
│   ├── users.ts                  # User, UserRole
│   ├── roles.ts                  # Role, Permission
│   ├── departments.ts            # Department
│   ├── auth.ts                   # LoginPayload, AuthResponse
│   ├── SystemSettings.ts         # Global settings
│   └── fieldTypes.ts             # Custom field type defs
├── hooks/
│   ├── queries/                  # React Query hooks (one per domain)
│   │   ├── useApplicants.ts      # useApplicants, useApplicant, useUpdateApplicant, useScheduleInterview, useUpdateInterviewStatus, etc.
│   │   ├── useCompanies.ts       # useCompanies, useUpdateCompany, useCompanySettings
│   │   ├── useJobPositions.ts    # useJobPositions, useJobPosition
│   │   ├── useUsers.ts           # useUsers, useUpdateUser
│   │   ├── useRoles.ts           # useRoles
│   │   ├── useDepartments.ts     # useDepartments
│   │   ├── useSystemSettings.ts  # useSystemSettings
│   │   ├── useAuth.ts            # useLogin, getCurrentUser
│   │   ├── useSendEmail.ts       # useSendEmail mutation
│   │   ├── useJobOffers.ts       # useJobOffers, useSendBulkOffers
│   │   ├── useTableLayout.ts     # table state
│   │   └── index.ts              # barrel export
│   ├── useDebounce.ts            # generic debounce
│   ├── useGoBack.ts              # navigation helper
│   ├── useModal.ts               # modal state
│   └── useStatusSettings.tsx     # status hooks with JSX
├── context/
│   ├── AuthContext.tsx           # user session, hasPermission(), logout
│   ├── SidebarContext.tsx        # sidebar open/close
│   └── ThemeContext.tsx          # light/dark mode
├── store/
│   ├── store.ts                  # Redux store (minimal use)
│   └── slices/
│       └── authSlice.ts          # (not heavily used)
├── components/
│   ├── modals/
│   │   ├── InterviewScheduleModal.tsx
│   │   ├── InterviewSettingsModal.tsx
│   │   ├── StatusChangeModal.tsx
│   │   ├── MessageModal.tsx
│   │   ├── BulkMessageModal.tsx
│   │   ├── CustomFilterModal.tsx
│   │   ├── CommentModal.tsx
│   │   └── JobOffersModal/
│   ├── form/
│   │   ├── Select.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── date-picker.tsx
│   │   ├── Label.tsx
│   │   └── input/
│   ├── common/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ValidationErrorAlert.tsx
│   │   ├── PageBreadCrumb.tsx
│   │   └── SmartText.tsx
│   ├── ui/
│   │   ├── modal/, button/, alert/, badge/, avatar/, table/
│   ├── charts/
│   ├── header/
│   ├── auth/
│   └── UserProfile/
├── pages/
│   ├── Recruiting/
│   │   ├── applicants/
│   │   │   ├── Table/
│   │   │   │   ├── ApplicantsTable.tsx     # Listing with filters
│   │   │   │   ├── hooks/                  # useApplicantFilters, useApplicantSelection, useBulkActions
│   │   │   │   ├── utils/                  # exportHelpers, filterHelpers
│   │   │   │   └── components/             # ApplicantsTable, ColumnMultiSelectHeader, StatusCell
│   │   │   ├── ApplicantPage/
│   │   │   │   └── ApplicantData.tsx       # Detail page (~250 lines)
│   │   │   └── MailPreview.tsx
│   │   ├── companies/
│   │   │   ├── Companies.tsx, createCompany.tsx, companysettings.tsx, PreviewCompany.tsx
│   │   ├── jobs/
│   │   │   ├── Jobs.tsx, CreateJob.tsx, PreviewJob.tsx
│   │   ├── jobOffers/
│   │   │   └── JobOffersPage.tsx
│   │   ├── users/, Settings/, roles/, blueCaller/, systemSettings/, savedFields/
│   ├── Dashboard/, AuthPages/, OtherPage/
├── layout/
│   ├── AppLayout.tsx, AppHeader.tsx, AppSidebar.tsx, Backdrop.tsx
├── router/
│   ├── Router.tsx (lazy-loaded routes)
│   ├── Paths.ts (route constants)
│   ├── ProtectedRoute.tsx, PermissionProtectedRoute.tsx
├── utils/
│   ├── errorHandler.ts           # getErrorMessage()
│   ├── swal.ts                   # Swal wrapper
│   ├── strings.ts                # string utilities
│   └── applicantDuplicateSort.ts
├── lib/ → queryClient.ts
├── icons/ → index.ts
├── main.tsx
└── index.css                     # Tailwind + globals
```

### Where to put new code

| Need                 | Where                               | Example                                   |
| -------------------- | ----------------------------------- | ----------------------------------------- |
| Add a modal          | `components/modals/`                | Props + mutation hooks, no data fetching  |
| Add a form input     | `components/form/`                  | Extend `Select.tsx`, `MultiSelect.tsx`    |
| Add a page           | `pages/Recruiting/<domain>/`        | Create `NewPage.tsx` or `NewPage/` folder |
| Add API call         | `services/<domain>Service.ts`       | `export async function fetchSomething()`  |
| Add React Query hook | `hooks/queries/<domain>.ts`         | Wrap service + React Query                |
| Add types            | `types/<domain>.ts`                 | Request/response interfaces               |
| Add utility          | `utils/` if shared, else page-local | Pure functions, no React                  |
| Add global state     | `context/<name>.tsx` or `store/`    | Context for UI, Redux for truly global    |

**Rule: Service → Hook → Component**

---

## Real HTTP Layer (Your Code)

### `config/api.ts`: Token and base URL

```ts
export const API_CONFIG = {
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    "https://application-maker.onrender.com/api/",
} as const;

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem("accessToken"),
  setAccessToken: (token: string) => localStorage.setItem("accessToken", token),
  clearTokens: () => localStorage.removeItem("accessToken"),
};
```

### `config/axios.ts`: Interceptors

```ts
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Add token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors (Joi validation, express-validator, etc.)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.details) {
      // Joi errors
      error.message = error.response.data.details
        .map((d: any) => `${d.path?.join(".")}: ${d.message}`)
        .join("\n");
    }
    return Promise.reject(error);
  },
);
```

### Services: Pure async functions

```ts
// services/applicantsService.ts
export const applicantsService = {
  async fetchApplicants(params?: { companyId?: string[] }) {
    const { data } = await axios.get("/applicants", { params });
    return data as Applicant[];
  },

  async updateApplicant(payload: UpdateApplicantRequest) {
    const { data } = await axios.put(`/applicants/${payload._id}`, payload);
    return data as Applicant;
  },

  async updateInterviewStatus(
    applicantId: string,
    interviewId: string,
    payload: any,
  ) {
    const { data } = await axios.put(
      `/applicants/${applicantId}/interviews/${interviewId}`,
      payload,
    );
    return data as Applicant;
  },
};
```

### Queries: React Query wrapping services

```ts
// hooks/queries/useApplicants.ts
export const applicantsKeys = {
  all: ['applicants'] as const,
  lists: () => [...applicantsKeys.all, 'list'] as const,
  list: (params?: {...}) => [...applicantsKeys.lists(), params] as const,
  detail: (id: string) => [...applicantsKeys.all, 'detail', id] as const,
};

export function useApplicants(params?: { companyId?: string[] }) {
  return useQuery({
    queryKey: applicantsKeys.list(params),
    queryFn: () => applicantsService.fetchApplicants(params),
    enabled: !!params?.companyId,
  });
}

export function useUpdateApplicant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => applicantsService.updateApplicant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
    },
  });
}
```

### Error handling

```ts
// utils/errorHandler.ts
export function getErrorMessage(error: any): string {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return "An error occurred.";
}

// Usage in components:
mutation.mutate(payload, {
  onError: (error) => {
    Swal.fire({ title: "Error", text: getErrorMessage(error), icon: "error" });
  },
});
```

---

## Coding Conventions (Your Patterns)

### File naming

| Type          | Convention           | Example                                           |
| ------------- | -------------------- | ------------------------------------------------- |
| Components    | `PascalCase.tsx`     | `InterviewSettingsModal.tsx`, `ApplicantData.tsx` |
| Query hooks   | `use<Domain>.ts`     | `useApplicants.ts`, `useCompanies.ts`             |
| Generic hooks | `use<Behavior>.ts`   | `useDebounce.ts`, `useGoBack.ts`                  |
| Services      | `<domain>Service.ts` | `applicantsService.ts`, `companiesService.ts`     |
| Types         | `<domain>.ts`        | `applicants.ts`, `companies.ts`, `users.ts`       |
| Utils         | `<action>.ts`        | `errorHandler.ts`, `applicantDuplicateSort.ts`    |

### Import order

1. React + third-party
2. Relative imports (`../`)
3. Types
4. Styles

```tsx
import { useState } from "react";
import { useParams } from "react-router";

import { useApplicants } from "../../../../hooks/queries";
import { useAuth } from "../../../../context/AuthContext";
import type { Applicant } from "../../../../types/applicants";
```

### Query hooks pattern

```tsx
const { data: applicants, isLoading } = useApplicants({
  companyId: userCompanyIds,
});
const updateMutation = useUpdateApplicant();

updateMutation.mutate(
  { _id: applicantId, status: "hired" },
  {
    onSuccess: () => Swal.fire({ title: "Updated!", icon: "success" }),
    onError: (error) =>
      Swal.fire({
        title: "Error",
        text: getErrorMessage(error),
        icon: "error",
      }),
  },
);
```

### TypeScript

**Always type component props:**

```ts
type InterviewSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  updateMutation: UseMutationResult<Applicant, Error, any>;
};

export default function InterviewSettingsModal({
  isOpen,
  onClose,
  applicant,
  updateMutation,
}: InterviewSettingsModalProps) {
  // ...
}
```

**Avoid `any`** — use types from `types/` folder.

---

## Adding a Feature (Step-by-Step)

### Scenario: "Send Bulk Offer Letter"

1. **Service** (`services/jobOffersService.ts`)

```ts
async sendBulkOffers(payload: { applicantIds: string[]; offerId: string }) {
  const { data } = await axios.post('/job-offers/send-bulk', payload);
  return data;
}
```

2. **Types** (`types/jobOffers.ts`)

```ts
export type BulkOfferResponse = { successCount: number; failedCount: number };
```

3. **Hook** (`hooks/queries/useJobOffers.ts`)

```ts
export function useSendBulkOffers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p) => jobOffersService.sendBulkOffers(p),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all }),
  });
}
```

4. **Modal** (`components/modals/SendBulkOffersModal.tsx`)

```tsx
export default function SendBulkOffersModal({
  isOpen,
  onClose,
  selectedIds,
}: Props) {
  const sendMutation = useSendBulkOffers();
  const handleSend = () => {
    sendMutation.mutate(
      { applicantIds: selectedIds, offerId },
      {
        onSuccess: () => Swal.fire({ title: "Sent!", icon: "success" }),
        onError: (e) =>
          Swal.fire({
            title: "Error",
            text: getErrorMessage(e),
            icon: "error",
          }),
      },
    );
  };
  return <Modal>...</Modal>;
}
```

5. **Use in page** (`pages/Recruiting/jobOffers/JobOffersPage.tsx`)

```tsx
<SendBulkOffersModal
  isOpen={showModal}
  onClose={onClose}
  selectedIds={selectedIds}
/>
```

---

## Finding Things

| Question            | Answer                                                        |
| ------------------- | ------------------------------------------------------------- |
| "Fetch applicants?" | `hooks/queries/useApplicants.ts`                              |
| "API endpoint?"     | `services/applicantsService.ts`                               |
| "Types?"            | `types/applicants.ts`                                         |
| "List page?"        | `pages/Recruiting/applicants/Table/ApplicantsTable.tsx`       |
| "Detail page?"      | `pages/Recruiting/applicants/ApplicantPage/ApplicantData.tsx` |
| "Auth/permissions?" | `context/AuthContext.tsx` + `useAuth()`                       |
| "Error handling?"   | `utils/errorHandler.ts` + `utils/swal.ts`                     |
| "Styling?"          | Tailwind CSS in JSX                                           |
| "Modals?"           | `components/modals/`                                          |
| "Form inputs?"      | `components/form/`                                            |

---

## Common Gotchas

1. **Multi-company users**: Most queries need `companyId` array

```ts
const userCompanyIds = user?.companies?.map((c) =>
  typeof c.companyId === "string" ? c.companyId : c.companyId?._id,
);
```

2. **Nested objects**: API returns company/job sometimes as object, sometimes as ID

3. **Custom responses**: `Record<string, any>` with field-dependent values

4. **Use `Swal.fire()`** not `alert()`

5. **Mutations need `onSuccess` callback** to invalidate queries:

```ts
onSuccess: () =>
  queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
```

---

## Quick Checklist

- [ ] Service function created?
- [ ] Hook wrapping service created?
- [ ] Types added to domain types file?
- [ ] Component using `Swal.fire()` for messages?
- [ ] `getErrorMessage()` called on errors?
- [ ] `queryClient.invalidateQueries()` in `onSuccess`?
- [ ] Permissions checked with `hasPermission()`?
- [ ] `npm run lint` passed?
- [ ] No console errors?

---

## Your Actual Folder Structure

This is how **your project is organized now**. Follow this for all new work.

```text
src/
├── config/
│   ├── api.ts                    # API_CONFIG, TOKEN_KEYS, tokenStorage helpers
│   └── axios.ts                  # axios instance, interceptors, error normalization
├── services/
│   ├── applicantsService.ts      # fetchApplicants, createApplicant, updateInterview, etc.
│   ├── companiesService.ts       # companies, settings, interview settings
│   ├── jobPositionsService.ts    # job CRUD operations
│   ├── usersService.ts           # user management
│   ├── rolesService.ts           # role/permission operations
│   ├── departmentsService.ts     # department operations
│   ├── systemSettingsService.ts  # system-wide settings
│   └── authService.ts            # login, logout, token refresh
├── types/
│   ├── applicants.ts             # Applicant, Interview, Message, Comment types
│   ├── companies.ts              # Company, CompanySettings types
│   ├── jobPositions.ts           # JobPosition types
│   ├── users.ts                  # User, UserRole types
│   ├── roles.ts                  # Role, Permission types
│   ├── departments.ts            # Department types
│   ├── auth.ts                   # LoginPayload, AuthResponse types
│   ├── SystemSettings.ts         # Global settings types
│   └── fieldTypes.ts             # Custom field type definitions
├── hooks/
│   ├── queries/
│   │   ├── useApplicants.ts      # useApplicants, useApplicant, useUpdateApplicant, etc.
│   │   ├── useCompanies.ts       # useCompanies, useUpdateCompany, useCompanySettings
│   │   ├── useJobPositions.ts    # useJobPositions, useJobPosition
│   │   ├── useUsers.ts           # useUsers, useUpdateUser
│   │   ├── useRoles.ts           # useRoles, usePermissions
│   │   ├── useDepartments.ts     # useDepartments
│   │   ├── useSystemSettings.ts  # useSystemSettings
│   │   ├── useAuth.ts            # useLogin, useLogout, getCurrentUser
│   │   ├── useSendEmail.ts       # useSendEmail mutation
│   │   └── index.ts              # barrel export of all hooks
│   ├── useDebounce.ts            # Generic debounce hook
│   ├── useGoBack.ts              # Navigation helper
│   ├── useModal.ts               # Modal open/close state
│   └── useStatusSettings.tsx     # Status-related hooks with JSX
├── context/
│   ├── AuthContext.tsx           # User session, hasPermission, logout
│   ├── SidebarContext.tsx        # Sidebar open/close state
│   └── ThemeContext.tsx          # Light/dark mode toggle
├── store/
│   ├── store.ts                  # Redux store config
│   └── slices/
│       └── authSlice.ts          # Auth Redux slice
├── components/
│   ├── modals/
│   │   ├── InterviewScheduleModal.tsx
│   │   ├── InterviewSettingsModal.tsx
│   │   ├── StatusChangeModal.tsx
│   │   ├── MessageModal.tsx
│   │   ├── BulkMessageModal.tsx
│   │   ├── CustomFilterModal.tsx
│   │   ├── CommentModal.tsx
│   │   └── JobOffersModal/
│   ├── form/
│   │   ├── Select.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── date-picker.tsx
│   │   ├── Label.tsx
│   │   └── input/
│   ├── common/
│   │   ├── LoadingSpinner.tsx
│   │   ├── ValidationErrorAlert.tsx
│   │   ├── PageBreadCrumb.tsx
│   │   └── SmartText.tsx
│   ├── ui/
│   │   ├── modal/
│   │   ├── button/
│   │   ├── alert/
│   │   ├── badge/
│   │   ├── avatar/
│   │   └── table/
│   ├── charts/
│   ├── header/
│   ├── auth/
│   └── UserProfile/
├── pages/
│   ├── Recruiting/
│   │   ├── applicants/
│   │   │   ├── Table/
│   │   │   │   ├── ApplicantsTable.tsx          # Main listing page with filters
│   │   │   │   ├── hooks/
│   │   │   │   ├── utils/
│   │   │   │   └── components/
│   │   │   ├── ApplicantPage/
│   │   │   │   └── ApplicantData.tsx            # Detail page with modals
│   │   │   └── MailPreview.tsx                  # Email template preview
│   │   ├── companies/
│   │   │   ├── Companies.tsx                    # List
│   │   │   ├── createCompany.tsx                # Create form
│   │   │   ├── companysettings.tsx              # Settings (status, mail templates)
│   │   │   └── PreviewCompany.tsx               # Detail view
│   │   ├── jobs/
│   │   │   ├── Jobs.tsx
│   │   │   ├── CreateJob.tsx
│   │   │   └── PreviewJob.tsx
│   │   ├── jobOffers/
│   │   │   └── JobOffersPage.tsx
│   │   ├── users/
│   │   ├── Settings/
│   │   │   ├── interviewCompany.tsx             # Company interview question settings
│   │   │   ├── interviewPerUser.tsx             # User saved question groups
│   │   │   └── StatusSettings.tsx               # Status configuration
│   │   ├── systemSettings/
│   │   ├── roles/
│   │   ├── blueCaller/
│   │   └── savedFields/
│   ├── Dashboard/
│   ├── AuthPages/
│   └── OtherPage/
├── layout/
│   ├── AppLayout.tsx             # Main layout wrapper
│   ├── AppHeader.tsx             # Header component
│   ├── AppSidebar.tsx            # Sidebar navigation
│   └── Backdrop.tsx              # Mobile sidebar overlay
├── router/
│   ├── Router.tsx                # Route definitions, lazy imports
│   ├── Paths.ts                  # Route constants and path functions
│   ├── ProtectedRoute.tsx        # Auth check
│   └── PermissionProtectedRoute.tsx # Permission-based route guard
├── utils/
│   ├── errorHandler.ts           # normalizeApiError, extractErrorMessage
│   ├── swal.ts                   # SweetAlert2 wrapper
│   ├── strings.ts                # String formatting utilities
│   └── applicantDuplicateSort.ts # Domain-specific utility
├── lib/
│   └── queryClient.ts            # React Query client config
├── icons/
│   └── index.ts                  # Icon components barrel export
├── layout/
├── config/
├── main.tsx                      # App entry
└── index.css                     # Tailwind + global styles
```

### Recommended Structure

```text
src/
├── app/
│   ├── router/
│   │   ├── index.tsx              # Route table, lazy imports, guards
│   │   └── paths.ts               # Central route definitions
│   ├── providers/
│   │   ├── AuthProvider.tsx       # App-wide auth state
│   │   ├── ThemeProvider.tsx      # Theme and appearance state
│   │   └── StoreProvider.tsx      # Redux / query / global providers
│   ├── store/
│   │   ├── index.ts               # Store setup
│   │   └── slices/                # Global slices only
│   └── queryClient.ts             # React Query client setup
├── assets/
│   ├── images/
│   ├── icons/
│   └── brand/
├── components/
│   ├── ui/                        # Small reusable primitives
│   ├── layout/                    # Header, sidebar, shell, backdrop
│   └── shared/                    # Cross-feature composites
├── constants/
│   ├── routes.ts
│   ├── queryKeys.ts
│   └── labels.ts
├── contexts/
│   ├── AuthContext.tsx
│   ├── SidebarContext.tsx
│   └── ThemeContext.tsx
├── features/
│   ├── applicants/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── companies/
│   ├── job-positions/
│   ├── interviews/
│   ├── job-offers/
│   └── auth/
├── hooks/
├── pages/
├── services/
├── types/
├── utils/
└── tests/
    ├── setup.ts
    └── fixtures/
```

### Why each folder exists

| Folder               | Purpose                         | What belongs here                                                                        |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `app/`               | App bootstrap and global wiring | Router setup, providers, store configuration, query client, app-wide composition.        |
| `assets/`            | Static non-code resources       | Images, icons, illustrations, fonts, brand files.                                        |
| `components/ui/`     | Reusable low-level UI           | Buttons, inputs, dialogs, cards, tables, loaders, badges, tabs, and generic primitives.  |
| `components/layout/` | Page shell and chrome           | Header, sidebar, footer, page wrappers, backdrops, and layout helpers.                   |
| `components/shared/` | Reusable mid-level pieces       | Empty states, error panels, filtered lists, search bars, and shared feature fragments.   |
| `constants/`         | Fixed values                    | Route names, query keys, labels, status maps, API constants, breakpoints, enumerations.  |
| `contexts/`          | React context providers         | Theme, auth session, permissions, sidebar state, and other cross-cutting UI state.       |
| `features/`          | Business domains                | Feature-specific components, hooks, services, schemas, and local state for one domain.   |
| `hooks/`             | Shared React hooks              | Cross-feature hooks such as debouncing, pagination, keyboard shortcuts, and modal state. |
| `pages/`             | Route-level screens             | Full screens that compose features and route-specific wrappers.                          |
| `services/`          | API communication               | HTTP calls, endpoint wrappers, request adapters, and backend-facing data access.         |
| `types/`             | Shared TypeScript types         | Domain models, request/response contracts, and reusable interfaces.                      |
| `utils/`             | Pure helpers                    | Formatting, parsing, guards, sorting, date helpers, and pure transformations.            |
| `tests/`             | Cross-cutting tests             | Integration tests, shared fixtures, and non-co-located test utilities.                   |

### Where to put common things

| Item                        | Recommended location             |
| --------------------------- | -------------------------------- |
| Generic UI primitives       | `components/ui/`                 |
| Reusable composed UI        | `components/shared/`             |
| Feature-specific UI         | `features/<feature>/components/` |
| Pages (route entry points)  | `pages/`                         |
| Reusable hooks              | `hooks/`                         |
| Feature-specific hooks      | `features/<feature>/hooks/`      |
| Pure reusable helpers       | `utils/`                         |
| Domain-only transformations | `features/<feature>/utils/`      |
| Shared API access           | `services/`                      |
| Feature-owned API layer     | `features/<feature>/services/`   |
| Cross-app providers         | `contexts/`                      |
| Shared type contracts       | `types/`                         |
| Feature-local types         | `features/<feature>/types/`      |
| Static files                | `assets/`                        |
| Stable values               | `constants/`                     |

---

## State Management

The project uses two separate state mechanisms. Choosing the right one is important.

### React Query — for server state

Use React Query for anything that originates from the API: applicant lists, job positions, interview data, company records. React Query handles caching, background refetching, loading and error states, and optimistic updates.

```ts
// features/applicants/hooks/useApplicants.ts
export function useApplicants() {
  return useQuery({
    queryKey: queryKeys.applicants.list(),
    queryFn: fetchApplicants,
  });
}
```

- Query keys live in `constants/queryKeys.ts` so they are never duplicated.
- Mutations that change server data should invalidate the relevant query keys on success.
- Do not mirror server data into `useState` or a Redux slice — React Query already owns that state.

### Context / Store — for UI state

Use React Context or the global store for state that exists only in the client: sidebar open/close, active theme, auth session, modal visibility, and multi-step form progress.

Ask before reaching for the store: is this state shared across more than two unrelated parts of the app? If not, local `useState` or a feature-level context is usually enough.

| State type                   | Where it lives                                       |
| ---------------------------- | ---------------------------------------------------- |
| Remote data (API responses)  | React Query                                          |
| Auth session                 | `AuthContext`                                        |
| Sidebar / theme / UI toggles | Feature context or `SidebarContext` / `ThemeContext` |
| Form state                   | `react-hook-form` local to the form component        |
| Truly global client state    | Redux slice in `app/store/slices/`                   |

---

## Your HTTP Client & Services Pattern

### Axios setup in `config/`

**`config/api.ts`**: API config and token storage

```ts
export const API_CONFIG = {
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    "https://application-maker.onrender.com/api/",
} as const;

export const tokenStorage = {
  getAccessToken: (): string | null =>
    localStorage.getItem(TOKEN_KEYS.accessToken),
  setAccessToken: (token: string) =>
    localStorage.setItem(TOKEN_KEYS.accessToken, token),
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEYS.accessToken);
    localStorage.removeItem(TOKEN_KEYS.refreshToken);
  },
};
```

**`config/axios.ts`**: Interceptors and error handling

```ts
import axios from "axios";
import { tokenStorage } from "./api";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: add auth token
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: normalize errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Convert API errors to user-friendly messages
    if (error.response?.data?.details) {
      // Joi validation errors: extract field messages
      const messages = error.response.data.details
        .map((d: any) => `${d.path?.join(".")}: ${d.message}`)
        .join("\n");
      error.message = messages;
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
```

### Service layer

**`services/applicantsService.ts`**: Async functions, no React, no state

```ts
import axios from "../config/axios";
import type { Applicant, UpdateApplicantRequest } from "../types/applicants";

export const applicantsService = {
  async fetchApplicants(params?: { companyId?: string[]; status?: string }) {
    const { data } = await axios.get("/applicants", { params });
    return data as Applicant[];
  },

  async getApplicant(id: string) {
    const { data } = await axios.get(`/applicants/${id}`);
    return data as Applicant;
  },

  async updateApplicant(payload: UpdateApplicantRequest) {
    const { data } = await axios.put(`/applicants/${payload._id}`, payload);
    return data as Applicant;
  },

  async updateInterviewStatus(
    applicantId: string,
    interviewId: string,
    payload: UpdateInterviewStatusRequest,
  ) {
    const { data } = await axios.put(
      `/applicants/${applicantId}/interviews/${interviewId}`,
      payload,
    );
    return data as Applicant;
  },

  // Helper to extract applicant from response payload
  extractApplicant(payload: any, applicantId: string): Applicant | null {
    // BFS search through payload to find applicant
    // Return normalized applicant
  },
};
```

**All services are namespaced** (not exported as individual functions) for consistency.

### Error handling

**`utils/errorHandler.ts`**: Convert API errors to UI messages

```ts
export function getErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return "An error occurred. Please try again.";
}
```

**Pattern: Always call `getErrorMessage()` when displaying errors to users.**

---

## Coding Rules & Conventions

### File naming

| File type        | Naming convention                             | Example                                          |
| ---------------- | --------------------------------------------- | ------------------------------------------------ |
| React components | `PascalCase.tsx`                              | `UserDropdown.tsx`, `InterviewSettingsModal.tsx` |
| Hooks            | `camelCase.ts` (`.tsx` only if JSX is needed) | `useDebounce.ts`, `useStatusSettings.tsx`        |
| Utilities        | `camelCase.ts`                                | `errorHandler.ts`, `applicantDuplicateSort.ts`   |
| Services         | `camelCaseService.ts`                         | `usersService.ts`, `companiesService.ts`         |
| Types            | `camelCase.ts` or domain-based names          | `applicants.ts`, `SystemSettings.ts`             |
| Constants        | `camelCase.ts`                                | `strings.ts`, `queryKeys.ts`                     |

### Import order — follow this always

1. React core imports
2. Third-party libraries (React Router, React Query, @mui, sweetalert2, etc.)
3. **Relative** imports (your code, using `../`)
4. **Absolute** imports from `src/` (prefer `../` over absolute for local files)
5. Types (from your imports)
6. Styles

**Real example from `ApplicantData.tsx`**:

```tsx
// 1. React
import { useState, useMemo, useEffect, useCallback } from "react";

// 2. Third-party
import { useParams, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "../../utils/swal";

// 3. Relative imports (local code)
import {
  useApplicant,
  useUpdateApplicant,
  useAddComment,
} from "../../../../hooks/queries";
import { useAuth } from "../../../../context/AuthContext";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import InterviewScheduleModal from "../../../../components/modals/InterviewScheduleModal";

// 4. Types
import type { Applicant } from "../../../../types/applicants";
```

**Note: Your codebase uses relative imports (`../`) more than absolute. That's fine — be consistent.**

### How query hooks work in your repo

Each domain has query hooks. Here's how they're used:

```tsx
// In a component:
const { data: applicants, isLoading } = useApplicants({
  companyId: userCompanyIds,
  status: "new",
});

const updateMutation = useUpdateApplicant();

function handleStatusChange(applicantId: string, newStatus: string) {
  updateMutation.mutate(
    { _id: applicantId, status: newStatus },
    {
      onSuccess: () => {
        Swal.fire({ title: "Updated!", icon: "success" });
      },
      onError: (error) => {
        Swal.fire({
          title: "Error",
          text: getErrorMessage(error),
          icon: "error",
        });
      },
    },
  );
}
```

**Pattern in your codebase:**

1. Query hooks handle `isLoading`, `isError`, `data`
2. Mutations handle `mutate()`, `isPending`
3. On success/error, call `Swal.fire()` (SweetAlert2 wrapper)
4. Never manually set state for server data — React Query owns it

### Container vs Presentational

**Containers** (pages, large modals):

- Call query hooks
- Handle mutations
- Manage local state for UI (modal open/close, form state)
- Compose multiple presentational components

**Presentational** (small components, modals):

- Accept data and callbacks as props
- No query hooks
- No mutations
- Just render UI

**Your `ApplicantData.tsx` is a large container** (~250 lines) — this is expected and correct.

### TypeScript patterns in your project

**Types are namespaced by domain:**

```ts
// types/applicants.ts
export type Applicant = {
  _id: string;
  companyId: string;
  jobPositionId: string;
  fullName: string;
  email: string;
  status: string;
  interviews?: Interview[];
  customResponses?: Record<string, any>;
  statusHistory?: StatusHistory[];
  createdAt?: string;
};

export type UpdateApplicantRequest = Partial<Applicant>;

export type Interview = {
  _id?: string;
  scheduledAt?: string;
  type?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes?: string;
};
```

**Component props are always typed:**

```ts
type InterviewSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  selectedInterview: Interview | null;
  setSelectedInterview: (v: Interview | null) => void;
  updateInterviewMutation: UseMutationResult<Applicant, Error, any>;
};

export default function InterviewSettingsModal({
  isOpen,
  onClose,
  applicant,
  selectedInterview,
  setSelectedInterview,
  updateInterviewMutation,
}: InterviewSettingsModalProps) {
  // ...
}
```

**Avoid `any`** — use types from your `types/` folder.

---

## Performance Guidelines

### Memoization

Memoization is an optimization, not a default. Apply it only when you have measured a performance problem or when the cost of re-rendering is provably high.

| Tool          | When to use                                                                                                      | When not to use                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `React.memo`  | A pure presentational component re-renders frequently with unchanged props and the render is expensive.          | Almost all small leaf components — the overhead of the comparison often exceeds the cost of a re-render. |
| `useMemo`     | A derived value is expensive to compute (e.g., sorting thousands of records) and its inputs change infrequently. | Simple transformations like filtering a short list or formatting a string.                               |
| `useCallback` | A callback is passed to a memoized child component and its identity matters for preventing re-renders.           | Callbacks defined locally within a component that is not memoized.                                       |

### Lazy loading

Use lazy loading for large screens, heavy charts, and infrequently visited routes. This keeps the initial bundle smaller and improves startup time.

```tsx
// app/router/index.tsx
const Interviews = lazy(() => import("@/pages/Interviews"));
const Analytics = lazy(() => import("@/pages/Analytics"));
```

Wrap lazily loaded routes in a `Suspense` boundary with a shared fallback loader. Do not create one-off spinners per route.

---

## Example: Adding a New Feature

### Scenario: Add "Send Bulk Offer Letter"

**Step 1: Add to service layer**

```ts
// services/jobOffersService.ts (create if doesn't exist)
export const jobOffersService = {
  async sendBulkOffers(payload: {
    applicantIds: string[];
    offerId: string;
    personalizeMessage?: string;
  }) {
    const { data } = await axios.post("/job-offers/send-bulk", payload);
    return data as BulkOfferResponse;
  },
};
```

**Step 2: Add types**

```ts
// types/jobOffers.ts (extend or create)
export type BulkOfferResponse = {
  successCount: number;
  failedCount: number;
  failures?: Array<{ applicantId: string; reason: string }>;
};
```

**Step 3: Add query hook**

```ts
// hooks/queries/useJobOffers.ts (extend if exists)
export function useSendBulkOffers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Parameters<typeof jobOffersService.sendBulkOffers>[0],
    ) => jobOffersService.sendBulkOffers(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
    },
  });
}
```

**Step 4: Add component/modal**

```tsx
// components/modals/SendBulkOffersModal.tsx
type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedApplicantIds: string[];
};

export default function SendBulkOffersModal({
  isOpen,
  onClose,
  selectedApplicantIds,
}: Props) {
  const [offerId, setOfferId] = useState("");
  const [message, setMessage] = useState("");
  const sendMutation = useSendBulkOffers();

  function handleSend() {
    sendMutation.mutate(
      {
        applicantIds: selectedApplicantIds,
        offerId,
        personalizeMessage: message,
      },
      {
        onSuccess: (data) => {
          Swal.fire({
            title: "Success!",
            text: `Sent ${data.successCount} offers`,
            icon: "success",
          });
          onClose();
        },
        onError: (error) => {
          Swal.fire({
            title: "Error",
            text: getErrorMessage(error),
            icon: "error",
          });
        },
      },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2>Send Bulk Offers</h2>
        <Select
          value={offerId}
          onChange={setOfferId}
          placeholder="Select offer template"
          // options from useOfferTemplates hook
        />
        <TextArea
          value={message}
          onChange={setMessage}
          placeholder="Optional personalization"
        />
        <button onClick={handleSend} disabled={sendMutation.isPending}>
          {sendMutation.isPending ? "Sending..." : "Send"}
        </button>
      </div>
    </Modal>
  );
}
```

**Step 5: Use in container**

```tsx
// pages/Recruiting/jobOffers/JobOffersPage.tsx (or wherever)
const [showSendModal, setShowSendModal] = useState(false);
const [selectedIds, setSelectedIds] = useState<string[]>([]);

return (
  <>
    <button onClick={() => setShowSendModal(true)}>Send Bulk Offers</button>
    <SendBulkOffersModal
      isOpen={showSendModal}
      onClose={() => setShowSendModal(false)}
      selectedApplicantIds={selectedIds}
    />
  </>
);
```

**That's it.** Service → Hook → Component → Page.

---

## Path to Navigate the Project

### Adding a new feature

1. Create `features/<feature-name>/` with subfolders for `components/`, `hooks/`, `services/`, `types/`, and `utils/`.
2. Build the feature UI components inside the feature folder.
3. Add request logic to the feature service layer or to `services/` if it is shared.
4. Store local feature state in a feature-level hook or context.
5. Expose only the minimum surface area to pages.
6. Wire the route in `pages/` and `app/router/`.

### Fixing a bug

1. Trace the issue from the visible UI symptom.
2. Find the handler or callback that is triggered.
3. Follow the call into the hook or service.
4. Check the API request shape and response mapping.
5. Verify the type definitions and error handling.

### Finding things quickly

| Need              | Start here                  |
| ----------------- | --------------------------- |
| Shared helpers    | `utils/`                    |
| Shared constants  | `constants/`                |
| Shared types      | `types/`                    |
| Network calls     | `services/`                 |
| Route composition | `app/router/` and `pages/`  |
| Global UI state   | `contexts/` or `app/store/` |
| Reusable UI       | `components/ui/`            |
| Feature logic     | `features/<feature>/`       |

---

## Quick Checklist for New Code

Before submitting a PR:

- [ ] Did you add the feature to the right domain folder?
- [ ] Did you create/extend the service function first?
- [ ] Did you create/extend the query hook to wrap the service?
- [ ] Did you add types to the domain types file?
- [ ] Did you use Swal for success/error messages (not `alert()`)
- [ ] Did you use `getErrorMessage(error)` when displaying errors?
- [ ] Did you use `queryClient.invalidateQueries()` to refresh after mutations?
- [ ] Did you check permissions with `hasPermission()` if needed?
- [ ] Did you test with multiple company IDs if the feature affects companies?
- [ ] Did you run `npm run lint` ?
- [ ] Did no console errors appear when testing?
- [ ] Did you use relative imports (prefer `../` over absolute paths)?

## Common Gotchas in Your Codebase

### 1. Multi-company users

Most queries accept `companyId` as a parameter. Users belong to multiple companies:

```ts
const { user } = useAuth();
const userCompanyIds = user?.companies?.map((c) =>
  typeof c.companyId === "string" ? c.companyId : c.companyId?._id,
);

const { data: applicants } = useApplicants({
  companyId: userCompanyIds,
});
```

### 2. Nested object populations

Sometimes API returns nested company/job data:

```ts
const applicant = {
  _id: "123",
  companyId: { _id: "c1", name: "Acme" }, // Can be string or object
  jobPositionId: { _id: "j1", title: "Dev" },
};

// Services use helper to extract: extractApplicantFromPayload()
```

### 3. Custom responses are key-value

`customResponses` is `Record<string, any>` — values depend on saved field types:

```ts
customResponses: {
  'saved_field_1': 'text value',
  'saved_field_2': ['multi', 'select'],
  'saved_field_3': { nested: 'object' },
}
```

### 4. Modals use `Swal.fire()` not `alert()`

```ts
import Swal from "../../utils/swal";

Swal.fire({
  title: "Success",
  text: "Saved",
  icon: "success",
  timer: 2000,
});
```

### 5. Mutations use `onSuccess` callback

```ts
mutation.mutate(
  payload,
  {
    onSuccess: (data) => {
      // Refresh queries, show success message
      queryClient.invalidateQueries({ queryKey: [...] });
      Swal.fire({ title: 'Success!', icon: 'success' });
    },
    onError: (error) => {
      Swal.fire({
        title: 'Error',
        text: getErrorMessage(error),
        icon: 'error',
      });
    },
  },
);
```

---

## Improvement Guidelines

### When a file grows too large

Split a component when it becomes hard to scan, test, or change. A practical threshold is around 200 lines, but complexity matters more than line count.

Split when you see:

- Multiple responsibilities in one file
- Repeated conditional rendering blocks
- Several handlers managing unrelated behavior
- Fetching, mapping, and rendering all mixed together
- JSX that is hard to read without scrolling

### Avoid prop drilling

Prefer composition first. If a value needs to travel through several levels, consider:

- Passing a render function or child component
- Moving shared state to context
- Using the store when the state is truly global
- Creating a feature-level hook that hides the wiring

### Centralize error handling and loading states

- Use shared loading components instead of inventing new spinners in every file.
- Normalize error messages in `utils/errorHandler.ts` so the UI receives friendly, stable messages.
- Keep API error translation consistent across the app.

---

## Testing

### Placement

| Test type                 | Location                                             |
| ------------------------- | ---------------------------------------------------- |
| Component behavior        | `Component.test.tsx` co-located with `Component.tsx` |
| Hook behavior             | `useHook.test.ts` co-located with `useHook.ts`       |
| Integration tests         | `tests/`                                             |
| Shared fixtures and mocks | `tests/fixtures/`                                    |

### What to test

- Test behavior, not implementation. Assert what the user sees and what happens on interaction, not internal state or private methods.
- Test edge cases for utilities that are used in multiple places.
- Test loading, error, and empty states for data-fetching components.
- Do not test third-party library internals.

### New utilities

Every new utility function should include:

- A clear function name that describes the outcome
- A short doc comment when the behavior is not obvious
- Explicit input and output types
- Tests for edge cases when the utility is used in multiple places

---

## Questions? Quick Reference

| Question                                 | Answer                                                           | File                                       |
| ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| "How do I add an API endpoint?"          | Create service function, add hook, add component, use in page    | `services/` → `hooks/queries/` → component |
| "How do I check user permissions?"       | Use `useAuth()` and `hasPermission()`                            | `context/AuthContext.tsx`                  |
| "How do I show a success message?"       | Use `Swal.fire({ title: 'Success', icon: 'success' })`           | `utils/swal.ts`                            |
| "How do I handle API errors?"            | Use `getErrorMessage(error)` and `Swal.fire()`                   | `utils/errorHandler.ts`                    |
| "How do I update data after a mutation?" | Use `queryClient.invalidateQueries()` in `onSuccess`             | hooks/queries                              |
| "Where's the API base URL?"              | `import.meta.env.VITE_API_BASE_URL` in `config/api.ts`           | `config/api.ts`                            |
| "How do I style components?"             | Use Tailwind CSS classes, no CSS files                           | `index.css`                                |
| "Can I use Axios directly?"              | No, use services. Axios is in `config/axios.ts`                  | `config/axios.ts`                          |
| "Where's the Redux store?"               | Mostly unused, auth lives in context. One slice: `authSlice.ts`  | `store/`                                   |
| "How do I add a reusable modal?"         | Create in `components/modals/`, pass data and callbacks as props | `components/modals/`                       |
