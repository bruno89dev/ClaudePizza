"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { startOrderHub } from "@/lib/signalr";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  items: OrderItem[];
}

const STATUS_VARIANT: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  Preparando: "warning",
  Pronto: "default",
  Entregue: "success",
  Cancelado: "destructive",
};

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"ativos" | "historico">("ativos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>("/api/orders").then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    startOrderHub().then((hub) => {
      hub.on("OrderStatusChanged", ({ orderId, status }: { orderId: number; status: string }) => {
        if (!mounted) return;
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activeOrders = orders.filter((o) => o.status === "Preparando" || o.status === "Pronto");
  const historyOrders = orders.filter((o) => o.status === "Entregue" || o.status === "Cancelado");
  const displayed = tab === "ativos" ? activeOrders : historyOrders;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center h-20 px-8 border-b border-[var(--border)]">
        <h1 className="font-mono font-bold text-2xl text-[var(--foreground)] flex-1">Meus Pedidos</h1>
        <div className="flex border border-[var(--border)] rounded-[var(--radius-m)] overflow-hidden">
          {(["ativos", "historico"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-mono transition-colors ${
                tab === t
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {t === "ativos" ? "Ativos" : "Histórico"}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        {loading && <p className="text-[var(--muted-foreground)]">Carregando...</p>}
        {!loading && displayed.length === 0 && (
          <p className="text-[var(--muted-foreground)]">Nenhum pedido encontrado.</p>
        )}
        {displayed.map((order) => (
          <Card key={order.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-base">Pedido #{order.id}</span>
                <div className="flex-1" />
                <span className="text-xs text-[var(--muted-foreground)]">
                  {new Date(order.createdAt).toLocaleString("pt-BR")}
                </span>
                <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-mono">{item.flavorName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.size} · {item.quantity}x
                    </p>
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
