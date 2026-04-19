"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DiscountType = "Percentage" | "FixedAmount";

interface Promotion {
  id: number;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  isIndeterminate: boolean;
  validFrom: string | null;
  validTo: string | null;
  weekDays: string | null;       // "1,2,3,4,5"
  applicableCategory: string | null;
  applicableSize: string | null;
  isActive: boolean;
}

type FormState = Omit<Promotion, "id">;

const DRINK_SIZES = ["Lata 350mL", "Latão 473mL", "600mL", "1L", "2L"];

const EMPTY: FormState = {
  name: "", description: "", discountType: "Percentage", discountValue: 0,
  isIndeterminate: false, validFrom: "", validTo: "",
  weekDays: null, applicableCategory: null, applicableSize: null, isActive: true,
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CATEGORIES = ["Pizzas", "Bordas", "Bebidas", "Entradas", "Entrega"];

function parseDays(str: string | null): number[] {
  if (!str) return [];
  return str.split(",").map(Number).filter((n) => !isNaN(n));
}
function serializeDays(days: number[]): string | null {
  return days.length ? days.sort().join(",") : null;
}

function formatBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return "R$ " + (parseInt(digits, 10) / 100).toFixed(2).replace(".", ",");
}
function parseBRLValue(str: string): number {
  const digits = str.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) / 100 : 0;
}

