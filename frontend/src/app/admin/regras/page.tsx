"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  List,
  Save,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  getAdminConfigs,
  createAdminConfig,
  updateAdminConfig,
} from "@/lib/api";
import type { AdminConfig } from "@/types";
import { useToast } from "@/lib/toast-context";

const DOC_TYPES = [
  {
    type: "PQ",
    label: "PQ — Procedimento da Qualidade",
    defaults: [
      "Objetivo e Abrangência",
      "Documentos Complementares",
      "Definições",
      "Descrição das Atividades",
      "Responsabilidades",
    ],
  },
  {
    type: "IT",
    label: "IT — Instrução de Trabalho",
    defaults: [
      "Objetivo e Abrangência",
      "Documentos Complementares",
      "Definições",
      "Condições de Segurança",
      "Características",
      "Condições de Armazenamento",
    ],
  },
  {
    type: "RQ",
    label: "RQ — Registro da Qualidade",
    defaults: [],
  },
];

interface SectionsState {
  [docType: string]: {
    configId: number | null;
    sections: string[];
  };
}

export default function RegrasPage() {
  const { showToast } = useToast();
  const [state, setState] = useState<SectionsState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editSections, setEditSections] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const configs = await getAdminConfigs("analysis_rule");
      const configList = Array.isArray(configs) ? configs : [];

      const newState: SectionsState = {};
      for (const dt of DOC_TYPES) {
        const config = configList.find((c: AdminConfig) => c.document_type === dt.type);
        newState[dt.type] = {
          configId: config?.id ?? null,
          sections: config?.config_data?.sections ?? dt.defaults,
        };
      }
      setState(newState);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(docType: string) {
    setEditingType(docType);
    setEditSections([...(state[docType]?.sections || [])]);
    setNewItem("");
  }

  function cancelEdit() {
    setEditingType(null);
    setEditSections([]);
    setNewItem("");
  }

  function addSection() {
    const trimmed = newItem.trim();
    if (trimmed && !editSections.includes(trimmed)) {
      setEditSections([...editSections, trimmed]);
    }
    setNewItem("");
  }

  function removeSection(index: number) {
    setEditSections(editSections.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editSections.length) return;
    const updated = [...editSections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setEditSections(updated);
  }

  async function handleSave() {
    if (!editingType) return;
    setSaving(true);
    setError(null);

    const configId = state[editingType]?.configId;
    const payload = {
      config_type: "analysis_rules",
      document_type: editingType,
      category_id: null,
      config_data: { sections: editSections },
    };

    try {
      if (configId) {
        await updateAdminConfig(configId, payload);
      } else {
        await createAdminConfig(payload);
      }
      showToast("Regras salvas com sucesso.", "success");
      cancelEdit();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
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
        <div>
          <h1 style={{ color: "var(--text-primary)" }}>
            Seções Obrigatórias
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Configure as seções que cada tipo de documento deve conter.
          </p>
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      )}

      {/* Document type cards */}
      {!loading && (
        <div className="space-y-6">
          {DOC_TYPES.map((dt) => {
            const data = state[dt.type];
            const isEditing = editingType === dt.type;
            const sections = data?.sections || dt.defaults;

            return (
              <div key={dt.type} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <List size={20} style={{ color: "var(--accent)" }} />
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                        {dt.label}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {sections.length} {sections.length === 1 ? "seção" : "seções"} configuradas
                        {!data?.configId && (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}> (padrão)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(dt.type)}
                      className="btn-action"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                </div>

                {/* View mode */}
                {!isEditing && (
                  <div className="space-y-1.5">
                    {sections.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                        Sem seções definidas — mantém estrutura original do documento.
                      </p>
                    ) : (
                      sections.map((section, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg-main)",
                            border: "1px solid var(--border)",
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
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                            {section}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div>
                    <div className="space-y-2 mb-4">
                      {editSections.map((section, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--accent-border)",
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
                            {i + 1}
                          </span>
                          <span className="flex-1" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                            {section}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveSection(i, "up")}
                              disabled={i === 0}
                              className="btn-action"
                              style={{ opacity: i === 0 ? 0.3 : 1 }}
                              title="Mover para cima"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(i, "down")}
                              disabled={i === editSections.length - 1}
                              className="btn-action"
                              style={{ opacity: i === editSections.length - 1 ? 0.3 : 1 }}
                              title="Mover para baixo"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSection(i)}
                              className="btn-action"
                              style={{ color: "var(--danger)" }}
                              title="Remover"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSection();
                          }
                        }}
                        placeholder="Nome da seção..."
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={addSection}
                        className="btn-secondary"
                        disabled={!newItem.trim()}
                      >
                        <Plus size={16} />
                        Adicionar
                      </button>
                    </div>

                    <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                      >
                        {saving ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        Salvar
                      </button>
                      <button onClick={cancelEdit} className="btn-secondary">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
