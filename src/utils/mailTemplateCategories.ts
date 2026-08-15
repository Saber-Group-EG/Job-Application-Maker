import { EmailTemplate, MailTemplateCategory } from '../types/companies';

export const MAIL_TEMPLATE_CATEGORIES: MailTemplateCategory[] = [
  'general',
  'applicants',
  'interviews',
  'support',
];

const DEFAULT_CATEGORY: MailTemplateCategory = 'general';

export function getTemplateCategory(template: Pick<EmailTemplate, 'category'>): MailTemplateCategory {
  return template.category || DEFAULT_CATEGORY;
}

export function filterTemplatesByCategory(
  templates: EmailTemplate[],
  category: MailTemplateCategory
): EmailTemplate[] {
  return templates.filter(
    (t) => getTemplateCategory(t) === 'general' || getTemplateCategory(t) === category
  );
}
