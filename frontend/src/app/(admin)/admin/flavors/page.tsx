"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
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

const EMPTY: Omit<Flavor, "id"> = { name: "", description: "", basePrice: 0, isAvailable: true };

export default function AdminFlavorsPage() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing: Flavor | null }>({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Flavor[]>("/api/flavors").then(setFlavors);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY);
    setModal({ open: true, editing: null });
  }

  function openEdit(flavor: Flavor) {
    setForm({ name: flavor.name, description: flavor.description, basePrice: flavor.basePrice, isAvailable: flavor.isAvailable });
    setModal({ open: true, editing: flavor });
  }

  async function handleDelete(flavor: Flavor) {
    if (!confirm(`Excluir "${flavor.name}"?`)) return;
    await api.delete(`/api/flavors/${flavor.id}`);
    load();
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (modal.editing) {
        await api.put(`/api/flavors/${modal.editing.id}`, form);
      } else {
        await api.post("/api/flavors", form);
      }
      setModal({ open: false, editing: null });
      load();
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Flavor>[] = [
    { key: "name", label: "Nome", className: "flex-1 min-w-0" },
    { key: "description", label: "Descrição", className: "flex-1 min-w-0" },
    {
      key: "basePrice",
      label: "Preço base",
      className: "w-32 shrink-0",
      render: (f) => `R$ ${f.basePrice.toFixed(2).replace(".", ",")}`,
    },
    {
      key: "isAvailable",
      label: "Status",
      className: "w-32 shrink-0",
      render: (f) => (
        <Badge variant={f.isAvailable ? "success" : "secondary"}>
          {f.isAvailable ? "Disponível" : "Indisponível"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full p-4 lg:p-8 gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Sabores</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Gerencie os sabores do cardápio</p>
        </div>
      </div>

      <DataTable
        data={flavors}
        columns={columns}
        onAdd={openCreate}
        addLabel="Novo Sabor"
        onEdit={openEdit}
        onDelete={handleDelete}
        searchKeys={["name"]}
      />

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{modal.editing ? "Editar Sabor" : "Novo Sabor"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Nome</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Descrição</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Preço base (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-[var(--primary)]"
                />
                <label htmlFor="available" className="text-sm font-mono">Disponível</label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setModal({ open: false, editing: null })}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
