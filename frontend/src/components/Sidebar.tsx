"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile, ProfileType } from "@/lib/profile-context";
import {
  FileText,
  Upload,
  ClipboardList,
  Settings,
  FolderTree,
  Tag,
  LayoutTemplate,
  ShieldCheck,
  Home,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItemsByProfile: Record<string, NavItem[]> = {
  autor: [
    {
      label: "Painel",
      href: "/autor",
      icon: <Home size={20} />,
    },
    {
      label: "Submeter Documento",
      href: "/autor/submeter",
      icon: <Upload size={20} />,
    },
  ],
  processos: [
    {
      label: "Fila de Revisao",
      href: "/processos",
      icon: <ClipboardList size={20} />,
    },
  ],
  admin: [
    {
      label: "Painel Admin",
      href: "/admin",
      icon: <Settings size={20} />,
    },
    {
      label: "Templates",
      href: "/admin/templates",
      icon: <LayoutTemplate size={20} />,
    },
    {
      label: "Regras de Analise",
      href: "/admin/regras",
      icon: <ShieldCheck size={20} />,
    },
    {
      label: "Categorias e Tags",
      href: "/admin/categorias",
      icon: <FolderTree size={20} />,
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
  const [collapsed, setCollapsed] = useState(false);

  if (!profile || pathname === "/") {
    return null;
  }

  const navItems = navItemsByProfile[profile] || [];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              5S
            </div>
            <span className="text-lg font-bold text-gray-900">
              5S Docs
            </span>
          </Link>
        )}
        {collapsed && (
          <Link
            href="/"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm"
          >
            5S
          </Link>
        )}
      </div>

      {/* Profile badge */}
      <div className="border-b border-gray-200 px-4 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profileLabels[profile]}
              </p>
              <p className="text-xs text-gray-500">Perfil ativo</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <User size={16} />
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={
                      isActive ? "text-indigo-600" : "text-gray-400"
                    }
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-3 py-3 space-y-1">
        <button
          onClick={() => {
            setProfile(null);
            window.location.href = "/";
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title={collapsed ? "Trocar Perfil" : undefined}
        >
          <LogOut size={20} className="text-gray-400" />
          {!collapsed && <span>Trocar Perfil</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? (
            <ChevronRight size={20} className="text-gray-400" />
          ) : (
            <>
              <ChevronLeft size={20} className="text-gray-400" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
