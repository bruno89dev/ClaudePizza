"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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

const SIZES = ["Pequena", "Média", "Grande"];
const CRUSTS = ["Sem borda", "Catupiry", "Cheddar", "Chocolate"];
const EXTRAS = ["Bacon", "Cebola", "Azeitona", "Pimenta", "Orégano extra"];
const SIZE_MULTIPLIER: Record<string, number> = { Pequena: 1, Média: 1.3, Grande: 1.6 };

export default function NewOrderPage() {
  const router = useRouter();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null);
  const [size, setSize] = useState("Média");
  const [crust, setCrust] = useState("Sem borda");
  const [extras, setExtras] = useState<string[]>([]);

  useEffect(() => {
    api.get<Flavor[]>("/api/flavors").then((data) =>
      setFlavors(data.filter((f) => f.isAvailable))
    );
  }, []);

  const filteredFlavors = flavors.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleExtra(extra: string) {
    setExtras((prev) =>
      prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra]
    );
  }

  const unitPrice = selectedFlavor
    ? parseFloat((selectedFlavor.basePrice * SIZE_MULTIPLIER[size]).toFixed(2))
    : 0;

  function handleAddToCart() {
    if (!selectedFlavor) return;
    const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");
    cart.push({
      flavorId: selectedFlavor.id,
      flavorName: selectedFlavor.name,
      size,
      crust: crust !== "Sem borda" ? crust : null,
      extras: extras.length ? JSON.stringify(extras) : null,
      quantity: 1,
      unitPrice,
    });
    localStorage.setItem("cart", JSON.stringify(cart));
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-20 px-8 border-b border-[var(--border)]">
        <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">Novo Pedido</h1>
      </header>

      <div className="flex flex-1 gap-6 p-8 overflow-hidden">
        {/* Left — form */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Step 1: Tamanho */}
          <Card>
            <CardHeader><CardTitle>1. Tamanho</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 py-3 rounded-[var(--radius-m)] border font-mono text-sm font-medium transition-colors ${
                    size === s
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {s}
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
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
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
              {filteredFlavors.map((flavor) => (
                <button
                  key={flavor.id}
                  onClick={() => setSelectedFlavor(flavor)}
                  className={`flex items-center justify-between p-3 rounded-[var(--radius-m)] border text-left transition-colors ${
                    selectedFlavor?.id === flavor.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-[var(--foreground)]">{flavor.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{flavor.description}</p>
                  </div>
                  <span className="font-mono text-sm text-[var(--primary)]">
                    R$ {flavor.basePrice.toFixed(2).replace(".", ",")}
                  </span>
                </button>
              ))}
              {filteredFlavors.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">Nenhum sabor encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Extras */}
          <Card>
            <CardHeader><CardTitle>3. Extras</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {EXTRAS.map((extra) => (
                <button
                  key={extra}
                  onClick={() => toggleExtra(extra)}
                  className={`flex items-center gap-2 p-3 rounded-[var(--radius-m)] border text-sm transition-colors ${
                    extras.includes(extra)
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {extra}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Step 4: Borda */}
          <Card>
            <CardHeader><CardTitle>4. Borda</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {CRUSTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCrust(c)}
                  className={`p-3 rounded-[var(--radius-m)] border font-mono text-sm transition-colors ${
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
        <div className="w-80 shrink-0">
          <Card className="sticky top-0">
            <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {selectedFlavor ? (
                <>
                  <div className="space-y-1">
                    <p className="font-mono font-semibold">{selectedFlavor.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {size} · {crust !== "Sem borda" ? crust : "Sem borda"}
                    </p>
                    {extras.length > 0 && (
                      <p className="text-xs text-[var(--muted-foreground)]">+ {extras.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-sm text-[var(--muted-foreground)]">Subtotal</span>
                    <span className="font-mono font-bold text-[var(--primary)]">
                      R$ {unitPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <Button className="w-full" onClick={handleAddToCart}>
                    Adicionar ao carrinho
                  </Button>
                </>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Selecione um sabor para ver o resumo.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
