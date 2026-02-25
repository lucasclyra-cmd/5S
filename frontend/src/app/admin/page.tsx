"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  ShieldCheck,
  FolderTree,
  Users,
  FolderInput,
  Loader2,
  Bot,
} from "lucide-react";
import { getDocuments, getCategories, getAdminConfigs, getTemplates, getAIUsageStats } from "@/lib/api";

interface AIUsageStat {
  agent_type: string;
  model: string;
  calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    documents: 0,
    categories: 0,
    templates: 0,
    rules: 0,
  });
  const [loading, setLoading] = useState(true);
  const [aiUsage, setAiUsage] = useState<AIUsageStat[]>([]);
  const [aiUsageLoading, setAiUsageLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadAIUsage();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [docs, cats, templates, rules] = await Promise.all([
        getDocuments({ limit: 1 }).catch(() => ({ total: 0 })),
        getCategories().catch(() => []),
        getTemplates().catch(() => ({ templates: [], total: 0 })),
        getAdminConfigs("analysis_rule").catch(() => []),
      ]);
      setStats({
        documents: (docs as any).total || 0,
        categories: Array.isArray(cats) ? cats.length : 0,
        templates: (templates as any).total || (templates as any).templates?.length || 0,
        rules: Array.isArray(rules) ? rules.length : 0,
      });
    } catch {
      // stats remain at 0
    } finally {
      setLoading(false);
    }
  }

  async function loadAIUsage() {
    setAiUsageLoading(true);
    try {
      const data = await getAIUsageStats();
      setAiUsage(Array.isArray(data) ? data : []);
    } catch {
      setAiUsage([]);
    } finally {
      setAiUsageLoading(false);
    }
  }

  const hasAIUsage =
    aiUsage.length > 0 &&
    aiUsage.some(
      (row) =>
        row.calls > 0 ||
        row.total_input_tokens > 0 ||
        row.total_output_tokens > 0 ||
        row.total_cost_usd > 0
    );

  const cards = [
    {
      label: "Templates",
      description:
        "Configure templates de formatação com fontes, margens, cabeçalhos e seções obrigatórias.",
      href: "/admin/templates",
      icon: <LayoutTemplate size={28} />,
    },
    {
      label: "Seções Obrigatórias",
      description:
        "Configure as seções que cada tipo de documento (PQ, IT, RQ) deve conter.",
      href: "/admin/regras",
      icon: <ShieldCheck size={28} />,
    },
    {
      label: "Categorias",
      description:
        "Gerencie categorias para organizar e classificar documentos.",
      href: "/admin/categorias",
      icon: <FolderTree size={28} />,
    },
    {
      label: "Aprovadores Padrão",
      description:
        "Configure os aprovadores padrão para as cadeias de aprovação.",
      href: "/admin/aprovadores",
      icon: <Users size={28} />,
    },
    {
      label: "Importar Documentos",
      description:
        "Importe documentos legados em massa para o sistema.",
      href: "/admin/importar",
      icon: <FolderInput size={28} />,
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ color: "var(--text-primary)" }}>
          Painel de Administração
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          Configure templates, seções obrigatórias e organize categorias do
          sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <p className="stat-label">Documentos</p>
          {loading ? (
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)", marginTop: 4 }} />
          ) : (
            <p className="stat-value">{stats.documents}</p>
          )}
        </div>
        <div className="stat-card">
          <p className="stat-label">Categorias</p>
          {loading ? (
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)", marginTop: 4 }} />
          ) : (
            <p className="stat-value">{stats.categories}</p>
          )}
        </div>
        <div className="stat-card">
          <p className="stat-label">Templates</p>
          {loading ? (
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)", marginTop: 4 }} />
          ) : (
            <p className="stat-value">{stats.templates}</p>
          )}
        </div>
        <div className="stat-card">
          <p className="stat-label">Regras</p>
          {loading ? (
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)", marginTop: 4 }} />
          ) : (
            <p className="stat-value">{stats.rules}</p>
          )}
        </div>
      </div>

      {/* Management cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card group transition-all"
            style={{ textDecoration: "none" }}
          >
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-light)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent)",
              }}
            >
              {card.icon}
            </div>
            <h3
              className="transition-colors"
              style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}
            >
              {card.label}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6 }}>
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      {/* AI Usage Stats */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={20} style={{ color: "var(--accent)" }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
            Uso de IA
          </h2>
        </div>

        {aiUsageLoading ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando estatísticas...</span>
          </div>
        ) : !hasAIUsage ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            Nenhum uso registrado ainda.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Modelo</th>
                  <th style={{ textAlign: "right" }}>Chamadas</th>
                  <th style={{ textAlign: "right" }}>Tokens Entrada</th>
                  <th style={{ textAlign: "right" }}>Tokens Saída</th>
                  <th style={{ textAlign: "right" }}>Custo Total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {aiUsage.map((row, idx) => (
                  <tr key={`${row.agent_type}-${idx}`}>
                    <td>
                      <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {row.agent_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {row.model}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {row.calls.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {row.total_input_tokens.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {row.total_output_tokens.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: row.total_cost_usd > 0 ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        ${row.total_cost_usd.toFixed(4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
