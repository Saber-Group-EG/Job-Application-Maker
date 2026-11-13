import Swal from './swal';

/**
 * "Saved, but the WhatsApp update wasn't sent" — for when the record (an
 * interview, an offer) was saved but its WhatsApp update couldn't go out, e.g.
 * a template not approved yet or no valid phone. Doesn't block: the page
 * usually shows its own success popup right after saving, and only one popup
 * shows at a time, so this waits for that one to close first.
 */
export function warnWhatsAppNotSent(kind: 'interview' | 'offer', reasons: Array<string | undefined>) {
  const text = [...new Set(reasons.filter(Boolean))].join(' · ');
  if (!text) return;
  const ar = document.documentElement.lang === 'ar';
  const title =
    kind === 'interview'
      ? ar
        ? 'تم حفظ المقابلة، لكن لم يُرسل تحديث واتساب'
        : "Interview saved, but the WhatsApp update wasn't sent"
      : ar
        ? 'تم حفظ العرض، لكن لم يُرسل تحديث واتساب'
        : "Offer saved, but the WhatsApp update wasn't sent";
  let tries = 0;
  const waitTurn = () => {
    if (Swal.isVisible() && tries++ < 120) setTimeout(waitTurn, 500);
    else void Swal.fire({ icon: 'warning', title, text });
  };
  setTimeout(waitTurn, 400);
}
