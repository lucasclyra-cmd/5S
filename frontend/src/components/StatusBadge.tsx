"use client";

import React from "react";

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  draft: { className: "badge-neutral", label: "Rascunho" },
  analyzing: { className: "badge-warning", label: "Analisando..." },
  formatting: { className: "badge-info", label: "Formatando..." },
  approved: { className: "badge-success", label: "Aprovado" },
  rejected: { className: "badge-danger", label: "Rejeitado" },
  pending_analysis: { className: "badge-warning", label: "Análise Pendente" },
  pending_review: { className: "badge-info", label: "Revisão Pendente" },
  in_review: { className: "badge-info", label: "Em Revisão" },
  spelling_review: { className: "badge-warning", label: "Revisão Ortográfica" },
  formatted: { className: "badge-success", label: "Formatado" },
  published: { className: "badge-success", label: "Publicado" },
  analysis_failed: { className: "badge-danger", label: "Falha na Análise" },
  formatting_failed: { className: "badge-danger", label: "Falha na Formatação" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (config) {
    return <span className={config.className}>{config.label}</span>;
  }
  return <span className="badge-neutral">{status}</span>;
}
