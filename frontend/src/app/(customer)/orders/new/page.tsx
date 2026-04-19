"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Plus, Minus, UtensilsCrossed, GlassWater, Tag, X, Pencil, ChevronDown } from "lucide-react";
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
  description: string; // para bebidas, armazena o tamanho (ex: "2L")
  price: number;
  category: string;
  isAvailable: boolean;
}

interface Promotion {
  id: number;
  name: string;
  description: string;
  discountType: "Percentage" | "FixedAmount";
  discountValue: number;
  isIndeterminate: boolean;
  validFrom: string | null;
  validTo: string | null;
  weekDays: string | null;
  applicableCategory: string | null;
  applicableSize: string | null;
  isActive: boolean;
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
  // meio a meio
  isHalf?: boolean;
  flavor2Name?: string;
}

const SIZES: { label: string; key: string; multiplier: number; slices: number }[] = [
  { label: "Broto",   key: "Broto",   multiplier: 0.75, slices: 4  },
  { label: "Média",   key: "Média",   multiplier: 1,    slices: 6  },
  { label: "Grande",  key: "Grande",  multiplier: 1.4,  slices: 8  },
  { label: "Família", key: "Família", multiplier: 1.8,  slices: 12 },
];

const CRUSTS: { label: string; price: number }[] = [
  { label: "Tradicional",     price: 0     },
  { label: "Catupiry",        price: 12.90 },
  { label: "Cheddar",         price: 13.90 },
  { label: "Chocolate ao Leite", price: 10.90 },
];

const EXTRAS: { label: string; price: number }[] = [
  { label: "Bacon",               price: 4.00 },
  { label: "Cebola caramelizada", price: 3.00 },
  { label: "Azeitona",            price: 2.00 },
  { label: "Pimenta",             price: 1.50 },
  { label: "Orégano extra",       price: 1.00 },
  { label: "Cream cheese",        price: 5.00 },
];

function roundToNinety(value: number): number {
  const floored = Math.floor(value);
  const candidate = floored + 0.9;
  return candidate >= value - 0.001 ? candidate : floored + 1.9;
}

function isPromoActive(p: Promotion): boolean {
  if (!p.isActive) return false;
  const now = new Date();
  if (!p.isIndeterminate) {
    if (p.validFrom && new Date(p.validFrom) > now) return false;
    if (p.validTo   && new Date(p.validTo)   < now) return false;
  }
  if (p.weekDays) {
    const days = p.weekDays.split(",").map(Number);
    if (!days.includes(now.getDay())) return false;
  }
  return true;
}

function promoLabel(p: Promotion): string {
  const discount = p.discountType === "Percentage"
    ? `${p.discountValue}% de desconto`
    : `R$ ${p.discountValue.toFixed(2).replace(".", ",")} de desconto`;
  const where = p.applicableCategory
    ? ` em ${p.applicableCategory}${p.applicableSize ? ` (${p.applicableSize})` : ""}`
    : "";
  return `${discount}${where} — ${p.name}`;
}

// ── Círculo SVG ───────────────────────────────────────────────────────────────

