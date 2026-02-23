"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  Save,
  X,
} from "lucide-react";
import {
  getAdminConfigs,
  createAdminConfig,
  updateAdminConfig,
  deleteAdminConfig,
  getCategories,
} from "@/lib/api";
import type { AdminConfig, Category } from "@/types";

interface RuleFormData {
  name: string;
  category_id: number | null;
  document_type: string;
  checklist: string[];
  description: string;
}

const defaultFormData: RuleFormData = {
  name: "",
  category_id: null,
  document_type: "",
  checklist: [],
  description: "",
};

export default function RegrasPage() {
  const [configs, setConfigs] = useState<AdminConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [checklistInput, setChecklistInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [configsData, catsData] = await Promise.all([
        getAdminConfigs("analysis_rule"),
        getCategories().catch(() => []),
      ]);
      setConfigs(Array.isArray(configsData) ? configsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar regras");
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setFormData(defaultFormData);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(config: AdminConfig) {
    const cd = config.config_data || {};
    setFormData({
      name: cd.name || "",
      category_id: config.category_id,
      document_type: config.document_type || "",
      checklist: cd.checklist || [],
      description: cd.description || "",
    });
    setEditingId(config.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setChecklistInput("");
  }

  function addChecklistItem() {
    const trimmed = checklistInput.trim();
    if (trimmed && !formData.checklist.includes(trimmed)) {
      setFormData({
        ...formData,
        checklist: [...formData.checklist, trimmed],
      });
    }
    setChecklistInput("");
  }

  function removeChecklistItem(item: string) {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((c) => c !== item),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("O nome da regra é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      config_type: "analysis_rule",
      category_id: formData.category_id || null,
      document_type: formData.document_type || null,
      config_data: {
        name: formData.name,
        description: formData.description,
        checklist: formData.checklist,
      },
    };

    try {
      if (editingId) {
        await updateAdminConfig(editingId, payload);
      } else {
        await createAdminConfig(payload);
      }
      closeForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar regra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteAdminConfig(id, "analysis_rules");
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir regra");
    }
  }

  function getCategoryName(id: number | null): string {
    if (!id) return "Todas";
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : `ID ${id}`;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 transition-colors mb-4"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: "var(--text-primary)" }}>
              Regras de Análise
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              Defina checklists e critérios de verificação para a IA.
            </p>
          </div>
          <button onClick={openCreateForm} className="btn-primary">
            <Plus size={18} />
            Nova Regra
          </button>
        </div>
      </div>

      {/* Error */}
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

      {/* Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ color: "var(--text-primary)" }}>
              {editingId ? "Editar Regra" : "Nova Regra"}
            </h2>
            <button
              onClick={closeForm}
              className="btn-action"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label-field">Nome da Regra</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Regra de Formatação Básica"
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o propósito desta regra..."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Tipo de Documento</label>
                <input
                  type="text"
                  value={formData.document_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      document_type: e.target.value,
                    })
                  }
                  placeholder="Ex: procedimento, instrução"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Categoria</label>
                <select
                  value={formData.category_id ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category_id: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="input-field"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label-field">
                Itens do Checklist (critérios de verificação)
              </label>
              <div className="space-y-2 mb-3">
                {formData.checklist.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-main)",
                    }}
                  >
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--accent-light)",
                        border: "1px solid var(--accent-border)",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--accent)",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item)}
                      className="btn-action"
                      style={{ width: 24, height: 24 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  placeholder="Descreva um item de verificação..."
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="btn-secondary"
                  disabled={!checklistInput.trim()}
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {editingId ? "Atualizar" : "Criar"} Regra
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      )}

      {/* Rules list */}
      {!loading && configs.length === 0 && !showForm && (
        <div className="card text-center py-16">
          <ShieldCheck size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>
            Nenhuma regra configurada
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 24 }}>
            Crie sua primeira regra de análise.
          </p>
          <button onClick={openCreateForm} className="btn-primary">
            <Plus size={18} />
            Criar Regra
          </button>
        </div>
      )}

      {!loading && configs.length > 0 && (
        <div className="space-y-4">
          {configs.map((config) => {
            const cd = config.config_data || {};
            return (
              <div key={config.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <ShieldCheck size={20} style={{ color: "var(--accent)" }} />
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                        {cd.name || "Regra sem nome"}
                      </h3>
                      {config.document_type && (
                        <span className="badge-info">
                          {config.document_type}
                        </span>
                      )}
                      <span className="badge-neutral">
                        {getCategoryName(config.category_id)}
                      </span>
                    </div>
                    {cd.description && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                        {cd.description}
                      </p>
                    )}
                    {cd.checklist && cd.checklist.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="section-title" style={{ marginBottom: 4 }}>
                          Checklist ({cd.checklist.length} itens)
                        </p>
                        {cd.checklist.map((item: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2"
                            style={{ fontSize: 13, color: "var(--text-secondary)" }}
                          >
                            <span
                              className="flex shrink-0 items-center justify-center mt-0.5"
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "var(--bg-main)",
                                border: "1px solid var(--border)",
                                fontSize: 10,
                                fontWeight: 500,
                                color: "var(--text-muted)",
                              }}
                            >
                              {i + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openEditForm(config)}
                      className="btn-action"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    {deleteConfirmId === config.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="btn-danger"
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="btn-ghost"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(config.id)}
                        className="btn-action"
                        title="Excluir"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
