import type { Metadata } from "next";
import "./globals.css";
import { ProfileProvider } from "@/lib/profile-context";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "5S - Sistema de Automacao de Documentos | Tex Cotton",
  description:
    "Sistema corporativo de automacao de documentos com analise de IA",
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
          <ClientLayout>{children}</ClientLayout>
        </ProfileProvider>
      </body>
    </html>
  );
}
