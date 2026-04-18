"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/admin/DataTable";

type OrderStatus = "Preparando" | "Pronto" | "Entregue" | "Cancelado";

interface OrderItem {
  id: number;
  flavorName: string;
  size: string;
  crust: string;
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
}

const STATUS_NEXT: Record<OrderStatus, OrderStatus | null> = {
  Preparando: "Pronto",
  Pronto: "Entregue",
  Entregue: null,
  Cancelado: null,
};

const STATUS_VARIANT: Record<OrderStatus, "warning" | "success" | "secondary" | "destructive"> = {
  Preparando: "warning",
  Pronto: "success",
  Entregue: "secondary",
  Cancelado: "destructive",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    api.get<Order[]>("/api/orders").then(setOrders);
  }

  useEffect(() => { load(); }, []);

  async function advanceStatus(order: Order) {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    setUpdating(true);
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status: next });
      load();
      if (detail?.id === order.id) setDetail((prev) => prev ? { ...prev, status: next } : null);
    } finally {
      setUpdating(false);
    }
  }

  async function cancel(order: Order) {
    if (!confirm(`Cancelar pedido #${order.id}?`)) return;
    setUpdating(true);
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status: "Cancelado" });
      load();
      if (detail?.id === order.id) setDetail((prev) => prev ? { ...prev, status: "Cancelado" } : null);
    } finally {
      setUpdating(false);
    }
  }

  const columns: Column<Order>[] = [
    { key: "id", label: "#", render: (o) => `#${o.id}` },
    { key: "userName", label: "Cliente" },
    {
      key: "deliveryType",
      label: "Tipo",
      render: (o) => (
        <Badge variant="secondary">{o.deliveryType === "Delivery" ? "Entrega" : "Retirada"}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (o) => (
        <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
      ),
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (o) => `R$ ${o.totalAmount.toFixed(2).replace(".", ",")}`,
    },
    {
      key: "createdAt",
      label: "Data",
      render: (o) =>
        new Date(o.createdAt).toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
    },
  ];

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <div>
        <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">Pedidos</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Gerencie e atualize o status dos pedidos</p>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        searchKeys={["userName"]}
        onEdit={(o) => setDetail(o)}
      />

      {/* Detail / status modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono">Pedido #{detail.id}</CardTitle>
              <button
                onClick={() => setDetail(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xl leading-none"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Cliente</span>
                <span className="font-mono font-medium">{detail.userName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Tipo</span>
                <Badge variant="secondary">{detail.deliveryType === "Delivery" ? "Entrega" : "Retirada"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Status atual</span>
                <Badge variant={STATUS_VARIANT[detail.status]}>{detail.status}</Badge>
              </div>

              {/* Items */}
              <div className="border-t border-[var(--border)] pt-3 space-y-2">
                {detail.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-[var(--foreground)]">
                      {item.quantity}× {item.flavorName} ({item.size})
                    </span>
                    <span className="font-mono text-[var(--muted-foreground)]">
                      R$ {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between font-mono font-bold border-t border-[var(--border)] pt-3">
                <span>Total</span>
                <span className="text-[var(--primary)]">
                  R$ {detail.totalAmount.toFixed(2).replace(".", ",")}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {detail.status !== "Cancelado" && detail.status !== "Entregue" && (
                  <button
                    onClick={() => cancel(detail)}
                    disabled={updating}
                    className="flex-1 py-2 rounded-[var(--radius-m)] border border-[var(--destructive)] text-[var(--destructive)] text-sm font-mono hover:bg-[var(--destructive)]/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar pedido
                  </button>
                )}
                {STATUS_NEXT[detail.status] && (
                  <button
                    onClick={() => advanceStatus(detail)}
                    disabled={updating}
                    className="flex-1 py-2 rounded-[var(--radius-m)] bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-mono hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {updating ? "Salvando..." : `Avançar para ${STATUS_NEXT[detail.status]}`}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
