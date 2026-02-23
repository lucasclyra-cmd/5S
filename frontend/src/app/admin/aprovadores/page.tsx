"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Edit2,
  Save,
  X,
} from "lucide-react";
import {
  getDefaultApprovers,
  createDefaultApprover,
  updateDefaultApprover,
  deleteDefaultApprover,
} from "@/lib/api";
import type { DefaultApprover } from "@/types";

const DOC_TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "PQ", label: "PQ - Procedimento" },
  { value: "IT", label: "IT - Instrução de Trabalho" },
  { value: "RQ", label: "RQ - Registro" },
];

export default function AprovadoresPadrao() {
  const [approvers, setApprovers] = useState<DefaultApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [docType, setDocType] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadApprovers();
  }, []);

  async function loadApprovers() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDefaultApprovers();
      setApprovers(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar aprovadores");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = {
        approver_name: name.trim(),
        approver_role: role.trim(),
        approver_profile: "processos",
        document_type: docType || null,
        is_default: true,
        order: editId ? (approvers.find((a) => a.id === editId)?.order ?? 0) : approvers.length,
      };

      if (editId) {
        await updateDefaultApprover(editId, data);
      } else {
        await createDefaultApprover(data);
      }
      resetForm();
      await loadApprovers();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar aprovador");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteDefaultApprover(id);
      await loadApprovers();
    } catch (err: any) {
      setError(err.message || "Erro ao remover aprovador");
    }
  }

  function startEdit(approver: DefaultApprover) {
    setEditId(approver.id);
    setName(approver.approver_name);
    setRole(approver.approver_role);
    setDocType(approver.document_type || "");
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setRole("");
    setDocType("");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users size={24} style={{ color: "var(--accent)" }} />
            <h1 style={{ color: "var(--text-primary)" }}>
              Aprovadores Padrão
            </h1>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Configure os aprovadores padrão para cada tipo de documento.
          </p>
        </div>
        <button onClick={loadApprovers} className="btn-secondary" disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Atualizar
        </button>
      </div>

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

      {/* Add/Edit form */}
      <div
        className="card mb-6"
        style={{
          border: editId
            ? "1px solid var(--accent-border)"
            : "1px solid var(--border)",
        }}
      >
        <h3 className="section-title">
          {editId ? "Editar Aprovador" : "Novo Aprovador"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label-field">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Santos"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Função/Setor</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Engenharia de Processos"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Tipo de Documento</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="input-field"
            >
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !role.trim()}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : editId ? (
              <Save size={16} />
            ) : (
              <Plus size={16} />
            )}
            {editId ? "Salvar Alterações" : "Adicionar Aprovador"}
          </button>
          {editId && (
            <button onClick={resetForm} className="btn-secondary">
              <X size={16} />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : approvers.length === 0 ? (
        <div
          className="text-center py-12"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          <Users size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Nenhum aprovador padrão configurado
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Adicione aprovadores que serão sugeridos automaticamente nas cadeias de aprovação.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Nome</th>
                <th>Função</th>
                <th>Tipo Doc.</th>
                <th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {approvers.map((approver) => (
                <tr key={approver.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {approver.order + 1}
                  </td>
                  <td style={{ fontWeight: 500 }}>{approver.approver_name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {approver.approver_role}
                  </td>
                  <td>
                    <span className="chip">
                      {approver.document_type || "Todos"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(approver)}
                        className="btn-action"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(approver.id)}
                        className="btn-action"
                        style={{ color: "var(--danger)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
