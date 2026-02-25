"use client";

import React, { useState, useEffect } from "react";
import { Users, Send, CheckCircle2, Trash2, Loader2, UserPlus } from "lucide-react";
import {
  getDistribution,
  addToDistribution,
  notifyAllRecipients,
  acknowledgeDistribution,
  removeFromDistribution,
} from "@/lib/api";
import type { DistributionEntry } from "@/types";

interface Props {
  documentId: number;
  documentCode: string;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function DistributionPanel({ documentId }: Props) {
  const [entries, setEntries] = useState<DistributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New recipient form state
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, [documentId]);

  async function loadEntries() {
    setLoading(true);
    setError(null);
    try {
      const result = await getDistribution(documentId);
      setEntries(result.distributions || []);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar lista de distribuição");
    } finally {
      setLoading(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleNotifyAll() {
    setActionLoading("notify");
    setError(null);
    try {
      await notifyAllRecipients(documentId);
      showSuccess("Todos os destinatários foram notificados.");
      await loadEntries();
    } catch (err: any) {
      setError(err?.message || "Erro ao notificar destinatários");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAcknowledge(entryId: number) {
    setActionLoading(`ack-${entryId}`);
    setError(null);
    try {
      await acknowledgeDistribution(entryId);
      showSuccess("Recebimento acusado com sucesso.");
      await loadEntries();
    } catch (err: any) {
      setError(err?.message || "Erro ao acusar recebimento");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(entryId: number) {
    setActionLoading(`remove-${entryId}`);
    setError(null);
    try {
      await removeFromDistribution(entryId);
      showSuccess("Destinatário removido.");
      await loadEntries();
    } catch (err: any) {
      setError(err?.message || "Erro ao remover destinatário");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("O nome do destinatário é obrigatório.");
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      await addToDistribution(documentId, {
        recipient_name: formName.trim(),
        recipient_role: formRole.trim() || undefined,
        recipient_email: formEmail.trim() || undefined,
      });
      setFormName("");
      setFormRole("");
      setFormEmail("");
      showSuccess("Destinatário adicionado.");
      await loadEntries();
    } catch (err: any) {
      setFormError(err?.message || "Erro ao adicionar destinatário");
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            Lista de Distribuição
          </h3>
          {!loading && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                background: "var(--bg-main)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {entries.length} destinatário{entries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleNotifyAll}
            disabled={actionLoading !== null}
            className="btn-primary"
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            {actionLoading === "notify" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Notificar todos
          </button>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div
          style={{
            background: "rgba(45, 138, 78, 0.08)",
            border: "1px solid var(--success)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "var(--success)",
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            background: "rgba(201, 69, 62, 0.08)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "var(--danger)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</span>
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="table-container mb-4">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Email</th>
                <th>Notificado em</th>
                <th>Acuse de recebimento</th>
                <th style={{ width: 120 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {entry.recipient_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {entry.recipient_role || "—"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {entry.recipient_email || "—"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDateTime(entry.notified_at)}
                    </span>
                  </td>
                  <td>
                    {entry.acknowledged_at ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                        <span style={{ fontSize: 12, color: "var(--success)" }}>
                          {formatDateTime(entry.acknowledged_at)}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(entry.id)}
                        disabled={actionLoading !== null}
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                      >
                        {actionLoading === `ack-${entry.id}` ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Acusar
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={actionLoading !== null}
                      className="btn-danger"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      {actionLoading === `remove-${entry.id}` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            fontSize: 14,
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          Nenhum destinatário cadastrado ainda.
        </div>
      )}

      {/* Add recipient form */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 16,
          marginTop: entries.length > 0 ? 0 : 0,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={16} style={{ color: "var(--accent)" }} />
          <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Adicionar Destinatário
          </h4>
        </div>

        {formError && (
          <div
            style={{
              background: "rgba(201, 69, 62, 0.08)",
              border: "1px solid var(--danger)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              marginBottom: 12,
              fontSize: 13,
              color: "var(--danger)",
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleAddRecipient} className="flex flex-wrap gap-3 items-end">
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <label
              htmlFor="dist-name"
              style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}
            >
              Nome <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              id="dist-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nome do destinatário"
              className="input-field"
              style={{ fontSize: 13 }}
              required
            />
          </div>
          <div style={{ flex: "1 1 150px", minWidth: 0 }}>
            <label
              htmlFor="dist-role"
              style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}
            >
              Papel
            </label>
            <input
              id="dist-role"
              type="text"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              placeholder="Ex: Gerente, Técnico"
              className="input-field"
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <label
              htmlFor="dist-email"
              style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}
            >
              Email
            </label>
            <input
              id="dist-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="input-field"
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <button
              type="submit"
              disabled={formSubmitting || !formName.trim()}
              className="btn-primary"
              style={{ fontSize: 13, padding: "8px 16px" }}
            >
              {formSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
