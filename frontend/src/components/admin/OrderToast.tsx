"use client";

import { useEffect, useState } from "react";
import { startOrderHub } from "@/lib/signalr";
import { isAdmin } from "@/lib/auth";

interface NewOrderPayload {
  orderId: number;
  userName: string;
  totalAmount: number;
}

export function OrderToast() {
  const [toasts, setToasts] = useState<(NewOrderPayload & { key: number })[]>([]);

  useEffect(() => {
    if (!isAdmin()) return;

    let mounted = true;
    startOrderHub().then((hub) => {
      hub.on("NewOrderReceived", (payload: NewOrderPayload) => {
        if (!mounted) return;
        const key = Date.now();
        setToasts((prev) => [...prev, { ...payload, key }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.key !== key));
        }, 6000);
      });
    });

    return () => { mounted = false; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.key}
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-m)] bg-[var(--card)] border border-[var(--primary)] shadow-lg animate-in slide-in-from-bottom-2"
        >
          <span className="text-[var(--primary)] text-lg">🍕</span>
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--foreground)]">
              Novo pedido #{t.orderId}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {t.userName} · R$ {t.totalAmount.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.key !== t.key))}
            className="ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
