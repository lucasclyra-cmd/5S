"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  ShieldCheck,
  FolderTree,
  BarChart3,
  FileText,
  Tag,
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
        "Configure templates de formatacao com fontes, margens, cabecalhos e secoes obrigatorias.",
      href: "/admin/templates",
      icon: <LayoutTemplate size={28} />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Regras de Analise",
      description:
        "Defina checklists e regras que a IA deve verificar em cada tipo de documento.",
      href: "/admin/regras",
      icon: <ShieldCheck size={28} />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      label: "Categorias e Tags",
      description:
        "Gerencie categorias e tags para organizar e classificar documentos.",
      href: "/admin/categorias",
      icon: <FolderTree size={28} />,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Painel de Administracao
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure templates, regras de analise e organize categorias do
          sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <FileText size={24} className="text-indigo-600" />
          </div>
          <div>
            {loading ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats.documents}
              </p>
            )}
            <p className="text-sm text-gray-500">Documentos</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <FolderTree size={24} className="text-blue-600" />
          </div>
          <div>
            {loading ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats.categories}
              </p>
            )}
            <p className="text-sm text-gray-500">Categorias</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
            <LayoutTemplate size={24} className="text-violet-600" />
          </div>
          <div>
            {loading ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats.templates}
              </p>
            )}
            <p className="text-sm text-gray-500">Templates</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <ShieldCheck size={24} className="text-amber-600" />
          </div>
          <div>
            {loading ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats.rules}
              </p>
            )}
            <p className="text-sm text-gray-500">Regras</p>
          </div>
        </div>
      </div>

      {/* Management cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card group hover:shadow-md hover:border-indigo-200 transition-all"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl ${card.bgColor} ${card.color} mb-4`}
            >
              {card.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {card.label}
            </h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
