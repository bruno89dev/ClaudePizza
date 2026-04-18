"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Promotion {
  id: number;
  name: string;
  description: string;
  discountType: 0 | 1; // 0 = Percentage, 1 = FixedAmount
  discountValue: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

type FormState = Omit<Promotion, "id">;
const EMPTY: FormState = {
  name: "", description: "", discountType: 0, discountValue: 0,
  validFrom: "", validTo: "", isActive: true,
};

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing: Promotion | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Promotion[]>("/api/promotions").then(setPromos);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setModal({ open: true, editing: null }); }
  function openEdit(p: Promotion) {
    setForm({ name: p.name, description: p.description, discountType: p.discountType, discountValue: p.discountValue, validFrom: p.validFrom.slice(0, 10), validTo: p.validTo.slice(0, 10), isActive: p.isActive });
    setModal({ open: true, editing: p });
  }
  async function handleDelete(p: Promotion) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    await api.delete(`/api/promotions/${p.id}`);
    load();
  }
  async function handleSave() {
    setSaving(true);
    try {
      if (modal.editing) await api.put(`/api/promotions/${modal.editing.id}`, form);
      else await api.post("/api/promotions", form);
      setModal({ open: false, editing: null });
      load();
    } finally { setSaving(false); }
  }

  const columns: Column<Promotion>[] = [
    { key: "name", label: "Nome" },
    { key: "discountType", label: "Tipo", render: (p) => p.discountType === 0 ? "% Percentual" : "R$ Fixo" },
    { key: "discountValue", label: "Valor", render: (p) => p.discountType === 0 ? `${p.discountValue}%` : `R$ ${p.discountValue.toFixed(2)}` },
    { key: "validTo", label: "Válido até", render: (p) => new Date(p.validTo).toLocaleDateString("pt-BR") },
    { key: "isActive", label: "Status", render: (p) => <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Ativa" : "Inativa"}</Badge> },
  ];

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">Promoções</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Gerencie promoções e descontos</p>
        </div>
      </div>

      <DataTable data={promos} columns={columns} onAdd={openCreate} addLabel="Nova Promoção" onEdit={openEdit} onDelete={handleDelete} searchKeys={["name"]} />

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>{modal.editing ? "Editar Promoção" : "Nova Promoção"}</CardTitle></CardHeader>
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
                  <label className="text-sm font-mono">Tipo</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: Number(e.target.value) as 0 | 1 })}
                    className="flex h-10 w-full rounded-[var(--radius-m)] border border-[var(--input)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]"
                  >
                    <option value={0}>Percentual (%)</option>
                    <option value={1}>Valor fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Valor</label>
                  <Input type="number" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Válido de</label>
                  <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Válido até</label>
                  <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[var(--primary)]" />
                <label htmlFor="active" className="text-sm font-mono">Ativa</label>
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
