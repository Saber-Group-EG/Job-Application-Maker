export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  let out = String(html);
  for (let i = 0; i < 3; i++) {
    if (!/&(lt|gt|amp|quot|#0?39|#x(?:22|27));/i.test(out)) break;
    out = out
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;/gi, "'")
      .replace(/&amp;/gi, '&');
  }
  return out;
}