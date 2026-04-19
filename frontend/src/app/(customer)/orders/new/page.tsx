"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Plus, Minus, UtensilsCrossed, GlassWater } from "lucide-react";
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

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

interface CartItem {
  type: "pizza" | "product";
  flavorId: number | null;
  flavorName: string;
  productCategory?: string;
  size: string;
  crust: string | null;
  extras: string | null;
  quantity: number;
  unitPrice: number;
}

const SIZES: { label: string; key: string; multiplier: number }[] = [
  { label: "Pequena", key: "Pequena", multiplier: 1 },
  { label: "Média",   key: "Média",   multiplier: 1.3 },
  { label: "Grande",  key: "Grande",  multiplier: 1.6 },
];

const CRUSTS: { label: string; price: number }[] = [
  { label: "Sem borda",  price: 0     },
  { label: "Catupiry",   price: 12.90 },
  { label: "Cheddar",    price: 13.90 },
  { label: "Chocolate",  price: 10.90 },
];

const EXTRAS: { label: string; price: number }[] = [
  { label: "Bacon",              price: 4.00 },
  { label: "Cebola caramelizada",price: 3.00 },
  { label: "Azeitona",           price: 2.00 },
  { label: "Pimenta",            price: 1.50 },
  { label: "Orégano extra",      price: 1.00 },
  { label: "Cream cheese",       price: 5.00 },
];

function roundToNinety(value: number): number {
  const floored = Math.floor(value);
  const candidate = floored + 0.9;
  return candidate >= value - 0.001 ? candidate : floored + 1.9;
}

