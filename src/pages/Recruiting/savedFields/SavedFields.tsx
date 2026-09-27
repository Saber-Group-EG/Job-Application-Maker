import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import { Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, IconButton, PageShell } from "../../../components/ui/kit";
import { useSavedFields, useDeleteSavedField } from "../../../hooks/queries";
import Swal from '../../../utils/swal';
import { useQueryClient } from "@tanstack/react-query";
import { savedFieldsKeys } from "../../../hooks/queries/useUsers";
import { useLocale } from '../../../context/LocaleContext';

export default function SavedFields() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { data, isLoading } = useSavedFields();
  const deleteMutation = useDeleteSavedField();
  const qc = useQueryClient();
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  // data is already the array
  const fields = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const handleEdit = (field: any) => {
    navigate(`/recruiting/saved-fields/create`, { state: { field } });
  };

  const handleDelete = async (fieldId: string) => {
    const result = await Swal.fire({
      title: t('deleteConfirmTitle', 'savedFields'),
      text: t('deleteConfirmText', 'savedFields'),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: t('deleteConfirmButton', 'savedFields'),
    });
    if (!result.isConfirmed) return;

    setDeletingIds((s) => ({ ...s, [fieldId]: true }));
    deleteMutation.mutate(fieldId, {
      onError: (err) => {
        Swal.fire({ title: t('deleteError', 'savedFields'), text: String((err as any)?.message || err), icon: "error" });
        setDeletingIds((s) => {
          const copy = { ...s };
          delete copy[fieldId];
          return copy;
        });
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: savedFieldsKeys.list() });
        setDeletingIds((s) => {
          const copy = { ...s };
          delete copy[fieldId];
          return copy;
        });
      },
    });
  };

  // Hide fields that are being deleted
  const activeFields = fields.filter((f: any) => !deletingIds[f.fieldId]);

  return (
    <PageShell
      title={t('sectionTitle', 'savedFields')}
      subtitle={isLoading ? undefined : t('totalTemplates', 'savedFields', { count: activeFields.length })}
      actions={
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate(`/recruiting/saved-fields/create`)}>
          {t('createNewField', 'savedFields')}
        </Button>
      }
    >
      <PageMeta title={t('metaTitle', 'savedFields')} description={isLoading ? t('metaLoadingDescription', 'savedFields') : t('metaDescription', 'savedFields')} />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
          ))}
          <span className="sr-only" role="status">{t('loadingMessage', 'savedFields')}</span>
        </div>
      ) : activeFields.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-6" />}
            title={t('emptyTitle', 'savedFields')}
            text={t('emptyDescription', 'savedFields')}
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate(`/recruiting/saved-fields/create`)}>
                {t('createNewField', 'savedFields')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeFields.map((f: any) => {
            const title = typeof f.label === "string" ? f.label : (f.label?.en || t('untitledField', 'savedFields'));
            return (
              <Card key={f.fieldId} className="flex items-start gap-4 p-4 transition hover:border-slate-300 dark:hover:border-slate-700">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {f.inputType === "repeatable_group" ? "GRP" : f.inputType?.substring(0, 3) || "TXT"}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <span className="truncate">{title}</span>
                      {f.isRequired && <Badge tone="red">{t('requiredBadge', 'savedFields')}</Badge>}
                    </h3>
                    {typeof f.label !== "string" && f.label?.ar && (
                      <p className="mt-0.5 truncate text-start text-sm text-slate-500 dark:text-slate-400" dir="rtl">{f.label.ar}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="blue">{t('typeLabel', 'savedFields', { type: f.inputType?.replace(/_/g, " ") || "text" })}</Badge>
                    {(f.choices || []).length > 0 && <Badge tone="amber">{t('optionsCount', 'savedFields', { count: f.choices.length })}</Badge>}
                    {(f.groupFields || []).length > 0 && <Badge tone="slate">{t('nestedFieldsCount', 'savedFields', { count: f.groupFields.length })}</Badge>}
                  </div>
                </div>
                <div className="-me-1.5 -mt-1 flex shrink-0">
                  <IconButton label={t('editTemplateTitle', 'savedFields')} onClick={() => handleEdit(f)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    tone="danger"
                    label={t('deleteTemplateTitle', 'savedFields')}
                    onClick={() => handleDelete(f.fieldId)}
                    disabled={deletingIds[f.fieldId]}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
