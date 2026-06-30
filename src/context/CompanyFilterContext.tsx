import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useCompanies } from '../hooks/queries/useCompanies';
import { useAuth } from './AuthContext';
import { toPlainString } from '../utils/strings';


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
};

const CompanyFilterContext = createContext<CompanyFilterContextType | undefined>(undefined);

export function CompanyFilterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: companies = [] } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const userCompanyIds = useMemo(() => {
    if (!user) return [];
    const roleName = user?.roleId?.name?.toLowerCase();
    if (roleName === 'super admin' || roleName === 'admin') return [];
    return (user?.companies ?? [])
      .map((c: any) => (typeof c.companyId === 'string' ? c.companyId : c.companyId?._id))
      .filter(Boolean) as string[];
  }, [user]);

  const isMultiCompany = useMemo(() => {
    if (userCompanyIds.length === 0) return companies.length > 1;
    return userCompanyIds.length > 1;
  }, [userCompanyIds, companies]);

  const companyOptions = useMemo(() => {
    return companies
      .filter((c: any) => {
        if (userCompanyIds.length === 0) return true;
        return userCompanyIds.includes(c._id);
      })
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
  }, [companies, userCompanyIds]);

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
    }),
    [selectedCompanyId, companies, companyOptions, companyMap, userCompanyIds, isMultiCompany]
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
