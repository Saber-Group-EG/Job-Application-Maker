import BaseSwal from 'sweetalert2';
import type { SweetAlertOptions } from 'sweetalert2';
import { errorText, friendlyText, recentErrorRef } from '../lib/userErrors';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Every error popup goes through here: technical text (stack traces, DB
// errors, "Request failed with status code 500") is swapped for a plain
// sentence, and a small reference line is added so a screenshot tells a
// developer which request failed and when.
function fire(...args: any[]) {
  const options: SweetAlertOptions =
    args[0] && typeof args[0] === 'object' ? { ...args[0] } : { title: args[0], html: args[1], icon: args[2] };

  if (options.icon === 'error') {
    let ref: string | undefined;
    if (typeof options.text === 'string') {
      const f = friendlyText(options.text);
      options.text = f.text;
      ref = f.ref;
    }
    if (typeof options.html === 'string' && !/<[a-z]/i.test(options.html)) {
      const f = friendlyText(options.html);
      options.html = f.text;
      ref = ref ?? f.ref;
    }
    // Several validation messages: one per line.
    if (typeof options.text === 'string' && options.text.includes('\n') && options.html === undefined) {
      options.html = options.text.split('\n').map(escapeHtml).join('<br>');
      delete options.text;
    }
    options.confirmButtonText ??= errorText('ok');
    ref = ref ?? recentErrorRef();
    if (ref && !options.footer) {
      options.footer = `<span style="font-size:12px;color:#94a3b8">${escapeHtml(errorText('errReference'))}: <span dir="ltr">${escapeHtml(ref)}</span></span>`;
    }
  }
  return BaseSwal.fire(options);
}

const Swal = new Proxy(BaseSwal, {
  get(target, prop, receiver) {
    return prop === 'fire' ? fire : Reflect.get(target, prop, receiver);
  },
}) as typeof BaseSwal;

export default Swal;
export * from 'sweetalert2';
