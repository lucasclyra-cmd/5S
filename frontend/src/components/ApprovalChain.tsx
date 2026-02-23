"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Shield,
  GraduationCap,
} from "lucide-react";
import {
  recordApproverAction,
  updateTrainingRequirement,
} from "@/lib/api";
import type { ApprovalChain as ApprovalChainType } from "@/types";

interface Props {
  chain: ApprovalChainType;
  onUpdate: (chain: ApprovalChainType) => void;
  isProcessos?: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ApprovalChainView({ chain, onUpdate, isProcessos }: Props) {
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectComments, setRejectComments] = useState<Record<number, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(false);

  const approvedCount = chain.approvers.filter((a) => a.action === "approve").length;
  const rejectedCount = chain.approvers.filter((a) => a.action === "reject").length;
  const pendingCount = chain.approvers.filter((a) => a.action === null).length;
  const totalRequired = chain.approvers.filter((a) => a.is_required).length;

  async function handleApprove(approverId: number) {
    setActionLoading(approverId);
    try {
      const updated = await recordApproverAction(chain.id, approverId, "approve");
      onUpdate(updated);
    } catch {
      // error handled by parent
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(approverId: number) {
    const comments = rejectComments[approverId]?.trim();
    if (!comments) return;
    setActionLoading(approverId);
    try {
      const updated = await recordApproverAction(chain.id, approverId, "reject", comments);
      onUpdate(updated);
    } catch {
      // error handled by parent
    } finally {
      setActionLoading(null);
      setShowRejectForm(null);
    }
  }

  async function handleTrainingToggle() {
    setTrainingLoading(true);
    try {
      const updated = await updateTrainingRequirement(chain.id, !chain.requires_training);
      onUpdate(updated);
    } catch {
      // ignore
    } finally {
      setTrainingLoading(false);
    }
  }

  const chainTypeLabel = chain.chain_type === "A" ? "Aprovação" : chain.chain_type === "Ra" ? "Reaprovação" : "Cancelamento";

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            Cadeia de Aprovação
          </h3>
          <span className="chip">{chainTypeLabel}</span>
        </div>
        <span
          className={`badge ${
            chain.status === "approved"
              ? "badge-success"
              : chain.status === "rejected"
              ? "badge-danger"
              : "badge-warning"
          }`}
        >
          {chain.status === "approved"
            ? "Aprovado"
            : chain.status === "rejected"
            ? "Rejeitado"
            : "Pendente"}
        </span>
      </div>

      {/* Progress */}
      <div
        className="flex items-center gap-4 mb-4 px-4 py-3"
        style={{
          background: "var(--bg-main)",
          borderRadius: "var(--radius-sm)",
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--success)", fontWeight: 600 }}>
          {approvedCount} aprovado{approvedCount !== 1 ? "s" : ""}
        </span>
        {rejectedCount > 0 && (
          <span style={{ color: "var(--danger)", fontWeight: 600 }}>
            {rejectedCount} rejeitado{rejectedCount !== 1 ? "s" : ""}
          </span>
        )}
        <span style={{ color: "var(--text-muted)" }}>
          {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          ({totalRequired} obrigatório{totalRequired !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Approvers list */}
      <div className="space-y-3">
        {chain.approvers.map((approver) => (
          <div
            key={approver.id}
            className="flex items-start gap-3 px-4 py-3"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background:
                approver.action === "approve"
                  ? "rgba(45, 138, 78, 0.04)"
                  : approver.action === "reject"
                  ? "rgba(201, 69, 62, 0.04)"
                  : "var(--bg-card)",
            }}
          >
            {/* Status icon */}
            <div className="mt-0.5">
              {approver.action === "approve" ? (
                <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
              ) : approver.action === "reject" ? (
                <XCircle size={20} style={{ color: "var(--danger)" }} />
              ) : (
                <Clock size={20} style={{ color: "var(--text-muted)" }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                  {approver.approver_name}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {approver.approver_role}
                </span>
                {approver.ai_recommended && (
                  <span
                    className="chip"
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      background: "rgba(59, 125, 216, 0.08)",
                      borderColor: "rgba(59, 125, 216, 0.2)",
                      color: "var(--info)",
                    }}
                  >
                    Sugerido pela IA
                  </span>
                )}
                {!approver.is_required && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    (opcional)
                  </span>
                )}
              </div>

              {/* Action details */}
              {approver.action && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  {approver.action === "approve" ? "Aprovado" : "Rejeitado"}
                  {approver.acted_at && ` em ${formatDate(approver.acted_at)}`}
                  {approver.comments && (
                    <p style={{ marginTop: 4, fontStyle: "italic" }}>
                      &ldquo;{approver.comments}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons for processos users */}
              {isProcessos && approver.action === null && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleApprove(approver.id)}
                    disabled={actionLoading !== null}
                    className="btn-success"
                    style={{ padding: "6px 14px", fontSize: 13 }}
                  >
                    {actionLoading === approver.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Aprovar
                  </button>
                  <button
                    onClick={() =>
                      setShowRejectForm(
                        showRejectForm === approver.id ? null : approver.id
                      )
                    }
                    disabled={actionLoading !== null}
                    className="btn-danger"
                    style={{ padding: "6px 14px", fontSize: 13 }}
                  >
                    <XCircle size={14} />
                    Rejeitar
                  </button>

                  {showRejectForm === approver.id && (
                    <div
                      className="w-full mt-2"
                      style={{
                        paddingTop: 8,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <textarea
                        value={rejectComments[approver.id] || ""}
                        onChange={(e) =>
                          setRejectComments({
                            ...rejectComments,
                            [approver.id]: e.target.value,
                          })
                        }
                        placeholder="Motivo da rejeição..."
                        rows={3}
                        className="input-field resize-none mb-2"
                        style={{ fontSize: 13 }}
                      />
                      <button
                        onClick={() => handleReject(approver.id)}
                        disabled={
                          !rejectComments[approver.id]?.trim() ||
                          actionLoading !== null
                        }
                        className="btn-danger"
                        style={{ padding: "6px 14px", fontSize: 13 }}
                      >
                        Confirmar Rejeição
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Training requirement */}
      {chain.status === "pending" && isProcessos && (
        <div
          className="mt-4 flex items-center gap-3 px-4 py-3"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg-main)",
          }}
        >
          <GraduationCap size={20} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
            As alterações exigem treinamento dos envolvidos?
          </span>
          <button
            onClick={handleTrainingToggle}
            disabled={trainingLoading}
            className={chain.requires_training ? "btn-primary" : "btn-secondary"}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {trainingLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : chain.requires_training ? (
              "Sim"
            ) : (
              "Não"
            )}
          </button>
        </div>
      )}

      {chain.requires_training !== null && chain.status !== "pending" && (
        <div
          className="mt-4 flex items-center gap-2 px-4 py-3"
          style={{
            borderRadius: "var(--radius-sm)",
            background: chain.requires_training
              ? "rgba(230, 168, 23, 0.06)"
              : "var(--bg-main)",
            border: `1px solid ${
              chain.requires_training ? "rgba(230, 168, 23, 0.2)" : "var(--border)"
            }`,
          }}
        >
          <GraduationCap
            size={18}
            style={{
              color: chain.requires_training ? "var(--warning)" : "var(--text-muted)",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {chain.requires_training
              ? "Treinamento necessário para os envolvidos"
              : "Treinamento não necessário"}
          </span>
        </div>
      )}
    </div>
  );
}
