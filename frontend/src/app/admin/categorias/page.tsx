"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
  Save,
} from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import type { Category } from "@/types";
import { useToast } from "@/lib/toast-context";

export default function CategoriasPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setName("");
    setDescription("");
    setParentId(null);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setName(cat.name);
    setDescription(cat.description);
    setParentId(cat.parent_id);
    setEditingId(cat.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setParentId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome da categoria é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: name.trim(),
          description: description.trim(),
          parent_id: parentId,
        });
      } else {
        await createCategory({
          name: name.trim(),
          description: description.trim(),
          parent_id: parentId,
        });
      }
      showToast(editingId ? "Categoria atualizada." : "Categoria criada.", "success");
      closeForm();
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteCategory(id);
      setDeleteConfirmId(null);
      showToast("Categoria excluída.", "success");
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir categoria");
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
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
        <h1 style={{ color: "var(--text-primary)" }}>
          Categorias
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          Organize os documentos com categorias hierárquicas.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderTree size={20} style={{ color: "var(--accent)" }} />
          <h2 style={{ color: "var(--text-primary)" }}>
            Categorias
          </h2>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary"
          style={{ padding: "6px 12px", fontSize: 13 }}
        >
          <Plus size={16} />
          Nova
        </button>
      </div>

      {error && (
        <div
          className="mb-4"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--danger)",
            background: "rgba(201, 69, 62, 0.06)",
            padding: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Category form */}
      {showForm && (
        <div className="card mb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Qualidade"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da categoria"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Categoria Pai</label>
              <select
                value={parentId ?? ""}
                onChange={(e) =>
                  setParentId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="input-field"
              >
                <option value="">Nenhuma (raiz)</option>
                {categories
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{ fontSize: 13 }}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editingId ? "Atualizar" : "Criar"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="btn-secondary"
                style={{ fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          />
        </div>
      ) : categories.length === 0 ? (
        <div className="card text-center py-8">
          <FolderTree
            size={36}
            className="mx-auto mb-3"
            style={{ color: "var(--text-muted)" }}
          />
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Nenhuma categoria cadastrada.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            >
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {cat.name}
                </p>
                {cat.description && (
                  <p className="truncate" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {cat.description}
                  </p>
                )}
                {cat.parent_id && (
                  <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>
                    Pai:{" "}
                    {categories.find((c) => c.id === cat.parent_id)
                      ?.name || `ID ${cat.parent_id}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button
                  onClick={() => openEdit(cat)}
                  className="btn-action"
                >
                  <Pencil size={16} />
                </button>
                {deleteConfirmId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="btn-danger"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="btn-ghost"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(cat.id)}
                    className="btn-action"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
