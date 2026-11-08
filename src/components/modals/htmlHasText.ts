/** Visible text of an HTML string (rich-text editors leave "<p><br></p>" when empty). */
export const htmlHasText = (html?: string | null) =>
  !!String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .trim();
