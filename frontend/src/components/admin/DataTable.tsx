"use client";

import { Search, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string; // e.g. "flex-1 min-w-0" or "w-28 shrink-0"
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  addLabel?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  searchKeys?: (keyof T)[];
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onAdd,
  addLabel = "Novo",
  onEdit,
  onDelete,
  searchKeys = [],
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 7;

  const filtered = search
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String(row[key]).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col flex-1 rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] overflow-hidden min-w-0">
      {/* Search + Add */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        {onAdd && (
          <Button size="sm" onClick={onAdd}>{addLabel}</Button>
        )}
      </div>

      {/* Scrollable table area */}
      <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center h-11 px-5 bg-[var(--muted)] border-b border-[var(--border)] min-w-[500px]">
        {columns.map((col) => (
          <div key={String(col.key)} className={`${col.className ?? "flex-1"} text-xs font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wide truncate`}>
            {col.label}
          </div>
        ))}
        {(onEdit || onDelete) && (
          <div className="w-24 text-xs font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wide text-right">
            Ações
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto min-w-[500px]">
        {paged.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-[var(--muted-foreground)]">
            Nenhum registro encontrado.
          </div>
        )}
        {paged.map((row) => (
          <div
            key={row.id}
            className="flex items-center h-13 px-5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
          >
            {columns.map((col) => (
              <div key={String(col.key)} className={`${col.className ?? "flex-1"} text-sm text-[var(--foreground)] truncate`}>
                {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
              </div>
            ))}
            {(onEdit || onDelete) && (
              <div className="w-24 flex items-center justify-end gap-3">
                {onEdit && (
                  <button
                    onClick={() => onEdit(row)}
                    title="Editar"
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(row)}
                    title="Excluir"
                    className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      </div>{/* end scroll wrapper */}
      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--muted-foreground)] font-mono">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors"
          >
            ‹
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                p === page
                  ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
