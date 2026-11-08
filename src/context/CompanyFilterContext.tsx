import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCompanies } from '../hooks/queries/useCompanies';
import { useAuth } from './AuthContext';
import { toPlainString } from '../utils/strings';
import type { User } from '../types/auth';


type CompanyOption = {
  id: string;
  title: string;
  titleAr?: string;
  logoPath?: string;
};

type CompanyFilterContextType = {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  companies: any[];
  companyOptions: CompanyOption[];
  companyMap: Record<string, any>;
  resetFilter: () => void;
  userCompanyIds: string[];
  isMultiCompany: boolean;
  isLoading: boolean;
};

const CompanyFilterContext = createContext<CompanyFilterContextType | undefined>(undefined);

const LEGACY_STORAGE_KEY = 'company-filter-selected-id';
const ADMIN_ROLE_NAMES = new Set(['admin', 'super admin', 'super_admin', 'superadmin']);

const selectionKey = (userId: string) => `${LEGACY_STORAGE_KEY}:${userId}`;

const readSelection = (userId: string | null): string | null => {
  if (!userId) return null;
  try {
    return localStorage.getItem(selectionKey(userId));
  } catch {
    return null;
  }
};

const isAdminUser = (user: User | null): boolean => {
  if (!user) return false;
  const roleName = user.roleId?.name?.trim().toLowerCase() ?? '';
  const legacyRole = typeof user.role === 'string' ? user.role.trim().toLowerCase() : '';
  return ADMIN_ROLE_NAMES.has(roleName) || ADMIN_ROLE_NAMES.has(legacyRole);
};

const refId = (ref: unknown): string => {
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object') {
    const r = ref as { _id?: string; id?: string };
    return r._id || r.id || '';
  }
  return '';
};

const accessibleCompanyIds = (user: User): string[] => {
  const fromCompanies = (user.companies ?? []).map((c) => refId(c.companyId));
  const fromAssigned = (user.assignedcompanyId ?? []).map((id) => refId(id));
  return [...new Set([...fromCompanies, ...fromAssigned].filter(Boolean))];
};

export function CompanyFilterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const userId = user?._id || user?.id || null;
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  // Tracks which account the in-memory selection currently belongs to, so the
  // selection never leaks across accounts and storage writes wait for hydration.
  const [hydratedUserId, setHydratedUserId] = useState<string | null | undefined>(undefined);
  const hydrationUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (hydrationUserId.current === userId) return;
    hydrationUserId.current = userId;
    setSelectedCompanyId(readSelection(userId));
    setHydratedUserId(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || hydratedUserId !== userId) return;
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      if (selectedCompanyId) {
        localStorage.setItem(selectionKey(userId), selectedCompanyId);
      } else {
        localStorage.removeItem(selectionKey(userId));
      }
    } catch {
      // ignore unavailable storage
    }
  }, [selectedCompanyId, userId, hydratedUserId]);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  const userCompanyIds = useMemo(() => {
    if (!user || isAdmin) return [];
    return accessibleCompanyIds(user);
  }, [user, isAdmin]);

  const companyOptions = useMemo(() => {
    return companies
      .filter((c: any) => isAdmin || userCompanyIds.includes(c._id))
      .map((c: any) => {
        const raw = c?.name;
        const title = typeof raw === 'string' ? raw : toPlainString(raw, 'en');
        const titleAr = typeof raw === 'string' ? raw : toPlainString(raw, 'ar');
        return {
          id: c._id,
          title,
          titleAr,
          logoPath: c?.logoPath,
        };
      })
      .filter((x) => x.id && x.title);
  }, [companies, isAdmin, userCompanyIds]);

  // An invalid saved selection is dropped; an account with a single accessible
  // company always lands on it, whatever its role.
  useEffect(() => {
    if (!user || companiesLoading || hydratedUserId !== userId) return;
    if (selectedCompanyId && !companyOptions.some((option) => option.id === selectedCompanyId)) {
      setSelectedCompanyId(null);
    }
    if (companyOptions.length === 1 && selectedCompanyId !== companyOptions[0].id) {
      setSelectedCompanyId(companyOptions[0].id);
    }
  }, [user, userId, hydratedUserId, companiesLoading, companyOptions, selectedCompanyId]);

  const isMultiCompany = companyOptions.length > 1;

  const companyMap = useMemo(() => {
    const map: Record<string, any> = {};
    companies.forEach((c: any) => {
      map[c._id] = c;
    });
    return map;
  }, [companies]);

  const resetFilter = () => setSelectedCompanyId(null);

  const value = useMemo(
    () => ({
      selectedCompanyId,
      setSelectedCompanyId,
      companies,
      companyOptions,
      companyMap,
      resetFilter,
      userCompanyIds,
      isMultiCompany,
      isLoading: companiesLoading,
    }),
    [selectedCompanyId, companies, companyOptions, companyMap, userCompanyIds, isMultiCompany, companiesLoading]
  );

  return (
    <CompanyFilterContext.Provider value={value}>
      {children}
    </CompanyFilterContext.Provider>
  );
}

export function useCompanyFilter() {
  const context = useContext(CompanyFilterContext);
  if (!context) {
    throw new Error('useCompanyFilter must be used within a CompanyFilterProvider');
  }
  return context;
}
