"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Pizza } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 h-14 px-4 border-b border-[var(--border)] bg-[var(--sidebar)] lg:hidden shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <Menu size={20} />
          </button>
          <Pizza size={20} className="text-[var(--primary)]" />
          <span className="font-mono font-bold tracking-widest text-[var(--primary)]">
            BELLA ROMA
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}
