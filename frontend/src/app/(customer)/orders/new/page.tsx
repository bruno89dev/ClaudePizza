"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Check } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Flavor {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  isAvailable: boolean;
}

interface CartItem {
  flavorId: number;
  flavorName: string;
  size: string;
  crust: string | null;
  extras: string | null;
  quantity: number;
  unitPrice: number;
}

const SIZES: { label: string; key: string; multiplier: number }[] = [
  { label: "Pequena", key: "Pequena", multiplier: 1 },
  { label: "Média", key: "Média", multiplier: 1.3 },
  { label: "Grande", key: "Grande", multiplier: 1.6 },
];

const CRUSTS = ["Sem borda", "Catupiry", "Cheddar", "Chocolate"];

const EXTRAS: { label: string; price: number }[] = [
  { label: "Bacon", price: 4.00 },
  { label: "Cebola caramelizada", price: 3.00 },
  { label: "Azeitona", price: 2.00 },
  { label: "Pimenta", price: 1.50 },
  { label: "Orégano extra", price: 1.00 },
  { label: "Cream cheese", price: 5.00 },
];

export default function NewOrderPage() {
  const router = useRouter();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null);
  const [size, setSize] = useState("Média");
  const [crust, setCrust] = useState("Sem borda");
  const [extras, setExtras] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.get<Flavor[]>("/api/flavors").then((data) =>
      setFlavors(data.filter((f) => f.isAvailable))
    );
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
  }, []);

  const filteredFlavors = flavors.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleExtra(label: string) {
    setExtras((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  }

  const sizeMultiplier = SIZES.find((s) => s.key === size)?.multiplier ?? 1;
  const extrasTotal = extras.reduce((sum, label) => {
    return sum + (EXTRAS.find((e) => e.label === label)?.price ?? 0);
  }, 0);

  const unitPrice = selectedFlavor
    ? parseFloat(
        (selectedFlavor.basePrice * sizeMultiplier + extrasTotal).toFixed(2)
      )
    : 0;

  function handleAddToCart() {
    if (!selectedFlavor) return;
    const newItem: CartItem = {
      flavorId: selectedFlavor.id,
      flavorName: selectedFlavor.name,
      size,
      crust: crust !== "Sem borda" ? crust : null,
      extras: extras.length ? JSON.stringify(extras) : null,
      quantity: 1,
      unitPrice,
    };
    const updated = [...cart, newItem];
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));

    // Reset selection, keep size preference
    setSelectedFlavor(null);
    setExtras([]);
    setCrust("Sem borda");
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-20 px-8 border-b border-[var(--border)]">
        <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">
          Novo Pedido
        </h1>
      </header>

      <div className="flex flex-1 gap-6 p-8 overflow-hidden">
        {/* Left — form */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Step 1: Tamanho */}
          <Card>
            <CardHeader>
              <CardTitle>1. Tamanho</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              {SIZES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSize(s.key)}
                  className={`flex-1 py-3 rounded-[var(--radius-m)] border font-mono text-sm font-medium transition-colors cursor-pointer ${
                    size === s.key
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Step 2: Sabor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>2. Sabor</CardTitle>
                <div className="relative w-56">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />
                  <Input
                    placeholder="Buscar sabor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {filteredFlavors.map((flavor) => {
                const price = flavor.basePrice * sizeMultiplier;
                return (
                  <button
                    key={flavor.id}
                    onClick={() => setSelectedFlavor(flavor)}
                    className={`flex items-center justify-between p-3 rounded-[var(--radius-m)] border text-left transition-colors cursor-pointer ${
                      selectedFlavor?.id === flavor.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <div>
                      <p className="font-mono text-sm font-medium text-[var(--foreground)]">
                        {flavor.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {flavor.description}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-[var(--primary)] shrink-0 ml-3">
                      R$ {price.toFixed(2).replace(".", ",")}
                    </span>
                  </button>
                );
              })}
              {filteredFlavors.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum sabor encontrado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Extras */}
          <Card>
            <CardHeader>
              <CardTitle>3. Extras</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {EXTRAS.map((extra) => {
                const checked = extras.includes(extra.label);
                return (
                  <label
                    key={extra.label}
                    className={`flex items-center gap-3 p-3 rounded-[var(--radius-m)] border text-sm transition-colors cursor-pointer ${
                      checked
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExtra(extra.label)}
                      className="w-4 h-4 accent-[var(--primary)] shrink-0"
                    />
                    <span
                      className={`flex-1 font-mono ${
                        checked
                          ? "text-[var(--primary)]"
                          : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {extra.label}
                    </span>
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      +R$ {extra.price.toFixed(2).replace(".", ",")}
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Step 4: Borda */}
          <Card>
            <CardHeader>
              <CardTitle>4. Borda</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {CRUSTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCrust(c)}
                  className={`p-3 rounded-[var(--radius-m)] border font-mono text-sm transition-colors cursor-pointer ${
                    crust === c
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right — summary */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          {/* Current pizza */}
          <Card className="sticky top-0">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedFlavor ? (
                <>
                  <div className="space-y-1">
                    <p className="font-mono font-semibold">
                      {selectedFlavor.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {size} · {crust}
                    </p>
                    {extras.length > 0 && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        + {extras.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Subtotal
                    </span>
                    <span className="font-mono font-bold text-[var(--primary)]">
                      R$ {unitPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddToCart}
                  >
                    {added ? (
                      <span className="flex items-center gap-2">
                        <Check size={16} /> Adicionado!
                      </span>
                    ) : (
                      "Adicionar ao carrinho"
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Selecione um sabor para ver o resumo.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart size={16} />
                  Carrinho ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <p className="font-mono font-medium text-[var(--foreground)]">
                        {item.flavorName}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.size}
                        {item.crust ? ` · ${item.crust}` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-[var(--primary)]">
                      R$ {item.unitPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-mono font-bold text-sm border-t border-[var(--border)] pt-2">
                  <span>Total</span>
                  <span className="text-[var(--primary)]">
                    R$ {subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push("/checkout")}
                >
                  Ir para o checkout
                </Button>
                <button
                  onClick={() => {
                    localStorage.removeItem("cart");
                    setCart([]);
                  }}
                  className="w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                >
                  Limpar carrinho
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
