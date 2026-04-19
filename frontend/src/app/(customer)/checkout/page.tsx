"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
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

type PaymentMethod = "Dinheiro" | "Pix" | "Débito" | "Crédito";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Pix", label: "Pix" },
  { value: "Débito", label: "Cartão de Débito" },
  { value: "Crédito", label: "Cartão de Crédito" },
];

function formatBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}

function parseBRL(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"Pickup" | "Delivery">("Pickup");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState<AddressData | null>(null);
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [needsChange, setNeedsChange] = useState<boolean | null>(null);
  const [changeForRaw, setChangeForRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
    setLoaded(true);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = deliveryType === "Delivery" && address ? address.fee : 0;
  const total = subtotal + deliveryFee;

  function handleZipChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setZipCode(formatted);
  }

  async function handleCepSearch() {
    if (zipCode.replace(/\D/g, "").length !== 8) {
      setCepError("CEP deve ter 8 dígitos.");
      return;
    }
    setCepError("");
    setLoadingCep(true);
    try {
      const data = await api.post<AddressData>("/api/delivery/estimate", { zipCode });
      if (data.city.toLowerCase() !== "araxá") {
        setCepError("Desculpe, entregamos somente em Araxá/MG.");
        setAddress(null);
        return;
      }
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
    if (!paymentMethod) {
      setPaymentError("Selecione uma forma de pagamento.");
      return;
    }
    setPaymentError("");
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
        paymentMethod,
        changeFor: paymentMethod === "Dinheiro" && needsChange ? parseBRL(changeForRaw) : null,
      });
      localStorage.removeItem("cart");
      router.push("/orders");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  // Empty cart state
  if (loaded && cart.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center h-16 lg:h-20 px-4 lg:px-8 border-b border-[var(--border)]">
          <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Carrinho</h1>
        </header>
        <div className="flex flex-col flex-1 items-center justify-center gap-6 p-8 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[var(--muted)]">
            <ShoppingCart size={36} className="text-[var(--muted-foreground)]" />
          </div>
          <div className="space-y-2">
            <p className="font-mono font-bold text-xl text-[var(--foreground)]">Seu carrinho está vazio</p>
            <p className="text-[var(--muted-foreground)] max-w-xs">
              Parece que você ainda não escolheu nenhuma pizza. Que tal montar a sua agora?
            </p>
          </div>
          <button
            onClick={() => router.push("/orders/new")}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-mono font-semibold rounded-[var(--radius-pill)] hover:bg-[var(--primary)]/90 transition-colors cursor-pointer"
          >
            <UtensilsCrossed size={18} />
            Montar minha pizza agora 🍕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-16 lg:h-20 px-4 lg:px-8 border-b border-[var(--border)]">
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Finalizar Pedido</h1>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 p-4 lg:p-8 overflow-y-auto lg:overflow-hidden">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-6 lg:overflow-y-auto">
          {/* Tipo de entrega */}
          <Card>
            <CardHeader><CardTitle>Tipo de Entrega</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              {(["Pickup", "Delivery"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setDeliveryType(type)}
                  className={`flex-1 py-3 rounded-[var(--radius-m)] border font-mono text-sm font-medium transition-colors cursor-pointer ${
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
                    placeholder="00000-000"
                    value={zipCode}
                    onChange={(e) => handleZipChange(e.target.value)}
                    maxLength={9}
                    className="flex-1"
                    inputMode="numeric"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
                      <Input placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagamento */}
          <Card>
            <CardHeader><CardTitle>Forma de Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-[var(--radius-m)] border cursor-pointer transition-colors ${
                      paymentMethod === opt.value
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => {
                        setPaymentMethod(opt.value);
                        setNeedsChange(null);
                        setChangeForRaw("");
                        setPaymentError("");
                      }}
                      className="accent-[var(--primary)] w-4 h-4 shrink-0"
                    />
                    <span className={`font-mono text-sm ${paymentMethod === opt.value ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Troco — apenas para Dinheiro */}
              {paymentMethod === "Dinheiro" && (
                <div className="space-y-3 pt-1">
                  <p className="text-sm font-mono text-[var(--foreground)]">Precisa de troco?</p>
                  <div className="flex gap-3">
                    {([true, false] as const).map((val) => (
                      <label
                        key={String(val)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-m)] border cursor-pointer transition-colors ${
                          needsChange === val
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="troco"
                          checked={needsChange === val}
                          onChange={() => { setNeedsChange(val); setChangeForRaw(""); }}
                          className="accent-[var(--primary)] w-4 h-4"
                        />
                        <span className="font-mono text-sm">{val ? "Sim" : "Não"}</span>
                      </label>
                    ))}
                  </div>

                  {needsChange === true && (
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-[var(--muted-foreground)]">Para quanto?</label>
                      <Input
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={changeForRaw}
                        onChange={(e) => setChangeForRaw(formatBRL(e.target.value))}
                        className="max-w-[180px]"
                      />
                    </div>
                  )}
                </div>
              )}

              {paymentError && <p className="text-sm text-[var(--destructive)]">{paymentError}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Right column — order summary */}
        <div className="w-full lg:w-96 shrink-0">
          <Card className="sticky top-0">
            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                {deliveryType === "Delivery" && address && (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
