// pages/Settings/EmailTemplates.tsx
import React, { useState } from "react";
import DOMPurify from 'dompurify';
import { Copy, Edit, Eye, Mail, PlusCircle, Save, Trash2 } from "lucide-react";
import Swal from "../../../utils/swal";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import { useCompanies } from "../../../hooks/queries/useCompanies";
import {
  useCreateMailTemplate,
  useUpdateMailTemplate,
  useDeleteMailTemplate,
  useDuplicateMailTemplate,
  previewEmailTemplate // ✅ Changed from usePreviewMailTemplate to previewEmailTemplate
} from "../../../hooks/queries/useCompanies";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  ToggleChip,
  inputClass,
  selectClass,
} from "../../../components/ui/kit";
import type { BadgeTone } from "../../../components/ui/kit";
import SettingsSection from "./components/SettingsSection";
import RichTextEditor from "../../../components/form/RichTextEditor";
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import {
  MAIL_TEMPLATE_CATEGORIES,
  getTemplateCategory,
} from '../../../utils/mailTemplateCategories';
import { MailTemplateCategory } from '../../../types/companies';
import { decodeHtmlEntities } from '../../../utils/html';

function stripHtml(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function TemplateFormModal({
  isOpen, onClose, template, settingsId, existingTemplates,
}: {
  isOpen: boolean;
  onClose: () => void;
  template?: any | null;
  settingsId: string;
  existingTemplates: any[];
}) {
  const [formData, setFormData] = useState({
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    html: template?.html ?? `<p>Hello {{candidateName}},</p>\n<p>We're excited to invite you for an interview for the position of {{jobTitle}}.</p>\n<p>Best regards,<br>HR Team</p>`,
    category: (template?.category as MailTemplateCategory) || "general",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const { t } = useLocale();
  const createMutation = useCreateMailTemplate();
  const updateMutation = useUpdateMailTemplate();
  // ✅ No more usePreviewMailTemplate - using direct function import

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.html) {
      Swal.fire(t('mailTemplates.error', 'settings'), t('mailTemplates.errorFillFields', 'settings'), "error");
      return;
    }
    
    if (!settingsId) {
      Swal.fire(t('mailTemplates.error', 'settings'), t('mailTemplates.errorSettingsId', 'settings'), "error");
      return;
    }
    
    try {
      if (template?._id) {
        await updateMutation.mutateAsync({
          settingsId,
          templateId: template._id,
          template: formData,
          existingTemplates,
        });
      } else {
        await createMutation.mutateAsync({
          settingsId,
          template: formData,
          existingTemplates,
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire(t('mailTemplates.error', 'settings'), t('mailTemplates.errorSaveFailed', 'settings'), "error");
    }
  };

  const handlePreview = () => {
    const previewHtml = previewEmailTemplate(
      { ...template, ...formData } as any,
      "John Doe", 
      "Software Engineer"
    );
    setPreviewContent(previewHtml);
    setShowPreview(true);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        size="lg"
        title={template ? t('mailTemplates.editTemplate', 'settings') : t('mailTemplates.createTemplate', 'settings')}
        footer={
          <>
            <Button icon={<Eye className="size-4" />} onClick={handlePreview} className="me-auto">
              {t('mailTemplates.preview', 'settings')}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t('mailTemplates.cancel', 'settings')}
            </Button>
            <Button type="submit" form="mail-template-form" variant="primary" icon={<Save className="size-4" />} loading={isLoading}>
              {t('mailTemplates.saveTemplate', 'settings')}
            </Button>
          </>
        }
      >
        <form id="mail-template-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label={t('mailTemplates.labelTemplateName', 'settings')} htmlFor="mt-name">
            <input
              id="mt-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('mailTemplates.templateNamePlaceholder', 'settings')}
              required
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_14rem]">
            <Field label={t('mailTemplates.labelEmailSubject', 'settings')} htmlFor="mt-subject">
              <input
                id="mt-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t('mailTemplates.emailSubjectPlaceholder', 'settings')}
                required
                className={inputClass}
              />
            </Field>
            <Field label={t('mailTemplates.labelCategory', 'settings')} htmlFor="mt-category" hint={t('mailTemplates.categoryHelp', 'settings')}>
              <select
                id="mt-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as MailTemplateCategory })}
                className={selectClass}
              >
                {MAIL_TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`mailTemplates.category.${cat}`, 'settings')}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t('mailTemplates.labelEmailBody', 'settings')}>
            <RichTextEditor value={formData.html} onChange={(content) => setFormData({ ...formData, html: content })} />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('mailTemplates.variablesHelpText', 'settings')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <code key={v} dir="ltr" className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {v}
                </code>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('mailTemplates.variablesExplanation', 'settings')}</p>
          </div>
        </form>
      </Dialog>

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} size="xl" title={t('mailTemplates.previewTitle', 'settings')}>
        <iframe
          srcDoc={DOMPurify.sanitize(previewContent)}
          className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
          style={{ height: '70vh' }}
          title={t('mailTemplates.previewTitle', 'settings')}
        />
      </Dialog>
    </>
  );
}

const TEMPLATE_VARIABLES = ['{{candidateName}}', '{{jobTitle}}', '{{InterviewDate}}', '{{interviewTime}}', '{{interviewType}}', '{{location}}', '{{address}}'];

const CATEGORY_TONES: Record<string, BadgeTone> = {
  general: 'slate',
  applicants: 'blue',
  interviews: 'amber',
};

