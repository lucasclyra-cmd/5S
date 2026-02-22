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
  color: string;
  bgColor: string;
}[] = [
  {
    id: "autor",
    label: "Autor",
    description:
      "Submeta documentos, acompanhe o status de analise pela IA e gerencie suas versoes.",
    icon: <FileText size={40} />,
    href: "/autor",
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-400",
  },
  {
    id: "processos",
    label: "Processos",
    description:
      "Revise documentos na fila de aprovacao, aprove ou rejeite com comentarios.",
    icon: <ClipboardList size={40} />,
    href: "/processos",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-400",
  },
  {
    id: "admin",
    label: "Administrador",
    description:
      "Configure templates, regras de analise, categorias e tags do sistema.",
    icon: <Settings size={40} />,
    href: "/admin",
    color: "text-violet-600",
    bgColor: "bg-violet-50 hover:bg-violet-100 border-violet-200 hover:border-violet-400",
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => handleSelect(p)}
          className={`group flex flex-col items-center gap-4 rounded-2xl border-2 p-8 text-center transition-all duration-200 shadow-sm hover:shadow-md ${p.bgColor}`}
        >
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ${p.color}`}
          >
            {p.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{p.label}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {p.description}
          </p>
        </button>
      ))}
    </div>
  );
}
