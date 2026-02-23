"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Users,
  AlertTriangle,
  Loader2,
  Shield,
} from "lucide-react";
import {
  getDefaultApprovers,
  detectSafety,
  createApprovalChain,
} from "@/lib/api";
import type { DefaultApprover, SafetyDetectionResult } from "@/types";

interface ApproverEntry {
  approver_name: string;
  approver_role: string;
  approver_profile: string;
  is_required: boolean;
  ai_recommended: boolean;
  order: number;
}

interface Props {
  versionId: number;
  documentType?: string | null;
  onChainCreated: () => void;
}

export default function ApproverSelector({
  versionId,
  documentType,
  onChainCreated,
}: Props) {
  const [approvers, setApprovers] = useState<ApproverEntry[]>([]);
  const [defaults, setDefaults] = useState<DefaultApprover[]>([]);
  const [safety, setSafety] = useState<SafetyDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [chainType, setChainType] = useState("A");

  // New approver form
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    loadDefaults();
  }, [documentType, versionId]);

  async function loadDefaults() {
    setLoading(true);
    try {
      const [defaultApprovers, safetyResult] = await Promise.all([
        getDefaultApprovers(documentType || undefined),
        detectSafety(versionId).catch(() => null),
      ]);

      setDefaults(defaultApprovers);
      setSafety(safetyResult);

      // Pre-populate with defaults
      const initial: ApproverEntry[] = defaultApprovers.map((d, i) => ({
        approver_name: d.approver_name,
        approver_role: d.approver_role,
        approver_profile: d.approver_profile,
        is_required: true,
        ai_recommended: false,
        order: i,
      }));

      // Add safety technician if recommended
      if (safetyResult?.involves_safety) {
        const alreadyHasSafety = initial.some((a) =>
          a.approver_role.toLowerCase().includes("segurança")
        );
        if (!alreadyHasSafety) {
          initial.push({
            approver_name: "Técnico de Segurança",
            approver_role: "Segurança do Trabalho",
            approver_profile: "processos",
            is_required: true,
            ai_recommended: true,
            order: initial.length,
          });
        }
      }

      setApprovers(initial);
    } catch {
      setApprovers([]);
    } finally {
      setLoading(false);
    }
  }

  function addApprover() {
    if (!newName.trim() || !newRole.trim()) return;
    setApprovers([
      ...approvers,
      {
        approver_name: newName.trim(),
        approver_role: newRole.trim(),
        approver_profile: "processos",
        is_required: true,
        ai_recommended: false,
        order: approvers.length,
      },
    ]);
    setNewName("");
    setNewRole("");
  }

  function removeApprover(index: number) {
    setApprovers(approvers.filter((_, i) => i !== index));
  }

  function toggleRequired(index: number) {
    setApprovers(
      approvers.map((a, i) =>
        i === index ? { ...a, is_required: !a.is_required } : a
      )
    );
  }

  async function handleCreateChain() {
    if (approvers.length === 0) return;
    setCreating(true);
    try {
      await createApprovalChain({
        version_id: versionId,
        chain_type: chainType,
        approvers: approvers.map((a, i) => ({
          ...a,
          order: i,
        })),
      });
      onChainCreated();
    } catch {
      // error handled by parent
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ marginLeft: 8, fontSize: 13, color: "var(--text-muted)" }}>
            Carregando aprovadores...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} style={{ color: "var(--accent)" }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
          Configurar Cadeia de Aprovação
        </h3>
      </div>

      {/* Safety warning */}
      {safety?.involves_safety && (
        <div
          className="flex items-start gap-3 mb-4 px-4 py-3"
          style={{
            borderRadius: "var(--radius-sm)",
            background: "rgba(230, 168, 23, 0.06)",
            border: "1px solid rgba(230, 168, 23, 0.2)",
          }}
        >
          <AlertTriangle size={20} style={{ color: "var(--warning)", marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Conteúdo de segurança detectado
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              {safety.recommendation}
            </p>
            {safety.safety_topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {safety.safety_topics.map((topic) => (
                  <span
                    key={topic}
                    className="chip"
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      background: "rgba(230, 168, 23, 0.08)",
                      borderColor: "rgba(230, 168, 23, 0.2)",
                      color: "var(--warning)",
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chain type */}
      <div className="mb-4">
        <label className="label-field">Tipo de Cadeia</label>
        <select
          value={chainType}
          onChange={(e) => setChainType(e.target.value)}
          className="input-field"
          style={{ width: "auto", minWidth: 200 }}
        >
          <option value="A">A - Aprovação</option>
          <option value="Ra">Ra - Reaprovação</option>
          <option value="C">C - Cancelamento</option>
        </select>
      </div>

      {/* Approvers list */}
      <div className="space-y-2 mb-4">
        {approvers.map((approver, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-3 py-2"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: approver.ai_recommended
                ? "rgba(59, 125, 216, 0.04)"
                : "var(--bg-card)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
                width: 20,
                textAlign: "center",
              }}
            >
              {index + 1}
            </span>
            <div className="flex-1">
              <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
                {approver.approver_name}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                {approver.approver_role}
              </span>
              {approver.ai_recommended && (
                <span
                  className="chip"
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    marginLeft: 8,
                    background: "rgba(59, 125, 216, 0.08)",
                    borderColor: "rgba(59, 125, 216, 0.2)",
                    color: "var(--info)",
                  }}
                >
                  IA
                </span>
              )}
            </div>
            <button
              onClick={() => toggleRequired(index)}
              className="btn-ghost"
              style={{
                fontSize: 11,
                padding: "2px 8px",
                color: approver.is_required ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {approver.is_required ? "Obrigatório" : "Opcional"}
            </button>
            <button
              onClick={() => removeApprover(index)}
              className="btn-action"
              style={{ width: 28, height: 28 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add approver */}
      <div
        className="flex gap-2 mb-4 p-3"
        style={{
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-main)",
          border: "1px dashed var(--border)",
        }}
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do aprovador"
          className="input-field flex-1"
          style={{ fontSize: 13 }}
        />
        <input
          type="text"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          placeholder="Função/Setor"
          className="input-field flex-1"
          style={{ fontSize: 13 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addApprover();
            }
          }}
        />
        <button
          onClick={addApprover}
          disabled={!newName.trim() || !newRole.trim()}
          className="btn-secondary"
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {/* Create chain */}
      <button
        onClick={handleCreateChain}
        disabled={creating || approvers.length === 0}
        className="btn-primary w-full justify-center"
      >
        {creating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Shield size={18} />
        )}
        Criar Cadeia de Aprovação ({approvers.length} aprovador
        {approvers.length !== 1 ? "es" : ""})
      </button>
    </div>
  );
}
