"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useProfile, ProfileType } from "@/lib/profile-context";
import { FileText, ClipboardList, Settings } from "lucide-react";

const profiles: {
  id: ProfileType;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}[] = [
  {
    id: "autor",
    label: "Autor",
    description:
      "Submeta documentos, acompanhe o status de análise pela IA e gerencie suas versões.",
    icon: <FileText size={32} />,
    href: "/autor",
  },
  {
    id: "processos",
    label: "Processos",
    description:
      "Revise documentos na fila de aprovação, aprove ou rejeite com comentários.",
    icon: <ClipboardList size={32} />,
    href: "/processos",
  },
  {
    id: "admin",
    label: "Administrador",
    description:
      "Configure templates, regras de análise, categorias e tags do sistema.",
    icon: <Settings size={32} />,
    href: "/admin",
  },
];

export default function ProfileSelector() {
  const { setProfile } = useProfile();
  const router = useRouter();

  const handleSelect = (p: (typeof profiles)[0]) => {
    setProfile(p.id);
    router.push(p.href);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto w-full px-4">
      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => handleSelect(p)}
          className="group flex flex-col items-center gap-4 p-7 text-center transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "var(--accent-border)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            {p.icon}
          </div>
          <h3
            className="text-white"
            style={{ fontSize: "16px", fontWeight: 600 }}
          >
            {p.label}
          </h3>
          <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
            {p.description}
          </p>
        </button>
      ))}
    </div>
  );
}
