"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, ChefHat, PackageCheck, Bike, ShoppingBag, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrderStatus =
  | "AguardandoConfirmacao" | "Confirmado" | "EmPreparo"
  | "Pronto" | "SaiuParaEntrega" | "AguardandoRetirada"
  | "Entregue" | "Cancelado";

const STATUS_LABEL: Record<OrderStatus, string> = {
  AguardandoConfirmacao: "Aguardando Confirmação",
  Confirmado:            "Confirmado",
  EmPreparo:             "Em Preparo",
  Pronto:                "Pronto",
  SaiuParaEntrega:       "Saiu p/ Entrega",
  AguardandoRetirada:    "Ag. Retirada",
  Entregue:              "Entregue",
  Cancelado:             "Cancelado",
};

const STATUS_VARIANT: Record<OrderStatus, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  AguardandoConfirmacao: "secondary",
  Confirmado:            "warning",
  EmPreparo:             "default",
  Pronto:                "warning",
  SaiuParaEntrega:       "default",
  AguardandoRetirada:    "default",
  Entregue:              "success",
  Cancelado:             "destructive",
};

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
  rating: number | null;
}

function TooltipWrapper({ text, children }: { text: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className="inline-flex"
      onMouseEnter={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && createPortal(
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)" }}
          className="px-2 py-1 rounded text-xs font-mono bg-[var(--foreground)] text-[var(--background)] whitespace-nowrap pointer-events-none z-[9999]"
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}

function ActionButtons({
  order,
  onUpdate,
  onRequestCancel,
  loading,
}: {
  order: Order;
  onUpdate: (id: number, status: OrderStatus) => void;
  onRequestCancel: (id: number) => void;
  loading: number | null;
}) {
  const busy = loading === order.id;

  if (order.status === "Entregue" || order.status === "Cancelado") {
    return <span className="text-xs text-[var(--muted-foreground)] font-mono">—</span>;
  }

  const cancelBtn = (
    <TooltipWrapper text="Cancelar pedido">
      <button
        disabled={busy}
        onClick={() => onRequestCancel(order.id)}
        className="px-3 py-1.5 rounded-[var(--radius-m)] text-xs font-mono bg-[var(--destructive)]/15 text-[var(--destructive)] hover:bg-[var(--destructive)]/30 transition-colors disabled:opacity-40 cursor-pointer"
      >
        Cancelar
      </button>
    </TooltipWrapper>
  );

  if (order.status === "AguardandoConfirmacao") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipWrapper text="Confirmar pedido">
          <button disabled={busy} onClick={() => onUpdate(order.id, "Confirmado")}
            className="p-1.5 rounded-[var(--radius-m)] bg-[#0f2e1a] text-[#4ade80] hover:bg-[#163d24] transition-colors disabled:opacity-40 cursor-pointer">
            <CheckCircle size={16} />
          </button>
        </TooltipWrapper>
        {cancelBtn}
      </div>
    );
  }

  if (order.status === "Confirmado") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipWrapper text="Iniciar preparo">
          <button disabled={busy} onClick={() => onUpdate(order.id, "EmPreparo")}
            className="p-1.5 rounded-[var(--radius-m)] bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-40 cursor-pointer">
            <ChefHat size={16} />
          </button>
        </TooltipWrapper>
        {cancelBtn}
      </div>
    );
  }

  if (order.status === "EmPreparo") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipWrapper text="Marcar como Pronto">
          <button disabled={busy} onClick={() => onUpdate(order.id, "Pronto")}
            className="p-1.5 rounded-[var(--radius-m)] bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-40 cursor-pointer">
            <CheckCircle size={16} />
          </button>
        </TooltipWrapper>
        {cancelBtn}
      </div>
    );
  }

  if (order.status === "Pronto") {
    const isDelivery = order.deliveryType === "Delivery";
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipWrapper text={isDelivery ? "Saiu para Entrega" : "Aguardando Retirada"}>
          <button
            disabled={busy}
            onClick={() => onUpdate(order.id, isDelivery ? "SaiuParaEntrega" : "AguardandoRetirada")}
            className="p-1.5 rounded-[var(--radius-m)] bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isDelivery ? <Bike size={16} /> : <ShoppingBag size={16} />}
          </button>
        </TooltipWrapper>
        {cancelBtn}
      </div>
    );
  }

  if (order.status === "SaiuParaEntrega" || order.status === "AguardandoRetirada") {
    return (
      <TooltipWrapper text="Marcar como Entregue">
        <button disabled={busy} onClick={() => onUpdate(order.id, "Entregue")}
          className="p-1.5 rounded-[var(--radius-m)] bg-[#0f2e1a] text-[#4ade80] hover:bg-[#163d24] transition-colors disabled:opacity-40 cursor-pointer">
          <PackageCheck size={16} />
        </button>
      </TooltipWrapper>
    );
  }

  return null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 7;

  const [cancelModal, setCancelModal] = useState<{ orderId: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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

  function handleRequestCancel(orderId: number) {
    setCancelReason("");
    setCancelModal({ orderId });
  }

  async function handleConfirmCancel() {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await api.patch(`/api/orders/${cancelModal.orderId}/status`, {
        status: "Cancelado",
        cancellationReason: cancelReason.trim() || null,
      });
      setCancelModal(null);
      load();
    } finally {
      setCancelling(false);
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

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle>Cancelar Pedido #{cancelModal.orderId}?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Por favor, conte-nos o motivo do cancelamento"
                rows={3}
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 resize-none"
              />
              <p className="text-xs text-[var(--muted-foreground)]">Observações</p>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setCancelModal(null)}>Não</Button>
                <Button variant="destructive" className="flex-1" onClick={handleConfirmCancel} disabled={cancelling}>
                  {cancelling ? "Cancelando..." : "Sim, cancelar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)] h-11">
                {[
                  { label: "#", cls: "w-14" },
                  { label: "Cliente", cls: "" },
                  { label: "Tipo", cls: "w-24" },
                  { label: "Status", cls: "w-44" },
                  { label: "Total", cls: "w-28" },
                  { label: "Data", cls: "w-32" },
                  { label: "Ações", cls: "w-36" },
                  { label: "Avaliação", cls: "w-24" },
                ].map(({ label, cls }) => (
                  <th key={label} className={`px-4 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wide ${cls}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
              {paged.map((order) => (
                <tr key={order.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-[var(--muted-foreground)]">#{order.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono text-[var(--foreground)]">{order.userName}</p>
                    {order.estimatedDeliveryAt && (
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Prev. {new Date(order.estimatedDeliveryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {order.deliveryType === "Delivery" ? "Entrega" : "Retirada"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[order.status]} className="text-xs whitespace-nowrap">
                      {STATUS_LABEL[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    R$ {order.totalAmount.toFixed(2).replace(".", ",")}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] font-mono">
                    {new Date(order.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <ActionButtons
                      order={order}
                      onUpdate={handleUpdate}
                      onRequestCancel={handleRequestCancel}
                      loading={loading}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[var(--muted-foreground)]">
                    {order.rating ? "⭐".repeat(order.rating) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--muted-foreground)] font-mono">
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors">‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${p === page ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