const selectCls = "select-primary flex h-10 w-full rounded-[var(--radius-m)] border border-[var(--input)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40";

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing: Promotion | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [valueRaw, setValueRaw] = useState("");
  const [saving, setSaving] = useState(false);

  function load() { api.get<Promotion[]>("/api/promotions").then(setPromos); }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY);
    setValueRaw("");
    setModal({ open: true, editing: null });
  }
  function openEdit(p: Promotion) {
    setForm({
      name: p.name, description: p.description,
      discountType: p.discountType, discountValue: p.discountValue,
      isIndeterminate: p.isIndeterminate,
      validFrom: p.validFrom ? p.validFrom.slice(0, 10) : "",
      validTo: p.validTo ? p.validTo.slice(0, 10) : "",
      weekDays: p.weekDays, applicableCategory: p.applicableCategory,
      applicableSize: p.applicableSize,
      isActive: p.isActive,
    });
    if (p.discountType === "FixedAmount") {
      const cents = Math.round(p.discountValue * 100);
      setValueRaw("R$ " + (cents / 100).toFixed(2).replace(".", ","));
    } else {
      setValueRaw(String(p.discountValue));
    }
    setModal({ open: true, editing: p });
  }
  async function handleDelete(p: Promotion) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    await api.delete(`/api/promotions/${p.id}`);
    load();
  }

  async function handleSave() {
    const discountValue = form.discountType === "FixedAmount"
      ? parseBRLValue(valueRaw)
      : parseFloat(valueRaw) || 0;

    const payload = {
      ...form,
      discountValue,
      validFrom: form.isIndeterminate || !form.validFrom ? null : form.validFrom,
      validTo:   form.isIndeterminate || !form.validTo   ? null : form.validTo,
    };
    setSaving(true);
    try {
      if (modal.editing) await api.put(`/api/promotions/${modal.editing.id}`, payload);
      else await api.post("/api/promotions", payload);
      setModal({ open: false, editing: null });
      load();
    } finally { setSaving(false); }
  }

  function toggleDay(idx: number) {
    const days = parseDays(form.weekDays);
    const next = days.includes(idx) ? days.filter((d) => d !== idx) : [...days, idx];
    setForm({ ...form, weekDays: serializeDays(next) });
  }

  const selectedDays = parseDays(form.weekDays);

  const columns: Column<Promotion>[] = [
    { key: "name", label: "Nome", className: "flex-1 min-w-0" },
    { key: "discountType", label: "Tipo", className: "w-28 shrink-0", render: (p) => p.discountType === "Percentage" ? "% Percentual" : "R$ Fixo" },
    { key: "discountValue", label: "Valor", className: "w-24 shrink-0", render: (p) => p.discountType === "Percentage" ? `${p.discountValue}%` : `R$ ${p.discountValue.toFixed(2).replace(".", ",")}` },
    { key: "applicableCategory", label: "Aplica em", className: "w-28 shrink-0", render: (p) => p.applicableCategory ?? "Todas" },
    {
      key: "validTo", label: "Validade", className: "w-32 shrink-0",
      render: (p) => p.isIndeterminate ? "Indeterminado" : (p.validTo ? new Date(p.validTo).toLocaleDateString("pt-BR") : "—"),
    },
    { key: "isActive", label: "Status", className: "w-20 shrink-0", render: (p) => <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Ativa" : "Inativa"}</Badge> },
  ];

  return (
    <div className="flex flex-col h-full p-4 lg:p-8 gap-6">
      <div>
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)]">Promoções</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Gerencie promoções e descontos</p>
      </div>

      <DataTable data={promos} columns={columns} onAdd={openCreate} addLabel="Nova Promoção" onEdit={openEdit} onDelete={handleDelete} searchKeys={["name"]} />

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <Card className="w-full max-w-lg my-auto">
            <CardHeader><CardTitle>{modal.editing ? "Editar Promoção" : "Nova Promoção"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Nome</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Descrição</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Tipo</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => {
                      const t = e.target.value as DiscountType;
                      setForm({ ...form, discountType: t });
                      setValueRaw("");
                    }}
                    className={selectCls}
                  >
                    <option value="Percentage">Percentual (%)</option>
                    <option value="FixedAmount">Valor fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Valor</label>
                  {form.discountType === "FixedAmount" ? (
                    <Input
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={valueRaw}
                      onChange={(e) => setValueRaw(formatBRL(e.target.value))}
                    />
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="0 – 100"
                      value={valueRaw}
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        setValueRaw(String(v));
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Aplica em */}
              <div className="space-y-1.5">
                <label className="text-sm font-mono">Aplica em</label>
                <select
                  value={form.applicableCategory ?? ""}
                  onChange={(e) => setForm({ ...form, applicableCategory: e.target.value || null, applicableSize: null })}
                  className={selectCls}
                >
                  <option value="">Todas as categorias</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tamanho de bebida */}
              {form.applicableCategory === "Bebidas" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-mono">Tamanho da bebida</label>
                  <select
                    value={form.applicableSize ?? ""}
                    onChange={(e) => setForm({ ...form, applicableSize: e.target.value || null })}
                    className={selectCls}
                  >
                    <option value="">Todos os tamanhos</option>
                    {DRINK_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Duração */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="indeterminate"
                    checked={form.isIndeterminate}
                    onChange={(e) => setForm({ ...form, isIndeterminate: e.target.checked })}
                    className="w-4 h-4 accent-[var(--primary)]"
                  />
                  <label htmlFor="indeterminate" className="text-sm font-mono cursor-pointer">Duração indeterminada</label>
                </div>

                {!form.isIndeterminate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-mono">Válido de</label>
                      <Input
                        type="date"
                        value={form.validFrom ?? ""}
                        disabled={form.isIndeterminate}
                        onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-mono">Válido até</label>
                      <Input
                        type="date"
                        value={form.validTo ?? ""}
                        disabled={form.isIndeterminate}
                        onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dias da semana */}
              <div className="space-y-2">
                <label className="text-sm font-mono">Dias da semana</label>
                <p className="text-xs text-[var(--muted-foreground)]">Deixe em branco para todos os dias</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_DAYS.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-[var(--radius-m)] border text-xs font-mono transition-colors cursor-pointer ${
                        selectedDays.includes(idx)
                          ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ativa */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--primary)]"
                />
                <label htmlFor="active" className="text-sm font-mono cursor-pointer">Ativa</label>
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
