"use client";

import ProfileSelector from "@/components/ProfileSelector";

export default function HomePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-sidebar)" }}
    >
      <div className="mb-12 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl font-bold text-2xl"
          style={{
            background: "var(--accent)",
            color: "var(--bg-sidebar)",
            boxShadow: "0 8px 32px rgba(212, 168, 67, 0.3)",
          }}
        >
          5S
        </div>
        <h1
          className="text-white"
          style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.5px" }}
        >
          Sistema de Automação de Documentos
        </h1>
        <p
          className="mt-2 max-w-lg mx-auto"
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
          }}
        >
          Tex Cotton — Selecione seu perfil para acessar o sistema.
        </p>
      </div>
      <ProfileSelector />
    </div>
  );
}
