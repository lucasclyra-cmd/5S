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
  deleteAdminConfigByType,
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
      setError("O nome da regra e obrigatorio.");
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
      await deleteAdminConfigByType(id, "analysis_rules");
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
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Regras de Analise
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Defina checklists e criterios de verificacao para a IA.
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
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Editar Regra" : "Nova Regra"}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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
                placeholder="Ex: Regra de Formatacao Basica"
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Descricao</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o proposito desta regra..."
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
                  placeholder="Ex: procedimento, instrucao"
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
                Itens do Checklist (criterios de verificacao)
              </label>
              <div className="space-y-2 mb-3">
                {formData.checklist.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 transition-colors"
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
                  placeholder="Descreva um item de verificacao..."
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

            <div className="flex gap-3 pt-4 border-t border-gray-200">
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
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      )}

      {/* Rules list */}
      {!loading && configs.length === 0 && !showForm && (
        <div className="card text-center py-16">
          <ShieldCheck size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">
            Nenhuma regra configurada
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Crie sua primeira regra de analise.
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
                      <ShieldCheck size={20} className="text-indigo-600" />
                      <h3 className="text-base font-semibold text-gray-900">
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
                      <p className="text-sm text-gray-500 mb-3">
                        {cd.description}
                      </p>
                    )}
                    {cd.checklist && cd.checklist.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Checklist ({cd.checklist.length} itens)
                        </p>
                        {cd.checklist.map((item: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 mt-0.5">
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
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    {deleteConfirmId === config.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200 transition-colors text-xs font-medium"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(config.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
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