export default function NewOrderPage() {
  const router = useRouter();
  const customizeRef = useRef<HTMLDivElement>(null);

  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Pizza customization state
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null);
  const [size, setSize] = useState("Média");
  const [crust, setCrust] = useState("Sem borda");
  const [extras, setExtras] = useState<string[]>([]);

  useEffect(() => {
    api.get<Flavor[]>("/api/flavors").then((d) => setFlavors(d.filter((f) => f.isAvailable)));
    api.get<Product[]>("/api/products").then((d) => setProducts(d.filter((p) => p.isAvailable)));
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
  }, []);

  function selectFlavor(flavor: Flavor) {
    setSelectedFlavor(flavor);
    setSize("Média");
    setCrust("Sem borda");
    setExtras([]);
    setTimeout(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function toggleExtra(label: string) {
    setExtras((prev) => prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]);
  }

  const sizeMultiplier = SIZES.find((s) => s.key === size)?.multiplier ?? 1;
  const extrasTotal = extras.reduce((s, l) => s + (EXTRAS.find((e) => e.label === l)?.price ?? 0), 0);
  const crustPrice = CRUSTS.find((c) => c.label === crust)?.price ?? 0;
  const pizzaUnitPrice = selectedFlavor
    ? roundToNinety(selectedFlavor.basePrice * sizeMultiplier) + extrasTotal + crustPrice
    : 0;

  function addPizzaToCart() {
    if (!selectedFlavor) return;
    const item: CartItem = {
      type: "pizza",
      flavorId: selectedFlavor.id,
      flavorName: selectedFlavor.name,
      size,
      crust: crust !== "Sem borda" ? crust : null,
      extras: extras.length ? JSON.stringify(extras) : null,
      quantity: 1,
      unitPrice: pizzaUnitPrice,
    };
    saveCart([...cart, item]);
    setSelectedFlavor(null);
    setExtras([]);
    setCrust("Sem borda");
  }

  function addProductToCart(product: Product) {
    const existing = cart.findIndex((i) => i.type === "product" && i.flavorName === product.name);
    let updated: CartItem[];
    if (existing >= 0) {
      updated = cart.map((i, idx) => idx === existing ? { ...i, quantity: i.quantity + 1 } : i);
    } else {
      updated = [...cart, {
        type: "product",
        flavorId: null,
        flavorName: product.name,
        productCategory: product.category,
        size: "",
        crust: null,
        extras: null,
        quantity: 1,
        unitPrice: product.price,
      }];
    }
    saveCart(updated);
  }

  function removeFromCart(idx: number) {
    const updated = cart.filter((_, i) => i !== idx);
    saveCart(updated);
  }

  function saveCart(items: CartItem[]) {
    setCart(items);
    localStorage.setItem("cart", JSON.stringify(items));
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const filteredFlavors = flavors.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const entradas = products.filter((p) => p.category === "Entradas");
  const bebidas = [...products.filter((p) => p.category === "Bebidas")].sort((a, b) => b.price - a.price);

  const hasEntrada = cart.some((i) => i.type === "product" && i.productCategory === "Entradas");
  const hasBebida  = cart.some((i) => i.type === "product" && i.productCategory === "Bebidas");

  function ProductCard({ product }: { product: Product }) {
    const qty = cart.filter((i) => i.type === "product" && i.flavorName === product.name).reduce((s, i) => s + i.quantity, 0);
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-medium text-[var(--foreground)] truncate">{product.name}</p>
          {product.description && <p className="text-xs text-[var(--muted-foreground)] truncate">{product.description}</p>}
          <p className="font-mono text-sm text-[var(--primary)] mt-0.5">R$ {product.price.toFixed(2).replace(".", ",")}</p>
        </div>
        <button
          onClick={() => addProductToCart(product)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 transition-colors cursor-pointer shrink-0 relative"
        >
          <Plus size={16} />
          {qty > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--foreground)] text-[var(--background)] text-[10px] font-mono font-bold flex items-center justify-center">
              {qty}
            </span>
          )}
        </button>
      </div>
    );
  }

  function UpsellBanner({ icon, text, action }: { icon: React.ReactNode; text: string; action: string }) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius-m)] border border-dashed border-[var(--primary)]/40 bg-[var(--primary)]/5">
        <div className="text-[var(--primary)]">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-mono text-[var(--foreground)]">{text}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{action}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-16 lg:h-20 px-4 lg:px-8 border-b border-[var(--border)] shrink-0">
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Novo Pedido</h1>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 p-4 lg:p-8 overflow-y-auto lg:overflow-hidden">
        {/* Coluna esquerda — seções */}
        <div className="flex-1 flex flex-col gap-8 lg:overflow-y-auto scrollbar-thin">

          {/* ── 1. ENTRADAS ── */}
          <section>
            <h2 className="font-mono font-bold text-base mb-3 text-[var(--foreground)] flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-[var(--primary)]" />
              Entradas
            </h2>
            {entradas.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {entradas.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {!hasEntrada && (
                  <div className="mt-3">
                    <UpsellBanner
                      icon={<UtensilsCrossed size={18} />}
                      text="Que tal uma entrada para começar?"
                      action="Adicione um petisco ou porção antes da pizza"
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Sem entradas disponíveis no momento.</p>
            )}
          </section>

          {/* ── 2. PIZZAS ── */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-mono font-bold text-base text-[var(--foreground)]">Pizzas</h2>
              <div className="relative w-48 shrink-0">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  placeholder="Buscar sabor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {filteredFlavors.map((flavor) => {
                const price = roundToNinety(flavor.basePrice); // Pequena tem multiplier 1
                return (
                  <button
                    key={flavor.id}
                    onClick={() => selectFlavor(flavor)}
                    className={`flex flex-col gap-1 p-3 rounded-[var(--radius-m)] border text-left transition-colors cursor-pointer ${
                      selectedFlavor?.id === flavor.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <span className="font-mono text-sm font-medium text-[var(--foreground)]">{flavor.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)] line-clamp-1">{flavor.description}</span>
                    <span className="font-mono text-sm text-[var(--primary)] mt-0.5">
                      a partir de R$ {price.toFixed(2).replace(".", ",")}
                    </span>
                  </button>
                );
              })}
              {filteredFlavors.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)] col-span-3">Nenhum sabor encontrado.</p>
              )}
            </div>

            {/* Painel de personalização — âncora */}
            {selectedFlavor && (
              <div ref={customizeRef} className="mt-4 p-4 rounded-[var(--radius-m)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-4">
                <p className="font-mono font-semibold text-[var(--foreground)]">{selectedFlavor.name}</p>

                {/* Tamanho */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Tamanho</p>
                  <div className="flex gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSize(s.key)}
                        className={`flex-1 py-2 rounded-[var(--radius-m)] border font-mono text-xs font-medium transition-colors cursor-pointer ${
                          size === s.key
                            ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Borda */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Borda</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CRUSTS.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => setCrust(c.label)}
                        className={`flex items-center justify-between gap-1 px-3 py-2 rounded-[var(--radius-m)] border font-mono text-xs transition-colors cursor-pointer ${
                          crust === c.label
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                        }`}
                      >
                        <span>{c.label}</span>
                        {c.price > 0 && <span className="opacity-70">+R$ {c.price.toFixed(2).replace(".", ",")}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extras */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Extras</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXTRAS.map((extra) => {
                      const checked = extras.includes(extra.label);
                      return (
                        <label
                          key={extra.label}
                          className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-m)] border text-xs transition-colors cursor-pointer ${
                            checked
                              ? "border-[var(--primary)] bg-[var(--primary)]/10"
                              : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                          }`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleExtra(extra.label)} className="w-3.5 h-3.5 accent-[var(--primary)] shrink-0" />
                          <span className={`flex-1 font-mono ${checked ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>{extra.label}</span>
                          <span className="text-[var(--muted-foreground)] opacity-70">+R$ {extra.price.toFixed(2).replace(".", ",")}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Preço + Adicionar */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--primary)]/20">
                  <span className="font-mono font-bold text-[var(--primary)]">
                    R$ {pizzaUnitPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <Button onClick={addPizzaToCart} size="sm">Adicionar ao carrinho</Button>
                </div>
              </div>
            )}
          </section>

          {/* ── 3. BEBIDAS ── */}
          <section>
            <h2 className="font-mono font-bold text-base mb-3 text-[var(--foreground)] flex items-center gap-2">
              <GlassWater size={16} className="text-[var(--primary)]" />
              Bebidas
            </h2>
            {bebidas.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {bebidas.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {!hasBebida && (
                  <div className="mt-3">
                    <UpsellBanner
                      icon={<GlassWater size={18} />}
                      text="Adicione uma bebida ao seu pedido"
                      action="Refrigerantes, sucos e muito mais"
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Sem bebidas disponíveis no momento.</p>
            )}
          </section>
        </div>

        {/* Coluna direita — carrinho */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <Card className="sticky top-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart size={16} />
                Carrinho {cart.length > 0 && `(${cart.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">Seu carrinho está vazio.</p>
              )}
              {cart.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium text-[var(--foreground)] truncate">{item.flavorName}</p>
                    {item.size && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.size}{item.crust ? ` · ${item.crust}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-sm text-[var(--primary)]">
                      R$ {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                    <button
                      onClick={() => removeFromCart(i)}
                      className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length > 0 && (
                <>
                  <div className="flex justify-between font-mono font-bold text-sm border-t border-[var(--border)] pt-2">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => router.push("/checkout")}>
                    Ir para o checkout
                  </Button>
                  <button
                    onClick={() => saveCart([])}
                    className="w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                  >
                    Limpar carrinho
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
