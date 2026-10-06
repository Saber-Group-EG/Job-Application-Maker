import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Building, Pencil, Plus, Search, ShieldAlert, Trash2 } from "lucide-react";
import Swal from "../../../utils/swal";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { Modal } from "../../../components/ui/modal";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import {
  useCompanies,
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import type { Department } from "../../../types/departments";
import DepartmentModalForm, { type DepartmentForm } from "../companies/DepartmentModalForm";
import {
  Button,
  Card,
  CardToolbar,
  EmptyState,
  ErrorState,
  IconButton,
  PageShell,
  Table,
  Td,
  Th,
  focusRing,
  inputClass,
  rowClass,
  selectClass,
} from "../../../components/ui/kit";

const emptyForm = (companyId = ""): DepartmentForm => ({
  companyId,
  name: { en: "", ar: "" },
  description: { en: "", ar: "" },
});

const idOf = (c: Department["companyId"] | undefined) =>
  typeof c === "string" ? c : c?._id ?? "";

export default function Departments() {
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const canRead = hasPermission("Company Management", "read");
  const canEdit = hasPermission("Company Management", "write");

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const {
    data: departments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const pick = (en?: string, ar?: string) =>
    locale === "ar"
      ? toPlainString(ar) || toPlainString(en) || ""
      : toPlainString(en) || toPlainString(ar) || "";

  const companyOptions = useMemo(
    () =>
      (companies as any[]).map((c) => ({
        id: c._id as string,
        label: toPlainString(c.name, locale) || c._id,
      })),
    [companies, locale]
  );
  const companyLabel = (id: string) =>
    companyOptions.find((c) => c.id === id)?.label ?? "—";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departments.filter((d) => {
      if (companyFilter && idOf(d.companyId) !== companyFilter) return false;
      if (!term) return true;
      return [d.name?.en, d.name?.ar, d.description?.en, d.description?.ar]
        .map((v) => toPlainString(v).toLowerCase())
        .some((v) => v.includes(term));
    });
  }, [departments, search, companyFilter]);

  const openModal = (dept?: Department) => {
    setEditingId(dept?._id ?? null);
    setForm(
      dept
        ? {
            companyId: idOf(dept.companyId),
            name: { en: dept.name?.en || "", ar: dept.name?.ar || "" },
            description: {
              en: dept.description?.en || "",
              ar: dept.description?.ar || "",
            },
          }
        : emptyForm(companyFilter || (companyOptions.length === 1 ? companyOptions[0].id : ""))
    );
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      Swal.fire(t("error", "companies"), (err as Error)?.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t("eliminateDept", "companies"),
      text: t("eliminateDeptDesc", "companies"),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t("cancel", "common"),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t("dissolveConfirm", "companies"),
    });
    if (!result.isConfirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      Swal.fire(t("error", "companies"), (err as Error)?.message, "error");
    }
  };

  if (!canRead) {
    return (
      <PageShell title={t("accessRestricted", "companies")}>
        <Card>
          <EmptyState
            icon={<ShieldAlert className="size-6" />}
            title={t("accessRestricted", "companies")}
            text={t("accessRestrictedDesc", "companies")}
          />
        </Card>
      </PageShell>
    );
  }

  if (isLoading || companiesLoading) return <LoadingSpinner fullPage />;

  return (
    <>
      <PageMeta
        title={t("deptPageTitle", "companies")}
        description={t("deptPageSubtitle", "companies")}
      />
      <PageShell
        title={t("deptPageTitle", "companies")}
        subtitle={t("deptPageSubtitle", "companies")}
        actions={
          canEdit && (
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => openModal()}
            >
              {t("createDepartment", "companies")}
            </Button>
          )
        }
      >
        {isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <Card>
            <CardToolbar>
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("deptSearchPlaceholder", "companies")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputClass} ps-9`}
                />
              </div>
              {companyOptions.length > 1 && (
                <select
                  aria-label={t("deptCompany", "companies")}
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className={`${selectClass} sm:max-w-[220px]`}
                >
                  <option value="">{t("deptAllCompanies", "companies")}</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </CardToolbar>
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Building className="size-6" />}
                title={t("noDepartmentsTitle", "companies")}
                text={t("noDepartmentsText", "companies")}
              />
            ) : (
              <Table minWidth={640}>
                <thead>
                  <tr>
                    <Th>{t("colDepartment", "companies")}</Th>
                    <Th>{t("deptCompany", "companies")}</Th>
                    <Th>{t("colDescription", "companies")}</Th>
                    <Th align="end">
                      <span className="sr-only">{t("colActions", "companies")}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((dept) => {
                    const name = pick(dept.name?.en, dept.name?.ar);
                    const desc = pick(dept.description?.en, dept.description?.ar);
                    const cid = idOf(dept.companyId);
                    return (
                      <tr key={dept._id} className={rowClass}>
                        <Td>
                          <p className="font-medium text-slate-900 dark:text-white">{name}</p>
                          {locale !== "ar" && dept.name?.ar && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <bdi>{toPlainString(dept.name.ar)}</bdi>
                            </p>
                          )}
                        </Td>
                        <Td>
                          <Link
                            to={`/company/${cid}`}
                            className={`rounded text-sm text-slate-700 hover:text-brand-600 hover:underline dark:text-slate-300 ${focusRing}`}
                          >
                            {companyLabel(cid)}
                          </Link>
                        </Td>
                        <Td className="max-w-md">
                          <p className="line-clamp-2 text-slate-500 dark:text-slate-400">
                            {desc || t("noOverview", "companies")}
                          </p>
                        </Td>
                        <Td align="end">
                          {canEdit && (
                            <div className="flex justify-end gap-1">
                              <IconButton
                                label={t("editDepartmentLabel", "companies", { name })}
                                onClick={() => openModal(dept)}
                              >
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton
                                tone="danger"
                                label={t("deleteDepartmentLabel", "companies", { name })}
                                onClick={() => handleDelete(dept._id)}
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        )}
      </PageShell>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="mx-4 max-w-xl overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900"
      >
        <DepartmentModalForm
          isEdit={Boolean(editingId)}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          saving={saving}
          companies={companyOptions}
        />
      </Modal>
    </>
  );
}
