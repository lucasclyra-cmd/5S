import type { Metadata } from "next";
import "./globals.css";
import { ProfileProvider } from "@/lib/profile-context";
import { ToastProvider } from "@/lib/toast-context";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "5S Docs — Automação de Documentos | Tex Cotton",
  description:
    "Sistema corporativo de automação de documentos normativos com análise por IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ProfileProvider>
          <ToastProvider>
            <ClientLayout>{children}</ClientLayout>
          </ToastProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
