import DOMPurify from 'dompurify';

export const formatDate = (dateString?: string, locale?: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString(locale || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateOnly = (dateString?: string, locale?: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(locale || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getReadableMessageText = (value?: string) => {
  if (!value) return '';

  const rawValue = String(value);
  const decoded = typeof document !== 'undefined'
    ? (() => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = DOMPurify.sanitize(rawValue);
      return textarea.value;
    })()
    : rawValue;

  const withLineBreaks = decoded
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>\s*<\s*p\s*>/gi, '\n\n')
    .replace(/<\s*\/div\s*>\s*<\s*div\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '');

  return withLineBreaks
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    case 'sent':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'accepted':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'expired':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'pending':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'interview':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'interviewed':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};
