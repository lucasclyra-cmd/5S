"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Shield, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { getWorkflowQueue, getPendingApprovals } from "@/lib/api";
import type { WorkflowItem, PendingApprovalItem } from "@/types";
import WorkflowQueueComponent from "@/components/WorkflowQueue";
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

export default function ProcessosDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const [queueData, approvalData] = await Promise.all([
        getWorkflowQueue().catch(() => []),
        getPendingApprovals().catch(() => []),
      ]);
      setItems(Array.isArray(queueData) ? queueData : []);
      setPendingApprovals(Array.isArray(approvalData) ? approvalData : []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar fila de revisão");
      setItems([]);
      setPendingApprovals([]);
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <p className="stat-label">Cadeias Pendentes</p>
          <p className="stat-value">{pendingApprovals.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Workflow Pendente</p>
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

      {/* Pending Approval Chains */}
      {!loading && pendingApprovals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ color: "var(--text-primary)" }}>
              Cadeias de Aprovação Pendentes
            </h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Progresso</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((item) => (
                  <tr
                    key={item.chain_id}
                    onClick={() => router.push(`/processos/${encodeURIComponent(item.document_code)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>
                        {item.document_code}
                      </span>
                    </td>
                    <td>{item.document_title}</td>
                    <td>
                      <span className="chip">{item.chain_type === "A" ? "Aprovação" : item.chain_type === "Ra" ? "Reaprovação" : "Cancelamento"}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: 80,
                            height: 6,
                            borderRadius: 3,
                            background: "var(--border)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${item.total_approvers > 0 ? (item.approved_count / item.total_approvers) * 100 : 0}%`,
                              height: "100%",
                              background: "var(--success)",
                              borderRadius: 3,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {item.approved_count}/{item.total_approvers}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDateTime(item.created_at)}
                      {getUrgencyChip(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy Workflow Queue */}
      {!loading && (
        <div>
          {pendingItems.length > 0 && (
            <>
              <h2 style={{ color: "var(--text-primary)", marginBottom: 16 }}>
                Documentos Pendentes (Workflow)
              </h2>
              <WorkflowQueueComponent
                items={pendingItems}
                onItemClick={handleItemClick}
              />
            </>
          )}

          {resolvedItems.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowResolved(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 14, fontWeight: 600, color: "var(--text-secondary)",
                  background: "none", border: "none", cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                {showResolved ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Documentos Resolvidos ({resolvedItems.length})
              </button>
              {showResolved && (
                <WorkflowQueueComponent
                  items={resolvedItems}
                  onItemClick={handleItemClick}
                />
              )}
            </div>
          )}

          {pendingItems.length === 0 && pendingApprovals.length === 0 && resolvedItems.length === 0 && (
            <div
              className="text-center py-16"
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
              }}
            >
              <CheckCircle2 size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                Nenhum documento pendente
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Todos os documentos foram processados.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
