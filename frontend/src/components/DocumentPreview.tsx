"use client";

import React, { useState } from "react";
import { FileText, Maximize2, Minimize2 } from "lucide-react";

interface DocumentPreviewProps {
  text: string;
  title?: string;
}

export default function DocumentPreview({
  text,
  title = "Conteúdo Extraído",
}: DocumentPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-action"
          title={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <div
        className="overflow-auto"
        style={{
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--bg-main)",
          padding: 16,
          maxHeight: expanded ? "none" : 384,
        }}
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 13,
            fontFamily: "monospace",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {text || "Nenhum conteúdo extraído disponível."}
        </pre>
      </div>
    </div>
  );
}
