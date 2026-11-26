// Turns a printed letter (job offer, contract) into an A4 PDF.
//
// The letter HTML is laid out in an off-screen iframe (so its own <style>
// applies), drawn once with html2canvas, then cut into pages. Page breaks
// fall between lines of text, never through one: every text line, image and
// block marked data-keep is an "atom" that cannot be split, and a heading
// marked data-keep-next stays with the first line after it.
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_W = 210;
const A4_H = 297;
const MARGIN_TOP = 14; // mm, pages 2+ (page 1 uses the letter's own padding)
const MARGIN_BOTTOM = 14; // mm, every page

type Atom = { top: number; bottom: number };

/** Unsplittable vertical spans, in CSS px relative to the container top. */
const collectAtoms = (root: HTMLElement): Atom[] => {
  const doc = root.ownerDocument;
  const origin = root.getBoundingClientRect().top;
  const atoms: Atom[] = [];
  const add = (r: { top: number; bottom: number }) => {
    if (r.bottom - r.top > 0) atoms.push({ top: r.top - origin, bottom: r.bottom - origin });
  };

  // Each rendered line of text.
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) add(r);
  }
  // Images and blocks that must stay whole (the signature block).
  root.querySelectorAll('img, [data-keep]').forEach((el) => add(el.getBoundingClientRect()));

  // Headings stay with the first line that follows them.
  root.querySelectorAll('[data-keep-next]').forEach((el) => {
    const h = el.getBoundingClientRect();
    const top = h.top - origin;
    const bottom = h.bottom - origin;
    const next = atoms
      .filter((a) => a.top >= bottom - 1)
      .reduce<Atom | null>((best, a) => (!best || a.top < best.top ? a : best), null);
    atoms.push({ top, bottom: next ? next.bottom : bottom });
  });
  return atoms;
};

/** Largest y <= limit (and > start) that does not cut through any atom. */
const findBreak = (atoms: Atom[], start: number, limit: number): number => {
  const cuts = (y: number) => atoms.some((a) => a.top < y - 0.5 && a.bottom > y + 0.5);
  if (!cuts(limit)) return limit;
  const candidates = atoms
    .map((a) => a.top)
    .filter((y) => y > start + 1 && y <= limit)
    .sort((a, b) => b - a);
  for (const y of candidates) if (!cuts(y)) return y;
  return limit; // a single block taller than a page: no choice but to cut
};

const waitForAssets = async (doc: Document) => {
  const imgs = Array.from(doc.images).filter((img) => !img.complete);
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((r) => {
          img.onload = img.onerror = () => r();
          setTimeout(r, 4000);
        })
    )
  );
  try {
    await (doc as any).fonts?.ready;
  } catch {
    /* fonts API missing: fine */
  }
};

export const downloadLetterPdf = async (html: string, filename: string): Promise<void> => {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'fixed',
    top: '0',
    left: '-10000px',
    width: `${A4_W}mm`,
    height: `${A4_H}mm`,
    border: 'none',
    pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    // No scrollbar: it would narrow the page and change line wrapping.
    doc.documentElement.style.overflow = 'hidden';
    await waitForAssets(doc);

    const root = doc.querySelector('.pdf-container') as HTMLElement | null;
    if (!root) throw new Error('PDF container not found');

    // Grow the frame to the full letter so nothing is laid out off-screen.
    const fullHeight = Math.ceil(root.getBoundingClientRect().height) + 2;
    iframe.style.height = `${fullHeight}px`;
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const widthPx = root.getBoundingClientRect().width;
    const heightPx = root.getBoundingClientRect().height;
    const atoms = collectAtoms(root);

    const canvas = await html2canvas(root, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: doc.documentElement.clientWidth,
      windowHeight: fullHeight,
      height: Math.ceil(heightPx),
    });

    const mmPerPx = A4_W / widthPx;
    const canvasPerPx = canvas.width / widthPx;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let start = 0;
    let page = 0;
    while (start < heightPx - 1) {
      const topMm = page === 0 ? 0 : MARGIN_TOP;
      const availPx = (A4_H - topMm - MARGIN_BOTTOM) / mmPerPx;
      const end = start + availPx >= heightPx ? heightPx : findBreak(atoms, start, start + availPx);

      const sliceH = Math.max(1, Math.round((end - start) * canvasPerPx));
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, Math.round(start * canvasPerPx), canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, topMm, A4_W, (end - start) * mmPerPx);

      start = end;
      page += 1;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
};
