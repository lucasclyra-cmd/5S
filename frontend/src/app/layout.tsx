import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProfileProvider } from "@/lib/profile-context";
import Sidebar from "@/components/Sidebar";
import { ClientLayout } from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "5S - Sistema de Automacao de Documentos",
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
      <body className={inter.className}>
        <ProfileProvider>
          <ClientLayout>{children}</ClientLayout>
        </ProfileProvider>
      </body>
    </html>
  );
}
