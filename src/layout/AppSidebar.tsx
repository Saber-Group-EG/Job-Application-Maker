import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

import {
  Briefcase,
  Building2,
  CreditCard,
  Home,
  Inbox,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { ChevronDownIcon, HorizontaLDots } from '../icons';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useCompanies } from '../hooks/queries/useCompanies';
import { useLocale } from '../context/LocaleContext';

type SubItem = {
  name: string;
  tKey?: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  show?: boolean;
};

type NavItem = {
  name: string;
  tKey?: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
  show?: boolean;
};

type NavSection = {
  key: string;
  tKey?: string;
  items: NavItem[];
};

const EMPTY_COMPANIES: never[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { hasPermission, user } = useAuth();
  const { t, dir } = useLocale();
  const location = useLocation();
  const { data: companiesData } = useCompanies();
  // A `= []` default would be a fresh array every render while data is
  // undefined, re-running the submenu effect below on every render.
  const companies = companiesData ?? EMPTY_COMPANIES;

  const hasAdminUsageAccess = useMemo(() => {
    const roleName = user?.roleId?.name?.toLowerCase?.();
    return String(roleName) === 'super admin' || String(roleName) === 'admin';
  }, [user]);

  // HR self-service promo sections are shown to HR Managers only (UX-only —
  // the backend enforces the real promo role list).
  const isHrManager = useMemo(() => {
    const roleName = user?.roleId?.name?.toLowerCase?.();
    return String(roleName) === 'hr manager';
  }, [user]);

  // Get applicant pages from companies data (from /auth/me)
  const applicantPageSubItems = useMemo(() => {
    const seen = new Set<string>();

    // Collect applicant pages from all companies the user has access to
    const allPages: any[] = [];

    companies.forEach((company: any) => {
      const pages = company?.settings?.applicantPages ?? [];
      if (Array.isArray(pages)) {
        allPages.push(...pages);
      }
    });

    return allPages
      .filter((p: any) => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      })
      .map((p: any) => ({
        name: p.name,
        tKey: undefined as string | undefined,
        path: `/applicants/page/${encodeURIComponent(p.name)}?statuses=${(p.statuses || []).map(encodeURIComponent).join(',')}${p.jobPositions?.length ? `&jobPositions=${p.jobPositions.map(encodeURIComponent).join(',')}` : ''}`,
        pro: false,
      }));
  }, [companies]);

  const hasSingleAssignedCompany = useMemo(() => {
    const roleName = user?.roleId?.name?.toLowerCase?.();
    const isAdminRole = roleName === 'admin' || roleName === 'super admin';
    if (isAdminRole) return false;

    const fromCompanies = Array.isArray(user?.companies)
      ? user.companies
          .map((c: any) =>
            typeof c?.companyId === 'string' ? c.companyId : c?.companyId?._id
          )
          .filter(Boolean)
      : [];

    const fromAssigned = Array.isArray((user as any)?.assignedcompanyId)
      ? (user as any).assignedcompanyId.filter(Boolean)
      : [];

    const mergedIds = Array.from(
      new Set([...fromCompanies, ...fromAssigned].map(String))
    );

    return mergedIds.length === 1;
  }, [user]);

  type OpenSubmenu = { section: string; index: number } | null;
  const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const can = hasPermission;
  const canSeeInterviewSettings =
    can('Interview Settings Management', 'read') ||
    can('Company Management', 'read') ||
    can('Settings Management', 'read');

  // One collapsible group per area of the product. A group left with a single
  // visible child is shown as a plain link instead of a one-item submenu.
  const rawItems: NavItem[] = [
    { icon: <Home />, name: 'Home', tKey: 'home', path: '/home' },
    {
      icon: <UsersRound />,
      name: 'Applicants',
      tKey: 'applicants',
      subItems: [
        {
          name: 'All Applicants',
          tKey: 'allApplicants',
          path: '/applicants',
          show: can('Applicant Management', 'read'),
        },
        {
          name: 'Import Applicants',
          tKey: 'importApplicants',
          path: '/applicants/blue-caller',
          show: can('Applicant Management', 'create'),
        },
        ...applicantPageSubItems,
      ],
    },
    {
      icon: <Briefcase />,
      name: 'Jobs & Hiring',
      tKey: 'jobsHiring',
      subItems: [
        {
          name: 'Jobs',
          tKey: 'jobs',
          path: '/jobs',
          show: can('Job Position Management', 'read'),
        },
        {
          name: 'Job Offers',
          tKey: 'jobOffers',
          path: '/job-offers',
          show: can('Offer Management', 'read'),
        },
        {
          name: 'Job Contracts',
          tKey: 'jobContracts',
          path: '/job-contracts',
          show: can('Contract Management', 'read'),
        },
      ],
    },
    {
      icon: <Inbox />,
      name: 'Communication',
      tKey: 'sectionCommunication',
      subItems: [
        {
          name: 'Mail Inbox',
          tKey: 'mailPreview',
          path: '/applicants/mail-preview',
          show: can('Mail Management', 'read'),
        },
        {
          name: 'Support Inbox',
          tKey: 'inquiryPreview',
          path: '/inquiries',
          show: can('Inquiry Management', 'read'),
        },
        {
          name: 'Mail Settings',
          tKey: 'mailSettings',
          path: '/recruiting/company-settings',
          show: can('Mail Management', 'read'),
        },
      ],
    },
    {
      icon: <Building2 />,
      name: 'Organization',
      tKey: 'sectionOrganization',
      subItems: [
        {
          name: 'Companies',
          tKey: hasSingleAssignedCompany ? 'companyData' : 'companies',
          path: '/companies',
          show: can('Company Management', 'read'),
        },
        {
          name: 'Departments',
          tKey: 'departments',
          path: '/departments',
          show: can('Company Management', 'read'),
        },
        {
          name: 'Users',
          tKey: 'users',
          path: '/users',
          show: can('User Management', 'read'),
        },
        {
          name: 'Permissions & Roles',
          tKey: 'permissionsRoles',
          path: '/permissions',
          show: can('Role Management', 'read'),
        },
      ],
    },
    {
      icon: <SlidersHorizontal />,
      name: 'Configuration',
      tKey: 'sectionConfiguration',
      subItems: [
        {
          name: 'Saved Fields',
          tKey: 'savedFields',
          path: '/recruiting/saved-fields',
        },
        {
          name: 'Saved Questions',
          tKey: 'savedQuestions',
          path: '/recruiting/saved-questions',
        },
        {
          name: 'Recommended Fields',
          tKey: 'recommendedFields',
          path: '/recommended-fields',
          show:
            can('Settings Management', 'create') &&
            can('Settings Management', 'write'),
        },
        {
          name: 'General Settings',
          tKey: 'generalSettings',
          path: '/recruiting/interview-settings',
          show: canSeeInterviewSettings,
        },
      ],
    },
    {
      icon: <CreditCard />,
      name: 'Billing & Growth',
      tKey: 'sectionBilling',
      subItems: [
        {
          name: 'Subscription',
          tKey: 'subscription',
          path: '/recruiting/subscription',
          show: can('Billing Management', 'write'),
        },
        {
          name: 'My Promo Codes',
          tKey: 'myPromos',
          path: '/my/promos',
          show: isHrManager,
        },
        {
          name: 'My Commissions',
          tKey: 'myCommissions',
          path: '/my/commissions',
          show: isHrManager,
        },
        {
          name: 'My Redemptions',
          tKey: 'myRedemptions',
          path: '/my/redemptions',
          show: isHrManager,
        },
      ],
    },
    {
      icon: <ShieldCheck />,
      name: 'Platform Admin',
      tKey: 'sectionPlatform',
      subItems: [
        {
          name: 'Company Usage',
          tKey: 'companyUsage',
          path: '/admin-settings',
          show: hasAdminUsageAccess,
        },
        {
          name: 'Plans',
          tKey: 'adminPlans',
          path: '/admin-plans',
          show: can('Subscription Plan Management', 'read'),
        },
        {
          name: 'Promo Codes',
          tKey: 'promoCodes',
          path: '/promos',
          show: hasAdminUsageAccess,
        },
        {
          name: 'Commissions',
          tKey: 'Commissions',
          path: '/promos/commissions',
          show: hasAdminUsageAccess,
        },
        {
          name: 'Redemptions',
          tKey: 'redemptions',
          path: '/promos/redemptions',
          show: hasAdminUsageAccess,
        },
      ],
    },
  ];

  const navItems: NavItem[] = rawItems.flatMap((item) => {
    if (!item.subItems) return [item];
    const visible = item.subItems.filter((s) => s.show !== false);
    if (visible.length === 0) return [];
    if (visible.length === 1) {
      const [only] = visible;
      return [
        { icon: item.icon, name: only.name, tKey: only.tKey, path: only.path },
      ];
    }
    return [{ ...item, subItems: visible }];
  });
  const sections: NavSection[] = [{ key: 'main', items: navItems }];

  useEffect(() => {
    let matched: OpenSubmenu = null;
    sections.forEach((section) => {
      section.items.forEach((nav, index) => {
        nav.subItems?.forEach((subItem) => {
          if (isActive(subItem.path)) {
            matched = { section: section.key, index };
          }
        });
      });
    });

    // Keep the previous object when nothing changed so this doesn't trigger
    // a re-render on every run.
    setOpenSubmenu((prev) => {
      const next = matched as OpenSubmenu;
      if (prev === next) return prev;
      if (
        prev &&
        next &&
        prev.section === next.section &&
        prev.index === next.index
      )
        return prev;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, isActive, applicantPageSubItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.section}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: string) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.section === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { section: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: string) => {
    return (
      <ul className="flex flex-col gap-4">
        {items.map((nav, index) => {
          const visibleSubItems = nav.subItems;

          return (
            <li key={nav.name}>
              {visibleSubItems ? (
                <>
                  <button
                    onClick={() => handleSubmenuToggle(index, menuType)}
                    className={`menu-item group ${
                      openSubmenu?.section === menuType &&
                      openSubmenu?.index === index
                        ? 'menu-item-active'
                        : 'menu-item-inactive'
                    } cursor-pointer ${
                      !isExpanded && !isHovered
                        ? 'lg:justify-center'
                        : 'lg:justify-start'
                    }`}
                  >
                    <span
                      className={`menu-item-icon-size  ${
                        openSubmenu?.section === menuType &&
                        openSubmenu?.index === index
                          ? 'menu-item-icon-active'
                          : 'menu-item-icon-inactive'
                      }`}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="menu-item-text">
                        {t(nav.tKey ?? nav.name)}
                      </span>
                    )}
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <ChevronDownIcon
                        className={`${dir === 'ltr' ? 'ml-auto' : 'mr-auto'} w-5 h-5 transition-transform duration-200 ${
                          openSubmenu?.section === menuType &&
                          openSubmenu?.index === index
                            ? 'rotate-180 text-brand-500'
                            : ''
                        }`}
                      />
                    )}
                  </button>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <div
                      ref={(el) => {
                        subMenuRefs.current[`${menuType}-${index}`] = el;
                      }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height:
                          openSubmenu?.section === menuType &&
                          openSubmenu?.index === index
                            ? `${subMenuHeight[`${menuType}-${index}`]}px`
                            : '0px',
                      }}
                    >
                      <ul
                        className={`mt-2 space-y-1 ${dir === 'ltr' ? 'ml-9' : 'mr-9'}`}
                      >
                        {visibleSubItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`menu-dropdown-item ${
                                isActive(subItem.path)
                                  ? 'menu-dropdown-item-active'
                                  : 'menu-dropdown-item-inactive'
                              }`}
                            >
                              {t(subItem.tKey ?? subItem.name)}
                              <span
                                className={`flex items-center gap-1 ${dir === 'ltr' ? 'ml-auto' : 'mr-auto'}`}
                              >
                                {subItem.new && (
                                  <span
                                    className={`${dir === 'ltr' ? 'ml-auto' : 'mr-auto'} ${
                                      isActive(subItem.path)
                                        ? 'menu-dropdown-badge-active'
                                        : 'menu-dropdown-badge-inactive'
                                    } menu-dropdown-badge`}
                                  >
                                    {t('new')}
                                  </span>
                                )}
                                {subItem.pro && (
                                  <span
                                    className={`${dir === 'ltr' ? 'ml-auto' : 'mr-auto'} ${
                                      isActive(subItem.path)
                                        ? 'menu-dropdown-badge-active'
                                        : 'menu-dropdown-badge-inactive'
                                    } menu-dropdown-badge`}
                                  >
                                    {t('pro')}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                nav.path && (
                  <Link
                    to={nav.path}
                    className={`menu-item group ${
                      isActive(nav.path)
                        ? 'menu-item-active'
                        : 'menu-item-inactive'
                    }`}
                  >
                    <span
                      className={`menu-item-icon-size ${
                        isActive(nav.path)
                          ? 'menu-item-icon-active'
                          : 'menu-item-icon-inactive'
                      }`}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="menu-item-text">
                        {t(nav.tKey ?? nav.name)}
                      </span>
                    )}
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 pwa:max-lg:pt-[env(safe-area-inset-top)] px-5 ${dir === 'ltr' ? 'left-0' : 'right-0'} bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 ${dir === 'ltr' ? 'border-r' : 'border-l'} border-gray-200
        ${
          isExpanded || isMobileOpen
            ? 'w-[290px]'
            : isHovered
              ? 'w-[290px]'
              : 'w-[90px]'
        }
        ${isMobileOpen ? 'translate-x-0' : dir === 'ltr' ? '-translate-x-full' : 'translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 ${dir === 'ltr' ? 'ml-5' : 'mr-5'} flex ${
          !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/auth-logo.png"
                alt="Logo"
                width={200}
                height={30}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/auth-logo.png"
                alt="Logo"
                width={200}
                height={30}
              />
            </>
          ) : (
            <img
              src="/images/logo/auth-logo.png"
              alt="Logo"
              width={200}
              height={30}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <div key={section.key}>
                <h2
                  className={`mb-3 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered && !isMobileOpen
                      ? 'lg:justify-center'
                      : 'justify-start'
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    section.tKey ? t(section.tKey) : null
                  ) : section.tKey ? (
                    <HorizontaLDots className="size-6" />
                  ) : null}
                </h2>
                {renderMenuItems(section.items, section.key)}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
