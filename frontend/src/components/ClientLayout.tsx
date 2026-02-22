"use client";

import { usePathname } from "next/navigation";
import { useProfile } from "@/lib/profile-context";
import Sidebar from "@/components/Sidebar";
import React from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const pathname = usePathname();
  const showSidebar = profile && pathname !== "/";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className={`flex-1 transition-all duration-200 ${
          showSidebar ? "ml-64" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
