"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UtensilsCrossed, ReceiptText, ShoppingCart, Settings, LogOut, Pizza, BarChart3, Tag, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const customerNav: NavItem[] = [
  { label: "Novo Pedido", href: "/orders/new", icon: <UtensilsCrossed size={18} /> },
  { label: "Meus Pedidos", href: "/orders", icon: <ReceiptText size={18} /> },
  { label: "Carrinho", href: "/checkout", icon: <ShoppingCart size={18} /> },
  { label: "Configurações", href: "/settings", icon: <Settings size={18} /> },
];

const adminNav: NavItem[] = [
  { label: "Sabores", href: "/admin/flavors", icon: <UtensilsCrossed size={18} /> },
  { label: "Promoções", href: "/admin/promotions", icon: <Tag size={18} /> },
  { label: "Produtos", href: "/admin/products", icon: <Package size={18} /> },
  { label: "Pedidos", href: "/admin/orders", icon: <ReceiptText size={18} /> },
  { label: "Dashboard", href: "/admin/dashboard", icon: <BarChart3 size={18} /> },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAuth();
  const isAdmin = user?.role === "Admin";
  const navItems = isAdmin ? adminNav : customerNav;

  function handleLogout() {
    clearAuth();
    document.cookie = "token=; Max-Age=0; path=/";
    document.cookie = "role=; Max-Age=0; path=/";
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-[240px] h-screen bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[var(--sidebar-border)]">
        <Pizza size={28} className="text-[var(--primary)]" />
        <span className="font-mono font-bold text-xl tracking-widest text-[var(--sidebar-foreground)] flex-1">
          BELLA ROMA
        </span>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <X size={18} />
          </button>
        )}
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-[var(--sidebar-border)]">
        <p className="font-mono font-semibold text-[var(--sidebar-foreground)]">{user?.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="px-2 mb-2 text-[10px] font-mono font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
          {isAdmin ? "Gerenciamento" : "Menu"}
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-m)] text-sm font-sans transition-colors",
                  pathname === item.href
                    ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)] font-medium"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-m)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--destructive)] transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
