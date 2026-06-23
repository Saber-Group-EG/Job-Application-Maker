/**
 * Converts a value that may be a localized object (e.g., {en, ar}) to a plain string.
 * When locale is 'ar', prioritizes Arabic; otherwise prioritizes English.
 * Falls back to the other language, then stringifies or returns empty string.
 */
const isLikelyObjectId = (value: string): boolean =>
  /^[a-f0-9]{24}$/i.test(String(value || '').trim());

export const toPlainString = (val: any, locale?: string): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  
  // Handle arrays (e.g., address array)
  if (Array.isArray(val)) {
    if (val.length === 0) return "";
    // Prefer the first meaningful item to avoid returning [object Object]
    for (const item of val) {
      const parsed = toPlainString(item, locale);
      if (parsed && parsed.trim() && !isLikelyObjectId(parsed)) {
        return parsed.trim();
      }
    }
    return "";
  }
  
  if (typeof val === "object") {
    // Prefer URL-like `location` fields (common for company address objects)
    const maybeLocation = (val as any)?.location;
    if (typeof maybeLocation === "string" && maybeLocation.trim()) {
      const locTrim = maybeLocation.trim();
      const lcase = locTrim.toLowerCase();
      if (
        lcase.startsWith('http://') ||
        lcase.startsWith('https://') ||
        locTrim.startsWith('//') ||
        lcase.startsWith('www.')
      ) return locTrim;
    }

    // Check for localized strings – respect locale priority
    if (locale === 'ar') {
      if (typeof val.ar === "string" && val.ar.trim()) return val.ar.trim();
      if (typeof val.en === "string" && val.en.trim()) return val.en.trim();
    } else {
      if (typeof val.en === "string" && val.en.trim()) return val.en.trim();
      if (typeof val.ar === "string" && val.ar.trim()) return val.ar.trim();
    }

    // Try common textual keys before falling back to JSON
    const commonKeys = [
      "value",
      "label",
      "name",
      "title",
      "address",
      "location",
      "street",
      "line1",
      "line2",
      "city",
    ];
    for (const key of commonKeys) {
      const v = (val as any)[key];
      if (typeof v === "string" && v.trim() && !isLikelyObjectId(v)) {
        return v.trim();
      }
      const nested = toPlainString(v, locale);
      if (nested && nested.trim() && !isLikelyObjectId(nested)) {
        return nested.trim();
      }
    }

    // Last attempt: scan all object values recursively
    for (const [key, nestedVal] of Object.entries(val)) {
      if (/(^_?id$|Id$)/i.test(key)) continue;
      const nested = toPlainString(nestedVal, locale);
      if (nested && nested.trim() && !isLikelyObjectId(nested)) {
        return nested.trim();
      }
    }

    // Fallback: stringify the object
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};
