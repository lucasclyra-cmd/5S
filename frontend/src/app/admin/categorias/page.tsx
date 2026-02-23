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
  Tag,
  Save,
  X,
} from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTags,
  createTag,
  deleteTag,
} from "@/lib/api";
import type { Category, Tag as TagType } from "@/types";

export default function CategoriasPage() {
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catParentId, setCatParentId] = useState<number | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [deleteCatConfirmId, setDeleteCatConfirmId] = useState<number | null>(null);

  // Tags state
  const [tags, setTags] = useState<TagType[]>([]);
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [deleteTagConfirmId, setDeleteTagConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  async function loadCategories() {
    setCatLoading(true);
    setCatError(null);
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setCatError(err.message || "Erro ao carregar categorias");
    } finally {
      setCatLoading(false);
    }
  }

  async function loadTags() {
    setTagLoading(true);
    setTagError(null);
    try {
      const data = await getTags();
      setTags(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setTagError(err.message || "Erro ao carregar tags");
    } finally {
      setTagLoading(false);
    }
  }

  // ---- Category form ----

  function openCatCreate() {
    setCatName("");
    setCatDescription("");
    setCatParentId(null);
    setEditingCatId(null);
    setShowCatForm(true);
  }

  function openCatEdit(cat: Category) {
    setCatName(cat.name);
    setCatDescription(cat.description);
    setCatParentId(cat.parent_id);
    setEditingCatId(cat.id);
    setShowCatForm(true);
  }

  function closeCatForm() {
    setShowCatForm(false);
    setEditingCatId(null);
    setCatName("");
    setCatDescription("");
    setCatParentId(null);
  }

  async function handleCatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) {
      setCatError("O nome da categoria é obrigatório.");
      return;
    }
    setCatSaving(true);
    setCatError(null);
    try {
      if (editingCatId) {
        await updateCategory(editingCatId, {
          name: catName.trim(),
          description: catDescription.trim(),
          parent_id: catParentId,
        });
      } else {
        await createCategory({
          name: catName.trim(),
          description: catDescription.trim(),
          parent_id: catParentId,
        });
      }
      closeCatForm();
      await loadCategories();
    } catch (err: any) {
      setCatError(err.message || "Erro ao salvar categoria");
    } finally {
      setCatSaving(false);
    }
  }

  async function handleCatDelete(id: number) {
    setCatError(null);
    try {
      await deleteCategory(id);
      setDeleteCatConfirmId(null);
      await loadCategories();
    } catch (err: any) {
      setCatError(err.message || "Erro ao excluir categoria");
    }
  }

  // ---- Tag operations ----

  async function handleTagCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTagSaving(true);
    setTagError(null);
    try {
      await createTag({ name: newTagName.trim() });
      setNewTagName("");
      await loadTags();
    } catch (err: any) {
      setTagError(err.message || "Erro ao criar tag");
    } finally {
      setTagSaving(false);
    }
  }

  async function handleTagDelete(id: number) {
    setTagError(null);
    try {
      await deleteTag(id);
      setDeleteTagConfirmId(null);
      await loadTags();
    } catch (err: any) {
      setTagError(err.message || "Erro ao excluir tag");
    }
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
        <h1 style={{ color: "var(--text-primary)" }}>
          Categorias e Tags
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          Organize os documentos com categorias hierárquicas e tags.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Categories Section ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderTree size={20} style={{ color: "var(--accent)" }} />
              <h2 style={{ color: "var(--text-primary)" }}>
                Categorias
              </h2>
            </div>
            <button
              onClick={openCatCreate}
              className="btn-primary"
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              <Plus size={16} />
              Nova
            </button>
          </div>

          {catError && (
            <div
              className="mb-4"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--danger)",
                background: "rgba(201, 69, 62, 0.06)",
                padding: 12,
              }}
            >
              <p style={{ fontSize: 13, color: "var(--danger)" }}>{catError}</p>
            </div>
          )}

          {/* Category form */}
          {showCatForm && (
            <div className="card mb-4">
              <form onSubmit={handleCatSubmit} className="space-y-4">
                <div>
                  <label className="label-field">Nome</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Ex: Qualidade"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Descrição</label>
                  <input
                    type="text"
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    placeholder="Descrição da categoria"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Categoria Pai</label>
                  <select
                    value={catParentId ?? ""}
                    onChange={(e) =>
                      setCatParentId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="input-field"
                  >
                    <option value="">Nenhuma (raiz)</option>
                    {categories
                      .filter((c) => c.id !== editingCatId)
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
                    disabled={catSaving}
                    className="btn-primary"
                    style={{ fontSize: 13 }}
                  >
                    {catSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {editingCatId ? "Atualizar" : "Criar"}
                  </button>
                  <button
                    type="button"
                    onClick={closeCatForm}
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
          {catLoading ? (
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
                      onClick={() => openCatEdit(cat)}
                      className="btn-action"
                    >
                      <Pencil size={16} />
                    </button>
                    {deleteCatConfirmId === cat.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCatDelete(cat.id)}
                          className="btn-danger"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeleteCatConfirmId(null)}
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteCatConfirmId(cat.id)}
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

        {/* ─── Tags Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Tag size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ color: "var(--text-primary)" }}>Tags</h2>
          </div>

          {tagError && (
            <div
              className="mb-4"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--danger)",
                background: "rgba(201, 69, 62, 0.06)",
                padding: 12,
              }}
            >
              <p style={{ fontSize: 13, color: "var(--danger)" }}>{tagError}</p>
            </div>
          )}

          {/* Tag create form */}
          <form
            onSubmit={handleTagCreate}
            className="flex gap-2 mb-4"
          >
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nome da nova tag"
              className="input-field flex-1"
              disabled={tagSaving}
            />
            <button
              type="submit"
              disabled={tagSaving || !newTagName.trim()}
              className="btn-primary"
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {tagSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Criar
            </button>
          </form>

          {/* Tags list */}
          {tagLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--accent)" }}
              />
            </div>
          ) : tags.length === 0 ? (
            <div className="card text-center py-8">
              <Tag size={36} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Nenhuma tag cadastrada.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="chip"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <span style={{ fontSize: 13 }}>{tag.name}</span>
                  {deleteTagConfirmId === tag.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTagDelete(tag.id)}
                        style={{
                          fontSize: 11,
                          color: "var(--danger)",
                          fontWeight: 600,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Sim
                      </button>
                      <span style={{ color: "var(--text-muted)" }}>|</span>
                      <button
                        onClick={() => setDeleteTagConfirmId(null)}
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteTagConfirmId(tag.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        display: "flex",
                        color: "var(--accent-hover)",
                        borderRadius: "50%",
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
