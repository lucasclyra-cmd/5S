"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { getWorkflowQueue } from "@/lib/api";
import type { WorkflowItem } from "@/types";
import WorkflowQueueComponent from "@/components/WorkflowQueue";

export default function ProcessosDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkflowQueue();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar fila de revisao");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function handleItemClick(item: WorkflowItem) {
    router.push(`/processos/${item.document_code}`);
  }

  const pendingItems = items.filter((i) => !i.resolved_at);
  const resolvedItems = items.filter((i) => i.resolved_at);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Fila de Revisao
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Documentos pendentes de aprovacao do setor de Processos.
          </p>
        </div>
        <button onClick={loadQueue} className="btn-secondary" disabled={loading}>
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <ClipboardList size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {pendingItems.length}
            </p>
            <p className="text-sm text-gray-500">Pendentes</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <ClipboardList size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {resolvedItems.filter((i) => i.action === "approved").length}
            </p>
            <p className="text-sm text-gray-500">Aprovados</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <ClipboardList size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {resolvedItems.filter((i) => i.action === "rejected").length}
            </p>
            <p className="text-sm text-gray-500">Rejeitados</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <span className="ml-3 text-sm text-gray-500">
            Carregando fila...
          </span>
        </div>
      )}

      {/* Queue */}
      {!loading && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Documentos Pendentes
          </h2>
          <WorkflowQueueComponent
            items={pendingItems}
            onItemClick={handleItemClick}
          />

          {resolvedItems.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Documentos Resolvidos
              </h2>
              <WorkflowQueueComponent
                items={resolvedItems}
                onItemClick={handleItemClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
