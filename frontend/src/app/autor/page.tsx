"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { getDocuments, searchDocuments } from "@/lib/api";
import type { Document } from "@/types";

export default function AutorDashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getDocuments(params);
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar documentos");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchDocuments(searchQuery);
      const docs = Array.isArray(data) ? data : [];
      setDocuments(docs);
      setTotal(docs.length);
    } catch (err: any) {
      setError(err.message || "Erro na busca");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return (
          <span className="badge-success flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} />
            Aprovado
          </span>
        );
      case "rejected":
        return (
          <span className="badge-danger flex items-center gap-1 w-fit">
            <XCircle size={12} />
            Rejeitado
          </span>
        );
      case "pending_analysis":
        return (
          <span className="badge-warning flex items-center gap-1 w-fit">
            <Clock size={12} />
            Analise Pendente
          </span>
        );
      case "pending_review":
        return (
          <span className="badge-info flex items-center gap-1 w-fit">
            <AlertCircle size={12} />
            Revisao Pendente
          </span>
        );
      case "formatted":
        return (
          <span className="badge-success flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} />
            Formatado
          </span>
        );
      case "published":
        return (
          <span className="badge-success flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} />
            Publicado
          </span>
        );
      default:
        return (
          <span className="badge-neutral flex items-center gap-1 w-fit">
            {status}
          </span>
        );
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Stats calculation
  const stats = {
    total: total,
    pending: documents.filter(
      (d) =>
        d.status === "pending_analysis" || d.status === "pending_review"
    ).length,
    approved: documents.filter(
      (d) =>
        d.status === "approved" ||
        d.status === "formatted" ||
        d.status === "published"
    ).length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Painel do Autor
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie seus documentos e acompanhe o status de analise.
          </p>
        </div>
        <Link href="/autor/submeter" className="btn-primary">
          <Plus size={18} />
          Novo Documento
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <BarChart3 size={24} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total}
            </p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Clock size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.pending}
            </p>
            <p className="text-sm text-gray-500">Pendentes</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.approved}
            </p>
            <p className="text-sm text-gray-500">Aprovados</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <XCircle size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.rejected}
            </p>
            <p className="text-sm text-gray-500">Rejeitados</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por codigo ou titulo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto min-w-[180px]"
        >
          <option value="">Todos os status</option>
          <option value="pending_analysis">Analise Pendente</option>
          <option value="pending_review">Revisao Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
          <option value="formatted">Formatado</option>
          <option value="published">Publicado</option>
        </select>
        <button onClick={handleSearch} className="btn-secondary">
          <Search size={18} />
          Buscar
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <span className="ml-3 text-sm text-gray-500">
            Carregando documentos...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && documents.length === 0 && (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum documento encontrado
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Comece submetendo seu primeiro documento.
          </p>
          <Link href="/autor/submeter" className="btn-primary">
            <Plus size={18} />
            Submeter Documento
          </Link>
        </div>
      )}

      {/* Documents table */}
      {!loading && documents.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Codigo
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Titulo
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Versao
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tags
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Data
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Acao
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/autor/${doc.code}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-indigo-600">
                      {doc.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {doc.title}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      v{doc.current_version}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(doc.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="badge-neutral text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags && doc.tags.length > 3 && (
                        <span className="badge-neutral text-xs">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {formatDate(doc.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium">
                      Ver
                      <ChevronRight size={16} />
                    </span>
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
