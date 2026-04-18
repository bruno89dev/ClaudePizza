"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CartItem {
  flavorId: number;
  flavorName: string;
  size: string;
  crust: string | null;
  extras: string | null;
  quantity: number;
  unitPrice: number;
}

interface AddressData {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  distanceKm: number;
  fee: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<"Pickup" | "Delivery">("Pickup");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState<AddressData | null>(null);
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = deliveryType === "Delivery" && address ? address.fee : 0;
  const total = subtotal + deliveryFee;

  async function handleCepSearch() {
    if (zipCode.replace(/\D/g, "").length !== 8) {
      setCepError("CEP deve ter 8 dígitos.");
      return;
    }
    setCepError("");
    setLoadingCep(true);
    try {
      const data = await api.post<AddressData>("/api/delivery/estimate", { zipCode });
      setAddress(data);
    } catch {
      setCepError("CEP não encontrado.");
      setAddress(null);
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleOrder() {
    if (cart.length === 0) return;
    if (deliveryType === "Delivery" && !address) {
      setCepError("Informe e consulte o CEP antes de confirmar.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/orders", {
        deliveryType,
        street: address?.street,
        number: number || null,
        complement: complement || null,
        neighborhood: address?.neighborhood,
        city: address?.city,
        state: address?.state,
        zipCode: address?.zipCode,
        deliveryFee,
        items: cart,
      });
      localStorage.removeItem("cart");
      router.push("/orders");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-20 px-8 border-b border-[var(--border)]">
        <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">Finalizar Pedido</h1>
      </header>

      <div className="flex flex-1 gap-6 p-8 overflow-hidden">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Tipo de entrega */}
          <Card>
            <CardHeader><CardTitle>Tipo de Entrega</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              {(["Pickup", "Delivery"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setDeliveryType(type)}
                  className={`flex-1 py-3 rounded-[var(--radius-m)] border font-mono text-sm font-medium transition-colors ${
                    deliveryType === type
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {type === "Pickup" ? "Retirada" : "Entrega"}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Endereço — só para Entrega */}
          {deliveryType === "Delivery" && (
            <Card>
              <CardHeader><CardTitle>Endereço de Entrega</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="CEP (somente números)"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    maxLength={9}
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={handleCepSearch} disabled={loadingCep}>
                    {loadingCep ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                {cepError && <p className="text-sm text-[var(--destructive)]">{cepError}</p>}
                {address && (
                  <>
                    <div className="p-3 rounded-[var(--radius-m)] bg-[var(--muted)] text-sm space-y-1">
                      <p className="font-mono">{address.street}</p>
                      <p className="text-[var(--muted-foreground)]">
                        {address.neighborhood} · {address.city}/{address.state}
                      </p>
                      {address.distanceKm > 0 && (
                        <p className="text-[var(--muted-foreground)] text-xs">
                          ~{address.distanceKm.toFixed(1)} km · Taxa: R$ {address.fee.toFixed(2).replace(".", ",")}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
                      <Input placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — order summary */}
        <div className="w-96 shrink-0">
          <Card className="sticky top-0">
            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Seu carrinho está vazio.</p>
              ) : (
                <>
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm">{item.flavorName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {item.size} {item.crust ? `· ${item.crust}` : ""} · {item.quantity}x
                        </p>
                      </div>
                      <span className="font-mono text-sm whitespace-nowrap">
                        R$ {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-[var(--border)] pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                      <span>Subtotal</span>
                      <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                    </div>
                    {deliveryType === "Delivery" && (
                      <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                        <span>Taxa de entrega</span>
                        <span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-mono font-bold text-lg pt-1">
                      <span>Total</span>
                      <span className="text-[var(--primary)]">R$ {total.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleOrder} disabled={submitting}>
                    {submitting ? "Confirmando..." : "Confirmar Pedido"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