function PizzaCircle({
  mode,
  flavor1,
  flavor2,
}: {
  mode: "inteira" | "meio-a-meio";
  flavor1: Flavor | null;
  flavor2: Flavor | null;
}) {
  const cx = 80; const cy = 80;
  const rCrust = 78; const rFill = 62;

  const shortName = (f: Flavor | null) => {
    if (!f) return "?";
    const words = f.name.split(" ");
    return words.length > 2 ? words.slice(0, 2).join(" ") : f.name;
  };

  if (mode === "inteira") {
    return (
      <svg width={160} height={160} viewBox="0 0 160 160" className="mx-auto">
        <circle cx={cx} cy={cy} r={rCrust} fill="#c8860a" />
        <circle cx={cx} cy={cy} r={rFill}  fill="#d4522a" />
        <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize={flavor1 ? 14 : 18} fontWeight="bold" fontFamily="monospace">
          {shortName(flavor1)}
        </text>
      </svg>
    );
  }

  return (
    <svg width={160} height={160} viewBox="0 0 160 160" className="mx-auto">
      <defs>
        <clipPath id="clip-top"><rect x={0} y={0} width={160} height={80} /></clipPath>
        <clipPath id="clip-bottom"><rect x={0} y={80} width={160} height={80} /></clipPath>
        <clipPath id="clip-inner"><circle cx={cx} cy={cy} r={rFill} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={rCrust} fill="#c8860a" />
      <circle cx={cx} cy={cy} r={rFill} fill="#b03a20" clipPath="url(#clip-top)" />
      <circle cx={cx} cy={cy} r={rFill} fill="#d4522a" clipPath="url(#clip-bottom)" />
      <line x1={cx - rFill} y1={80} x2={cx + rFill} y2={80} stroke="#111" strokeWidth={2} clipPath="url(#clip-inner)" />
      <text x={cx} y={57} textAnchor="middle" fill="white" fontSize={flavor1 ? 12 : 16} fontWeight="bold" fontFamily="monospace" clipPath="url(#clip-top)">
        {shortName(flavor1)}
      </text>
      <text x={cx} y={110} textAnchor="middle" fill="white" fontSize={flavor2 ? 12 : 16} fontWeight="bold" fontFamily="monospace" clipPath="url(#clip-bottom)">
        {shortName(flavor2)}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NewOrderPage() {
  const router = useRouter();
  const pizzaSectionRef = useRef<HTMLDivElement>(null);
  const customizeRef    = useRef<HTMLDivElement>(null);

  const [flavors,        setFlavors]        = useState<Flavor[]>([]);
  const [products,       setProducts]       = useState<Product[]>([]);
  const [promos,         setPromos]         = useState<Promotion[]>([]);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [search,         setSearch]         = useState("");
  const [cart,           setCart]           = useState<CartItem[]>([]);

  // Upsell modal
  const [upsellModal, setUpsellModal] = useState(false);

  // Modo da pizza
  const [pizzaMode,  setPizzaMode]  = useState<"inteira" | "meio-a-meio">("inteira");
  const [halfStep,   setHalfStep]   = useState<1 | 2>(1);

  // Customização
  const [selectedFlavor,  setSelectedFlavor]  = useState<Flavor | null>(null);
  const [selectedFlavor2, setSelectedFlavor2] = useState<Flavor | null>(null);
  const [size,   setSize]   = useState("Média");
  const [crust,  setCrust]  = useState("Tradicional");
  const [extras, setExtras] = useState<string[]>([]);

  // Edição de item do carrinho
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Modal sabores iguais
  const [sameFlavorModal, setSameFlavorModal] = useState<Flavor | null>(null);

  useEffect(() => {
    api.get<Flavor[]>("/api/flavors").then((d) => setFlavors(d.filter((f) => f.isAvailable)));
    api.get<Product[]>("/api/products").then((d) => setProducts(d.filter((p) => p.isAvailable)));
    api.get<Promotion[]>("/api/promotions").then(setPromos).catch(() => {});
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
  }, []);

  const activePromos = promos.filter(isPromoActive);

  function changePizzaMode(mode: "inteira" | "meio-a-meio") {
    setPizzaMode(mode);
    setSelectedFlavor(null);
    setSelectedFlavor2(null);
    setHalfStep(1);
    setExtras([]);
    setCrust("Tradicional");
  }

  function resetCustomize() {
    setSelectedFlavor(null);
    setSelectedFlavor2(null);
    setHalfStep(1);
    setExtras([]);
    setCrust("Tradicional");
    setEditingIdx(null);
    setPizzaMode("inteira");
  }

  function startEdit(idx: number) {
    const item = cart[idx];
    if (item.type !== "pizza") return;
    const isHalf = !!item.isHalf;
    const f1 = flavors.find((f) => f.id === item.flavorId) ?? null;
    const f2Name = item.flavor2Name ?? null;
    const f2 = f2Name ? flavors.find((f) => f.name === f2Name) ?? null : null;
    setPizzaMode(isHalf ? "meio-a-meio" : "inteira");
    setSelectedFlavor(f1);
    setSelectedFlavor2(f2);
    setHalfStep(isHalf && !f2 ? 2 : 1);
    setSize(item.size);
    setCrust(item.crust ?? "Tradicional");
    setExtras(item.extras ? JSON.parse(item.extras) : []);
    setEditingIdx(idx);
    setTimeout(() => pizzaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function selectFlavor(flavor: Flavor) {
    if (pizzaMode === "inteira") {
      setSelectedFlavor(flavor);
      setTimeout(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      return;
    }
    // meio a meio
    if (halfStep === 1) {
      setSelectedFlavor(flavor);
      setHalfStep(2);
    } else {
      // verificar se é o mesmo sabor
      if (selectedFlavor?.id === flavor.id) {
        setSameFlavorModal(flavor);
        return;
      }
      setSelectedFlavor2(flavor);
      setTimeout(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  }

  function toggleExtra(label: string) {
    setExtras((prev) => prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]);
  }

  const sizeMultiplier = SIZES.find((s) => s.key === size)?.multiplier ?? 1;
  const extrasTotal    = extras.reduce((s, l) => s + (EXTRAS.find((e) => e.label === l)?.price ?? 0), 0);
  const crustPrice     = CRUSTS.find((c) => c.label === crust)?.price ?? 0;

  const basePrice = pizzaMode === "meio-a-meio"
    ? Math.max(selectedFlavor?.basePrice ?? 0, selectedFlavor2?.basePrice ?? 0)
    : (selectedFlavor?.basePrice ?? 0);

  const pizzaUnitPrice = basePrice > 0
    ? roundToNinety(basePrice * sizeMultiplier) + extrasTotal + crustPrice
    : 0;

  const showCustomize = pizzaMode === "inteira"
    ? selectedFlavor !== null
    : selectedFlavor !== null && selectedFlavor2 !== null;

  function addPizzaToCart() {
    if (!selectedFlavor) return;
    if (pizzaMode === "meio-a-meio" && !selectedFlavor2) return;

    const isHalf = pizzaMode === "meio-a-meio";
    const flavorName = isHalf
      ? selectedFlavor.name
      : selectedFlavor.name;

    const newItem: CartItem = {
      type: "pizza",
      flavorId: selectedFlavor.id,
      flavorName,
      size,
      crust: crust !== "Tradicional" ? crust : null,
      extras: extras.length ? JSON.stringify(extras) : null,
      quantity: 1,
      unitPrice: pizzaUnitPrice,
      isHalf,
      flavor2Name: isHalf ? selectedFlavor2!.name : undefined,
    };

    if (editingIdx !== null) {
      const updated = cart.map((item, i) => i === editingIdx ? newItem : item);
      saveCart(updated);
    } else {
      saveCart([...cart, newItem]);
    }
    resetCustomize();
  }

  function addProductToCart(product: Product) {
    const idx = cart.findIndex((i) => i.type === "product" && i.flavorName === product.name);
    const updated = idx >= 0
      ? cart.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i)
      : [...cart, {
          type: "product" as const,
          flavorId: null,
          flavorName: product.name,
          productCategory: product.category,
          size: "",
          crust: null,
          extras: null,
          quantity: 1,
          unitPrice: product.price,
        }];
    saveCart(updated);
  }

  function changeQty(idx: number, delta: number) {
    const updated = cart
      .map((item, i) => i === idx ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0);
    saveCart(updated);
  }

  function removeFromCart(idx: number) {
    saveCart(cart.filter((_, i) => i !== idx));
  }

  function saveCart(items: CartItem[]) {
    setCart(items);
    localStorage.setItem("cart", JSON.stringify(items));
  }

  const subtotal        = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const filteredFlavors = flavors.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  const entradas        = products.filter((p) => p.category === "Entradas");
  const bebidas         = [...products.filter((p) => p.category === "Bebidas")].sort((a, b) => b.price - a.price);
  const hasEntrada      = cart.some((i) => i.type === "product" && i.productCategory === "Entradas");
  const hasBebida       = cart.some((i) => i.type === "product" && i.productCategory === "Bebidas");
  const hasPizza        = cart.some((i) => i.type === "pizza");
  const needsUpsell     = hasPizza && (!hasEntrada || !hasBebida);

  function handleGoToCheckout() {
    if (needsUpsell) setUpsellModal(true);
    else router.push("/checkout");
  }

  function ProductCard({ product }: { product: Product }) {
    const qty = cart.filter((i) => i.type === "product" && i.flavorName === product.name)
      .reduce((s, i) => s + i.quantity, 0);
    const isDrink = product.category === "Bebidas";
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-medium text-[var(--foreground)] truncate">{product.name}</p>
          {isDrink
            ? <p className="text-xs text-[var(--muted-foreground)]">{product.description}</p>
            : product.description && <p className="text-xs text-[var(--muted-foreground)] truncate">{product.description}</p>
          }
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

  const halfLabel = halfStep === 1 ? "Escolha o sabor da metade superior" : "Agora escolha a metade inferior";

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-16 lg:h-20 px-4 lg:px-8 border-b border-[var(--border)] shrink-0">
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Novo Pedido</h1>
      </header>

      {/* Banner de promoções ativas */}
      {activePromos.length > 0 && !promoDismissed && (
        <div className="mx-4 lg:mx-8 mt-4 p-3 rounded-[var(--radius-m)] border border-[var(--primary)]/40 bg-[var(--primary)]/8 flex items-start gap-3">
          <Tag size={16} className="text-[var(--primary)] mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-mono font-semibold text-[var(--primary)]">
              {activePromos.length === 1 ? "Promoção ativa hoje!" : `${activePromos.length} promoções ativas hoje!`}
            </p>
            {activePromos.map((p) => (
              <p key={p.id} className="text-xs text-[var(--muted-foreground)] mt-0.5">{promoLabel(p)}</p>
            ))}
          </div>
          <button onClick={() => setPromoDismissed(true)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 gap-6 p-4 lg:p-8 overflow-y-auto lg:overflow-hidden">
        {/* Coluna esquerda */}
        <div className="flex-1 flex flex-col gap-8 lg:overflow-y-auto scrollbar-thin">

          {/* ── 1. ENTRADAS ── */}
          <section>
            <h2 className="font-mono font-bold text-base mb-3 text-[var(--foreground)] flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-[var(--primary)]" />
              Entradas
            </h2>
            {entradas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entradas.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Sem entradas disponíveis no momento.</p>
            )}
          </section>

          {/* ── 2. PIZZAS ── */}
          <section ref={pizzaSectionRef}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-mono font-bold text-base text-[var(--foreground)]">Pizzas</h2>
              <div className="relative w-48 shrink-0">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input placeholder="Buscar sabor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
            </div>

            {/* Seletor Inteira / Meio a meio */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <select
                  value={pizzaMode}
                  onChange={(e) => changePizzaMode(e.target.value as "inteira" | "meio-a-meio")}
                  className="appearance-none h-9 pl-3 pr-8 text-sm font-mono bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 cursor-pointer"
                >
                  <option value="inteira">Inteira</option>
                  <option value="meio-a-meio">Meio a meio</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--primary)] pointer-events-none" />
              </div>
              {pizzaMode === "meio-a-meio" && (
                <p className="text-xs font-mono text-[var(--primary)]">{halfLabel}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {filteredFlavors.map((flavor) => {
                const isSelected1 = selectedFlavor?.id === flavor.id;
                const isSelected2 = selectedFlavor2?.id === flavor.id;
                return (
                  <button
                    key={flavor.id}
                    onClick={() => selectFlavor(flavor)}
                    className={`flex flex-col gap-1 p-3 rounded-[var(--radius-m)] border text-left transition-colors cursor-pointer ${
                      isSelected1 || isSelected2
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <span className="font-mono text-sm font-medium text-[var(--foreground)]">{flavor.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)] line-clamp-1">{flavor.description}</span>
                    <span className="font-mono text-sm text-[var(--primary)] mt-0.5">
                      a partir de R$ {roundToNinety(flavor.basePrice * 0.75).toFixed(2).replace(".", ",")}
                    </span>
                    {isSelected1 && pizzaMode === "meio-a-meio" && (
                      <span className="text-[10px] font-mono text-[var(--primary)] font-semibold">▲ Superior</span>
                    )}
                    {isSelected2 && (
                      <span className="text-[10px] font-mono text-[var(--primary)] font-semibold">▼ Inferior</span>
                    )}
                  </button>
                );
              })}
              {filteredFlavors.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)] col-span-3">Nenhum sabor encontrado.</p>
              )}
            </div>

            {/* Painel de personalização */}
            {selectedFlavor && (
              <div ref={customizeRef} className="mt-4 p-4 rounded-[var(--radius-m)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-4">

                {/* Círculo + preço */}
                <div className="flex items-center gap-4">
                  <PizzaCircle mode={pizzaMode} flavor1={selectedFlavor} flavor2={selectedFlavor2} />
                  <div className="flex flex-col gap-1">
                    {pizzaMode === "meio-a-meio" && !selectedFlavor2 && (
                      <p className="text-xs text-[var(--muted-foreground)] font-mono">Escolha a metade inferior ↑</p>
                    )}
                    {showCustomize && (
                      <>
                        <p className="text-xs text-[var(--muted-foreground)] font-mono uppercase tracking-wider">Subtotal</p>
                        <p className="font-mono font-bold text-2xl text-[var(--primary)]">
                          R$ {pizzaUnitPrice.toFixed(2).replace(".", ",")}
                        </p>
                        {extrasTotal > 0 && (
                          <p className="text-xs text-[var(--muted-foreground)] font-mono">
                            incl. extras +R$ {extrasTotal.toFixed(2).replace(".", ",")}
                          </p>
                        )}
                        {crustPrice > 0 && (
                          <p className="text-xs text-[var(--muted-foreground)] font-mono">
                            incl. borda +R$ {crustPrice.toFixed(2).replace(".", ",")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {showCustomize && (
                  <>
                    {/* Tamanho */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Tamanho</p>
                      <div className="flex gap-2">
                        {SIZES.map((s) => {
                          const disabledForHalf = pizzaMode === "meio-a-meio" && s.key === "Broto";
                          return (
                            <button key={s.key}
                              onClick={() => !disabledForHalf && setSize(s.key)}
                              disabled={disabledForHalf}
                              title={disabledForHalf ? "Broto não disponível para meio a meio" : undefined}
                              className={`flex-1 py-2 rounded-[var(--radius-m)] border font-mono text-xs font-medium transition-colors flex flex-col items-center ${
                                disabledForHalf
                                  ? "border-[var(--border)] text-[var(--muted-foreground)]/40 cursor-not-allowed opacity-40"
                                  : size === s.key
                                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10 cursor-pointer"
                                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)] cursor-pointer"
                              }`}
                            >
                              <span>{s.label}</span>
                              <span className="text-[10px] opacity-70 font-normal">{s.slices} fatias</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Borda */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Borda</p>
                      <div className="grid grid-cols-2 gap-2">
                        {CRUSTS.map((c) => (
                          <button key={c.label} onClick={() => setCrust(c.label)}
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

                    {/* Extras — 3 colunas */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Extras</p>
                      <div className="grid grid-cols-3 gap-2">
                        {EXTRAS.map((extra) => {
                          const checked = extras.includes(extra.label);
                          return (
                            <label key={extra.label}
                              className={`flex flex-col gap-1 px-2 py-2 rounded-[var(--radius-m)] border text-xs transition-colors cursor-pointer ${
                                checked ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <input type="checkbox" checked={checked} onChange={() => toggleExtra(extra.label)} className="w-3 h-3 accent-[var(--primary)] shrink-0" />
                                <span className={`font-mono text-[11px] leading-tight ${checked ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>{extra.label}</span>
                              </div>
                              <span className="text-[var(--muted-foreground)] opacity-70 text-[10px] pl-4">+R$ {extra.price.toFixed(2).replace(".", ",")}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--primary)]/20">
                      {editingIdx !== null && (
                        <Button variant="outline" size="sm" onClick={resetCustomize}>Cancelar edição</Button>
                      )}
                      <Button onClick={addPizzaToCart} size="sm" className="ml-auto">
                        {editingIdx !== null ? "Salvar alteração" : "Adicionar ao carrinho"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ── 3. BEBIDAS — 3 colunas ── */}
          <section>
            <h2 className="font-mono font-bold text-base mb-3 text-[var(--foreground)] flex items-center gap-2">
              <GlassWater size={16} className="text-[var(--primary)]" />
              Bebidas
            </h2>
            {bebidas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {bebidas.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
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
                    {/* Exibição meio a meio */}
                    {item.isHalf ? (
                      <div className="font-mono text-sm font-medium text-[var(--foreground)]">
                        <p className="truncate">½ {item.flavorName}</p>
                        <p className="truncate">½ {item.flavor2Name}</p>
                      </div>
                    ) : (
                      <p className="font-mono text-sm font-medium text-[var(--foreground)] truncate">{item.flavorName}</p>
                    )}
                    {item.size && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.size}{item.crust ? ` · ${item.crust}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-mono text-sm text-[var(--primary)]">
                      R$ {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => changeQty(i, -1)}
                        className="w-5 h-5 flex items-center justify-center rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors cursor-pointer">
                        <Minus size={10} />
                      </button>
                      <span className="font-mono text-xs w-4 text-center">{item.quantity}</span>
                      <button onClick={() => changeQty(i, +1)}
                        className="w-5 h-5 flex items-center justify-center rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer">
                        <Plus size={10} />
                      </button>
                      {item.type === "pizza" && (
                        <button onClick={() => startEdit(i)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer ml-0.5">
                          <Pencil size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {cart.length > 0 && (
                <>
                  <div className="flex justify-between font-mono font-bold text-sm border-t border-[var(--border)] pt-2">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleGoToCheckout}>
                    Ir para o checkout
                  </Button>
                  <button onClick={() => saveCart([])}
                    className="w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer">
                    Limpar carrinho
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de upsell */}
      {upsellModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">Seu pedido está quase completo!</CardTitle>
                <button onClick={() => setUpsellModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer shrink-0">
                  <X size={16} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasEntrada && entradas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-mono font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <UtensilsCrossed size={14} className="text-[var(--primary)]" /> Que tal uma entrada?
                  </p>
                  <div className="space-y-2">
                    {entradas.slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                </div>
              )}
              {!hasBebida && bebidas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-mono font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <GlassWater size={14} className="text-[var(--primary)]" /> Adicione uma bebida
                  </p>
                  <div className="space-y-2">
                    {bebidas.slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
                <Button variant="outline" className="flex-1" onClick={() => { setUpsellModal(false); router.push("/checkout"); }}>
                  Não, obrigado
                </Button>
                <Button className="flex-1" onClick={() => setUpsellModal(false)}>
                  Adicionar itens
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal sabores iguais */}
      {sameFlavorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <p className="font-mono font-semibold text-[var(--foreground)] text-center">
                Os 2 sabores escolhidos são iguais. Deseja uma pizza inteira {sameFlavorModal.name}?
              </p>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => {
                  setPizzaMode("inteira");
                  setSelectedFlavor(sameFlavorModal);
                  setSelectedFlavor2(null);
                  setHalfStep(1);
                  setSameFlavorModal(null);
                  setTimeout(() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                }}>
                  Sim, quero uma inteira
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {
                  setSelectedFlavor2(null);
                  setHalfStep(2);
                  setSameFlavorModal(null);
                }}>
                  Não, vou escolher outro sabor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
