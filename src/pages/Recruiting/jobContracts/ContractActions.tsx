/**
 * ContractActions.tsx
 *
 * Single action for an existing JobContract:
 *   - Download as PDF  (jsPDF, no print dialog)
 *
 * No email — contracts are not sent via email in this module.
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { JobContract } from '../../../services/contractsService';

// ─── PDF generator ────────────────────────────────────────────────────────────

async function downloadContractAsPdf(contract: JobContract): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  let y = margin;

  // ── Brand accent bar ────────────────────────────────────────────────────
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, pageW, 6, 'F');
  y += 4;

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39);
  doc.text('Job Contract', margin, (y += 14));

  doc.setFontSize(13);
  doc.setTextColor(99, 102, 241);
  doc.text(contract.position, margin, (y += 9));

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, (y += 5), pageW - margin, y);

  // ── Applicant block ──────────────────────────────────────────────────────
  const applicantName =
    typeof contract.applicantId === 'object' && contract.applicantId !== null
      ? contract.applicantId.fullName
      : null;
  const applicantEmail =
    typeof contract.applicantId === 'object' && contract.applicantId !== null
      ? contract.applicantId.email
      : null;

  if (applicantName) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('PREPARED FOR', margin, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(applicantName, margin, (y += 5));

    if (applicantEmail) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(applicantEmail, margin, (y += 5));
    }
  }

  // ── Core details ─────────────────────────────────────────────────────────
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Contract Details', margin, y);
  y += 4;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const details: [string, string][] = [
    ['Contract Type', contract.contractType.replace('-', ' ')],
    ['Start Date', formatDate(contract.startDate)],
    ...(contract.endDate
      ? ([['End Date', formatDate(contract.endDate)]] as [string, string][])
      : []),
    ...(contract.probationPeriod != null
      ? ([
          [
            'Probation',
            `${contract.probationPeriod} month${contract.probationPeriod !== 1 ? 's' : ''}`,
          ],
        ] as [string, string][])
      : []),
    ...(contract.salary.basic != null
      ? ([
          [
            'Basic Salary',
            `${contract.salary.basic.toLocaleString()} ${contract.salary.currency}`,
          ],
        ] as [string, string][])
      : []),
  ];

  const rowH = 8;
  const labelW = 50;

  details.forEach(([label, value], i) => {
    const rowY = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentW, rowH, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 3, rowY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(value, margin + labelW, rowY + 5.5);
  });

  y += details.length * rowH + 10;

  // ── Benefits ─────────────────────────────────────────────────────────────
  if (contract.benefits.length > 0) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Benefits', margin, y);
    y += 5;

    contract.benefits.forEach((b, i) => {
      if (y > pageH - 20) {
        doc.addPage();
        y = margin;
      }
      const rowY = y + i * rowH;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY, contentW, rowH, 'F');
      }
      const label = b.label.en || b.label.ar;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(label, margin + 3, rowY + 5.5);

      if (b.value) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39);
        doc.text(b.value, pageW - margin - 3, rowY + 5.5, { align: 'right' });
      }
    });

    y += contract.benefits.length * rowH + 10;
  }

  // ── Sections ─────────────────────────────────────────────────────────────
  const sorted = [...contract.sections].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  for (const section of sorted) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      (section.title.en || section.title.ar).toUpperCase(),
      margin + 3,
      y + 5
    );
    y += 10;

    for (const item of section.items) {
      if (y > pageH - 20) {
        doc.addPage();
        y = margin;
      }
      const text = item.en || item.ar;
      const lines = doc.splitTextToSize(`• ${text}`, contentW - 6) as string[];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5 + 1;
    }
    y += 5;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (contract.notes) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, 5, 'F');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Internal Notes', margin + 3, y + 3.5);
    y += 7;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(
      contract.notes,
      contentW - 6
    ) as string[];
    doc.text(noteLines, margin + 3, y);
    y += noteLines.length * 5 + 5;
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(239, 68, 68);
    doc.rect(0, pageH - 4, pageW, 4, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${p} of ${totalPages}  ·  Generated ${new Date().toLocaleDateString()}`,
      pageW / 2,
      pageH - 7,
      { align: 'center' }
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = contract.position.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const applicantSlug = applicantName
    ? `_${applicantName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    : '';
  doc.save(`job_contract_${safeName}${applicantSlug}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractActions({ contract }: { contract: JobContract }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadContractAsPdf(contract);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={pdfLoading}
      className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
      title="Download as PDF"
    >
      {pdfLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <FileDown className="size-3.5" />
      )}
    </button>
  );
}
