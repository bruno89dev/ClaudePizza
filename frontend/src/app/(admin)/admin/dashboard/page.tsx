"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Label,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as HBarChart
} from "recharts";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyStat { date: string; orders: number; revenue: number }
interface StatusStat { status: string; count: number }
interface FlavorStat { flavorName: string; count: number }
interface SizeStat { size: string; count: number }
interface DeliveryTypeStat { type: string; count: number }

interface Stats {
  dailyStats: DailyStat[];
  statusBreakdown: StatusStat[];
  topFlavors: FlavorStat[];
  sizeBreakdown: SizeStat[];
  deliveryTypeBreakdown: DeliveryTypeStat[];
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  cancellationRate: number;
  averageRating: number;
}

const CHART_COLORS = ["#FF8400", "#3B82F6", "#22C55E", "#F59E0B", "#FF5C33", "#8B5CF6"];
const STATUS_COLORS: Record<string, string> = {
  Preparando: "#F59E0B",
  Pronto:     "#FF8400",
  Entregue:   "#22C55E",
  Cancelado:  "#FF5C33",
};

function toISO(date: Date) {
  return date.toISOString().split("T")[0];
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">{label}</p>
        <p className={`font-mono font-bold text-2xl ${color ?? "text-[var(--foreground)]"}`}>{value}</p>
        {sub && <p className="text-xs text-[var(--muted-foreground)]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function DonutCenter({ cx, cy, value, label }: { cx?: number; cy?: number; value: number | string; label: string }) {
  return (
    <g>
      <text x={cx} y={(cy ?? 0) - 6} textAnchor="middle" fill="var(--foreground)" className="font-mono" style={{ fontSize: 22, fontWeight: 700 }}>
        {value}
      </text>
      <text x={cx} y={(cy ?? 0) + 14} textAnchor="middle" fill="var(--muted-foreground)" style={{ fontSize: 11 }}>
        {label}
      </text>
    </g>
  );
}

export default function DashboardPage() {
  const defaultTo = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultTo.getDate() - 6);

  const [from, setFrom] = useState(toISO(defaultFrom));
  const [to, setTo] = useState(toISO(defaultTo));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const fetchStats = useCallback(async (f: string, t: string) => {
    const diffDays = (new Date(t).getTime() - new Date(f).getTime()) / 86400000;
    if (diffDays > 90) {
      showToast("Intervalo máximo de 90 dias.");
      return;
    }
    if (diffDays < 0) {
      showToast("A data inicial deve ser anterior à data final.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<Stats>(`/api/orders/stats?from=${f}&to=${t}`);
      setStats(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      showToast(
        msg.toLowerCase().includes("fetch")
          ? "Servidor temporariamente indisponível. Aguarde um momento e tente novamente."
          : msg || "Erro ao carregar dados."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(from, to); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const totalDonut = stats?.statusBreakdown.reduce((s, i) => s + i.count, 0) ?? 0;
  const totalSizes = stats?.sizeBreakdown.reduce((s, i) => s + i.count, 0) ?? 0;
  const totalDelivery = stats?.deliveryTypeBreakdown.reduce((s, i) => s + i.count, 0) ?? 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--destructive)] text-white px-4 py-3 rounded-[var(--radius-m)] shadow-lg font-mono text-sm animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 lg:px-8 py-4 border-b border-[var(--border)] shrink-0">
        <h1 className="font-mono font-bold text-xl lg:text-2xl text-[var(--foreground)] flex-1">Dashboard</h1>

        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 text-sm font-mono bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          />
          <span className="text-[var(--muted-foreground)] text-sm font-mono">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 text-sm font-mono bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-m)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          />
          <button
            onClick={() => fetchStats(from, to)}
            disabled={loading}
            className="h-9 px-4 text-sm font-mono bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius-m)] hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? "..." : "Filtrar"}
          </button>
        </div>
      </header>

      {!stats && !loading && (
        <div className="flex items-center justify-center flex-1 text-[var(--muted-foreground)]">
          Nenhum dado para o período.
        </div>
      )}

      {stats && stats.totalOrders === 0 && (
        <div className="flex items-center justify-center flex-1 text-[var(--muted-foreground)] font-mono text-sm">
          Nenhum pedido encontrado no período selecionado.
        </div>
      )}

      {stats && stats.totalOrders > 0 && (
        <div className="p-4 lg:p-8 space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Pedidos" value={String(stats.totalOrders)} sub="no período" />
            <KpiCard
              label="Faturamento"
              value={`R$ ${stats.totalRevenue.toFixed(2).replace(".", ",")}`}
              sub="pedidos não cancelados"
              color="text-[var(--primary)]"
            />
            <KpiCard label="Ticket médio" value={`R$ ${stats.averageTicket.toFixed(2).replace(".", ",")}`} />
            <KpiCard
              label="Cancelamentos"
              value={`${stats.cancellationRate.toFixed(1)}%`}
              color={stats.cancellationRate > 10 ? "text-[var(--destructive)]" : "text-[#4ade80]"}
            />
            <KpiCard
              label="Avaliação média"
              value={stats.averageRating > 0 ? `${"⭐".repeat(Math.round(stats.averageRating))} ${stats.averageRating.toFixed(1)}` : "—"}
              sub="baseado nos pedidos entregues"
              color="text-[var(--foreground)]"
            />
          </div>

          {/* Line + Bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Faturamento por dia</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.dailyStats} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
                      tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
                      tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }}
                      formatter={(v) => [`R$ ${Number(v).toFixed(2).replace(".", ",")}`, "Faturamento"]}
                      labelFormatter={(l) => `Data: ${l}`}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#FF8400" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pedidos por dia</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.dailyStats} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
                      tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }}
                      formatter={(v) => [Number(v), "Pedidos"]}
                      labelFormatter={(l) => `Data: ${l}`}
                    />
                    <Bar dataKey="orders" fill="#FF8400" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Donut row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Status dos pedidos</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.statusBreakdown} dataKey="count" nameKey="status"
                      innerRadius={60} outerRadius={85} paddingAngle={3}
                      labelLine={false}>
                      {stats.statusBreakdown.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <Label content={<DonutCenter value={totalDonut} label="pedidos" />} position="center" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {stats.statusBreakdown.map((s, i) => (
                    <div key={s.status} className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted-foreground)]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                      {s.status}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tamanho das pizzas</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.sizeBreakdown} dataKey="count" nameKey="size"
                      innerRadius={60} outerRadius={85} paddingAngle={3}
                      labelLine={false}>
                      {stats.sizeBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <Label content={<DonutCenter value={totalSizes} label="pizzas" />} position="center" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {stats.sizeBreakdown.map((s, i) => (
                    <div key={s.size} className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted-foreground)]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {s.size}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pickup vs Entrega</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.deliveryTypeBreakdown} dataKey="count" nameKey="type"
                      innerRadius={60} outerRadius={85} paddingAngle={3}
                      labelLine={false}>
                      {stats.deliveryTypeBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <Label content={<DonutCenter value={totalDelivery} label="pedidos" />} position="center" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {stats.deliveryTypeBreakdown.map((d, i) => (
                    <div key={d.type} className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted-foreground)]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.type}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top flavors horizontal bar */}
          <Card>
            <CardHeader><CardTitle>Top 5 sabores mais pedidos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <HBarChart data={stats.topFlavors} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="flavorName" width={140}
                    tick={{ fontSize: 11, fill: "var(--foreground)", fontFamily: "monospace" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }}
                    formatter={(v) => [Number(v), "Pedidos"]}
                  />
                  <Bar dataKey="count" fill="#FF8400" radius={[0, 4, 4, 0]} />
                </HBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
