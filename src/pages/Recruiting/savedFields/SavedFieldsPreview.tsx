import { useLocation, useNavigate, useParams } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import { useSavedFields } from "../../../hooks/queries";
import { useLocale } from '../../../context/LocaleContext';
import type { SavedField } from '../../../types/users';
import { ArrowLeft, FileQuestion, Info, ListChecks, Pencil, Rows3, SlidersHorizontal } from "lucide-react";
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

export default function SavedFieldsPreview() {
  const { t } = useLocale();
  const { state } = useLocation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const { data } = useSavedFields();

  // The list page passes the field in router state; a direct visit looks it up.
  const field: SavedField | undefined =
    (state as { field?: SavedField } | null)?.field ||
    (data || []).find((f) => f.fieldId === decodeURIComponent(fieldId || ""));

  const back = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('previewBackButton', 'savedFields')}
    </button>
  );

  if (!field) {
    return (
      <>
        <PageMeta title={t('previewNotFound', 'savedFields')} description={t('previewNotFoundDesc', 'savedFields')} />
        <PageShell back={back} title={t('previewNotFoundTitle', 'savedFields')}>
          <Card>
            <EmptyState
              icon={<FileQuestion className="size-6" />}
              title={t('previewNotFoundTitle', 'savedFields')}
              text={t('previewNotFoundText', 'savedFields')}
              action={<Button onClick={() => navigate(-1)}>{t('previewReturnButton', 'savedFields')}</Button>}
            />
          </Card>
        </PageShell>
      </>
    );
  }

  const labelEn = typeof field.label === "string" ? field.label : (field.label?.en || t('untitledField', 'savedFields'));
  const labelAr = typeof field.label === "string" ? "" : (field.label?.ar || "");
  const inputType = String(field.inputType || "");
  const typeLabel = inputType.replace(/_/g, " ");

  return (
    <>
      <PageMeta title={t('previewMetaTitle', 'savedFields', { label: labelEn })} description={t('previewMetaDescription', 'savedFields', { label: labelEn })} />
      <PageShell
        back={back}
        title={labelEn}
        subtitle={labelAr ? <bdi dir="rtl">{labelAr}</bdi> : t('previewPageTitle', 'savedFields')}
        actions={
          <Button
            variant="primary"
            icon={<Pencil className="size-4" />}
            onClick={() => navigate(`/recruiting/saved-fields/create`, { state: { field } })}
          >
            {t('previewEditButton', 'savedFields')}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardToolbar>
                <SectionTitle icon={<SlidersHorizontal className="size-4" />}>{t('previewSettingsTitle', 'savedFields')}</SectionTitle>
              </CardToolbar>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('previewTypeBadge', 'savedFields')}</dt>
                  <dd className="text-sm capitalize text-slate-900 dark:text-white">{typeLabel || "—"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('previewValidationBadge', 'savedFields')}</dt>
                  <dd>
                    <Badge tone={field.isRequired ? "amber" : "slate"}>
                      {field.isRequired ? t('previewMandatory', 'savedFields') : t('previewOptional', 'savedFields')}
                    </Badge>
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('previewTemplateId', 'savedFields')}</dt>
                  <dd className="break-all font-mono text-sm text-slate-700 dark:text-slate-300"><bdi dir="ltr">{field.fieldId}</bdi></dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('previewDefaultValue', 'savedFields')}</dt>
                  <dd className={`text-sm ${field.defaultValue ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                    {field.defaultValue || t('previewNoDefault', 'savedFields')}
                  </dd>
                </div>
              </dl>
            </Card>

            {field.choices && field.choices.length > 0 && (
              <Card>
                <CardToolbar>
                  <SectionTitle icon={<ListChecks className="size-4" />}>
                    {t('previewAvailableOptions', 'savedFields')}
                    <span className="ms-1 font-normal text-slate-400">({field.choices.length})</span>
                  </SectionTitle>
                </CardToolbar>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {field.choices.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span className="text-slate-900 dark:text-white">{typeof c === "string" ? c : c.en}</span>
                      {typeof c !== "string" && c.ar && (
                        <span className="text-slate-500 dark:text-slate-400" dir="rtl">{c.ar}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {field.groupFields && field.groupFields.length > 0 && (
              <Card>
                <CardToolbar>
                  <SectionTitle icon={<Rows3 className="size-4" />}>{t('previewNestedSchema', 'savedFields')}</SectionTitle>
                </CardToolbar>
                <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                  {field.groupFields.map((gf, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {typeof gf.label === "string" ? gf.label : gf.label?.en}
                          </p>
                          <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{String(gf.inputType || "").replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      {gf.isRequired && <Badge tone="amber">{t('requiredBadge', 'savedFields')}</Badge>}
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

          <Card className="self-start p-4">
            <div className="flex gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('previewQuickNote', 'savedFields')}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('previewQuickNoteText', 'savedFields')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </PageShell>
    </>
  );
}
