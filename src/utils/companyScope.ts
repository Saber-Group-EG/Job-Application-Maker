// Which companies a page's data requests cover for this user: the selected
// company, else every company they belong to (super admins: all, via
// undefined). Shared by the homepage and the Reports page.
export function getCompanyIdFromUser(
  user: any,
  selectedCompanyId?: string
): string[] | undefined {
  const roleName = user?.roleId?.name?.toLowerCase();
  if (roleName === 'super admin') {
    if (selectedCompanyId) return [selectedCompanyId];
    return undefined;
  }
  const fromCompanies =
    user?.companies?.map((c: any) =>
      typeof c.companyId === 'string' ? c.companyId : c.companyId?._id
    ).filter(Boolean) || [];
  const fromAssigned = user?.assignedcompanyId?.filter(Boolean) || [];
  const userCompanyIds = [...new Set([...fromCompanies, ...fromAssigned])];
  if (selectedCompanyId) {
    return userCompanyIds.includes(selectedCompanyId) ? [selectedCompanyId] : [];
  }
  return userCompanyIds.length > 0 ? userCompanyIds : undefined;
}
