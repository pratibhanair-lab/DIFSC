"use client";

/** "Download PDF" uses the browser's own print-to-PDF (choose "Save as PDF"). */
export default function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Download PDF
    </button>
  );
}
