"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

type FormState = Omit<Product, "id">;
const EMPTY: FormState = { name: "", description: "", price: 0, category: "", isAvailable: true };

const CATEGORIES = ["Bebidas", "Entradas", "Sobremesas", "Outros"];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  function load() { api.get<Product[]>("/api/products").then(setProducts); }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setModal({ open: true, editing: null }); }
  function openEdit(p: Product) {
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, isAvailable: p.isAvailable });
    setModal({ open: true, editing: p });
  }
  async function handleDelete(p: Product) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    await api.delete(`/api/products/${p.id}`);
    load();
  }
  async function handleSave() {
    setSaving(true);
    try {
      if (modal.editing) await api.put(`/api/products/${modal.editing.id}`, form);
      else await api.post("/api/products", form);
      setModal({ open: false, editing: null });
      load();
    } finally { setSaving(false); }
  }

  const columns: Column<Product>[] = [
    { key: "name", label: "Nome" },
    { key: "category", label: "Categoria" },
    { key: "price", label: "Preço", render: (p) => `R$ ${p.price.toFixed(2).replace(".", ",")}` },
    { key: "isAvailable", label: "Status", render: (p) => <Badge variant={p.isAvailable ? "success" : "secondary"}>{p.isAvailable ? "Disponível" : "Indisponível"}</Badge> },
  ];

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <div>
        <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">Produtos</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Gerencie bebidas, entradas e outros produtos</p>
      </div>

      <DataTable data={products} columns={columns} onAdd={openCreate} addLabel="Novo Produto" onEdit={openEdit} onDelete={handleDelete} searchKeys={["name", "category"]} />

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>{modal.editing ? "Editar Produto" : "Novo Produto"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Nome</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Descrição</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Preço (R$)</label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-10 w-full rounded-[var(--radius-m)] border border-[var(--input)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]"
                  >
                    <option value="">Selecione...</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="avail" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="w-4 h-4 accent-[var(--primary)]" />
                <label htmlFor="avail" className="text-sm font-mono">Disponível</label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setModal({ open: false, editing: null })}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
