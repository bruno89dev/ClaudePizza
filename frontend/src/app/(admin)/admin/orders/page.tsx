"use client";

import { useEffect, useState } from "react";
import { ChefHat, PackageCheck, XCircle, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "Preparando" | "Pronto" | "Entregue" | "Cancelado";

interface OrderItem {
  id: number;
  flavorName: string;
  size: string;
  crust: string | null;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: number;
  userName: string;
  deliveryType: "Pickup" | "Delivery";
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  estimatedDeliveryAt: string | null;
}

const STATUS_VARIANT: Record<OrderStatus, "warning" | "success" | "secondary" | "destructive" | "default"> = {
  Preparando: "warning",
  Pronto:     "default",
  Entregue:   "success",
  Cancelado:  "destructive",
};

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-mono bg-[var(--foreground)] text-[var(--background)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {text}
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  order: Order;
  onUpdate: (id: number, status: OrderStatus) => void;
  loading: number | null;
}

function ActionButtons({ order, onUpdate, loading }: ActionButtonsProps) {
  const busy = loading === order.id;
  if (order.status === "Entregue" || order.status === "Cancelado") {
    return <span className="text-xs text-[var(--muted-foreground)] font-mono">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      {order.status === "Preparando" && (
        <Tooltip text="Marcar como Pronto">
          <button
            disabled={busy}
            onClick={() => onUpdate(order.id, "Pronto")}
            className="p-1.5 rounded-[var(--radius-m)] bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ChefHat size={16} />
          </button>
        </Tooltip>
      )}
      {order.status === "Pronto" && (
        <Tooltip text="Marcar como Entregue">
          <button
            disabled={busy}
            onClick={() => onUpdate(order.id, "Entregue")}
            className="p-1.5 rounded-[var(--radius-m)] bg-[#0f2e1a] text-[#4ade80] hover:bg-[#163d24] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <PackageCheck size={16} />
          </button>
        </Tooltip>
      )}
      <Tooltip text="Cancelar pedido">
        <button
          disabled={busy}
          onClick={() => {
            if (confirm(`Cancelar pedido #${order.id}?`)) onUpdate(order.id, "Cancelado");
          }}
          className="p-1.5 rounded-[var(--radius-m)] bg-[var(--destructive)]/15 text-[var(--destructive)] hover:bg-[var(--destructive)]/30 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <XCircle size={16} />
        </button>
      </Tooltip>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 7;

  function load() {
    api.get<Order[]>("/api/orders").then(setOrders);
  }

  useEffect(() => { load(); }, []);

  async function handleUpdate(id: number, status: OrderStatus) {
    setLoading(id);
    try {
      await api.patch(`/api/orders/${id}/status`, { status });
      load();
    } finally {
      setLoading(null);
    }
  }

  const filtered = search
    ? orders.filter((o) =>
        o.userName.toLowerCase().includes(search.toLowerCase()) ||
        String(o.id).includes(search)
      )
    : orders;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full p-4 lg:p-8 gap-6">
      <div>
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Pedidos</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Atualize o status dos pedidos em tempo real</p>
      </div>

      <div className="flex flex-col flex-1 rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              placeholder="Buscar por cliente ou #ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 h-9 text-sm bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 font-mono"
            />
          </div>
        </div>

        {/* Scrollable table */}
        <div className="overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_100px_110px_110px_120px_100px] items-center h-11 px-5 bg-[var(--muted)] border-b border-[var(--border)] min-w-[700px]">
          {["#", "Cliente", "Tipo", "Status", "Total", "Data", "Ações"].map((h) => (
            <div key={h} className="text-xs font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto min-w-[700px]">
          {paged.length === 0 && (
            <div className="flex items-center justify-center h-20 text-sm text-[var(--muted-foreground)]">
              Nenhum pedido encontrado.
            </div>
          )}
          {paged.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-[60px_1fr_100px_110px_110px_120px_100px] items-center min-h-[52px] px-5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40 transition-colors"
            >
              <span className="font-mono text-sm text-[var(--muted-foreground)]">#{order.id}</span>
              <div>
                <p className="text-sm font-mono text-[var(--foreground)]">{order.userName}</p>
                {order.estimatedDeliveryAt && (
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Prev. {new Date(order.estimatedDeliveryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="w-fit">
                {order.deliveryType === "Delivery" ? "Entrega" : "Retirada"}
              </Badge>
              <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
              <span className="font-mono text-sm">
                R$ {order.totalAmount.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-xs text-[var(--muted-foreground)] font-mono">
                {new Date(order.createdAt).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <ActionButtons order={order} onUpdate={handleUpdate} loading={loading} />
            </div>
          ))}
        </div>

        </div>{/* end scroll */}
        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors"
            >‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                  p === page
                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                }`}
              >{p}</button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors"
            >›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
