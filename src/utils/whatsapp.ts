// WhatsApp "click to chat": opens WhatsApp (app or web) on the user's side
// with the message typed in, ready to send. Nothing is sent by our server.

/** International digits for wa.me, assuming Egypt (+20) for local numbers. */
export function toWhatsAppNumber(phone: unknown): string | null {
  if (typeof phone !== 'string' && typeof phone !== 'number') return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `20${digits.replace(/^0+/, '')}`;
  else if (/^1\d{9}$/.test(digits)) digits = `20${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** wa.me link with the message prefilled, or null without a usable number. */
export function whatsAppLink(phone: unknown, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
