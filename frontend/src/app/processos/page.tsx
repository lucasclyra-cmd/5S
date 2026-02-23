"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
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
      setError(err.message || "Erro ao carregar fila de revisão");
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
          <h1 style={{ color: "var(--text-primary)" }}>
            Fila de Revisão
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Documentos pendentes de aprovação do setor de Processos.
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
        <div className="stat-card">
          <p className="stat-label">Pendentes</p>
          <p className="stat-value">{pendingItems.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Aprovados</p>
          <p className="stat-value">
            {resolvedItems.filter((i) => i.action === "approved").length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Rejeitados</p>
          <p className="stat-value">
            {resolvedItems.filter((i) => i.action === "rejected").length}
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-6"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--danger)",
            background: "rgba(201, 69, 62, 0.06)",
            padding: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ marginLeft: 12, fontSize: 13, color: "var(--text-muted)" }}>
            Carregando fila...
          </span>
        </div>
      )}

      {/* Queue */}
      {!loading && (
        <div>
          <h2 style={{ color: "var(--text-primary)", marginBottom: 16 }}>
            Documentos Pendentes
          </h2>
          <WorkflowQueueComponent
            items={pendingItems}
            onItemClick={handleItemClick}
          />

          {resolvedItems.length > 0 && (
            <div className="mt-8">
              <h2 style={{ color: "var(--text-primary)", marginBottom: 16 }}>
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
