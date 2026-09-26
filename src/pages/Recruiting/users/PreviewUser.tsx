import { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useLocale } from "../../../context/LocaleContext";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { 
  useUsers, 
  useRoles, 
  useCompanies, 
  useDepartments 
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import {
  Mail,
  Phone,
  Shield,
  Building2,
  Pencil,
  ArrowLeft,
  ShieldAlert,
  Building,
  Calendar
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  PageShell,
  SectionTitle,
  focusRing,
} from "../../../components/ui/kit";

type UserCompanyView = {
  companyName: string;
  departments: string[];
  isPrimary?: boolean;
};

export default function PreviewUser() {
  const { t, locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch data
  const { data: usersResponse, isLoading: usersLoading } = useUsers();
  const rawUsers = Array.isArray(usersResponse) ? usersResponse : ((usersResponse as any)?.data ?? []);
  const { data: roles = [] } = useRoles();
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();

  // Find the current user
  const user = useMemo(() => {
    return rawUsers.find((u: any) => u._id === id);
  }, [rawUsers, id]);

  // Get role name
  const roleName = useMemo(() => {
    if (!user) return t('previewUnauthorized', 'users');
    if (typeof user.roleId === "object" && user.roleId) {
      return toPlainString((user.roleId as any).name);
    }
    const role = roles.find((r) => r._id === user.roleId);
    return role ? toPlainString((role as any).name) : t('previewStandardRole', 'users');
  }, [user, roles]);

  // Transform company assignments
  const userCompanies = useMemo<UserCompanyView[]>(() => {
    if (!user || !user.companies) return [];

    const resolveDepartmentName = (rawDept: any, companyObj: any) => {
      if (!rawDept) return t('previewSectionUnknown', 'users');

      if (typeof rawDept === "object" && rawDept.name) {
        return toPlainString(rawDept.name) || t('previewSectionUnknown', 'users');
      }

      const directId =
        typeof rawDept === "string"
          ? rawDept
          : rawDept?._id || rawDept?.departmentId?._id || rawDept?.departmentId;

      if (!directId) return t('previewSectionUnknown', 'users');

      const fromGlobal = departments.find(
        (item: any) =>
          item?._id === directId || String(item?._id) === String(directId)
      );
      if (fromGlobal) {
        return toPlainString((fromGlobal as any).name) || t('previewSectionUnknown', 'users');
      }

      const companyDepartments = (companyObj as any)?.departments || [];
      const fromCompany = companyDepartments.find(
        (item: any) =>
          item?._id === directId ||
          item === directId ||
          String(item?._id) === String(directId)
      );
      if (fromCompany) {
        return toPlainString((fromCompany as any).name || fromCompany) || t('previewSectionUnknown', 'users');
      }

      return t('previewSectionUnknown', 'users');
    };

    return user.companies
      .filter((userCompany: any) => userCompany && userCompany.companyId)
      .map((userCompany: any) => {
        const companyId = typeof userCompany.companyId === "string" ? userCompany.companyId : userCompany.companyId?._id;
        const companyObj = companies.find((c) => c._id === companyId);
        const companyName = companyObj ? toPlainString(companyObj.name) : t('previewUnassigned', 'users');

        const userDepts = (userCompany.departments || []).map((dept: any) =>
          resolveDepartmentName(dept, companyObj)
        );

        return { companyName, departments: userDepts, isPrimary: userCompany.isPrimary };
      });
  }, [user, companies, departments]);

  if (usersLoading) return <LoadingSpinner fullPage />;

  const back = (
    <Link
      to="/users"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('previewBackButton', 'users')}
    </Link>
  );

  if (!user) return (
    <PageShell back={back} title={t('previewNotFoundTitle', 'users')}>
      <Card>
        <EmptyState
          icon={<ShieldAlert className="size-6" />}
          title={t('previewNotFoundTitle', 'users')}
          text={t('previewNotFoundText', 'users')}
          action={<Button variant="secondary" onClick={() => navigate("/users")}>{t('previewReturnButton', 'users')}</Button>}
        />
      </Card>
    </PageShell>
  );

  const userName = toPlainString(user.fullName || user.name || t('previewAnonymous', 'users'));
  const isActive = user.isActive !== false;
  const addedOn = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : t('previewAddedSystem', 'users');

  return (
    <PageShell
      back={back}
      title={
        <span className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 truncate">{userName}</span>
          <Badge tone={isActive ? 'green' : 'red'}>{isActive ? t('previewStatusActive', 'users') : t('previewStatusRevoked', 'users')}</Badge>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><Shield className="size-3.5" />{roleName}</span>
          <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" />{t('previewAddedLabel', 'users', { date: addedOn })}</span>
        </span>
      }
      actions={
        <Button variant="primary" icon={<Pencil className="size-4" />} onClick={() => navigate(`/user/${id}/edit`)}>
          {t('previewEditButton', 'users')}
        </Button>
      }
    >
      <PageMeta title={t('previewMetaTitle', 'users', { name: userName })} description={t('previewMetaDescription', 'users')} />

      <Card>
        <CardToolbar>
          <SectionTitle icon={<Shield className="size-4" />}>{t('previewPersonalInfo', 'users')}</SectionTitle>
        </CardToolbar>
        <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t('previewPrimaryEmail', 'users')}</dt>
              <dd className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.email}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Phone className="size-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t('previewSecureLine', 'users')}</dt>
              <dd className={`truncate text-sm font-medium ${user.phone ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} dir="ltr">
                {user.phone || t('previewNoLine', 'users')}
              </dd>
            </div>
          </div>
        </dl>
      </Card>

      <Card>
        <CardToolbar>
          <SectionTitle icon={<Building2 className="size-4" />}>{t('previewCompanySection', 'users')}</SectionTitle>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('companiesCount', 'users', { count: userCompanies.length })}</span>
        </CardToolbar>
        {userCompanies.length === 0 ? (
          <EmptyState icon={<Building2 className="size-6" />} title={t('previewNoOrganizationalTies', 'users')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {userCompanies.map((assignment, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Building className="size-4" />
                    </span>
                    <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{assignment.companyName}</h3>
                  </div>
                  {assignment.isPrimary && <Badge tone="blue">{t('previewPrimaryHQ', 'users')}</Badge>}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                    {t('previewMappedSections', 'users', { count: assignment.departments.length })}
                  </p>
                  {assignment.departments.length === 0 ? (
                    <p className="text-sm text-slate-400">{t('previewNoDepartments', 'users')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignment.departments.map((dept, dIdx) => (
                        <span key={dIdx} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {dept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
