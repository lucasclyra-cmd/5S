"use client";

import ProfileSelector from "@/components/ProfileSelector";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
          <span className="text-2xl font-bold">5S</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Sistema de Automacao de Documentos
        </h1>
        <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
          Selecione seu perfil para acessar o sistema. O perfil determina
          as funcionalidades disponiveis na interface.
        </p>
      </div>
      <ProfileSelector />
    </div>
  );
}
