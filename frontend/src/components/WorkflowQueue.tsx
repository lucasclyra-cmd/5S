"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { WorkflowItem } from "@/types";

interface WorkflowQueueProps {
  items: WorkflowItem[];
  onItemClick: (item: WorkflowItem) => void;
}

export default function WorkflowQueue({
  items,
  onItemClick,
}: WorkflowQueueProps) {
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusIcon(action: string | null) {
    if (action === "approved") {
      return <CheckCircle2 size={16} className="text-green-500" />;
    }
    if (action === "rejected") {
      return <XCircle size={16} className="text-red-500" />;
    }
    return <Clock size={16} className="text-amber-500" />;
  }

  function getStatusLabel(action: string | null) {
    if (action === "approved") return "Aprovado";
    if (action === "rejected") return "Rejeitado";
    return "Pendente";
  }

  function getStatusBadgeClass(action: string | null) {
    if (action === "approved") return "badge-success";
    if (action === "rejected") return "badge-danger";
    return "badge-warning";
  }

  if (items.length === 0) {
    return (
      <div className="card text-center py-12">
        <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">
          Fila vazia
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Nao ha documentos pendentes de revisao.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Codigo
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Titulo
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Data
            </th>
            <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
              Acao
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onItemClick(item)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-indigo-600">
                  {item.document_code}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-900">
                  {item.document_title}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`${getStatusBadgeClass(item.action)} flex items-center gap-1.5 w-fit`}
                >
                  {getStatusIcon(item.action)}
                  {getStatusLabel(item.action)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-500">
                  {formatDate(item.created_at)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
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
