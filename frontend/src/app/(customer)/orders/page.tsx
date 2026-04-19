"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { startOrderHub } from "@/lib/signalr";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: number;
  flavorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: number;
  status: string;
  deliveryType: string;
  totalAmount: number;
  deliveryFee: number;
  createdAt: string;
  estimatedDeliveryAt: string | null;
  items: OrderItem[];
  rating: number | null;
}

const STATUS_VARIANT: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  Preparando: "warning",
  Pronto:     "default",
  Entregue:   "success",
  Cancelado:  "destructive",
};

const STATUS_TOAST_COLOR: Record<string, string> = {
  Preparando: "bg-[var(--primary)]",
  Pronto:     "bg-[#3B82F6]",
  Entregue:   "bg-[#22C55E]",
  Cancelado:  "bg-[var(--destructive)]",
};

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function StarRatingModal({ order, onClose, onRated }: {
  order: Order;
  onClose: () => void;
  onRated: (id: number, rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(rating: number) {
    setSelected(rating);
    setSubmitting(true);
    try {
      await api.patch(`/api/orders/${order.id}/rate`, { rating });
      onRated(order.id, rating);
      setDone(true);
      setTimeout(onClose, 1500);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="p-6 space-y-4">
          {done ? (
            <>
              <p className="text-4xl">🙏</p>
              <p className="font-mono font-bold text-lg text-[var(--foreground)]">Obrigado!</p>
              <p className="text-sm text-[var(--muted-foreground)]">Sua avaliação foi registrada.</p>
            </>
          ) : (
            <>
              <p className="text-3xl">🍕</p>
              <p className="font-mono font-bold text-lg text-[var(--foreground)]">Como foi seu pedido #{order.id}?</p>
              <p className="text-sm text-[var(--muted-foreground)]">Toque em uma estrela para avaliar</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    disabled={submitting}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => submit(star)}
                    className="text-4xl transition-transform hover:scale-125 cursor-pointer disabled:opacity-50"
                    style={{ filter: star <= (hovered || selected) ? "none" : "grayscale(1)" }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Avaliar depois
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"ativos" | "historico">("ativos");
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [statusToast, setStatusToast] = useState<{ orderId: number; status: string } | null>(null);

  // History filter
  const defaultTo = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultTo.getDate() - 29);
  const [from, setFrom] = useState(toISO(defaultFrom));
  const [to, setTo] = useState(toISO(defaultTo));
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    api.get<Order[]>("/api/orders").then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  // SignalR — register handler once
  useEffect(() => {
    let mounted = true;
    startOrderHub().then((hub) => {
      hub.on("OrderStatusChanged", ({ orderId, status }: { orderId: number; status: string }) => {
        if (!mounted) return;
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        setStatusToast({ orderId, status });
        setTimeout(() => setStatusToast(null), 4000);
      });
    });
    return () => { mounted = false; };
  }, []);

  // Join each order's group so the server can push status updates
  useEffect(() => {
    if (orders.length === 0) return;
    startOrderHub().then((hub) => {
      orders.forEach((o) => {
        hub.invoke("JoinOrderGroup", String(o.id)).catch(() => {});
      });
    });
  }, [orders]);

  // Prompt rating for recently-delivered unrated orders
  useEffect(() => {
    if (ratingOrder) return;
    const candidate = orders.find((o) => {
      if (o.status !== "Entregue" || o.rating !== null) return false;
      const age = Date.now() - new Date(o.createdAt).getTime();
      return age < 48 * 60 * 60 * 1000;
    });
    if (candidate) setRatingOrder(candidate);
  }, [orders, ratingOrder]);

  function handleRated(id: number, rating: number) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, rating } : o)));
  }

  const activeOrders = orders.filter((o) => o.status === "Preparando" || o.status === "Pronto");

  // History with date filter
  const historyAll = orders.filter((o) => o.status === "Entregue" || o.status === "Cancelado");
  const historyFiltered = historyAll.filter((o) => {
    const d = o.createdAt.slice(0, 10);
    return d >= from && d <= to;
  });

  const displayed = tab === "ativos" ? activeOrders : historyFiltered;

  function applyFilter() {
    const diff = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    if (diff < 0) { setFilterError("Data inicial deve ser anterior à data final."); return; }
    if (diff > 90) { setFilterError("Intervalo máximo de 90 dias."); return; }
    setFilterError("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toast de mudança de status */}
      {statusToast && (
        <div className={`fixed bottom-4 right-4 z-50 ${STATUS_TOAST_COLOR[statusToast.status] ?? "bg-[var(--card)]"} text-white px-4 py-3 rounded-[var(--radius-m)] shadow-lg font-mono text-sm animate-in slide-in-from-bottom-2`}>
          Pedido #{statusToast.orderId} — {statusToast.status}
        </div>
      )}

      {ratingOrder && (
        <StarRatingModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onRated={handleRated}
        />
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 lg:px-8 py-4 border-b border-[var(--border)] shrink-0">
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)] flex-1">Meus Pedidos</h1>
        <div className="flex border border-[var(--border)] rounded-[var(--radius-m)] overflow-hidden self-start">
          {(["ativos", "historico"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-mono transition-colors cursor-pointer ${
                tab === t
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {t === "ativos" ? `Ativos (${activeOrders.length})` : "Histórico"}
            </button>
          ))}
        </div>
      </header>

      {/* Filtro de histórico */}
      {tab === "historico" && (
        <div className="flex flex-wrap items-center gap-2 px-4 lg:px-8 py-3 border-b border-[var(--border)] bg-[var(--card)]">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 text-sm font-mono bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          />
          <span className="text-[var(--muted-foreground)] text-sm font-mono">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 text-sm font-mono bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          />
          <Button size="sm" onClick={applyFilter}>Filtrar</Button>
          {filterError && <p className="text-sm text-[var(--destructive)] font-mono">{filterError}</p>}
          <span className="text-xs text-[var(--muted-foreground)] font-mono ml-auto">{historyFiltered.length} pedido{historyFiltered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4">
        {loading && <p className="text-[var(--muted-foreground)]">Carregando...</p>}
        {!loading && displayed.length === 0 && (
          <p className="text-[var(--muted-foreground)]">Nenhum pedido encontrado.</p>
        )}
        {displayed.map((order) => (
          <Card key={order.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-semibold text-base">Pedido #{order.id}</span>
                <div className="flex-1" />
                <span className="text-xs text-[var(--muted-foreground)]">
                  {new Date(order.createdAt).toLocaleString("pt-BR")}
                </span>
                <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>{order.status}</Badge>
              </div>
              {order.estimatedDeliveryAt && (
                <p className="text-xs text-[var(--primary)] font-mono mt-1">
                  ⏱ Previsão de {order.deliveryType === "Delivery" ? "entrega" : "retirada"}:{" "}
                  {new Date(order.estimatedDeliveryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {order.status === "Entregue" && order.rating && (
                <p className="text-xs text-[var(--muted-foreground)] font-mono mt-1">
                  {"⭐".repeat(order.rating)} ({order.rating}/5)
                </p>
              )}
              {order.status === "Entregue" && !order.rating && (
                <button
                  onClick={() => setRatingOrder(order)}
                  className="text-xs text-[var(--primary)] font-mono mt-1 hover:underline cursor-pointer text-left"
                >
                  ☆ Avaliar este pedido
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-mono">{item.flavorName}</p>
                    {item.size && (
                      <p className="text-xs text-[var(--muted-foreground)]">{item.size} · {item.quantity}x</p>
                    )}
                  </div>
                  <span className="text-sm font-mono">
                    R$ {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--muted-foreground)]">Total:</span>
                <span className="font-mono font-bold text-lg">
                  R$ {order.totalAmount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
