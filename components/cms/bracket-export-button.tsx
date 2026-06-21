"use client";

import { Download } from "lucide-react";

export function BracketExportButton() {
  return (
    <button
      className="button secondary bracket-export-button"
      onClick={() => window.print()}
      title="Open the complete bracket for printing or saving as PDF"
      type="button"
    >
      <Download aria-hidden="true" size={16} />
      Save bracket
    </button>
  );
}