export default function EmailTemplates({
  companyId: _companyId,
  embedded = false
}: {
  companyId?: string;
  embedded?: boolean;
}) {
  const { user, hasPermission } = useAuth();
  const { t } = useLocale();
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [modalOpenKey, setModalOpenKey] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<MailTemplateCategory | 'all'>('all');

  const openCreateModal = () => {
    setEditingTemplate(null);
    setModalOpenKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (template: any) => {
    setEditingTemplate(template);
    setModalOpenKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const userCompanyIds = (user?.companies ?? [])
    .map((c: any) => typeof c.companyId === "string" ? c.companyId : c.companyId?._id)
    .filter(Boolean) as string[];

  const isSuperAdmin = !!user?.roleId?.name?.toString().toLowerCase().includes("admin");
  const availableCompanies = isSuperAdmin
    ? (companies as any[])
    : (companies as any[]).filter((c) => userCompanyIds.includes(c._id));

  const canEdit = !!hasPermission && (
    hasPermission("Company Management", "write") ||
    hasPermission("Settings Management", "write") ||
    hasPermission("Settings Management", "create")
  );

  // Get the selected company and its settings ID
  const effectiveCompanyId = selectedCompanyId ?? availableCompanies[0]?._id;
  const selectedCompany = availableCompanies.find((c: any) => c._id === effectiveCompanyId);
  const settingsId = selectedCompany?.settings?._id;
  const templates: any[] = selectedCompany?.settings?.mailSettings?.emailTemplates ?? [];

  const deleteMutation = useDeleteMailTemplate();
  const duplicateMutation = useDuplicateMailTemplate();

  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter((t) => getTemplateCategory(t) === categoryFilter);

  const handleDeleteTemplate = async (template: any) => {
    if (!settingsId) {
      Swal.fire(t('mailTemplates.error', 'settings'), t('mailTemplates.errorSettingsId', 'settings'), "error");
      return;
    }
    const result = await Swal.fire({
      title: t('mailTemplates.deleteTitle', 'settings'),
      text: t('mailTemplates.deleteText', 'settings', { name: template.name }),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#d33",
      confirmButtonText: t('mailTemplates.deleteConfirm', 'settings'),
    });
    if (result.isConfirmed && template._id) {
      deleteMutation.mutate({
        settingsId,
        templateId: template._id,
        existingTemplates: templates,
      });
    }
  };

  const handleDuplicate = (template: any) => {
    if (!settingsId) {
      Swal.fire(t('mailTemplates.error', 'settings'), t('mailTemplates.errorSettingsId', 'settings'), "error");
      return;
    }
    duplicateMutation.mutate({
      settingsId,
      template,
      existingTemplates: templates,
    });
  };

  const createDisabled = !canEdit || !selectedCompanyId || !settingsId;

  return (
    <SettingsSection
      embedded={embedded}
      icon={<Mail className="size-4" />}
      title={t('mailTemplates.sectionTitle', 'settings')}
      description={t('mailTemplates.sectionDesc', 'settings')}
      actions={
        <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openCreateModal} disabled={createDisabled}>
          {t('mailTemplates.createTemplateBtn', 'settings')}
        </Button>
      }
    >
      <Card>
        <CardToolbar>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('mailTemplates.labelCategory', 'settings')}>
            <ToggleChip selected={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
              {t('mailTemplates.category.all', 'settings')}
            </ToggleChip>
            {MAIL_TEMPLATE_CATEGORIES.map((cat) => (
              <ToggleChip key={cat} selected={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>
                {t(`mailTemplates.category.${cat}`, 'settings')}
              </ToggleChip>
            ))}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{filteredTemplates.length}</span>
        </CardToolbar>

        {filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<Mail className="size-6" />}
            title={t('mailTemplates.emptyStateTitle', 'settings')}
            text={t('mailTemplates.emptyStateDesc', 'settings')}
            action={
              <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openCreateModal} disabled={!canEdit || !settingsId}>
                {t('mailTemplates.createTemplateBtn', 'settings')}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template._id}
                className="flex flex-col rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{template.name}</h3>
                  <div className="-me-1.5 -mt-1 flex shrink-0">
                    <IconButton label={t('mailTemplates.editTemplate', 'settings')} onClick={() => openEditModal(template)} disabled={!canEdit || !settingsId}>
                      <Edit className="size-4" />
                    </IconButton>
                    <IconButton label={t('duplicate', 'common')} onClick={() => handleDuplicate(template)} disabled={!canEdit || duplicateMutation.isPending || !settingsId}>
                      <Copy className="size-4" />
                    </IconButton>
                    <IconButton tone="danger" label={t('delete', 'common')} onClick={() => handleDeleteTemplate(template)} disabled={!canEdit || deleteMutation.isPending || !settingsId}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-1">
                  <Badge tone={CATEGORY_TONES[getTemplateCategory(template)] ?? 'green'}>
                    {t(`mailTemplates.category.${getTemplateCategory(template)}`, 'settings')}
                  </Badge>
                </div>
                <p className="mt-3 truncate text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">{t('mailTemplates.cardSubject', 'settings')}</span> {template.subject}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{stripHtml(template.html)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {settingsId && (
        <TemplateFormModal
          key={modalOpenKey}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTemplate(null); }}
          template={editingTemplate}
          settingsId={settingsId}
          existingTemplates={templates}
        />
      )}
    </SettingsSection>
  );
}
