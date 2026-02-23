"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  LayoutTemplate,
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

interface TemplateFormData {
  document_type: string;
  category_id: number | null;
  font_family: string;
  font_size: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  header_text: string;
  footer_text: string;
  required_sections: string[];
}

const defaultFormData: TemplateFormData = {
  document_type: "",
  category_id: null,
  font_family: "Arial",
  font_size: 12,
  margin_top: 2.5,
  margin_bottom: 2.5,
  margin_left: 3.0,
  margin_right: 3.0,
  header_text: "",
  footer_text: "",
  required_sections: [],
};

export default function TemplatesPage() {
  const [configs, setConfigs] = useState<AdminConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [sectionInput, setSectionInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [configsData, catsData] = await Promise.all([
        getAdminConfigs("template"),
        getCategories().catch(() => []),
      ]);
      setConfigs(Array.isArray(configsData) ? configsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar templates");
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
      document_type: config.document_type || "",
      category_id: config.category_id,
      font_family: cd.font_family || "Arial",
      font_size: cd.font_size || 12,
      margin_top: cd.margins?.top ?? 2.5,
      margin_bottom: cd.margins?.bottom ?? 2.5,
      margin_left: cd.margins?.left ?? 3.0,
      margin_right: cd.margins?.right ?? 3.0,
      header_text: cd.header_text || "",
      footer_text: cd.footer_text || "",
      required_sections: cd.required_sections || [],
    });
    setEditingId(config.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setSectionInput("");
  }

  function addSection() {
    const trimmed = sectionInput.trim();
    if (trimmed && !formData.required_sections.includes(trimmed)) {
      setFormData({
        ...formData,
        required_sections: [...formData.required_sections, trimmed],
      });
    }
    setSectionInput("");
  }

  function removeSection(s: string) {
    setFormData({
      ...formData,
      required_sections: formData.required_sections.filter(
        (sec) => sec !== s
      ),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      config_type: "template",
      category_id: formData.category_id || null,
      document_type: formData.document_type || null,
      config_data: {
        font_family: formData.font_family,
        font_size: formData.font_size,
        margins: {
          top: formData.margin_top,
          bottom: formData.margin_bottom,
          left: formData.margin_left,
          right: formData.margin_right,
        },
        header_text: formData.header_text,
        footer_text: formData.footer_text,
        required_sections: formData.required_sections,
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
      setError(err.message || "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteAdminConfig(id, "template");
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir template");
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
              Templates de Formatação
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              Configure modelos de formatação para diferentes tipos de documento.
            </p>
          </div>
          <button onClick={openCreateForm} className="btn-primary">
            <Plus size={18} />
            Novo Template
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
              {editingId ? "Editar Template" : "Novo Template"}
            </h2>
            <button
              onClick={closeForm}
              className="btn-action"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Tipo de Documento</label>
                <input
                  type="text"
                  value={formData.document_type}
                  onChange={(e) =>
                    setFormData({ ...formData, document_type: e.target.value })
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Fonte</label>
                <select
                  value={formData.font_family}
                  onChange={(e) =>
                    setFormData({ ...formData, font_family: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>
              <div>
                <label className="label-field">Tamanho da Fonte (pt)</label>
                <input
                  type="number"
                  value={formData.font_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      font_size: Number(e.target.value),
                    })
                  }
                  min={8}
                  max={24}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label-field">Margens (cm)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Superior</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.margin_top}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        margin_top: Number(e.target.value),
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Inferior</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.margin_bottom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        margin_bottom: Number(e.target.value),
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Esquerda</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.margin_left}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        margin_left: Number(e.target.value),
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Direita</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.margin_right}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        margin_right: Number(e.target.value),
                      })
                    }
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Texto do Cabeçalho</label>
                <input
                  type="text"
                  value={formData.header_text}
                  onChange={(e) =>
                    setFormData({ ...formData, header_text: e.target.value })
                  }
                  placeholder="Ex: Nome da Empresa"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Texto do Rodapé</label>
                <input
                  type="text"
                  value={formData.footer_text}
                  onChange={(e) =>
                    setFormData({ ...formData, footer_text: e.target.value })
                  }
                  placeholder="Ex: Página {page}"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label-field">Seções Obrigatórias</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.required_sections.map((s) => (
                  <span
                    key={s}
                    className="chip"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSection(s)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--accent-hover)" }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sectionInput}
                  onChange={(e) => setSectionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSection();
                    }
                  }}
                  placeholder="Nome da seção"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addSection}
                  className="btn-secondary"
                  disabled={!sectionInput.trim()}
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
                {editingId ? "Atualizar" : "Criar"} Template
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

      {/* Templates list */}
      {!loading && configs.length === 0 && !showForm && (
        <div className="card text-center py-16">
          <LayoutTemplate size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>
            Nenhum template configurado
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 24 }}>
            Crie seu primeiro template de formatação.
          </p>
          <button onClick={openCreateForm} className="btn-primary">
            <Plus size={18} />
            Criar Template
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
                      <LayoutTemplate
                        size={20}
                        style={{ color: "var(--accent)" }}
                      />
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                        {config.document_type || "Template Geral"}
                      </h3>
                      <span className="badge-info">
                        {getCategoryName(config.category_id)}
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3"
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Fonte:</span>{" "}
                        {cd.font_family || "N/A"} {cd.font_size || ""}pt
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Margens:</span>{" "}
                        {cd.margins
                          ? `${cd.margins.top}/${cd.margins.bottom}/${cd.margins.left}/${cd.margins.right}cm`
                          : "N/A"}
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Cabeçalho:</span>{" "}
                        {cd.header_text || "N/A"}
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Rodapé:</span>{" "}
                        {cd.footer_text || "N/A"}
                      </div>
                    </div>
                    {cd.required_sections &&
                      cd.required_sections.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                          <span className="section-title" style={{ marginBottom: 0 }}>
                            Seções:
                          </span>
                          {cd.required_sections.map((s: string) => (
                            <span key={s} className="badge-neutral">
                              {s}
                            </span>
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
