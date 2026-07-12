export async function translateText(
  text: string,
  sourceLang: 'en' | 'ar',
  targetLang: 'en' | 'ar'
): Promise<string> {
  if (!text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data?.[0]?.map((s: any) => s[0]).filter(Boolean).join('');
    return translated || text;
  } catch {
    return text;
  }
}
