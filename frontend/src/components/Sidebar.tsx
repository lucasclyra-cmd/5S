"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile, ProfileType } from "@/lib/profile-context";
import {
  FileText,
  Upload,
  ClipboardList,
  Settings,
  FolderTree,
  LayoutTemplate,
  ShieldCheck,
  Home,
  LogOut,
  BookOpen,
  Users,
  FolderInput,
} from "lucide-react";

interface NavSection {
  title?: string;
  items: { label: string; href: string; icon: React.ReactNode }[];
}

const navByProfile: Record<string, NavSection[]> = {
  autor: [
    {
      title: "Documentos",
      items: [
        { label: "Painel", href: "/autor", icon: <Home size={18} /> },
        {
          label: "Submeter Documento",
          href: "/autor/submeter",
          icon: <Upload size={18} />,
        },
      ],
    },
  ],
  processos: [
    {
      title: "Revisão",
      items: [
        {
          label: "Fila de Revisão",
          href: "/processos",
          icon: <ClipboardList size={18} />,
        },
      ],
    },
    {
      title: "Registros",
      items: [
        {
          label: "Lista Mestra",
          href: "/processos/lista-mestra",
          icon: <BookOpen size={18} />,
        },
      ],
    },
  ],
  admin: [
    {
      title: "Administração",
      items: [
        { label: "Painel", href: "/admin", icon: <Settings size={18} /> },
      ],
    },
    {
      title: "Configurações",
      items: [
        {
          label: "Templates",
          href: "/admin/templates",
          icon: <LayoutTemplate size={18} />,
        },
        {
          label: "Regras de Análise",
          href: "/admin/regras",
          icon: <ShieldCheck size={18} />,
        },
        {
          label: "Categorias",
          href: "/admin/categorias",
          icon: <FolderTree size={18} />,
        },
        {
          label: "Aprovadores Padrão",
          href: "/admin/aprovadores",
          icon: <Users size={18} />,
        },
        {
          label: "Importar Documentos",
          href: "/admin/importar",
          icon: <FolderInput size={18} />,
        },
      ],
    },
  ],
};

const profileLabels: Record<string, string> = {
  autor: "Autor",
  processos: "Processos",
  admin: "Admin",
};

export default function Sidebar() {
  const { profile, setProfile } = useProfile();
  const pathname = usePathname();

  if (!profile || pathname === "/") {
    return null;
  }

  const sections = navByProfile[profile] || [];

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col"
      style={{ background: "var(--bg-sidebar)" }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="block">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm"
              style={{ background: "var(--accent)", color: "var(--bg-sidebar)" }}
            >
              5S
            </div>
            <div>
              <div className="text-[15px] font-bold text-white leading-tight">
                5S Docs
              </div>
              <div
                className="text-[10px] font-medium uppercase tracking-[1.2px]"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Tex Cotton
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-6" : ""}>
            {section.title && (
              <div
                className="px-3 mb-2"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    item.href !== "/autor" &&
                    item.href !== "/processos" &&
                    item.href !== "/admin" &&
                    pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 transition-all duration-150"
                      style={{
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: isActive ? "var(--accent)" : "transparent",
                        color: isActive
                          ? "var(--bg-sidebar)"
                          : "rgba(255,255,255,0.55)",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "13.5px",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 mt-auto">
        <div
          className="mb-3 mx-3"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "12px",
          }}
        >
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
            <div>
              <div className="text-[13px] font-medium text-white leading-tight">
                {profileLabels[profile]}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                Perfil ativo
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setProfile(null);
            window.location.href = "/";
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: "13px",
            borderRadius: "8px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.45)";
          }}
        >
          <LogOut size={16} />
          Trocar Perfil
        </button>
      </div>
    </aside>
  );
}
