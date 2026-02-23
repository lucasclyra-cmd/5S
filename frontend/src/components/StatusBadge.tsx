"use client";

import React from "react";

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  approved: { className: "badge-success", label: "Aprovado" },
  rejected: { className: "badge-danger", label: "Rejeitado" },
  pending_analysis: { className: "badge-warning", label: "Analise Pendente" },
  pending_review: { className: "badge-info", label: "Revisao Pendente" },
  formatted: { className: "badge-success", label: "Formatado" },
  published: { className: "badge-success", label: "Publicado" },
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
