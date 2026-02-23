"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  ShieldCheck,
  FolderTree,
  Loader2,
} from "lucide-react";
import { getDocuments, getCategories, getAdminConfigs } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    documents: 0,
    categories: 0,
    templates: 0,
    rules: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [docs, cats, templates, rules] = await Promise.all([
        getDocuments({ limit: 1 }).catch(() => ({ total: 0 })),
        getCategories().catch(() => []),
        getAdminConfigs("template").catch(() => []),
        getAdminConfigs("analysis_rule").catch(() => []),
      ]);
      setStats({
        documents: (docs as any).total || 0,
        categories: Array.isArray(cats) ? cats.length : 0,
        templates: Array.isArray(templates) ? templates.length : 0,
        rules: Array.isArray(rules) ? rules.length : 0,
      });
    } catch {
      // stats remain at 0
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      label: "Templates",
      description:
        "Configure templates de formatação com fontes, margens, cabeçalhos e seções obrigatórias.",
      href: "/admin/templates",
      icon: <LayoutTemplate size={28} />,
    },
    {
      label: "Regras de Análise",
      description:
        "Defina checklists e regras que a IA deve verificar em cada tipo de documento.",
      href: "/admin/regras",
      icon: <ShieldCheck size={28} />,
    },
    {
      label: "Categorias e Tags",
      description:
        "Gerencie categorias e tags para organizar e classificar documentos.",
      href: "/admin/categorias",
      icon: <FolderTree size={28} />,
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
          Configure templates, regras de análise e organize categorias do
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
}
