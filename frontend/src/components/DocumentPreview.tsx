"use client";

import React, { useState } from "react";
import { FileText, Maximize2, Minimize2 } from "lucide-react";

interface DocumentPreviewProps {
  text: string;
  title?: string;
}

export default function DocumentPreview({
  text,
  title = "Conteudo Extraido",
}: DocumentPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <div
        className={`overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 ${
          expanded ? "max-h-none" : "max-h-96"
        }`}
      >
        <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700 leading-relaxed">
          {text || "Nenhum conteudo extraido disponivel."}
        </pre>
      </div>
    </div>
  );
}
