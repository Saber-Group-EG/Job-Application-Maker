# Job Application Maker

A comprehensive, bilingual (English/Arabic) Applicant Tracking System (ATS) and recruitment management platform built with React and TypeScript. This system streamlines the entire hiring lifecycle — from job posting and applicant tracking to interview scheduling, job offers, and contract management.

---

## Key Features

- **Multi-Company Management** — Create and manage multiple organizations with independent settings, statuses, and email configurations.
- **Job Position Management** — Create, clone, and manage job listings with bilingual titles, custom fields, weighted scoring, and configurable visibility.
- **Applicant Tracking** — Full lifecycle management with status tracking, duplicate detection, column customization, rich filtering, and Excel export.
- **Interview Management** — Schedule single or bulk interviews, manage question groups with scoring, and track completion status.
- **Job Offers & Contracts** — Generate, send, and track offers and contracts with PDF generation, commission structures, and signature tracking.
- **Email Communications** — Rich template editor (Quill), dynamic variable insertion, and Resend API integration.
- **Role-Based Access Control** — Granular permissions system with role management, department-level access, and route-level protection.
- **Analytics Dashboard** — Real-time applicant status overview, interview schedule widget, and rejection insights with chart visualization.
- **Bilingual RTL/LTR Support** — Full English and Arabic interface with automatic right-to-left layout switching.
- **Dark Mode** — Theme toggle with persistent user preference.

---

## Tech Stack

| Category                 | Technologies                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| **Framework**            | React 18, TypeScript 5.7                                              |
| **Build Tool**           | Vite 6                                                                |
| **Routing**              | React Router 7                                                        |
| **State Management**     | TanStack React Query 5 (server state), Redux Toolkit 2 (client state) |
| **UI Components**        | Material-UI 7, Material React Table, Tailwind CSS 4                   |
| **Charts**               | ApexCharts                                                            |
| **Calendar**             | FullCalendar                                                          |
| **PDF Generation**       | jsPDF, html2canvas, html2pdf.js                                       |
| **Rich Text**            | React Quill                                                           |
| **Drag & Drop**          | dnd-kit, react-dnd                                                    |
| **Internationalization** | Custom Locale Context + i18next (landing page)                        |
| **HTTP Client**          | Axios                                                                 |
| **File Upload**          | react-dropzone, Cloudinary                                            |
| **Email**                | Resend API                                                            |
| **Icons**                | Lucide React, Custom SVG icons                                        |
| **Linting**              | ESLint with TypeScript and React Hooks plugins                        |

---

## Architecture

The application follows a modern single-page application architecture:

```
Components → React Query Hooks → Service Classes → Axios Instance → REST API
```

- **Service Layer**: Singleton classes encapsulate all API interactions, response extraction, and error normalization.
- **Server State**: TanStack React Query manages all API data with cached queries and optimistic mutations with automatic rollback.
- **Authorization**: Two-tier access control — authentication guards (`ProtectedRoute`) and permission-based route protection (`PermissionProtectedRoute`) with component-level permission checks.
- **Multi-Tenancy**: Company context filters all data across the application, persisted in local storage.
- **Internationalization**: Custom context-based translation engine with namespace-organized JSON locale files and automatic RTL direction switching.

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn

### Installation

```bash
git clone <repository-url>
cd Job-Application-Maker
npm install
```

### Development

```bash
npm run dev
```

The development server starts at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── auth/          # Authentication components
│   ├── charts/        # Chart and analytics widgets
│   ├── common/        # Shared components (spinner, breadcrumb, theme toggle)
│   ├── header/        # Application header and user dropdown
│   ├── modals/        # Shared modal dialogs
│   ├── tables/        # Reusable table components
│   └── ui/            # Base UI elements
├── config/            # API configuration and Axios instance
├── context/           # React contexts (Auth, Locale, Theme, Sidebar, CompanyFilter)
├── hooks/             # Custom hooks and React Query mutations
│   └── queries/       # Data fetching hooks per domain
├── icons/             # SVG icon components
├── layout/            # Application shell (header, sidebar, layout wrapper)
├── lib/               # Library configuration (query client)
├── locales/           # Translation files (en/ar, 25+ namespaces each)
├── pages/             # Route-level page components
│   ├── AuthPages/     # Sign in / Sign up
│   ├── Dashboard/     # Main analytics dashboard
│   ├── Landing/       # Public marketing pages
│   └── Recruiting/    # Core HR modules (companies, jobs, applicants, offers, contracts)
├── router/            # Route definitions, guards, and path constants
├── services/          # API service classes
├── store/             # Redux store and slices
├── types/             # TypeScript type definitions
└── utils/             # Utility functions (PDF generators, error handlers, helpers)
```

---

## Available Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the Vite development server                |
| `npm run build`   | Compile TypeScript and generate production build |
| `npm run preview` | Preview the production build locally             |
| `npm run lint`    | Run ESLint across the codebase                   |

---
