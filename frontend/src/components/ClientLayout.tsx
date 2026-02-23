"use client";

import { usePathname } from "next/navigation";
import { useProfile } from "@/lib/profile-context";
import Sidebar from "@/components/Sidebar";
import React from "react";
import { ChevronRight } from "lucide-react";

const breadcrumbMap: Record<string, string> = {
  autor: "Autor",
  processos: "Processos",
  admin: "Administracao",
  submeter: "Submeter Documento",
  templates: "Templates",
  regras: "Regras de Analise",
  categorias: "Categorias e Tags",
  "lista-mestra": "Lista Mestra",
  aprovadores: "Aprovadores Padrão",
};

function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5" style={{ fontSize: "12.5px" }}>
      <span style={{ color: "var(--text-muted)" }}>5S Docs</span>
      {parts.map((part, i) => {
        const label = breadcrumbMap[part] || decodeURIComponent(part);
        const isLast = i === parts.length - 1;
        return (
          <React.Fragment key={i}>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <span
              style={{
                color: isLast ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: isLast ? 500 : 400,
              }}
            >
              {label}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const pathname = usePathname();
  const showSidebar = profile && pathname !== "/";

  if (!showSidebar) {
    return <>{children}</>;
  }

  const profileLabels: Record<string, string> = {
    autor: "Autor",
    processos: "Processos",
    admin: "Admin",
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ marginLeft: 240 }}>
        {/* Top Bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-8"
          style={{
            height: 56,
            background: "var(--bg-card)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Breadcrumb />
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
              style={{
                background: "var(--accent)",
                color: "var(--bg-sidebar)",
              }}
            >
              {profileLabels[profile]?.[0] || "?"}
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {profileLabels[profile]}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
