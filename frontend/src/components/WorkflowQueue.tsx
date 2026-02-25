"use client";

import React from "react";
import {
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { WorkflowItem } from "@/types";
import { formatDateTime } from "@/lib/format";

function getUrgencyChip(createdAt: string): React.ReactNode {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays >= 7) {
    return (
      <span style={{
        display: "inline-flex", padding: "2px 7px", borderRadius: 100,
        fontSize: 11, fontWeight: 600, marginLeft: 6,
        background: "rgba(201,69,62,0.08)", color: "var(--danger)",
      }}>
        +7 dias
      </span>
    );
  }
  if (ageDays >= 3) {
    return (
      <span style={{
        display: "inline-flex", padding: "2px 7px", borderRadius: 100,
        fontSize: 11, fontWeight: 600, marginLeft: 6,
        background: "rgba(230,168,23,0.10)", color: "var(--warning)",
      }}>
        +3 dias
      </span>
    );
  }
  return null;
}

interface WorkflowQueueProps {
  items: WorkflowItem[];
  onItemClick: (item: WorkflowItem) => void;
}

export default function WorkflowQueue({
  items,
  onItemClick,
}: WorkflowQueueProps) {
  function getStatusLabel(action: string | null) {
    if (action === "approved") return "Aprovado";
    if (action === "rejected") return "Rejeitado";
    return "Pendente";
  }

  function getStatusBadgeClass(action: string | null) {
    if (action === "approved") return "badge badge-success";
    if (action === "rejected") return "badge badge-danger";
    return "badge badge-warning";
  }

  if (items.length === 0) {
    return (
      <div className="card text-center py-12">
        <AlertCircle size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
        <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>
          Fila vazia
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Não há documentos pendentes de revisão.
        </p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Título</th>
            <th>Status</th>
            <th>Data</th>
            <th style={{ textAlign: "right" }}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer"
              onClick={() => onItemClick(item)}
            >
              <td>
                <span style={{ fontWeight: 500, color: "var(--accent)" }}>
                  {item.document_code}
                </span>
              </td>
              <td>
                <span style={{ color: "var(--text-primary)" }}>
                  {item.document_title}
                </span>
              </td>
              <td>
                <span className={getStatusBadgeClass(item.action)}>
                  {getStatusLabel(item.action)}
                </span>
              </td>
              <td>
                <span style={{ color: "var(--text-muted)" }}>
                  {formatDateTime(item.created_at)}
                </span>
                {!item.resolved_at && getUrgencyChip(item.created_at)}
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  className="inline-flex items-center gap-1"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Revisar
                  <ChevronRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
